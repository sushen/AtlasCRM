import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readConfig, safeFailure, IntegrationError } from '../server/config.mjs';
import { request as httpRequest } from 'node:http';
import { WhatsAppService, textPayload } from '../server/whatsapp.mjs';
import { parseWebhook, verifyChallenge, verifySignature } from '../server/webhook.mjs';
import { MessageRepository, messageKey } from '../server/repository.mjs';
import { createAtlasServer } from '../server/http.mjs';
import { sendTracked } from '../server/send.mjs';
import { firebaseAuthenticator } from '../server/auth.mjs';
import { whatsappApiRequest } from '../js/services/whatsapp-api.js';
import { messagingBackendUrl, messagingBackendKey, defaultMessagingBackend } from '../js/utils/messaging-backend.js';
import { summarizeAttempt, classifyDiagnosticFailure, latestFailedAttempt, runDiagnostic } from '../scripts/whatsapp-diagnose.mjs';
import { prepareLocalFirebase } from '../server/local-firebase.mjs';

const config = { accessToken: 'fake-private-token', phoneNumberId: '123', businessAccountId: '456',
  appSecret: 'fake-app-secret', verifyToken: 'fake-verify-token', graphVersion: 'v25.0' };
const message = { id: 'wamid.fictional', from: '8801712345678', timestamp: '1791190000', type: 'text', text: { body: 'Hello CRM' } };
const payload = (messages = [message], statuses = []) => ({ object: 'whatsapp_business_account', entry: [{ id: '456', changes: [{ field: 'messages', value: {
  metadata: { phone_number_id: '123', display_phone_number: '15550001111' }, contacts: [{ wa_id: message.from, profile: { name: 'Demo Lead' } }], messages, statuses,
} }] }] });
const sign = raw => `sha256=${createHmac('sha256', config.appSecret).update(raw).digest('hex')}`;

test('send diagnostic reveals only numeric rejection and normalized recipient match', () => {
  const attempt = { state: 'failed_or_unknown', recipient: '+8801712345678', body: 'private body',
    failure: { code: 'meta_api_error', metaCode: 131030, httpStatus: 400, message: 'private Meta text' } };
  const result = summarizeAttempt(attempt, '01712345678');
  assert.deepEqual(result, { found: true, state: 'failed_or_unknown', failureCode: 'meta_api_error',
    metaCode: 131030, metaSubcode: null, httpStatus: 400, outcome: 'definite_meta_rejection',
    verifiedRecipientMatches: true });
  assert.equal(JSON.stringify(result).includes(attempt.recipient), false);
  assert.equal(JSON.stringify(result).includes(attempt.body), false);
  assert.equal(JSON.stringify(result).includes(attempt.failure.message), false);
  assert.equal(summarizeAttempt(attempt, '+15550001111').verifiedRecipientMatches, false);
  assert.equal(summarizeAttempt({ ...attempt, failure: { code: 'meta_network_error' } }, undefined).outcome, 'uncertain_or_not_sent');
});

test('diagnostic uses local Firebase bootstrap and reads paged attempts without writes', async () => {
  const privateAttempt = { state: 'failed_or_unknown', recipient: '+8801712345678', body: 'private body',
    failure: { code: 'meta_api_error', metaCode: 131030, message: 'private Meta text' } };
  const firstPage = Array.from({ length: 10 }, () => ({ get: () => 'accepted' }));
  const calls = [];
  const query = { orderBy: (...args) => { calls.push(['orderBy', ...args]); return query; },
    select: (...args) => { calls.push(['select', ...args]); return query; },
    limit: value => { calls.push(['limit', value]); return query; },
    startAfter: () => { calls.push(['startAfter']); return query; },
    get: async () => ({ docs: calls.some(call => call[0] === 'startAfter')
      ? [{ get: () => 'failed_or_unknown', data: () => privateAttempt }] : firstPage,
      size: calls.some(call => call[0] === 'startAfter') ? 1 : 10 }) };
  const db = { collection: name => { assert.equal(name, 'whatsappSendAttempts'); return query; } };
  let cleaned = false;
  const result = await runDiagnostic({ bootstrap: async project => {
    assert.equal(project, process.env.ATLAS_FIREBASE_PROJECT_ID || 'atlascrm-c5722');
    return () => { cleaned = true; };
  }, openFirestore: () => db, verifiedRecipient: '01712345678' });
  assert.equal(cleaned, true);
  assert.equal(result.found, true);
  assert.equal(result.metaCode, 131030);
  assert.equal(result.verifiedRecipientMatches, true);
  assert.equal(JSON.stringify(result).includes(privateAttempt.body), false);
  assert.equal(JSON.stringify(result).includes(privateAttempt.failure.message), false);
  assert.deepEqual(calls.filter(call => call[0] === 'startAfter').length, 1);
  assert.equal(typeof prepareLocalFirebase, 'function');
  assert.equal(await latestFailedAttempt({ collection: () => ({ orderBy: () => ({ select: () => ({ limit: () => ({ get: async () => ({ docs: [], size: 0 }) }) }) }) }) }), null);
});

test('diagnostic failures expose only fixed reason and safe status', async () => {
  const secret = 'private-token-body-phone';
  assert.deepEqual(classifyDiagnosticFailure({ code: 7, message: secret }, 'firestore_query'),
    { reason: 'firestore_permission_denied', status: 7 });
  assert.deepEqual(classifyDiagnosticFailure({ code: 9, message: secret }, 'firestore_query'),
    { reason: 'firestore_failed_precondition', status: 9 });
  assert.deepEqual(classifyDiagnosticFailure({ code: 'unexpected', message: secret }, 'firestore_query'),
    { reason: 'firestore_query_failed' });
  await assert.rejects(runDiagnostic({ bootstrap: async () => { throw Error(secret); } }), error => {
    assert.equal(JSON.stringify(error.details).includes(secret), false);
    assert.deepEqual(error.details, { reason: 'firebase_credential_initialization_failed' });
    return true;
  });
});

test('shared local Firebase bootstrap preserves explicit ADC and sets project defaults', async () => {
  const env = { GOOGLE_APPLICATION_CREDENTIALS: 'existing-adc.json' };
  const cleanup = await prepareLocalFirebase('fictional-project', env);
  assert.equal(env.GOOGLE_APPLICATION_CREDENTIALS, 'existing-adc.json');
  assert.equal(env.GOOGLE_CLOUD_PROJECT, 'fictional-project');
  assert.equal(env.GOOGLE_CLOUD_QUOTA_PROJECT, 'fictional-project');
  cleanup();
});

function memoryRepository() {
  const data = new Map();
  const key = (name, id) => `${name}/${id}`;
  let queue = Promise.resolve();
  const repository = new MessageRepository({
    now: () => '2026-10-05T00:00:00.000Z',
    transaction: callback => {
      const work = queue.then(async () => {
      const writes = [];
      const result = await callback({
        get: async (name, id) => structuredClone(data.get(key(name, id)) || null),
        findCustomer: async phone => {
          const entry = [...data.entries()].find(([k, v]) => k.startsWith('customers/') && v.normalizedPhone === phone);
          return entry ? { ...structuredClone(entry[1]), id: entry[0].slice(10) } : null;
        },
        set: (name, id, value) => writes.push([key(name, id), structuredClone(value)]),
      });
      for (const [k, v] of writes) data.set(k, v);
      return result;
      });
      queue = work.catch(() => {});
      return work;
    },
  });
  return { repository, data };
}

test('verification accepts the existing token and rejects missing, wrong, and non-subscribe inputs', () => {
  const params = new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': config.verifyToken, 'hub.challenge': '00123' });
  assert.equal(verifyChallenge(params, config.verifyToken), '00123');
  assert.equal(verifyChallenge(params, 'wrong'), null);
  assert.equal(verifyChallenge(params, undefined), null);
  params.set('hub.mode', 'other');
  assert.equal(verifyChallenge(params, config.verifyToken), null);
});

test('signed raw bodies are required and tampering is rejected', () => {
  const raw = Buffer.from(JSON.stringify(payload()));
  assert.equal(verifySignature(raw, sign(raw), config.appSecret), true);
  assert.equal(verifySignature(Buffer.from('{}'), sign(raw), config.appSecret), false);
  assert.equal(verifySignature(raw, undefined, config.appSecret), false);
  assert.equal(verifySignature(raw, sign(raw), undefined), false);
});

test('parses inbound text and profile metadata while filtering foreign accounts and malformed messages', () => {
  const [event] = parseWebhook(payload(), config);
  assert.equal(event.sender, '+8801712345678');
  assert.equal(event.body, 'Hello CRM');
  assert.equal(event.profileName, 'Demo Lead');
  assert.equal(event.metadata.phoneNumberId, '123');
  assert.equal(event.timestamp, new Date(Number(message.timestamp) * 1000).toISOString());
  assert.deepEqual(parseWebhook(payload(), { ...config, businessAccountId: 'other' }), []);
  assert.deepEqual(parseWebhook(payload([{ ...message, from: null }]), config), []);
  assert.throws(() => parseWebhook(null, config), /malformed_webhook/);
  assert.throws(() => parseWebhook({ object: 'whatsapp_business_account' }, config), /malformed_webhook/);
});

test('unknown fields, unrelated events, unsupported message types and statuses are safe', () => {
  assert.deepEqual(parseWebhook({ object: 'other' }, config), []);
  const [event] = parseWebhook(payload([{ ...message, type: 'image', text: undefined, future: true }]), config);
  assert.equal(event.messageType, 'image');
  assert.equal(event.body, null);
  assert.deepEqual(parseWebhook(payload([], [{ id: 'id', status: 'future', timestamp: message.timestamp }]), config), []);
});

test('atomic duplicate protection creates one contact, message and timeline entry', async () => {
  const { repository, data } = memoryRepository();
  const [event] = parseWebhook(payload(), config);
  assert.equal((await repository.accept(event)).duplicate, false);
  assert.equal((await repository.accept(event)).duplicate, true);
  assert.equal((await repository.accept({ ...event, timestamp: '2026-10-06T00:00:00.000Z' })).duplicate, true);
  assert.equal([...data.keys()].filter(k => k.startsWith('customers/')).length, 1);
  assert.equal([...data.keys()].filter(k => k.startsWith('messages/')).length, 1);
  assert.equal([...data.values()].filter(v => v.type === 'whatsapp_message_received').length, 1);
});

test('associates existing qualified/suppressed customers without replacing their business state', async () => {
  const { repository, data } = memoryRepository();
  data.set('customers/existing', { name: 'Private Demo', normalizedPhone: '+8801712345678', status: 'do_not_contact' });
  await repository.accept(parseWebhook(payload(), config)[0]);
  assert.equal(data.get(`messages/${messageKey(message.id)}`).customerId, 'existing');
  assert.equal(data.get('customers/existing').status, 'do_not_contact');
  await assert.rejects(repository.prepareSend('+8801712345678', 'Hi'), /recipient_suppressed/);
});

test('out-of-order and duplicate status events retain read evidence and statuses preceding outbound persistence', async () => {
  const { repository, data } = memoryRepository();
  data.set('customers/existing', { normalizedPhone: '+8801712345678', status: 'customer' });
  const attemptId = await repository.prepareSend('+8801712345678', 'Hi');
  const event = status => parseWebhook(payload([], [{ id: 'wamid.outbound', status, timestamp: message.timestamp, recipient_id: message.from }]), config)[0];
  await repository.accept(event('read'));
  await repository.accept(event('delivered'));
  await repository.accept(event('sent'));
  await repository.accept(event('failed'));
  assert.equal((await repository.accept(event('read'))).duplicate, true);
  await repository.finishSend(attemptId, { externalMessageId: 'wamid.outbound', phoneNumberId: '123' });
  const stored = data.get(`messages/${messageKey('wamid.outbound')}`);
  assert.equal(stored.deliveryStatus, 'read');
  assert.equal(stored.customerId, 'existing');
  assert.equal(stored.body, 'Hi');
  const other = event('failed'); other.externalMessageId = 'wamid.failed';
  await repository.accept(other);
  assert.equal(data.get(`messages/${messageKey('wamid.failed')}`).deliveryStatus, 'failed');
});

test('outbound uses the official API with normalized text and structured acceptance', async () => {
  let request;
  const service = new WhatsAppService(config, async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.outbound' }] }) };
  });
  const result = await service.sendText('017 1234-5678', 'Hello from AtlasCRM');
  assert.equal(request.url, 'https://graph.facebook.com/v25.0/123/messages');
  assert.equal(request.options.headers.Authorization, `Bearer ${config.accessToken}`);
  assert.deepEqual(JSON.parse(request.options.body), { messaging_product: 'whatsapp', to: '8801712345678', type: 'text', text: { body: 'Hello from AtlasCRM' } });
  assert.equal(result.status, 'accepted');
  assert.throws(() => textPayload('abc123456789', 'Hi'), /invalid_recipient/);
  assert.throws(() => textPayload('+8801712345678', ''), /invalid_message/);
  assert.throws(() => textPayload('+8801712345678', 'x'.repeat(4097)), /invalid_message/);
});

test('Meta errors, bad responses, timeouts and network errors do not leak private values', async () => {
  const errorResponse = { ok: false, status: 400, json: async () => ({ error: { code: 131047, error_subcode: 1, message: config.accessToken } }) };
  await assert.rejects(new WhatsAppService(config, async () => errorResponse).sendText(message.from, 'Hi'), error => {
    assert.deepEqual(safeFailure(error), { code: 'meta_api_error', httpStatus: 400, metaCode: 131047, metaSubcode: 1 });
    assert.equal(String(error).includes(config.accessToken), false); return true;
  });
  await assert.rejects(new WhatsAppService(config, async () => { throw Error(config.accessToken); }).sendText(message.from, 'Hi'), /meta_network_error/);
  await assert.rejects(new WhatsAppService(config, async () => ({ ok: true, status: 200, json: async () => ({}) })).sendText(message.from, 'Hi'), /invalid_meta_response/);
  await assert.rejects(new WhatsAppService(config, async (_, options) => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => reject(Error('aborted')));
  }), 5).sendText(message.from, 'Hi'), /meta_timeout/);
});

test('missing configuration reports variable names only and API version must be explicit', () => {
  assert.throws(() => readConfig({}), error => {
    assert.ok(error.details.missing.includes('WHATSAPP_APP_SECRET')); return true;
  });
  const env = { WHATSAPP_ACCESS_TOKEN: config.accessToken, WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_BUSINESS_ACCOUNT_ID: '456' };
  assert.throws(() => readConfig(env, 'send'), error => error.details.missing.includes('WHATSAPP_GRAPH_API_VERSION'));
  assert.equal(readConfig({ ...env, WHATSAPP_GRAPH_API_VERSION: 'v25.0' }, 'send').graphVersion, 'v25.0');
});

test('tracked sends persist intent before API call and never retry acceptance after storage failure', async () => {
  const { repository, data } = memoryRepository();
  let sends = 0;
  const service = { sendText: async () => { sends++; return { externalMessageId: 'out', status: 'accepted' }; } };
  await assert.rejects(sendTracked(repository, service, message.from, 'Hi', '123'), /recipient_not_in_crm/);
  assert.equal(sends, 0);
  data.set('customers/existing', { normalizedPhone: '+8801712345678', status: 'new' });
  await sendTracked(repository, service, message.from, 'Hi', '123');
  assert.equal(data.get(`messages/${messageKey('out')}`).body, 'Hi');
  repository.finishSend = async () => { throw Error('storage unavailable'); };
  await assert.rejects(sendTracked(repository, service, message.from, 'Hi', '123'), /message_accepted_storage_failed_do_not_resend/);
  assert.equal(sends, 2);
  assert.ok([...data.values()].some(v => v.state === 'pending'));
});

test('outbound acceptance associates the retained customer after a duplicate merge', async () => {
  const { repository, data } = memoryRepository();
  data.set('customers/old', { normalizedPhone: '+8801712345678', status: 'new' });
  const attempt = await repository.prepareSend(message.from, 'Hi');
  data.delete('customers/old');
  data.set('customers/retained', { normalizedPhone: '+8801712345678', status: 'customer' });
  await repository.finishSend(attempt, { externalMessageId: 'merged.out', phoneNumberId: '123' });
  assert.equal(data.get(`messages/${messageKey('merged.out')}`).customerId, 'retained');
  assert.equal([...data.values()].find(v => v.type === 'whatsapp_message_accepted').customerId, 'retained');
});

test('HTTP handles verification, signatures, malformed input, privacy boundaries and retryable storage failure', async t => {
  const { repository } = memoryRepository();
  const logs = [];
  const server = createAtlasServer({ config, repository, logger: { error: (...args) => logs.push(args) } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const verified = await fetch(`${base}/webhooks/whatsapp?${new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': config.verifyToken, 'hub.challenge': '42' })}`);
  assert.equal(verified.status, 200); assert.equal(await verified.text(), '42');
  assert.equal((await fetch(`${base}/webhooks/whatsapp`)).status, 403);
  const post = async (body, signature = sign(body)) => fetch(`${base}/webhooks/whatsapp`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature }, body });
  const body = JSON.stringify(payload());
  assert.equal((await post(body)).status, 200);
  assert.equal((await post(body)).status, 200);
  assert.equal((await post(body, 'wrong')).status, 401);
  assert.equal((await post('{')).status, 400);
  assert.equal((await post('{}')).status, 200);
  assert.equal((await post('x'.repeat(1024 * 1024 + 1))).status, 413);
  for (const path of ['/server/config.mjs', '/.env', '/docs/SECURITY.md', '/package.json']) assert.equal((await fetch(base + path)).status, 404);
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/js/app.js')).status, 200);
  repository.accept = async () => { throw Error(config.accessToken); };
  assert.equal((await post(body)).status, 503);
  assert.equal(JSON.stringify(logs).includes(config.accessToken), false);
});

test('web authentication checks revocation and restricts sending to approved Firebase UIDs', async () => {
  let revokeCheck;
  const authenticate = firebaseAuthenticator({ verifyIdToken: async (token, revoked) => {
    revokeCheck = revoked;
    if (token === 'expired') throw Error('private provider diagnostic');
    return { uid: token === 'approved' ? 'operator' : 'stranger' };
  } }, ['operator']);
  assert.equal(await authenticate('Bearer approved'), 'operator');
  assert.equal(revokeCheck, true);
  await assert.rejects(authenticate(undefined), /authentication_required/);
  await assert.rejects(authenticate('Bearer expired'), /authentication_required/);
  await assert.rejects(authenticate('Bearer unapproved'), /sending_not_authorized/);
  await assert.rejects(firebaseAuthenticator({}, [])('Bearer approved'), /web_sending_not_configured/);
});

test('web sending is authenticated, CRM-bound and idempotent under concurrent duplicate requests', async t => {
  const { repository, data } = memoryRepository();
  data.set('customers/demo', { normalizedPhone: '+8801712345678', status: 'customer' });
  data.set('customers/suppressed', { normalizedPhone: '+8801812345678', status: 'do_not_contact' });
  let sends = 0;
  const sendService = { sendText: async to => { sends++; assert.equal(to, '+8801712345678'); return { externalMessageId: 'web.out', status: 'accepted' }; } };
  const authenticate = firebaseAuthenticator({ verifyIdToken: async token => ({ uid: token === 'approved' ? 'operator' : 'other' }) }, ['operator']);
  const server = createAtlasServer({ config, repository, sendService, authenticate });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = { customerId: 'demo', body: 'From the CRM', requestId: '12345678-1234-4123-8123-123456789012' };
  const post = (body = request, token = 'approved', extra = {}) => fetch(base + '/api/whatsapp/messages', { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }, body: JSON.stringify(body) });
  assert.equal((await post(request, null)).status, 401);
  assert.equal((await post(request, 'unapproved')).status, 403);
  assert.equal((await post(request, 'approved', { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal(sends, 0);
  assert.equal((await fetch(base + '/api/whatsapp/config', { headers: { Authorization: 'Bearer approved' } })).status, 200);
  const results = await Promise.all([post(), post()]);
  assert.ok(results.some(response => response.status === 200));
  assert.equal(sends, 1);
  const replay = await post();
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).replay, true);
  assert.equal((await post({ ...request, body: 'Different content' })).status, 409);
  assert.equal((await post({ ...request, customerId: 'suppressed', requestId: '12345678-1234-4123-8123-123456789013' })).status, 403);
  assert.equal((await post({ ...request, to: '+15550009999' })).status, 400);
  assert.equal((await post({ ...request, customerId: 'absent', requestId: '12345678-1234-4123-8123-123456789014' })).status, 400);
  assert.equal(sends, 1);
});

test('browser API client passes Firebase identity and preserves uncertain-send warnings without leaking errors', async () => {
  const user = { getIdToken: async () => 'fictional-firebase-token' };
  let request;
  const payload = { customerId: 'demo', body: 'Hi', requestId: '12345678-1234-4123-8123-123456789012' };
  const result = await whatsappApiRequest(user, '/api/whatsapp/messages', payload, async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ status: 'accepted' }) };
  });
  assert.equal(result.status, 'accepted');
  assert.equal(request.options.headers.Authorization, 'Bearer fictional-firebase-token');
  assert.deepEqual(JSON.parse(request.options.body), payload);
  await assert.rejects(whatsappApiRequest(null, '/api/whatsapp/config'), /Sign in again/);
  await assert.rejects(whatsappApiRequest(user, '/api/whatsapp/messages', payload, async () => { throw Error('sensitive network detail'); }), error => {
    assert.equal(error.retrySafe, false); assert.equal(error.message.includes('sensitive'), false); return true;
  });
  await assert.rejects(whatsappApiRequest(user, '/api/whatsapp/config', undefined, async () => ({ ok: false, json: async () => ({ code: 'web_sending_not_configured' }) })), error => error.retrySafe);
  await assert.rejects(whatsappApiRequest(user, '/api/whatsapp/messages', payload, async () => ({ ok: false, json: async () => ({ code: 'message_accepted_storage_failed_do_not_resend' }) })), /Do not resend/);
});

test('local connection settings only allow the fixed loopback endpoint and never forward tokens elsewhere', async () => {
  assert.equal(defaultMessagingBackend('https://atlascrm-c5722.web.app'), 'http://127.0.0.1:3000');
  assert.equal(defaultMessagingBackend('https://evil.example'), '');
  assert.equal(messagingBackendUrl('http://127.0.0.1:3000'), 'http://127.0.0.1:3000');
  assert.equal(messagingBackendUrl(''), '');
  for (const url of ['https://example.com', 'http://user:secret@127.0.0.1:3000', 'http://127.0.0.1:3000/path', 'http://127.0.0.1:3000/?x=y', 'http://192.168.1.2:3000']) assert.throws(() => messagingBackendUrl(url));
  const original = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: key => key === messagingBackendKey ? 'http://127.0.0.1:3000' : '' };
    let target;
    await whatsappApiRequest({ getIdToken: async () => 'fake' }, '/api/whatsapp/config', undefined, async url => {
      target = url; return { ok: true, json: async () => ({ enabled: true }) };
    });
    assert.equal(target, 'http://127.0.0.1:3000/api/whatsapp/config');
    globalThis.localStorage = { getItem: () => 'https://evil.example' };
    await assert.rejects(whatsappApiRequest({ getIdToken: async () => 'fake' }, '/api/whatsapp/config', undefined, async () => {
      assert.fail('must not fetch an untrusted endpoint');
    }), /not available/);
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});

test('local bridge permits only trusted Hosting origins and preflights; Firebase auth is still mandatory', async t => {
  const { repository } = memoryRepository();
  const server = createAtlasServer({ config: { ...config, localBridge: true }, repository,
    sendService: {}, authenticate: async header => { if (header !== 'Bearer approved') throw new IntegrationError('authentication_required'); return 'operator'; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/whatsapp/config`;
  const origin = 'https://atlascrm-c5722.web.app';
  const preflight = await fetch(url, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization', 'Access-Control-Request-Private-Network': 'true' } });
  assert.equal(preflight.status, 200);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  assert.equal(preflight.headers.get('access-control-allow-private-network'), 'true');
  const enabled = await fetch(url, { headers: { Origin: origin, 'sec-fetch-site': 'cross-site', Authorization: 'Bearer approved' } });
  assert.equal(enabled.status, 200);
  assert.equal((await fetch(url, { headers: { Origin: 'https://evil.example', Authorization: 'Bearer approved' } })).status, 403);
  assert.equal((await fetch(url, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } })).status, 403);
  const rebindingStatus = await new Promise((resolve, reject) => {
    const request = httpRequest(url, { headers: { Host: 'evil.example', Origin: origin, Authorization: 'Bearer approved' } }, response => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject); request.end();
  });
  assert.equal(rebindingStatus, 403);
  const unauthenticated = await fetch(url, { headers: { Origin: origin } });
  assert.equal(unauthenticated.status, 401);
});
