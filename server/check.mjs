import { readConfig, safeFailure } from './config.mjs';
import { firestoreRepository } from './firestore.mjs';

console.log(process.env.WHATSAPP_ALLOWED_USER_UIDS?.trim()
  ? 'Web sending: approved-user list configured'
  : 'Web sending: disabled; configure WHATSAPP_ALLOWED_USER_UIDS to enable');

for (const purpose of ['webhook', 'send']) {
  try { readConfig(process.env, purpose); console.log(`${purpose} configuration: ready`); }
  catch (error) { console.error(`${purpose} configuration:`, safeFailure(error)); process.exitCode = 1; }
}
if (!process.exitCode) {
  try {
    const repository = firestoreRepository(readConfig());
    await repository.adapter.transaction(tx => tx.get('whatsappEvents', 'configuration-probe'));
    console.log('Firestore server access: ready');
  } catch { console.error('Firestore server access: unavailable; configure Application Default Credentials'); process.exitCode = 1; }
}
