import {CATALOG_WORKER_ORIGIN} from './catalog-api-config.js';
export async function inventoryFetch(path,{user,body,fetchImpl=fetch}={}){
  if(!/^\/api\/inventory\/(list(?:\?(?:cursor|purchaseId)=.*)?|summary|command)$/.test(path)||CATALOG_WORKER_ORIGIN!=='https://atlas.meshstocks.workers.dev')throw Error('Invalid inventory destination.');
  if(!user)throw Error('Sign in with your Atlas operator account.');
  if(body&&new TextEncoder().encode(JSON.stringify(body)).length>20000){const error=Error('Delivery details are too long. Shorten them before saving.');error.confirmedRejected=true;throw error;}
  const response=await fetchImpl(CATALOG_WORKER_ORIGIN+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+await user.getIdToken(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000),redirect:'error',cache:'no-store'});
  if(!response.ok){let value;try{value=await response.json();}catch{}const error=Error(value?.message||'Private inventory is unavailable or access was denied.');error.confirmedRejected=response.status<500;throw error;}
  return response.json();
}
