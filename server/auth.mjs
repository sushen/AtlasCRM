import { IntegrationError } from './config.mjs';

export function firebaseAuthenticator(auth, allowedUids) {
  const allowed = new Set(allowedUids);
  return async authorization => {
    if (!allowed.size) throw new IntegrationError('web_sending_not_configured');
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ') || authorization.length > 16384) {
      throw new IntegrationError('authentication_required');
    }
    let claims;
    try { claims = await auth.verifyIdToken(authorization.slice(7), true); }
    catch { throw new IntegrationError('authentication_required'); }
    if (!allowed.has(claims.uid)) throw new IntegrationError('sending_not_authorized');
    return claims.uid;
  };
}
