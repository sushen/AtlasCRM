// Supplier text stays untrusted. Only our own headings become Telegram HTML.
export const telegramEscape = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function readableDescription(value, limit = 2300) {
  const text = String(value || '')
    .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?\s*>|<\s*\/\s*(?:p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ')
    .replace(/\s*((?:👉|✅|⚠️?))\s*/gu, '\n\n$1 ')
    .replace(/([^\n])\s*([•●▪])\s*/g, '$1\n$2 ')
    .split('\n').map(line => line.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) return 'No additional description supplied. Ask support for product details.';
  // Keep payloads comfortably below Telegram's text limit after HTML escaping.
  return text.length > limit ? text.slice(0, limit).trimEnd() + '\n… Ask support for the full description.' : text;
}

export function catalogFreshness({ stale = false, fetchedAt } = {}) {
  if (stale) return 'Saved catalog — live refresh unavailable. Confirm price and stock with admin before ordering.';
  const date = new Date(fetchedAt);
  return Number.isFinite(date.getTime())
    ? 'Catalog updated: ' + new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date) + ' (Bangladesh time)'
    : 'Price and stock can change. Refresh before ordering.';
}
