import { CATALOG_WORKER_ORIGIN } from './catalog-api-config.js';

export function catalogEndpoint(path) {
  if(path!=='/api/catalog/products')throw Error('Unsupported catalog path');
  if(!CATALOG_WORKER_ORIGIN)return path;
  const url=new URL(CATALOG_WORKER_ORIGIN);
  if(url.origin!=='https://atlas.meshstocks.workers.dev'||url.pathname!=='/'||url.search||url.hash)throw Error('Invalid catalog Worker origin');
  return url.origin+path;
}
export async function catalogFetch(path,options={}) {
  const endpoint=catalogEndpoint(path);
  // Public read-only catalog: do not initialize Firebase or attach identity tokens.
  return fetch(endpoint,options);
}
