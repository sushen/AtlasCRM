import { createHash, randomUUID } from 'node:crypto';
import { IntegrationError } from './config.mjs';
import { textPayload } from './whatsapp.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
export const messageKey = id => hash(id);
const rank = { accepted: 0, sent: 1, delivered: 2, read: 3 };
export function nextStatus(current, event) {
  if (!current) return event.deliveryStatus;
  if (event.deliveryStatus === 'failed') return ['delivered', 'read'].includes(current.deliveryStatus)
    ? current.deliveryStatus : 'failed';
  if (current.deliveryStatus === 'failed' && event.timestamp < (current.statusTimestamp || '')) return 'failed';
  return (rank[event.deliveryStatus] ?? -1) > (rank[current.deliveryStatus] ?? -1)
    ? event.deliveryStatus : current.deliveryStatus;
}

// Adapter transactions provide get(collection,id), findCustomer(phone), set(...).
// All reads precede writes so the same code works with Firestore transactions.
export class MessageRepository {
  constructor(adapter) { this.adapter = adapter; }

  async accept(event) {
    const key = messageKey(event.externalMessageId);
    const eventKey = hash(JSON.stringify([key, event.kind, event.deliveryStatus, event.timestamp]));
    return this.adapter.transaction(async tx => {
      const duplicate = await tx.get('whatsappEvents', eventKey);
      if (duplicate) return { duplicate: true };
      const previous = await tx.get('messages', key);
      if (event.kind === 'message' && previous?.direction === 'inbound') return { duplicate: true };
      let customer = previous?.customerId ? await tx.get('customers', previous.customerId) : null;
      if (customer) customer = { ...customer, id: previous.customerId };
      if (!customer) customer = await tx.findCustomer(event.kind === 'message' ? event.sender : event.recipient);
      let newCustomer = false;
      if (!customer && event.kind === 'message') {
        const id = `wa_${hash(event.sender)}`;
        const existing = await tx.get('customers', id);
        customer = existing ? { ...existing, id } : { id, name: event.profileName || 'WhatsApp Lead',
          phone: event.sender, normalizedPhone: event.sender, whatsappNumber: event.sender,
          source: 'WhatsApp Cloud API', sourceGroup: 'Inbound WhatsApp', status: 'new', customerStatus: 'lead',
          tags: ['whatsapp-lead'], notes: '', importedAt: null, firstContactedAt: null, lastContactedAt: null,
          lastReplyAt: null, nextFollowUpAt: null, contactAttempts: 0, createdAt: this.adapter.now() };
        newCustomer = !existing;
      }
      const status = event.kind === 'message' ? 'received' : nextStatus(previous, event);
      const record = event.kind === 'message' ? { ...event } : { ...previous,
        channel: 'whatsapp', direction: 'outbound', externalMessageId: event.externalMessageId,
        recipient: event.recipient || previous?.recipient || null, metadata: event.metadata,
        errorCodes: event.errorCodes };
      delete record.kind;
      record.customerId = customer?.id || previous?.customerId || null;
      record.deliveryStatus = status;
      record.statusTimestamp = previous?.statusTimestamp && previous.statusTimestamp > event.timestamp
        ? previous.statusTimestamp : event.timestamp;
      record.createdAt = previous?.createdAt || this.adapter.now();
      record.updatedAt = this.adapter.now();
      if (event.kind === 'message') {
        const { id, ...data } = customer;
        // Incoming content never overrides business qualification or suppression states.
        tx.set('customers', id, { ...data, lastReplyAt: data.lastReplyAt && data.lastReplyAt > event.timestamp
          ? data.lastReplyAt : event.timestamp, updatedAt: this.adapter.now() });
        if (newCustomer) tx.set('activities', `wa_created_${key}`, this.activity(id, 'whatsapp_contact_created', 'Contact created from an incoming WhatsApp message', key));
      }
      tx.set('messages', key, record);
      tx.set('whatsappEvents', eventKey, { ...event, customerId: record.customerId, receivedAt: this.adapter.now() });
      if (record.customerId) {
        const note = event.kind === 'message'
          ? event.body ?? `Unsupported WhatsApp message type: ${event.messageType}`
          : `WhatsApp API status: ${event.deliveryStatus}`;
        tx.set('activities', `wa_${eventKey}`, this.activity(record.customerId,
          event.kind === 'message' ? 'whatsapp_message_received' : 'whatsapp_message_status', note, key));
      }
      return { duplicate: false };
    });
  }

  activity(customerId, type, note, key) {
    return { customerId, type, note, description: note, metadata: { channel: 'whatsapp', messageId: key }, createdAt: this.adapter.now() };
  }

  async prepareSend(to, body) {
    const payload = textPayload(to, body), recipient = `+${payload.to}`, id = randomUUID();
    await this.adapter.transaction(async tx => {
      const customer = await tx.findCustomer(recipient);
      if (!customer) throw new IntegrationError('recipient_not_in_crm');
      if (['blocked', 'do_not_contact'].includes(customer.status)) throw new IntegrationError('recipient_suppressed');
      tx.set('whatsappSendAttempts', id, { customerId: customer.id, recipient, body, messageType: 'text',
        state: 'pending', createdAt: this.adapter.now() });
    });
    return id;
  }

  async prepareCustomerSend(customerId, body, requestId, actorUid) {
    if (typeof customerId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(customerId)
        || typeof requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)) {
      throw new IntegrationError('invalid_send_request');
    }
    if (typeof actorUid !== 'string' || !actorUid) throw new IntegrationError('authentication_required');
    const attemptId = `web_${hash(JSON.stringify([actorUid, requestId]))}`;
    return this.adapter.transaction(async tx => {
      const previous = await tx.get('whatsappSendAttempts', attemptId);
      if (previous) {
        if (previous.requestCustomerId !== customerId || previous.body !== body) throw new IntegrationError('send_request_conflict');
        if (previous.state === 'accepted') return { attemptId, replay: true };
        throw new IntegrationError('send_pending_or_unknown_do_not_retry');
      }
      const customer = await tx.get('customers', customerId);
      if (!customer) throw new IntegrationError('recipient_not_in_crm');
      if (['blocked', 'do_not_contact'].includes(customer.status)) throw new IntegrationError('recipient_suppressed');
      // The browser supplies a customer ID, never an arbitrary destination.
      const payload = textPayload(customer.normalizedPhone, body);
      const recipient = `+${payload.to}`;
      tx.set('whatsappSendAttempts', attemptId, { customerId, requestCustomerId: customerId, actorUid,
        recipient, body, messageType: 'text', state: 'pending', createdAt: this.adapter.now() });
      return { attemptId, recipient, replay: false };
    });
  }

  async finishSend(attemptId, result) {
    await this.adapter.transaction(async tx => {
      const attempt = await tx.get('whatsappSendAttempts', attemptId);
      if (!attempt) throw new IntegrationError('send_attempt_missing');
      const key = messageKey(result.externalMessageId);
      const previous = await tx.get('messages', key);
      const customer = await tx.findCustomer(attempt.recipient);
      if (!customer) throw new IntegrationError('send_customer_missing');
      tx.set('messages', key, { ...previous, channel: 'whatsapp', direction: 'outbound',
        sender: null, recipient: attempt.recipient, body: attempt.body, messageType: 'text',
        customerId: customer.id, externalMessageId: result.externalMessageId,
        timestamp: new Date().toISOString(), deliveryStatus: previous?.deliveryStatus || 'accepted',
        metadata: previous?.metadata || { phoneNumberId: result.phoneNumberId },
        createdAt: previous?.createdAt || this.adapter.now(), updatedAt: this.adapter.now() });
      tx.set('whatsappSendAttempts', attemptId, { ...attempt, state: 'accepted', externalMessageId: result.externalMessageId, updatedAt: this.adapter.now() });
      tx.set('activities', `wa_out_${key}`, this.activity(customer.id, 'whatsapp_message_accepted',
        `WhatsApp API accepted an outbound message: ${attempt.body}`, key));
    });
  }

  async failSend(attemptId, failure) {
    await this.adapter.transaction(async tx => {
      const attempt = await tx.get('whatsappSendAttempts', attemptId);
      tx.set('whatsappSendAttempts', attemptId, { ...attempt, state: 'failed_or_unknown', failure, updatedAt: this.adapter.now() });
    });
  }
}
