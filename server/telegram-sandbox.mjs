import { telegramEscape as esc } from './telegram-presentation.mjs';

// A read-only operator preview. Never reuse shop ordering or fulfillment handlers.
export class TelegramSandbox {
  constructor({ api, listProducts, operatorIds }) {
    this.api = api;
    this.listProducts = listProducts;
    this.operators = new Set(operatorIds.map(String));
    if (!this.operators.size || [...this.operators].some(id => !/^[1-9]\d*$/.test(id))) throw Error('Operator allowlist required');
  }

  async handle(update) {
    const callback = update.callback_query;
    const message = callback?.message || update.message;
    const actor = callback?.from || message?.from;
    if (!message || message.chat?.type !== 'private' ||
        String(message.chat.id) !== String(actor?.id) || !this.operators.has(String(actor?.id))) return;
    let page = 0;
    if (callback) {
      if (!/^sandbox:page:\d{1,6}$/.test(callback.data || '')) return;
      page = Number(callback.data.split(':')[2]);
      await this.api.call('answerCallbackQuery', { callback_query_id: callback.id });
    } else if (!/^(\/(?:start|menu|products)(?:@[a-zA-Z0-9_]+)?(?:\s.*)?|🛍 Products)$/i.test(message.text || '')) {
      await this.api.call('sendMessage', { chat_id: message.chat.id, text: 'Atlas Test is a private, read-only product preview. Send /products to refresh. Ordering and payments are disabled.' });
      return;
    }
    let products;
    try { products = (await this.listProducts()).filter(p => p.active === true && typeof p.name === 'string'); }
    catch {
      await this.api.call('sendMessage', { chat_id: message.chat.id, text: 'The Firebase product preview is unavailable. No order or data change was made. Try /products again later.' });
      return;
    }
    products.sort((a,b) => a.name.localeCompare(b.name));
    const count = Math.max(1, Math.ceil(products.length / 5));
    page = Math.min(page, count - 1);
    const lines = ['<b>Atlas Test · private product preview</b>', '', 'Current active Firebase products. Preview only; not published to the live shop.', ''];
    for (const product of products.slice(page * 5, page * 5 + 5)) {
      const amount = product.price;
      const currency = /^[A-Z]{3}$/.test(product.currency || '') ? product.currency : null;
      const price = typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 && currency ? `${currency} ${amount.toFixed(2)}` : 'Price or currency not configured';
      const days = Number.isSafeInteger(product.durationDays) && product.durationDays > 0 ? `${product.durationDays} day${product.durationDays === 1 ? '' : 's'}` : 'Term not configured';
      lines.push(`<b>${esc(product.name.slice(0, 150))}</b>`, `${esc(price)} · ${days}`, '');
    }
    if (!products.length) lines.push('No active products yet.', '');
    lines.push(`Page ${page + 1} of ${count}`, 'Ordering and payments disabled. No stock or delivery is implied.');
    const navigation = [];
    if (page > 0) navigation.push({ text: '‹ Previous', callback_data: `sandbox:page:${page - 1}` });
    if (page + 1 < count) navigation.push({ text: 'Next ›', callback_data: `sandbox:page:${page + 1}` });
    const keyboard = navigation.length ? [navigation] : [];
    keyboard.push([{ text: 'Refresh products', callback_data: `sandbox:page:${page}` }]);
    await this.api.call('sendMessage', { chat_id: message.chat.id, text: lines.join('\n'), parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard }, protect_content: true });
  }
}
