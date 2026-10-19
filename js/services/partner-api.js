import {CATALOG_WORKER_ORIGIN} from './catalog-api-config.js';
export async function partnerFetch(path,{user,body,fetchImpl=fetch}={}){
  if(!/^\/api\/partners\/(click|handoff|list|admin|report|export)(\?|$)/.test(path))throw Error('Invalid partner route');
  if(CATALOG_WORKER_ORIGIN!=='https://atlas.meshstocks.workers.dev')throw Error('Invalid partner backend');
  const headers={};if(user)headers.Authorization='Bearer '+await user.getIdToken();
  if(body)headers['Content-Type']='application/json';
  const response=await fetchImpl(CATALOG_WORKER_ORIGIN+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!response.ok){let value;try{value=await response.json();}catch{}throw Error(value?.message||'Partner service unavailable or access denied');}
  return response;
}
