import {localSession,localStoreKey,sharedFirebase} from '../local-runtime.js';
export async function inventoryFetch(path,{body,user}={}){
  if(sharedFirebase&&!user)throw Error('Sign in with the existing CRM operator account.');
  const saved=JSON.parse(localStorage.getItem(localStoreKey)||'{}');
  // Only this browser's local test references are sent to the loopback service.
  const references={};for(const name of ['customers','products','purchases'])references[name]=(saved[name]||[]).map(row=>({id:row.id,name:row.name,active:row.active,customerId:row.customerId,productId:row.productId,paymentStatus:row.paymentStatus,expiryDate:row.expiryDate}));
  const response=await fetch(path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+(sharedFirebase?await user.getIdToken():localSession),...(sharedFirebase?{'X-Atlas-Local-Session':localSession}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify({command:body,...(sharedFirebase?{}:{references})})}:{}),cache:'no-store',redirect:'error'});
  if(!response.ok){const value=await response.json();const error=Error(value.message||'Local inventory service unavailable.');error.confirmedRejected=response.status<500;throw error;}return response.json();
}
