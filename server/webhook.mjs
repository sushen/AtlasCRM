import { createHmac, timingSafeEqual } from 'node:crypto';
import { normalizePhone } from '../js/utils/phone.js';
import { IntegrationError } from './config.mjs';
import { referralEvidence } from './lead-alerts.mjs';

const array = value => Array.isArray(value) ? value : [];
const string = (value, max = 512) => typeof value === 'string' && value.length <= max ? value : null;
const timestamp = value => {
  if (typeof value !== 'string' || !/^\d{1,11}$/.test(value)) return null;
  const date = new Date(Number(value) * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const phone = value => typeof value === 'string' && /^\+?\d{8,15}$/.test(value) ? normalizePhone(value) : null;
const equal = (a, b) => {
  const x = Buffer.from(a || ''), y = Buffer.from(b || '');
  return x.length === y.length && timingSafeEqual(x, y);
};

export function verifyChallenge(params, token) {
  const challenge = params.get('hub.challenge');
  return Boolean(token) && params.get('hub.mode') === 'subscribe'
    && equal(params.get('hub.verify_token'), token) && challenge !== null && challenge.length <= 1024
    ? challenge : null;
}

export function verifySignature(raw, signature, secret) {
  if (!secret || typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  return equal(signature, `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`);
}

export function parseWebhook(payload, config) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new IntegrationError('malformed_webhook');
  if (payload.object !== 'whatsapp_business_account') return [];
  if (!Array.isArray(payload.entry)) throw new IntegrationError('malformed_webhook');
  const events = [];
  for (const entry of payload.entry) {
    if (entry?.id !== config.businessAccountId) continue;
    for (const change of array(entry.changes)) {
      const value = change?.value;
      if (change?.field !== 'messages' || value?.metadata?.phone_number_id !== config.phoneNumberId) continue;
      const metadata = { phoneNumberId: config.phoneNumberId, businessAccountId: config.businessAccountId,
        businessNumber: phone(value.metadata.display_phone_number) };
      for (const message of array(value.messages)) {
        const id = string(message?.id), sender = phone(message?.from), at = timestamp(message?.timestamp);
        const type = string(message?.type, 64);
        if (!id || !sender || !at || !type) continue;
        const body = type === 'text' ? string(message.text?.body, 16384) : null;
        if (type === 'text' && body === null) continue;
        const contact = array(value.contacts).find(c => c?.wa_id === message.from);
        events.push({ kind: 'message', channel: 'whatsapp', direction: 'inbound', externalMessageId: id,
          sender, recipient: metadata.businessNumber, timestamp: at, messageType: type, body,
          profileName: string(contact?.profile?.name, 256), deliveryStatus: 'received', metadata,
          referral: referralEvidence(message.referral) });
      }
      for (const status of array(value.statuses)) {
        const id = string(status?.id), at = timestamp(status?.timestamp);
        if (!id || !at || !['sent', 'delivered', 'read', 'failed'].includes(status?.status)) continue;
        events.push({ kind: 'status', externalMessageId: id, timestamp: at, deliveryStatus: status.status,
          recipient: phone(status.recipient_id), errorCodes: array(status.errors).map(e => e?.code).filter(Number.isInteger), metadata });
      }
    }
  }
  return events;
}
