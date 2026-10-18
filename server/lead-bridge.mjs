// Starts only the private CRM bridge; no Meta credential, sends or public webhook.
import { getAuth } from 'firebase-admin/auth';
import { prepareLocalFirebase } from './local-firebase.mjs';
import { firestoreRepository } from './firestore.mjs';
import { workspaceOperator } from './operator.mjs';
import { leadAlertToken } from './lead-alerts.mjs';
import { createAtlasServer } from './http.mjs';

let cleanup = () => {};
process.on('exit', () => cleanup());
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
try {
  const projectId = process.env.ATLAS_FIREBASE_PROJECT_ID || 'atlascrm-c5722';
  const token = await leadAlertToken();
  if (token.length < 32) throw Error('private_token_missing');
  cleanup = await prepareLocalFirebase(projectId);
  const repository = firestoreRepository({ projectId, allowedUserUids: [] });
  await workspaceOperator(getAuth());
  await repository.adapter.transaction(tx => tx.get('whatsappLeadAlerts', 'bridge-read-probe'));
  const server = createAtlasServer({ config: { leadAlertToken: token }, repository });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  server.on('error', () => { console.error('Lead bridge cannot listen; check whether Atlas already uses port 3000.'); process.exitCode = 1; server.close(); });
  server.listen(3000, '127.0.0.1', () => console.log('Private Atlas lead bridge ready. Manual capture available; automatic WhatsApp messages require separate API setup.'));
} catch {
  console.error('Lead bridge unavailable. Check the private admin token, Firebase login and operator access.');
  process.exitCode = 1;
}
