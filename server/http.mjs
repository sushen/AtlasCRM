import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { verifyChallenge, verifySignature, parseWebhook } from './webhook.mjs';
import { safeFailure } from './config.mjs';
import { IntegrationError } from './config.mjs';
import { sendCustomerMessage } from './send.mjs';
import { groupMenu, familyMenu, productMessage, SHOP_MENU } from './telegram-catalog.mjs';
import { leadFeedAllowed } from './lead-alerts.mjs';

const root = new URL('../', import.meta.url);
const mime = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', jpg:'image/jpeg' };
export function createAtlasServer({ config, repository, sendService, authenticate, catalogService, logger = console }) {
  return createServer(async (req, res) => {
    const reply = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(body);
    };
    const json = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (['/api/genie/lead-alerts', '/api/genie/manual-leads'].includes(url.pathname)) {
        if (!leadFeedAllowed(req, config?.leadAlertToken)) return json(403, { code: 'lead_feed_denied' });
        if (url.pathname === '/api/genie/manual-leads') {
          if (req.method !== 'POST' || url.search) return json(405, { code: 'method_not_allowed' });
          if (!repository?.captureManualLead) return json(503, { code: 'lead_feed_unavailable' });
          if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return json(415, { code: 'json_required' });
          const chunks = []; let bytes = 0;
          for await (const chunk of req) { bytes += chunk.length; if (bytes > 8192) return json(413, { code: 'payload_too_large' }); chunks.push(chunk); }
          let value;
          try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
          catch { return json(400, { code: 'invalid_lead' }); }
          try { return json(200, await repository.captureManualLead(value)); }
          catch (error) { return json(['invalid_lead','lead_request_conflict'].includes(error.code) ? 400 : 503, { code: 'lead_not_confirmed' }); }
        }
        if (req.method !== 'GET') return json(405, { code: 'method_not_allowed' });
        const cursor = url.searchParams.get('cursor') || '';
        if ((cursor && !/^[a-f0-9]{64}$/.test(cursor)) || [...url.searchParams.keys()].some(key => key !== 'cursor')) return json(400, { code: 'invalid_cursor' });
        if (!repository?.listLeadAlerts) return json(503, { code: 'lead_feed_unavailable' });
        try { return json(200, await repository.listLeadAlerts(cursor)); }
        catch { return json(503, { code: 'lead_feed_unavailable' }); }
      }
      if (['/api/catalog/products', '/api/catalog/telegram-menu'].includes(url.pathname)) {
        if (!catalogService) return json(503, { code: 'catalog_not_configured' });
        // This preview is loopback-only, with no hosted-origin/CORS bridge.
        const host = req.headers.host || '';
        if (!/^(?:127\.0\.0\.1|localhost):\d+$/.test(host)
            || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
            || req.headers['sec-fetch-site'] === 'cross-site'
            || (req.headers.origin && req.headers.origin !== 'http://' + host)) return json(403, { code: 'catalog_access_denied' });
        if (req.method !== 'GET') return json(405, { code: 'method_not_allowed' });
        try {
          const catalog = await catalogService.list();
          if (url.pathname.endsWith('/telegram-menu')) {
            const action = url.searchParams.get('action') || 'groups:0';
            const family = /^family:([^:]{1,45}):(\d{1,4})$/.exec(action);
            const product = action.startsWith('product:') ? catalog.products.find(p => p.id === action.slice(8)) : null;
            const view = product ? productMessage(product, catalog.storefront?.telegramUrl || '')
              : family ? familyMenu(catalog.products, family[1], Number(family[2]))
              : groupMenu(catalog.products, Number(/^groups:(\d{1,4})$/.exec(action)?.[1] || 0));
            return json(200, { ...view, menu: SHOP_MENU, telegramUrl: catalog.storefront?.telegramUrl || '' });
          }
          return json(200, catalog);
        }
        catch (error) { return json(error.status || 502, { code: error.code || 'catalog_supplier_unavailable' }); }
      }
      if (['/api/whatsapp/config', '/api/whatsapp/messages'].includes(url.pathname)) {
        const trustedOrigins = new Set(['https://atlascrm-c5722.web.app', 'https://atlascrm-c5722.firebaseapp.com']);
        const origin = req.headers.origin;
        const localOriginAllowed = config?.localBridge && trustedOrigins.has(origin);
        if (config?.localBridge && !/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(req.headers.host || '')) return json(403, { code: 'sending_not_authorized' });
        if (origin && config?.localBridge && !localOriginAllowed && !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin)) return json(403, { code: 'sending_not_authorized' });
        if (localOriginAllowed) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
        }
        if (req.method === 'OPTIONS') {
          if (!localOriginAllowed) return json(403, { code: 'sending_not_authorized' });
          const requestedMethod = req.headers['access-control-request-method'];
          const requestedHeaders = (req.headers['access-control-request-headers'] || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
          if (!['GET', 'POST'].includes(requestedMethod) || requestedHeaders.some(value => !['authorization', 'content-type'].includes(value))) return json(403, { code: 'sending_not_authorized' });
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
          res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
          res.setHeader('Access-Control-Allow-Private-Network', 'true');
          return json(200, { enabled: true });
        }
        const isSend = url.pathname.endsWith('/messages');
        if (req.method !== (isSend ? 'POST' : 'GET')) return json(405, { code: 'method_not_allowed' });
        if (!sendService || !authenticate || !repository) return json(503, { code: 'web_sending_not_configured' });
        // Only the explicit hosted workspace can bridge to the loopback server.
        // Bearer auth, UID checks and JSON apply equally to local and cloud routes.
        if (req.headers['sec-fetch-site'] === 'cross-site' && !localOriginAllowed) return json(403, { code: 'sending_not_authorized' });
        try {
          const actorUid = await authenticate(req.headers.authorization);
          if (!isSend) return json(200, { enabled: true });
          if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return json(415, { code: 'json_required' });
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 32 * 1024) return json(413, { code: 'payload_too_large' });
            chunks.push(chunk);
          }
          let request;
          try { request = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
          catch { return json(400, { code: 'invalid_send_request' }); }
          if (!request || typeof request !== 'object' || Array.isArray(request)
              || Object.keys(request).some(key => !['customerId', 'body', 'requestId'].includes(key))) {
            return json(400, { code: 'invalid_send_request' });
          }
          const result = await sendCustomerMessage(repository, sendService, request, actorUid, config.phoneNumberId);
          return json(200, { status: result.status, replay: Boolean(result.replay) });
        } catch (error) {
          const code = error instanceof IntegrationError ? error.code : 'send_failed_or_unknown';
          const status = code === 'authentication_required' ? 401
            : ['sending_not_authorized', 'recipient_suppressed'].includes(code) ? 403
            : ['send_request_conflict', 'send_pending_or_unknown_do_not_retry'].includes(code) ? 409
            : code === 'web_sending_not_configured' ? 503
            : ['invalid_send_request', 'invalid_message', 'invalid_recipient', 'recipient_not_in_crm'].includes(code) ? 400 : 502;
          // No provider error text, customer data, bearer token or UID in response/logs.
          return json(status, { code });
        }
      }
      if (url.pathname === '/webhooks/whatsapp') {
        if (!config || !repository || !config.appSecret || !config.verifyToken) return reply(503, 'Webhook not configured');
        if (req.method === 'GET') {
          const challenge = verifyChallenge(url.searchParams, config.verifyToken);
          return challenge === null ? reply(403, 'Verification rejected') : reply(200, challenge);
        }
        if (req.method !== 'POST') return reply(405, 'Method not allowed');
        if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(415, 'JSON required');
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 1024 * 1024) return reply(413, 'Payload too large');
          chunks.push(chunk);
        }
        const raw = Buffer.concat(chunks);
        if (!verifySignature(raw, req.headers['x-hub-signature-256'], config.appSecret)) return reply(401, 'Signature rejected');
        let events;
        try { events = parseWebhook(JSON.parse(raw.toString('utf8')), config); }
        catch { return reply(400, 'Malformed webhook'); }
        // Acknowledge only after durable writes. On failure Meta can retry; earlier
        // events in a partially processed batch are protected by transaction dedup.
        for (const event of events) await repository.accept(event);
        return reply(200, 'EVENT_RECEIVED');
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return reply(405, 'Method not allowed');
      const path = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      // Only browser assets are public; no directory listing or backend source.
      if (!/^(?:index\.html|login\.html|404\.html|(?:js|css)\/[a-zA-Z0-9_/-]+\.(?:js|css)|images\/brand\/atlas-logo\.jpg|images\/shop\/(?:welcome|chatgpt|claude|gemini|canva|notion)\.jpg)$/.test(path)
          || path.includes('..')) return reply(404, 'Not found');
      let content;
      try { content = await readFile(fileURLToPath(new URL(path, root))); }
      catch { return reply(404, 'Not found'); }
      res.writeHead(200, { 'Content-Type': mime[path.split('.').pop()], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      logger.error('Atlas request failed', safeFailure(error));
      if (!res.headersSent) reply(503, 'Temporarily unavailable');
      else res.end();
    }
  });
}
