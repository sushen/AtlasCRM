import { readConfig, safeFailure } from './config.mjs';
import { createAtlasServer } from './http.mjs';
import { WhatsAppService } from './whatsapp.mjs';
import { leadAlertToken } from './lead-alerts.mjs';

try {
  const staticOnly = process.argv.includes('--static-only');
  const config = staticOnly ? null : { ...readConfig(), leadAlertToken: await leadAlertToken() };
  const repository = staticOnly ? null : (await import('./firestore.mjs')).firestoreRepository(config);
  let sendService = null;
  if (!staticOnly && config.allowedUserUids.length) {
    const sendConfig = readConfig(process.env, 'send');
    sendService = new WhatsAppService(sendConfig);
  }
  const server = createAtlasServer({ config, repository, sendService,
    authenticate: repository?.authenticate });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('error', () => { console.error('Atlas server could not listen'); process.exitCode = 1; });
  server.listen(config?.port || 3000, config?.host || '127.0.0.1', () => {
    console.log(`AtlasCRM listening on port ${config?.port || 3000}${staticOnly ? ' (static preview)' : ''}`);
  });
} catch (error) {
  console.error('Atlas startup failed', safeFailure(error));
  process.exitCode = 1;
}
