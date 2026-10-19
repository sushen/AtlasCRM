// Apply once in the supplier adapter; web and Telegram format the retail result.
export const CATALOG_DEFAULT_MARKUP_PERCENT = 10;
export const CATALOG_STOCK_MARKUP_TIERS = Object.freeze([
  Object.freeze({ minAvailable: 1, maxAvailable: 1, markupPercent: 40 }),
  Object.freeze({ minAvailable: 2, maxAvailable: 4, markupPercent: 30 }),
  Object.freeze({ minAvailable: 5, maxAvailable: 10, markupPercent: 20 }),
  Object.freeze({ minAvailable: 11, maxAvailable: null, markupPercent: 10 })
]);

export function catalogMarkupPercent(available) {
  // Unknown, invalid and out-of-stock counts do not establish scarcity.
  if (!Number.isSafeInteger(available) || available < 1) return CATALOG_DEFAULT_MARKUP_PERCENT;
  return CATALOG_STOCK_MARKUP_TIERS.find(tier => available >= tier.minAvailable
    && (tier.maxAvailable === null || available <= tier.maxAvailable)).markupPercent;
}

export function currencyDecimals(currency) {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits; }
  catch { return 2; }
}

export function retailPrice(amount, currency = 'USD', available = null) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return null;
  const scale = 10 ** currencyDecimals(currency);
  const marked = amount * (100 + catalogMarkupPercent(available)) / 100;
  return Math.round((marked + Number.EPSILON * Math.max(1, marked)) * scale) / scale;
}

export function formatCatalogPrice(product) {
  if (product.price === null || !Number.isFinite(product.price)) return 'Price unavailable';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price); }
  catch { return `${product.price.toFixed(2)} ${product.currency || ''}`.trim(); }
}
