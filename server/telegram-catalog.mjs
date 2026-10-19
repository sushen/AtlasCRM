import { catalogGroups, productFamily } from '../js/utils/catalog-groups.js';
import { FEATURED_FAMILIES } from '../js/utils/catalog-featured.js';
import { formatCatalogPrice } from '../js/utils/catalog-pricing.js';
import { telegramGroupUrl } from './catalog-settings.mjs';
import { telegramEscape as esc, readableDescription, catalogFreshness } from './telegram-presentation.mjs';
import { telegramBrandImage } from '../js/utils/shop-images.js';

export const SHOP_MENU = { keyboard: [[{ text: '🛍 Products' }, { text: '💬 Support' }],
  [{ text: '👛 Wallet' }, { text: '🔌 API' }], [{ text: '🛡 Warranty' }]],
  resize_keyboard: true, is_persistent: true, input_field_placeholder: 'Choose a quick menu below' };
const icons = {
  'ChatGPT & Codex': '🤖', Claude: '🧠', 'Google AI & Veo': '✨', Canva: '🎨', Notion: '📝',
  ElevenLabs: '🎙️', CapCut: '✂️', 'Microsoft & Windows': '🪟', YouTube: '▶️', Adobe: '🖌️',
  Figma: '🖍️', 'Kling AI': '🎬', Midjourney: '🖼️', Perplexity: '🔎', Cursor: '⌨️',
  GitHub: '💻', Spotify: '🎧', Netflix: '🍿', 'Disney+': '🏰', Amazon: '📦',
  Grammarly: '✍️', Duolingo: '🦉', LinkedIn: '💼', Zoom: '📹', Runway: '🎞️',
  Freepik: '🎨', Envato: '🧩', Suno: '🎵', Sora: '🎥', HeyGen: '🗣️',
  'Leonardo AI': '🖌️', Manus: '🤖', Lovable: '💗', Replit: '🧑‍💻', Windsurf: '🏄',
  DeepSeek: '🐋', Grok: '💡', Qwen: '💬', Meitu: '🌸', Wink: '😉', Xingtu: '📸',
  Gamma: '📊', 'Beautiful.ai': '📽️', Locket: '💛', Autodesk: '📐', Proton: '🔐',
  Higgsfield: '🎬', 'Email services': '📧', Apple: '🍎', Seedance: '💃', 'Domo AI': '🎭',
  MiniMax: '⚡', 'GPM Login': '🌐', Roblox: '🎮', Discord: '💬', Reddit: '🗨️',
  Scribd: '📚', Akool: '🪄', Kahoot: '🎯', 'Wispr Flow': '🎙️', n8n: '🔗',
  Railway: '🚆', 'Cuty AI': '🎬', Quizlet: '🗂️', Xbox: '🎮', iQIYI: '📺',
  BeautyCam: '🤳', Coursera: '🎓', Krea: '🖼️', 'Lart AI': '🎨', OpenArt: '🖌️',
  Dreamina: '💭', Tryclico: '🪄', iLovePDF: '📄', 'Muse AI': '🎥', Telegram: '✈️',
  'X / Twitter': '🗞️', TikTok: '🎵', 'Facebook & Instagram': '📱',
  'VPN services': '🛡️', 'Cloud storage': '☁️', 'Other products': '🛍️'
};
const callbackButton = (text, data) => new TextEncoder().encode(data).length <= 64 ? { text, callback_data: data } : null;
const pages = (items, page, size) => {
  const count = Math.max(1, Math.ceil(items.length / size));
  const current = Math.max(0, Math.min(count - 1, Number.isInteger(page) ? page : 0));
  return { count, current, visible: items.slice(current * size, (current + 1) * size) };
};

export function groupMenu(products, page = 0) {
  const featured = FEATURED_FAMILIES.map(feature => feature.family);
  const groups = catalogGroups(products).sort((a, b) => {
    const ai = featured.indexOf(a.name); const bi = featured.indexOf(b.name);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.name.localeCompare(b.name);
  });
  const chunk = pages(groups, page, 24);
  const buttons = chunk.visible.map(group => callbackButton(`${icons[group.name] || '📦'} ${group.name}`, `family:${group.name}:0`)).filter(Boolean);
  const rows = [];
  for (let i = 0; i < buttons.length; i += 3) rows.push(buttons.slice(i, i + 3));
  const navigation = [];
  if (chunk.current > 0) navigation.push(callbackButton('‹ Previous', `groups:${chunk.current - 1}`));
  if (chunk.current + 1 < chunk.count) navigation.push(callbackButton('Next ›', `groups:${chunk.current + 1}`));
  if (navigation.length) rows.push(navigation);
  return { parse_mode: 'HTML', text: `<b>🛍️ ATLAS MARKET</b>\n\nFind your next digital tool.\n\n🏷️ ${groups.length} brands & categories\n📦 ${products.length} product listings\n\nChoose a category to compare plans, prices and stock.\n\nPage ${chunk.current + 1} of ${chunk.count}`,
    reply_markup: { inline_keyboard: rows } };
}

export function familyMenu(products, family, page = 0) {
  const variants = products.filter(product => productFamily(product) === family);
  const chunk = pages(variants, page, 5);
  const lines = [`<b>${icons[family] || '🛍️'} ${esc(family)}</b>`, '', `${variants.length} plans & options`, ''];
  const keyboard = [];
  for (const product of chunk.visible) {
    const stock = product.stock === 'available' ? `${product.available} available` : product.stock === 'out' ? 'Out of stock' : 'Availability unknown';
    lines.push('<b>' + esc(product.name.slice(0, 150)) + '</b>', `💰 ${esc(formatCatalogPrice(product))}\n📦 ${esc(stock)}`, '');
    if (/^[a-zA-Z0-9_-]{1,48}$/.test(product.id)) keyboard.push([callbackButton(formatCatalogPrice(product) + ' · ' + product.name.slice(0, 45), 'product:' + product.id)]);
  }
  const navigation = [];
  if (chunk.current > 0) navigation.push(callbackButton('‹ Previous', `family:${family}:${chunk.current - 1}`));
  if (chunk.current + 1 < chunk.count) navigation.push(callbackButton('Next ›', `family:${family}:${chunk.current + 1}`));
  if (navigation.length) keyboard.push(navigation.filter(Boolean));
  keyboard.push([callbackButton('⬅️ All categories', 'groups:0')]);
  lines.push(`Page ${chunk.current + 1} of ${chunk.count}`, 'Tap a plan for its full details and current price.');
  return { parse_mode: 'HTML', text: lines.join('\n'), reply_markup: { inline_keyboard: keyboard } };
}

export function productMessage(product, groupUrl, freshness = {}) {
  const stock = product.stock === 'available' ? `${product.available} available` : product.stock === 'out' ? 'Out of stock — ask about restocking' : 'Confirm availability with support';
  const requirements = [product.requirements.email ? 'Customer email' : '', product.requirements.accounts ? 'Customer account identifiers' : '', product.requirements.months ? 'Selected duration' : ''].filter(Boolean);
  const rows = [];
  if (groupUrl) rows.push([{ text: '💬 Visit our Telegram channel', url: telegramGroupUrl(groupUrl) }]);
  if (/^[a-zA-Z0-9_-]{1,48}$/.test(product.id)) rows.push([callbackButton('🔄 Refresh price & stock', 'refresh:' + product.id)]);
  rows.push([callbackButton('⬅️ Compare other plans', 'family:' + productFamily(product) + ':0')]);
  return { parse_mode: 'HTML', text: ['<b>' + esc(product.name.slice(0, 180)) + '</b>',
    '💰 <b>Price</b>  ' + esc(formatCatalogPrice(product)) + '\n📦 <b>Stock</b>  ' + esc(stock),
    '📝 <b>Product details</b>\n' + esc(readableDescription(product.description)),
    requirements.length ? '📋 <b>Required to order</b>\n' + requirements.map(item => '• ' + esc(item)).join('\n') : '',
    '🔖 <b>Product reference</b>\n<code>' + esc(product.id.slice(0, 80)) + '</code>',
    esc(catalogFreshness(freshness)), 'Contact admin to confirm the terms before paying.'].filter(Boolean).join('\n\n'),
    reply_markup: { inline_keyboard: rows } };
}

export class TelegramApiError extends Error {
  constructor(code, retryAfter = 0) { super(code); this.retryAfter = retryAfter; }
}

export class TelegramApi {
  constructor(token, { fetchImpl = fetch } = {}) {
    if (!/^\d+:[a-zA-Z0-9_-]+$/.test(token || '')) throw new TelegramApiError('telegram_token_not_configured');
    this.token = token; this.fetch = (...args) => fetchImpl.call(globalThis, ...args);
    this.blockedUntil = 0;
  }
  async call(method, data = {}, signal) {
    if (!['getMe', 'getWebhookInfo', 'getUpdates', 'sendMessage', 'sendPhoto', 'editMessageText', 'answerCallbackQuery', 'setMyCommands', 'getMyCommands', 'setChatMenuButton', 'getChatMenuButton'].includes(method)) throw new TelegramApiError('telegram_method_not_allowed');
    if (Date.now() < this.blockedUntil) throw new TelegramApiError('telegram_rate_limited', Math.ceil((this.blockedUntil - Date.now()) / 1000));
    try {
      const upload=data.photo instanceof Blob;
      let payload;
      if(upload) {
        payload=new FormData();
        for(const[key,value]of Object.entries(data))payload.set(key,key==='photo'?value:typeof value==='object'?JSON.stringify(value):String(value));
      }
      const response = await this.fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
        method: 'POST', ...(upload?{}:{headers:{'Content-Type':'application/json'}}), body: upload?payload:JSON.stringify(data),
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(40000)]) : AbortSignal.timeout(method === 'getUpdates' ? 40000 : 15000), redirect: 'manual'
      });
      const body = await response.json();
      if (method === 'editMessageText' && body.error_code === 400 && String(body.description).includes('message is not modified')) return { unchanged: true };
      if (!response.ok || body.ok !== true) {
        const retryAfter = Number(body.parameters?.retry_after) || 0;
        if (retryAfter) this.blockedUntil = Date.now() + retryAfter * 1000;
        const error=new TelegramApiError('telegram_request_failed', retryAfter);error.confirmedFailure=true;throw error;
      }
      return body.result;
    } catch (error) { throw error instanceof TelegramApiError ? error : new TelegramApiError('telegram_connection_failed'); }
  }
}

export class TelegramCatalogBot {
  constructor({ api, catalog, allowedChatIds, groupUrl = '', username = '', publicPrivateChats = false, now = Date.now }) {
    if (!allowedChatIds?.length && !publicPrivateChats) throw Error('Configure the allowed Telegram chat IDs');
    this.api = api; this.catalog = catalog; this.allowedChats = new Set(allowedChatIds.map(String));
    this.groupUrl = telegramGroupUrl(groupUrl); this.username = username.toLowerCase();
    this.publicPrivateChats = publicPrivateChats; this.now = now; this.lastRequest = new Map();
  }
  async handleUpdate(update) {
    const callback = update.callback_query;
    const message = callback?.message || update.message;
    if (!message?.chat || message.from?.is_bot && !callback) return false;
    if (!this.allowedChats.has(String(message.chat.id)) && !(this.publicPrivateChats && message.chat.type === 'private')) return false;
    const requestKey = `${message.chat.id}:${callback?.from?.id || message.from?.id || ''}`;
    if (this.now() - (this.lastRequest.get(requestKey) || -Infinity) < 1500) {
      if (callback) await this.api.call('answerCallbackQuery', { callback_query_id: callback.id, text: 'Please wait a moment.' });
      return false;
    }
    const text = String(message.text || '').trim();
    const command = /^\/(start|catalog|products|help)(?:@([a-zA-Z0-9_]+))?(?:\s+(.*))?$/i.exec(text);
    if (command?.[2] && command[2].toLowerCase() !== this.username) return false;
    const menuAction = { '🛍 Products': 'products', '💬 Support': 'support', '👛 Wallet': 'wallet', '🔌 API': 'api', '🛡 Warranty': 'warranty' }[text];
    if (!callback && !command && !menuAction) return false;
    this.lastRequest.set(requestKey, this.now());
    if (this.lastRequest.size > 10000) this.lastRequest.clear();
    if (callback) await this.api.call('answerCallbackQuery', { callback_query_id: callback.id });
    const chatId = message.chat.id;
    const respond = body => this.api.call(callback ? 'editMessageText' : 'sendMessage', {
      chat_id: chatId, ...(callback ? { message_id: message.message_id } : {}),
      ...body, link_preview_options: { is_disabled: true }
    });
    const showBrand = async family => {
      const image = telegramBrandImage(family);
      if (!image) return;
      try { await this.api.call('sendPhoto', { chat_id: chatId, photo: image, caption: family + ' · Atlas Market' }); }
      catch (error) { if (!error.confirmedFailure || error.retryAfter) throw error; }
    };
    if (menuAction && menuAction !== 'products' || command?.[1].toLowerCase() === 'help') {
      const messages = {
        support: 'Questions about a product? Visit our Telegram channel for contact instructions. Include the product name and reference when enquiring.',
        wallet: 'Use the contact instructions in our Telegram channel to enquire about orders and payment arrangements. This bot does not collect payments or display a shared supplier wallet.',
        api: 'This bot and our website share the same product catalog and retail pricing. Private supplier credentials are never provided here.',
        warranty: 'Warranty terms vary by listing. Open Product details and confirm the exact terms with support before ordering.'
      };
      return respond({ text: 'ATLAS MARKET\n\n' + (messages[menuAction] || 'Use /catalog to browse products.') + (this.groupUrl ? '\n\nTelegram channel: ' + this.groupUrl : ''), reply_markup: SHOP_MENU });
    }
    if (!callback && command?.[1].toLowerCase() === 'start') {
      await respond({ text: 'Welcome to Atlas Market.\n\nExplore our product collection, compare prices, then continue your enquiry in our Telegram group. Choose a quick menu below.', reply_markup: SHOP_MENU });
    }
    try {
      const { products, stale, fetchedAt } = await this.catalog.list();
      const data = String(callback?.data || 'groups:0');
      if (data.startsWith('product:') || data.startsWith('refresh:')) {
        const product = products.find(p => p.id === data.slice(8));
        if (product && !data.startsWith('refresh:')) await showBrand(productFamily(product));
        return respond(product ? productMessage(product, this.groupUrl, {stale,fetchedAt}) : { text: 'This listing is no longer available. Use /catalog to refresh.' });
      }
      const familyCallback = /^family:([^:]+):(\d+)$/.exec(data);
      const query = command?.[3]?.trim().toLowerCase();
      const family = familyCallback?.[1] || (query ? catalogGroups(products).find(g => g.name.toLowerCase().includes(query === 'gemini' ? 'google ai' : query))?.name : null);
      if (family) { await showBrand(family); return respond(familyMenu(products, family, Number(familyCallback?.[2] || 0))); }
      return respond(groupMenu(products, Number(/^groups:(\d+)$/.exec(data)?.[1] || 0)));
    } catch {
      return respond({ text: 'Catalog temporarily unavailable. Please try again later or contact support.', reply_markup: callback ? { inline_keyboard: [[callbackButton('Refresh catalog', 'groups:0')]] } : SHOP_MENU });
    }
  }
}
