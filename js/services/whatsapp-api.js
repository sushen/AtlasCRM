import { messagingBackendUrl, messagingBackendKey, defaultMessagingBackend } from '../utils/messaging-backend.js';
const messages = {
  web_sending_not_configured: 'Direct sending is not available yet. The messaging backend needs configuration.',
  authentication_required: 'Sign in again before sending.',
  sending_not_authorized: 'Your account is not authorized to send WhatsApp messages.',
  recipient_suppressed: 'Sending is disabled for this contact.',
  recipient_not_in_crm: 'This contact is no longer available. Refresh the contacts list.',
  invalid_message: 'Enter a message of up to 4,096 characters.',
  invalid_recipient: 'This contact has an invalid WhatsApp number.',
  invalid_send_request: 'The send request is invalid. Refresh the page before trying again.',
  meta_api_error: 'WhatsApp rejected the message. Check the messaging configuration and the customer service window.',
  send_pending_or_unknown_do_not_retry: 'This message may already have been sent. Check its history before sending another.',
  message_accepted_storage_failed_do_not_resend: 'WhatsApp accepted the message, but Atlas could not save the result. Do not resend it.',
};
const safeToRetry = new Set(['web_sending_not_configured', 'authentication_required', 'sending_not_authorized',
  'recipient_suppressed', 'recipient_not_in_crm', 'invalid_message', 'invalid_recipient', 'invalid_send_request', 'meta_api_error']);

export async function whatsappApiRequest(user, path, payload, fetchImpl = globalThis.fetch, timeoutMs = 30000) {
  if (!user) throw apiError('authentication_required');
  let token;
  try { token = await user.getIdToken(); } catch { throw apiError('authentication_required'); }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let backend = '';
    try { backend = messagingBackendUrl(globalThis.localStorage?.getItem(messagingBackendKey) ?? defaultMessagingBackend(globalThis.location?.origin)); }
    catch { throw apiError('web_sending_not_configured'); }
    const response = await fetchImpl(backend + path, { method: payload ? 'POST' : 'GET', credentials: 'omit',
      redirect: 'error', signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}) });
    let data;
    try { data = await response.json(); } catch { throw apiError(payload ? 'send_failed_or_unknown' : 'web_sending_not_configured'); }
    if (!response.ok) throw apiError(typeof data?.code === 'string' && messages[data.code] ? data.code : 'send_failed_or_unknown');
    if (payload ? data?.status !== 'accepted' : data?.enabled !== true) throw apiError(payload ? 'send_failed_or_unknown' : 'web_sending_not_configured');
    return data;
  } catch (error) {
    if (error?.isWhatsAppError) throw error;
    throw apiError(payload ? 'send_failed_or_unknown' : 'web_sending_not_configured');
  } finally { clearTimeout(timer); }
}

function apiError(code) {
  const error = new Error(messages[code] || 'The send result is unknown. Check message history before sending another.');
  error.isWhatsAppError = true;
  error.code = code;
  error.retrySafe = safeToRetry.has(code);
  return error;
}

export const checkWhatsAppSending = user => whatsappApiRequest(user, '/api/whatsapp/config');
export const sendWhatsAppMessage = (user, customerId, body, requestId) =>
  whatsappApiRequest(user, '/api/whatsapp/messages', { customerId, body, requestId });
