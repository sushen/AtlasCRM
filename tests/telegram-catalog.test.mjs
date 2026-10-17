import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { normalizeProduct } from '../server/catalog.mjs';
import { groupMenu, familyMenu, productMessage, SHOP_MENU, TelegramApi, TelegramCatalogBot } from '../server/telegram-catalog.mjs';

const product = normalizeProduct({ productId: 'canva_1', name: 'Canva Pro', productType: 'slot',
  price: { amount: 10, currency: 'USD' }, availability: { available: 5 }, description: 'A sample listing' });
const groupUrl = 'https://t.me/+test_invite';
const chat = { id: -100123, type: 'supergroup' };

test('bot menu has three-column product buttons and reference-style persistent navigation', () => {
  const products = ['ChatGPT Plus', 'Claude Pro', 'Gemini Advanced', 'Canva Pro', 'Notion Plus'].map(name => ({ ...product, name }));
  const menu = groupMenu(products);
  assert.equal(menu.reply_markup.inline_keyboard[0].length, 3);
  assert.match(menu.reply_markup.inline_keyboard[0][0].text, /ChatGPT/);
  assert.match(menu.reply_markup.inline_keyboard[0][1].text, /Claude/);
  assert.match(menu.reply_markup.inline_keyboard[0][2].text, /Google/);
  assert.deepEqual(SHOP_MENU.keyboard.map(row => row.length), [2, 2, 1]);
  for (const row of menu.reply_markup.inline_keyboard) for (const button of row) assert.ok(Buffer.byteLength(button.callback_data) <= 64);
});
test('bot and website use the same marked-up price and group destination', () => {
  assert.equal(product.price, 11);
  assert.match(familyMenu([product], 'Canva').text, /\$11.00/);
  assert.equal(familyMenu([product], 'Canva').reply_markup.inline_keyboard[0][0].text,'$11.00 · Canva Pro');
  const detail = productMessage(product, groupUrl);
  assert.match(detail.text, /\$11.00/);
  assert.equal(detail.reply_markup.inline_keyboard[0][0].url, groupUrl);
});
test('group variants paginate without losing listings', () => {
  const variants = Array.from({ length: 12 }, (_, index) => ({ ...product, id: 'p' + index, name: 'Canva ' + index }));
  assert.match(familyMenu(variants, 'Canva', 1).text, /Page 2 of 3/);
  assert.equal(familyMenu(variants, 'Canva', 1).reply_markup.inline_keyboard.filter(row => row[0]?.callback_data?.startsWith('product:')).length, 5);
});
test('bot ignores unapproved chats and text addressed to another bot', async () => {
  let calls = 0;
  const bot = new TelegramCatalogBot({ api: { call: async () => { calls++; } }, catalog: { list: async () => ({ products: [product] }) },
    allowedChatIds: [chat.id], username: 'atlasbot', groupUrl });
  assert.equal(await bot.handleUpdate({ message: { chat: { id: 42, type: 'private' }, text: '/catalog' } }), false);
  assert.equal(await bot.handleUpdate({ message: { chat, text: '/catalog@otherbot' } }), false);
  assert.equal(calls, 0);
});
test('start sends the welcome keyboard and product menu only after an incoming command', async () => {
  const calls = [];
  const bot = new TelegramCatalogBot({ api: { call: async (method, payload) => calls.push({ method, payload }) },
    catalog: { list: async () => ({ products: [product] }) }, allowedChatIds: [chat.id], groupUrl });
  await bot.handleUpdate({ message: { chat, text: '/start', from: { id: 1 } } });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, 'sendMessage');
  assert.equal(calls[0].payload.reply_markup.is_persistent, true);
  assert.ok(calls[1].payload.reply_markup.inline_keyboard);
});
test('callback edits menu and shows a Telegram enquiry link without purchasing', async () => {
  const calls = [];
  const bot = new TelegramCatalogBot({ api: { call: async (method, payload) => calls.push({ method, payload }) },
    catalog: { list: async () => ({ products: [product] }) }, allowedChatIds: [chat.id], groupUrl });
  await bot.handleUpdate({ callback_query: { id: 'demo', from: { id: 1 }, data: 'product:canva_1', message: { chat, message_id: 10 } } });
  assert.deepEqual(calls.map(call => call.method), ['answerCallbackQuery', 'editMessageText']);
  assert.match(calls[1].payload.text, /\$11.00/);
  assert.equal(calls[1].payload.reply_markup.inline_keyboard[0][0].url, groupUrl);
});
test('wallet menu explains manual ordering without reading the supplier wallet', async () => {
  let fetched = false; const calls = [];
  const bot = new TelegramCatalogBot({ api: { call: async (_, payload) => calls.push(payload) },
    catalog: { list: async () => { fetched = true; } }, allowedChatIds: [chat.id], groupUrl });
  await bot.handleUpdate({ message: { chat, text: '👛 Wallet' } });
  assert.equal(fetched, false);
  assert.match(calls[0].text, /does not collect payments/);
});
test('Telegram API sanitizes failures and never exposes token through the error', async () => {
  const api = new TelegramApi('12345:fictional_private_token', { fetchImpl: async () => { throw Error('URL contains fictional_private_token'); } });
  await assert.rejects(api.call('getMe'), error => error.message === 'telegram_connection_failed');
  await assert.rejects(api.call('deleteWebhook'), /telegram_method_not_allowed/);
});
test('Telegram API applies the reported cooldown before another request', async () => {
  let calls = 0;
  const api = new TelegramApi('12345:fictional_private_token', { fetchImpl: async () => {
    calls++; return { ok: false, json: async () => ({ ok: false, parameters: { retry_after: 30 } }) };
  }});
  await assert.rejects(api.call('getMe'), error => error.retryAfter === 30);
  await assert.rejects(api.call('getMe'), /telegram_rate_limited/);
  assert.equal(calls, 1);
});

test('local shop preview preserves a newer menu choice when an older catalog request finishes', async () => {
  const source = await readFile(new URL('../js/telegram-preview.js', import.meta.url), 'utf8');
  const { document } = parseHTML('<html><body><div id="app"></div></body></html>');
  const menu = { ...groupMenu([product]), menu: SHOP_MENU, telegramUrl: groupUrl };
  let count = 0; let complete;
  const fetchImpl = async () => {
    count++;
    if (count === 1) return { ok: true, json: async () => menu };
    return new Promise(resolve => { complete = () => resolve({ ok: true, json: async () => menu }); });
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await new AsyncFunction('document', 'fetch', source)(document, fetchImpl);
  const pending = document.querySelector('[data-shop-inline] button').onclick();
  const wallet = [...document.querySelectorAll('[data-shop-menu] button')].find(button => button.textContent === '👛 Wallet');
  wallet.click();
  assert.match(document.querySelector('[data-shop-message]').textContent, /does not collect payment/);
  complete(); await pending;
  assert.match(document.querySelector('[data-shop-message]').textContent, /does not collect payment/);
  assert.equal(document.querySelector('[data-shop-inline] a').getAttribute('href'), groupUrl);
});
