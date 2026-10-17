import { getAuth } from 'firebase-admin/auth';
import { readConfig, IntegrationError, safeFailure } from './config.mjs';
import { firestoreRepository } from './firestore.mjs';
import { firebaseAuthenticator } from './auth.mjs';
import { WhatsAppService } from './whatsapp.mjs';
import { createAtlasServer } from './http.mjs';
import { prepareLocalFirebase } from './local-firebase.mjs';
import { workspaceOperator } from './operator.mjs';

let cleanupFirebase = () => {};
let stage = 'saved_firebase_login';
process.on('exit', () => cleanupFirebase());
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

try {
  const projectId = process.env.ATLAS_FIREBASE_PROJECT_ID || 'atlascrm-c5722';
  cleanupFirebase = await prepareLocalFirebase(projectId);
  // A supported explicit startup version; an existing environment value wins.
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';
  const config = readConfig({ ...process.env, WHATSAPP_GRAPH_API_VERSION: graphVersion }, 'send');
  if(config.port!==3000)throw new IntegrationError('local_port_must_be_3000');
  stage = 'firestore_initialization';
  const repository = firestoreRepository(config);
  stage = 'firestore_read';
  await repository.adapter.transaction(tx => tx.get('whatsappEvents', 'local-startup-probe'));
  let allowed = config.allowedUserUids;
  if (!allowed.length) {
    stage = 'firebase_operator_lookup';
    allowed = await workspaceOperator(getAuth());
    console.log('Local sending limited to the approved Firebase workspace operator');
  }
  const localConfig = { ...config, host: '127.0.0.1', localBridge: true, allowedUserUids: allowed };
  const service = new WhatsAppService(localConfig);
  stage = 'meta_read_check';
  // Read-only Meta check: validates the configured token/phone/version without sending.
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${config.phoneNumberId}?fields=id`, {
    headers: { Authorization: `Bearer ${config.accessToken}` }, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new IntegrationError('local_meta_configuration_check_failed', { httpStatus: response.status });
  const phone = await response.json();
  if (phone.id !== config.phoneNumberId) throw new IntegrationError('local_meta_configuration_check_failed');
  const server = createAtlasServer({ config: localConfig, repository, sendService: service,
    authenticate: firebaseAuthenticator(getAuth(), allowed) });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? 'Port 3000 is already in use. Atlas may already be running. In the CRM, choose Settings > WhatsApp sending > This computer > Check connection; do not start another copy.'
      : 'Local Atlas server could not listen. Check port 3000 and local permissions.');
    process.exit(1);
  });
  server.listen(config.port, '127.0.0.1', () => {
    console.log(`Atlas local messaging ready on port ${config.port}; Firebase and Meta read-only checks passed`);
    console.log(process.env.WHATSAPP_APP_SECRET ? 'Signed webhooks available locally' : 'Outbound ready; incoming webhooks disabled until app secret and HTTPS callback are configured');
  });
} catch (error) {
  console.error('Local Atlas startup failed', { ...safeFailure(error), stage,
    ...(Number.isInteger(error.code) ? { diagnosticCode: error.code } : {}) });
  process.exitCode = 1;
}
