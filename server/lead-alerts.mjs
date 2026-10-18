// Private desktop alert bridge; no message bodies or full phone numbers leave Atlas.
import { timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function leadAlertToken(env = process.env) {
  if (env.ATLAS_ADMIN_TOKEN) return env.ATLAS_ADMIN_TOKEN;
  try {
    const text = await readFile(new URL('../.env', import.meta.url), 'utf8');
    return text.split(/\r?\n/).map(line => line.match(/^\s*ATLAS_ADMIN_TOKEN\s*=\s*(.*?)\s*$/))
      .find(Boolean)?.[1]?.replace(/^['"]|['"]$/g, '') || '';
  } catch { return ''; }
}

export function leadFeedAllowed(req, token) {
  if (typeof token !== 'string' || token.length < 32 || req.headers.origin || req.headers['sec-fetch-site']) return false;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) ||
      !/^(?:127\.0\.0\.1|localhost):3000$/.test(req.headers.host || '')) return false;
  const received = req.headers.authorization || '';
  const expected = `Bearer ${token}`;
  const a = Buffer.from(received), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function referralEvidence(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !['ad', 'post'].includes(raw.source_type)) return null;
  const id = typeof raw.source_id === 'string' && /^\d{1,30}$/.test(raw.source_id) ? raw.source_id : null;
  const click = typeof raw.ctwa_clid === 'string' && /^[A-Za-z0-9._-]{1,2048}$/.test(raw.ctwa_clid) ? raw.ctwa_clid : null;
  return id || click ? { sourceType: raw.source_type, sourceId: id, clickId: click, evidence: 'meta_webhook_referral' } : null;
}

export function leadAlert(event, customerId, key, createdAt, newCustomer) {
  return { customerId, messageKey: key, createdAt, messageAt: event.timestamp,
    displayName: String(event.profileName || 'WhatsApp enquiry').slice(0, 100),
    maskedPhone: '••••' + String(event.sender || '').slice(-4),
    newLead: newCustomer, source: event.referral?.sourceType === 'ad' ? 'ad_referral' : event.referral?.sourceType === 'post' ? 'post_referral' : 'unattributed',
    sourceId: event.referral?.sourceId || null };
}

export function publicAlert(id, value) {
  return { id, customerId: String(value.customerId || '').slice(0, 100),
    displayName: String(value.displayName || 'WhatsApp enquiry').slice(0, 100), maskedPhone: String(value.maskedPhone || '').slice(0, 12),
    messageAt: value.messageAt, receivedAt: value.createdAt?.toDate ? value.createdAt.toDate().toISOString() : value.createdAt,
    newLead: value.newLead === true, source: ['ad_referral', 'post_referral', 'manual'].includes(value.source) ? value.source : 'unattributed',
    sourceId: value.sourceId || null };
}
