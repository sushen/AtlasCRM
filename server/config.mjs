export class IntegrationError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

export function readConfig(env = process.env, purpose = 'webhook') {
  const required = purpose === 'send'
    ? ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID', 'WHATSAPP_GRAPH_API_VERSION']
    : ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'];
  const missing = required.filter(name => !env[name]?.trim());
  if (missing.length) throw new IntegrationError('missing_configuration', { missing });
  for (const name of ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID']) {
    if (!/^\d+$/.test(env[name])) throw new IntegrationError('invalid_configuration', { field: name });
  }
  if (purpose === 'send' && !/^v\d+\.0$/.test(env.WHATSAPP_GRAPH_API_VERSION)) {
    throw new IntegrationError('invalid_configuration', { field: 'WHATSAPP_GRAPH_API_VERSION' });
  }
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new IntegrationError('invalid_port');
  return Object.freeze({
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    appSecret: env.WHATSAPP_APP_SECRET,
    graphVersion: env.WHATSAPP_GRAPH_API_VERSION,
    allowedUserUids: (env.WHATSAPP_ALLOWED_USER_UIDS || '').split(',').map(value => value.trim()).filter(Boolean),
    projectId: env.ATLAS_FIREBASE_PROJECT_ID || 'atlascrm-c5722',
    host: env.HOST || '127.0.0.1', port,
  });
}

// Only application-owned codes and numeric diagnostics may reach logs.
export function safeFailure(error) {
  return error instanceof IntegrationError
    ? { code: error.code, ...error.details }
    : { code: 'internal_error' };
}
