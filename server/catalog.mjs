// Read-only supplier catalog. No buyer identity, balance, orders or delivery data.
import { retailPrice, CATALOG_DEFAULT_MARKUP_PERCENT, CATALOG_STOCK_MARKUP_TIERS } from '../js/utils/catalog-pricing.js';
import { storefrontSettings, supplierConfiguration } from './catalog-settings.mjs';
export class CatalogError extends Error {
  constructor(code, status = 502) { super(code); this.code = code; this.status = status; }
}

export function normalizeProduct(product) {
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  let image = '';
  try {
    const url = new URL(product.image || '', 'https://canboso.com');
    if (product.image && url.protocol === 'https:' && url.origin === 'https://canboso.com') image = url.href;
  } catch {}
  const available = number(product.availability?.available);
  return {
    id: String(product.productId || ''), name: String(product.name || 'Unnamed product'),
    description: String(product.description || ''), image,
    type: ['account', 'slot', 'upgrade_account'].includes(product.productType) ? product.productType : 'other',
    price: retailPrice(number(product.price?.amount), String(product.price?.currency || ''), available),
    currency: String(product.price?.currency || ''),
    available, stock: available === null ? 'unknown' : available > 0 ? 'available' : 'out',
    sold: number(product.availability?.sold),
    promotions: Array.isArray(product.promotions) ? product.promotions.map(item => ({
      type: String(item.type || ''), minQty: number(item.minQty), percent: number(item.percent), bonusQty: number(item.bonusQty)
    })) : [],
    requirements: {
      email: product.purchaseRequirements?.customerEmail === true,
      accounts: product.purchaseRequirements?.customerAccounts === true,
      months: product.purchaseRequirements?.slotMonths === true,
      allowedMonths: Array.isArray(product.purchaseRequirements?.allowedMonths) ? product.purchaseRequirements.allowedMonths.filter(Number.isInteger) : []
    }
  };
}

export class SupplierCatalog {
  constructor({ key = supplierConfiguration().key, baseUrl = supplierConfiguration().baseUrl, fetchImpl = fetch, now = Date.now,
    settings = storefrontSettings() } = {}) {
    // Workers native fetch requires its global receiver, unlike Node fetch.
    this.key = key; this.fetch = (...args) => fetchImpl.call(globalThis, ...args); this.now = now;
    this.settings = settings;
    this.baseUrl = supplierConfiguration({ CANBOSS_API_BASE_URL: baseUrl }).baseUrl;
    this.cached = null; this.expires = 0; this.blockedUntil = 0; this.pending = null;
  }
  async list() {
    if (this.cached && this.now() < this.expires) return this.cached;
    if (this.now() < this.blockedUntil) throw new CatalogError('catalog_temporarily_unavailable', 503);
    if (this.pending) return this.pending;
    this.pending = this.load();
    try { return await this.pending; } finally { this.pending = null; }
  }
  async load() {
    if (!this.key) throw new CatalogError('catalog_not_configured', 503);
    const url = new URL('/api/v2/telegram-buyer/products', this.baseUrl);
    url.searchParams.set('key', this.key);
    try {
      const response = await this.fetch(url, { headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12000), redirect: 'manual' });
      if (response.status === 429) {
        const retry = Number(response.headers.get('retry-after'));
        this.blockedUntil = this.now() + Math.max(60, Number.isFinite(retry) ? retry : 60) * 1000;
        throw new CatalogError('catalog_rate_limited', 503);
      }
      if (!response.ok) throw new CatalogError('catalog_supplier_unavailable');
      const body = await response.json();
      if (body.success !== true || !Array.isArray(body.products)) throw new CatalogError('catalog_invalid_response');
      // Kept on the server adapter only; never attached to the public catalog result.
      this.offerSnapshot=body.products.filter(p=>p&&typeof p==='object').map(p=>({id:String(p.productId||''),sourceId:'canboso',name:String(p.name||'Unnamed product'),
        unitCost:typeof p.price?.amount==='number'&&Number.isFinite(p.price.amount)&&p.price.amount>=0?p.price.amount:null,currency:String(p.price?.currency||''),
        available:Number.isSafeInteger(p.availability?.available)&&p.availability.available>=0?p.availability.available:null,fetchedAt:this.now()}));
      const result = { products: body.products.filter(p => p && typeof p === 'object').map(normalizeProduct),
        fetchedAt: new Date(this.now()).toISOString(), currency: String(body.walletCurrency || ''),
        storefront: this.settings, pricing: { mode: 'stock_tiers',
          defaultMarkupPercent: CATALOG_DEFAULT_MARKUP_PERCENT, tiers: CATALOG_STOCK_MARKUP_TIERS } };
      this.cached = result; this.expires = this.now() + 60000;
      return result;
    } catch (error) {
      if (!(error instanceof CatalogError) || error.code !== 'catalog_rate_limited') this.blockedUntil = this.now() + 30000;
      throw error instanceof CatalogError ? error : new CatalogError('catalog_supplier_unavailable');
    }
  }
}
