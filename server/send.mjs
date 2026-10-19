import { readConfig, IntegrationError, safeFailure } from './config.mjs';
import { WhatsAppService } from './whatsapp.mjs';
import { firestoreRepository } from './firestore.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export async function sendTracked(repository, service, to, body, phoneNumberId) {
  const attemptId = await repository.prepareSend(to, body);
  return completeAttempt(repository, service, attemptId, to, body, phoneNumberId);
}

export async function sendCustomerMessage(repository, service, { customerId, body, requestId }, actorUid, phoneNumberId) {
  const attempt = await repository.prepareCustomerSend(customerId, body, requestId, actorUid);
  if (attempt.replay) return { status: 'accepted', attemptId: attempt.attemptId, replay: true };
  return completeAttempt(repository, service, attempt.attemptId, attempt.recipient, body, phoneNumberId);
}

async function completeAttempt(repository, service, attemptId, to, body, phoneNumberId) {
  let result;
  try { result = await service.sendText(to, body); }
  catch (error) {
    try { await repository.failSend(attemptId, safeFailure(error)); } catch { /* Pending record remains for reconciliation. */ }
    if (error instanceof IntegrationError) throw new IntegrationError(error.code, { ...error.details, attemptId });
    throw new IntegrationError('send_failed_or_unknown', { attemptId });
  }
  try { await repository.finishSend(attemptId, { ...result, phoneNumberId }); }
  catch { throw new IntegrationError('message_accepted_storage_failed_do_not_resend', { attemptId }); }
  return { status: result.status, attemptId };
}

// Importing for tests never sends anything.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2) throw new IntegrationError('usage_send_recipient_and_message');
    const config = readConfig(process.env, 'send');
    const result = await sendTracked(firestoreRepository(config), new WhatsAppService(config), args[0], args[1], config.phoneNumberId);
    console.log('WhatsApp send result', result);
  } catch (error) { console.error('WhatsApp send failed', safeFailure(error)); process.exitCode = 1; }
}
