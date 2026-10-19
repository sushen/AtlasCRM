import test from 'node:test';
import assert from 'node:assert/strict';
import { TelegramSandbox } from '../server/telegram-sandbox.mjs';

const offer = { name: 'one day one USD', price: 1, currency: 'USD', durationDays: 1, active: true, credentials: 'never-send-this' };
const message = (id = 123) => ({ message: { chat: { id, type: 'private' }, from: { id }, text: '/start' } });
function setup(listProducts = async () => [offer]) {
  const calls = [];
  const bot = new TelegramSandbox({ api: { call: async (method, data) => calls.push({ method, data }) }, listProducts, operatorIds: ['123'] });
  return { bot, calls };
}
test('sandbox shows the current Firebase offer terms without sensitive fields or checkout', async () => {
  const { bot, calls } = setup();
  await bot.handle(message());
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'sendMessage');
  assert.match(calls[0].data.text, /one day one USD/);
  assert.match(calls[0].data.text, /USD 1.00 · 1 day/);
  assert.match(calls[0].data.text, /Ordering and payments disabled/);
  assert.ok(!JSON.stringify(calls).includes('never-send-this'));
  assert.equal(calls[0].data.protect_content, true);
});
test('unauthorized users, groups and mismatched callback actors cannot read products', async () => {
  let reads = 0;
  const { bot, calls } = setup(async () => { reads++; return [offer]; });
  await bot.handle(message(456));
  const group = message(); group.message.chat.type = 'group'; await bot.handle(group);
  await bot.handle({ callback_query: { id: 'callback', from: { id: 456 }, message: message().message, data: 'sandbox:page:0' } });
  assert.equal(reads, 0); assert.deepEqual(calls, []);
});
test('refresh rereads products, hides inactive offers and escapes names', async () => {
  let reads = 0;
  const { bot, calls } = setup(async () => { reads++; return [{ ...offer, name: '<b>Offer</b>', price: reads }, { ...offer, name: 'hidden', active: false }]; });
  await bot.handle(message()); await bot.handle(message());
  assert.match(calls[1].data.text, /USD 2.00/);
  assert.match(calls[1].data.text, /&lt;b&gt;Offer&lt;\/b&gt;/);
  assert.ok(!calls[1].data.text.includes('hidden'));
});
test('unavailable Firebase fails closed and sends no raw error', async () => {
  const { bot, calls } = setup(async () => { throw Error('private-token'); });
  await bot.handle(message());
  assert.match(calls[0].data.text, /unavailable/);
  assert.ok(!JSON.stringify(calls).includes('private-token'));
});
test('sandbox pages fresh data and clamps stale page requests', async () => {
  const { bot, calls } = setup(async () => Array.from({ length: 6 }, (_, i) => ({ ...offer, name: `Offer ${i}` })));
  await bot.handle({ callback_query: { id: 'cb', from: { id: 123 }, message: message().message, data: 'sandbox:page:999' } });
  assert.equal(calls[0].method, 'answerCallbackQuery');
  assert.match(calls[1].data.text, /Page 2 of 2/);
  assert.match(calls[1].data.text, /Offer 5/);
  assert.ok(!calls[1].data.text.includes('Offer 0'));
});
test('sandbox refuses empty or nonnumeric operator allowlists', () => {
  for (const operatorIds of [[], ['user']]) assert.throws(() => new TelegramSandbox({ operatorIds }));
});
