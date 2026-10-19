const decode = part => Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')), c => c.charCodeAt(0));
export function createFirebaseVerifier(fetchImpl = fetch, {claims=false}={}) {
  let keys = null; let expires = 0; let pending;
  async function refresh() {
    if (!pending) pending = (async () => {
      const response = await fetchImpl.call(globalThis, 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com', {signal:AbortSignal.timeout(8000),redirect:'manual'});
      if (!response.ok) throw Error('keys_unavailable');
      const data = await response.json();
      if (!Array.isArray(data.keys) || !data.keys.length) throw Error('invalid_keys');
      const age = Number(/(?:^|,)\s*max-age=(\d+)/i.exec(response.headers.get('cache-control') || '')?.[1] || 300);
      keys = data.keys; expires = Date.now() + Math.min(age, 86400) * 1000;
    })().finally(() => { pending = undefined; });
    await pending;
  }
  return async function verify(header, project) {
  try {
    if (!header?.startsWith('Bearer ') || header.length > 8192 || !project) return false;
    const token = header.slice(7); const parts = token.split('.');
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return false;
    const head = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const claim = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    const now = Date.now() / 1000;
    if (!head || !claim || head.alg !== 'RS256' || typeof head.kid !== 'string' || !head.kid || claim.aud !== project || claim.iss !== `https://securetoken.google.com/${project}`
        || typeof claim.sub !== 'string' || !claim.sub || claim.sub.length > 128
        || !Number.isFinite(claim.exp) || claim.exp <= now || !Number.isFinite(claim.iat) || claim.iat < 0 || claim.iat > now
        || !Number.isFinite(claim.auth_time) || claim.auth_time < 0 || claim.auth_time > now) return false;
    if (!keys || Date.now() >= expires) await refresh();
    const jwk = keys.find(key => key.kid === head.kid && key.kty === 'RSA');
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify']);
    const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts[0]+'.'+parts[1]));
    return verified ? (claims?claim:true) : false;
  } catch { return false; }
  };
}
export const verifyFirebaseToken = createFirebaseVerifier();
export const verifyFirebaseClaims = createFirebaseVerifier(fetch,{claims:true});
