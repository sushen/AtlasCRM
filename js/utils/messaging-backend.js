export function messagingBackendUrl(value) {
  if (!value) return '';
  let url;
  try { url = new URL(value); } catch { throw Error('Choose Hosted or Local computer messaging.'); }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash || url.port !== '3000') {
    throw Error('The local messaging service must use http://127.0.0.1:3000.');
  }
  return url.origin;
}

export const messagingBackendKey = 'atlas_messaging_backend';

export function defaultMessagingBackend(origin) {
  return ['https://atlascrm-c5722.web.app', 'https://atlascrm-c5722.firebaseapp.com'].includes(origin)
    ? 'http://127.0.0.1:3000' : '';
}
