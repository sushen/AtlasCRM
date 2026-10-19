import { normalizePhone } from '../js/utils/phone.js';
import { IntegrationError } from './config.mjs';

export function textPayload(to, body) {
  if (typeof to !== 'string' || !/^\+?[\d\s().-]+$/.test(to)) throw new IntegrationError('invalid_recipient');
  const phone = normalizePhone(to);
  if (!phone) throw new IntegrationError('invalid_recipient');
  if (typeof body !== 'string' || !body.trim() || [...body].length > 4096) throw new IntegrationError('invalid_message');
  return { messaging_product: 'whatsapp', to: phone.slice(1), type: 'text', text: { body } };
}

export class WhatsAppService {
  constructor(config, fetchImpl = globalThis.fetch, timeoutMs = 10000) {
    this.config = config;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async sendText(to, body) {
    const payload = textPayload(to, body);
    const { accessToken, phoneNumberId, graphVersion } = this.config;
    if (!accessToken || !/^\d+$/.test(phoneNumberId || '') || !/^v\d+\.0$/.test(graphVersion || '')) {
      throw new IntegrationError('missing_send_configuration');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let data;
      try { data = await response.json(); } catch { throw new IntegrationError('invalid_meta_response', { httpStatus: response.status }); }
      if (!response.ok || data?.error) {
        const details = { httpStatus: response.status };
        for (const [source, target] of [['code', 'metaCode'], ['error_subcode', 'metaSubcode']]) {
          if (Number.isInteger(data?.error?.[source])) details[target] = data.error[source];
        }
        // Meta error text can echo credentials/customer content. Never propagate it.
        throw new IntegrationError('meta_api_error', details);
      }
      const id = data?.messages?.[0]?.id;
      if (typeof id !== 'string' || !id || id.length > 512) throw new IntegrationError('invalid_meta_response');
      return { externalMessageId: id, status: 'accepted', recipient: `+${payload.to}` };
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(controller.signal.aborted ? 'meta_timeout' : 'meta_network_error');
    } finally { clearTimeout(timer); }
  }
}
