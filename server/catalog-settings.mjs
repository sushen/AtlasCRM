export function telegramGroupUrl(value = '') {
  if (!value.trim()) return '';
  let url;
  try { url = new URL(value); } catch { throw Error('Invalid Telegram destination URL'); }
  if (url.protocol !== 'https:' || !['t.me', 'telegram.me'].includes(url.hostname)
      || url.username || url.password || url.port || url.search || url.hash
      || !/^\/(?:[a-zA-Z][a-zA-Z0-9_]{4,31}|\+[a-zA-Z0-9_-]+|joinchat\/[a-zA-Z0-9_-]+)\/?$/.test(url.pathname)) {
    throw Error('Use a Telegram channel/group URL or invite link');
  }
  return url.href;
}

export function storefrontSettings(environment = globalThis.process?.env || {}) {
  return { brand: 'Atlas Market', telegramUrl: telegramGroupUrl(environment.TELEGRAM_GROUP_URL || '') };
}

export function supplierConfiguration(environment = globalThis.process?.env || {}) {
  const key = environment.CANBOSS_BUYER_API_KEY || environment.CANBOSO_BUYER_API_KEY || '';
  if (environment.CANBOSS_BUYER_API_KEY && environment.CANBOSO_BUYER_API_KEY && environment.CANBOSS_BUYER_API_KEY !== environment.CANBOSO_BUYER_API_KEY) throw Error('Conflicting supplier key aliases');
  const baseUrl = environment.CANBOSS_API_BASE_URL || environment.CANBOSO_API_BASE_URL || 'https://canboso.com';
  if (new URL(baseUrl).origin !== 'https://canboso.com' || !/^https:\/\/canboso\.com\/?$/.test(baseUrl)) throw Error('Unsupported supplier API origin');
  return { key, baseUrl: 'https://canboso.com' };
}
