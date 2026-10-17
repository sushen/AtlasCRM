// One rule shared by the supplier adapter, storefront and Telegram formatter.
export const CATALOG_MARKUP_PERCENT = 10;

export function currencyDecimals(currency) {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits; }
  catch { return 2; }
}

export function retailPrice(amount, currency = 'USD') {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return null;
  const scale = 10 ** currencyDecimals(currency);
  const marked = amount * (100 + CATALOG_MARKUP_PERCENT) / 100;
  return Math.round((marked + Number.EPSILON * Math.max(1, marked)) * scale) / scale;
}

export function formatCatalogPrice(product) {
  if (product.price === null || !Number.isFinite(product.price)) return 'Price unavailable';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price); }
  catch { return `${product.price.toFixed(2)} ${product.currency || ''}`.trim(); }
}
