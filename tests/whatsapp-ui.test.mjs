import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { whatsappUrl, whatsappDesktopUrl, interpolate } from '../js/utils/whatsapp.js';

const source = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const modalSource = source.slice(source.indexOf('function waModal(id)'), source.indexOf('function followModal(id)'));
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function dialog({ demo = false, send = async () => ({ status: 'accepted' }), check = async () => ({ enabled: true }) } = {}) {
  const { document } = parseHTML('<html><body></body></html>');
  const customer = { id: 'demo-contact', name: 'Demo', normalizedPhone: '+8801712345678', status: 'new' };
  const records = [];
  const waModal = new Function('customers', 'document', 'esc', 'outreachSnippets', 'isDemo', 'auth',
    'checkWhatsAppSending', 'sendWhatsAppMessage', 'interpolate', 'whatsappUrl', 'whatsappDesktopUrl',
    'transition', 'render', 'addActivity', 'crypto', `${modalSource}; return waModal;`)(
    [customer], document, value => String(value), [{ body: 'Hello {{name}}' }], () => demo,
    { currentUser: { uid: 'fictional-user' } }, check, send, interpolate, whatsappUrl, whatsappDesktopUrl,
    async () => records.push('manual_sent'), async () => {}, async () => records.push('opened'),
    { randomUUID: () => '12345678-1234-4123-8123-123456789012' });
  waModal(customer.id);
  return { document, records, button: document.querySelector('[data-api-send]'), textarea: document.querySelector('[data-message]'),
    status: document.querySelector('[data-api-status]'), link: document.querySelector('[data-open]') };
}

test('web dialog sends the prepared message once and displays acceptance without recording manual sending', async () => {
  let calls = 0, release;
  const d = dialog({ send: async (user, customerId, body, requestId) => {
    calls++; assert.equal(customerId, 'demo-contact'); assert.equal(body, 'Hello Demo'); assert.ok(requestId);
    await new Promise(resolve => { release = resolve; }); return { status: 'accepted' };
  } });
  await tick();
  assert.equal(d.button.disabled, true); // Blank messages cannot be sent.
  d.document.querySelector('[data-snippet]').click();
  assert.equal(d.button.disabled, false);
  const pending = d.button.onclick();
  assert.equal(d.button.disabled, true);
  assert.equal(d.document.querySelector('[data-sent]').disabled, true);
  assert.equal(d.link.hasAttribute('href'), false);
  await d.button.onclick();
  assert.equal(calls, 1);
  release(); await pending;
  assert.match(d.status.textContent, /accepted/);
  assert.equal(d.button.disabled, true);
  assert.deepEqual(d.records, []);
});

test('demo and unavailable backend retain manual links and disable API sending', async () => {
  let checks = 0;
  const demo = dialog({ demo: true, check: async () => { checks++; } });
  await tick();
  assert.equal(checks, 0);
  assert.equal(demo.button.disabled, true);
  assert.match(demo.status.textContent, /signed-in Firebase/);
  assert.ok(demo.link.hasAttribute('href'));
  const unavailable = dialog({ check: async () => { throw Error('Direct sending is not available yet.'); } });
  await tick();
  assert.equal(unavailable.button.disabled, true);
  assert.match(unavailable.status.textContent, /not available/);
  assert.ok(unavailable.link.hasAttribute('href'));
});

test('uncertain sends block repeat and manual duplicate sending; safe rejection allows correction', async () => {
  const uncertain = dialog({ send: async () => { throw Object.assign(Error('Check message history'), { retrySafe: false }); } });
  await tick(); uncertain.textarea.value = 'Hi'; uncertain.textarea.dispatchEvent(new uncertain.document.defaultView.Event('input'));
  await uncertain.button.onclick();
  assert.equal(uncertain.button.disabled, true);
  assert.equal(uncertain.link.hasAttribute('href'), false);
  assert.equal(uncertain.document.querySelector('[data-close]').disabled, false);
  const rejected = dialog({ send: async () => { throw Object.assign(Error('WhatsApp rejected the message'), { retrySafe: true }); } });
  await tick(); rejected.document.querySelector('[data-snippet]').click();
  await rejected.button.onclick();
  assert.equal(rejected.button.disabled, false);
  assert.ok(rejected.link.hasAttribute('href'));
  assert.equal(rejected.document.querySelector('[data-sent]').disabled, false);
});
