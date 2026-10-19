import * as fb from '../firebase.js';
import { normalizePhone } from '../utils/phone.js';
import {normalizeWhatsAppUsername} from '../utils/customer-identity.js';
import {prepareCustomerPurchase,productAccessStatus} from '../utils/customer-sales.js';

const key='atlas_demo_store';
const now=()=>new Date().toISOString();
let demo=JSON.parse(localStorage.getItem(key)||'{"customers":[],"activities":[],"followups":[],"products":[],"purchases":[],"subscriptions":[],"templates":[]}');
['customers','activities','followups','products','purchases','subscriptions','templates','messages'].forEach(k=>{if(!demo[k])demo[k]=[]});
const persist=()=>localStorage.setItem(key,JSON.stringify(demo));
export const statuses=['new','not_contacted','contacted','replied','interested','negotiating','customer','follow_up','no_response','inactive','blocked','do_not_contact'];
export const statusLabels={new:'New',not_contacted:'Not contacted',contacted:'Contacted',replied:'Replied',interested:'Interested',negotiating:'Negotiating',customer:'Customer',follow_up:'Follow-up',no_response:'No response',inactive:'Inactive',blocked:'Blocked',do_not_contact:'Do not contact'};
export function isDemo(){return !fb.configured||location.search.includes('demo=1')}
const listCollection=async name=>{if(isDemo())return demo[name]||[];const s=await fb.getDocs(fb.collection(fb.db,name));return s.docs.map(d=>({id:d.id,...d.data()}))};
export async function listCustomers(){return listCollection('customers')}
export async function getCustomer(id){if(isDemo())return demo.customers.find(x=>x.id===id);const s=await fb.getDoc(fb.doc(fb.db,'customers',id));return s.exists()?{id:s.id,...s.data()}:null}
export async function listActivities(id){if(isDemo())return demo.activities.filter(x=>x.customerId===id).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));const s=await fb.getDocs(fb.query(fb.collection(fb.db,'activities'),fb.where('customerId','==',id),fb.orderBy('createdAt','asc')));return s.docs.map(d=>({id:d.id,...d.data()}))}
export async function addActivity(customerId,type,note='',metadata={}){const a={customerId,type,description:note,note,metadata,createdAt:now()};if(isDemo()){const out={id:crypto.randomUUID(),...a};demo.activities.push(out);persist();return out}const ref=await fb.addDoc(fb.collection(fb.db,'activities'),{...a,createdAt:fb.serverTimestamp()});return {id:ref.id,...a}}
export async function createCustomer(input,{activityType="imported",activityNote="WhatsApp lead imported"}={}) {
  const phone=normalizePhone(input.phone||input.whatsapp);
  const username=input.whatsappUsername?normalizeWhatsAppUsername(input.whatsappUsername):null;
  if(input.whatsappUsername&&!username)throw Error('Invalid WhatsApp username');
  if(!phone&&!username)throw Error('Invalid phone number or WhatsApp username');
  if((input.phone||input.whatsapp)&&!phone)throw Error('Invalid phone number');
  const c={name:input.name||input.display_name||'',phone,normalizedPhone:phone,whatsappNumber:phone,
    ...(username?{whatsappUsername:'@'+username,normalizedWhatsAppUsername:username}:{}),
    source:input.source||'WhatsApp numbers import',sourceGroup:input.sourceGroup||input.source_group||'WhatsApp numbers file',
    status:input.status||input.lead_status||'new',customerStatus:input.customerStatus||input.customer_status||'lead',tags:input.tags||['imported','whatsapp-lead'],notes:input.notes||'',
    importedAt:now(),firstContactedAt:null,lastContactedAt:null,nextFollowUpAt:null,lastReplyAt:null,contactAttempts:0,createdAt:now(),updatedAt:now()};
  // Never query null phone values: unrelated username-only leads must stay separate.
  const matchField=phone?'normalizedPhone':'normalizedWhatsAppUsername',matchValue=phone||username;
  if(isDemo()){
    const existing=demo.customers.find(x=>x[matchField]===matchValue);if(existing)return {customer:existing,duplicate:true};
    c.id=crypto.randomUUID();
    const next={...demo,customers:[...demo.customers,c],activities:[...demo.activities,{id:crypto.randomUUID(),customerId:c.id,type:activityType,note:activityNote,description:activityNote,metadata:{},createdAt:now()}]};
    localStorage.setItem(key,JSON.stringify(next));demo=next;return {customer:c,duplicate:false};
  }
  const existingSnap=await fb.getDocs(fb.query(fb.collection(fb.db,'customers'),fb.where(matchField,'==',matchValue),fb.limit(1)));
  if(!existingSnap.empty){const d=existingSnap.docs[0];return {customer:{id:d.id,...d.data()},duplicate:true};}
  const ref=fb.doc(fb.collection(fb.db,'customers')),batch=fb.writeBatch(fb.db);
  batch.set(ref,{...c,importedAt:fb.serverTimestamp(),createdAt:fb.serverTimestamp(),updatedAt:fb.serverTimestamp()});
  batch.set(fb.doc(fb.collection(fb.db,'activities')),{customerId:ref.id,type:activityType,description:activityNote,note:activityNote,metadata:{},createdAt:fb.serverTimestamp()});
  await batch.commit();return {customer:{id:ref.id,...c},duplicate:false};
}

export async function updateCustomer(id,patch){const data={...patch,updatedAt:now()};if(isDemo()){const i=demo.customers.findIndex(x=>x.id===id);if(i<0)throw Error('Customer not found');demo.customers[i]={...demo.customers[i],...data};persist();return demo.customers[i]}await fb.updateDoc(fb.doc(fb.db,'customers',id),{...data,updatedAt:fb.serverTimestamp()});return getCustomer(id)}
const usefulFields=['name','phone','normalizedPhone','whatsappNumber','whatsappUsername','normalizedWhatsAppUsername','status','customerStatus','tags','notes','importedAt','createdAt','updatedAt','firstContactedAt','lastContactedAt','lastReplyAt','nextFollowUpAt','contactAttempts','source','sourceGroup'];
const valueScore=c=>usefulFields.reduce((n,k)=>n+(Array.isArray(c[k])?c[k].length?1:0:(c[k]!==null&&c[k]!==undefined&&c[k]!==''&&c[k]!==0?1:0)),0)+(c.notes?String(c.notes).length/100:0);
const mergeFields=(master,records)=>{const out={...master};for(const k of usefulFields){if((out[k]===null||out[k]===undefined||out[k]===''||(Array.isArray(out[k])&&!out[k].length))){const candidate=records.find(r=>r[k]!==null&&r[k]!==undefined&&r[k]!==''&&(!Array.isArray(r[k])||r[k].length));if(candidate)out[k]=candidate[k]}}out.tags=[...new Set(records.flatMap(r=>Array.isArray(r.tags)?r.tags:[]))];out.contactAttempts=Math.max(...records.map(r=>Number(r.contactAttempts)||0));return out};
export async function scanDuplicates(){const all=await listCustomers();const groups=new Map();for(const c of all){const phone=c.normalizedPhone||normalizePhone(c.phone||c.whatsappNumber);if(!phone)continue;if(!groups.has(phone))groups.set(phone,[]);groups.get(phone).push({...c,normalizedPhone:phone})}const duplicates=[...groups.entries()].filter(([,records])=>records.length>1).map(([phone,records])=>({phone,records:records.sort((a,b)=>valueScore(b)-valueScore(a)),duplicateCount:records.length-1}));return {totalRecords:all.length,uniquePhoneNumbers:groups.size,duplicateGroups:duplicates.length,duplicateRecords:duplicates.reduce((n,g)=>n+g.duplicateCount,0),groups:duplicates}}
const duplicateRelatedNames=['activities','followups','purchases','subscriptions','messages'];
let mergeAllRunning=false;
async function mergeDuplicateGroupSnapshot(group,masterId,relatedByCustomerId){const master=group.records.find(r=>r.id===masterId)||group.records[0];if(!master)throw Error('Duplicate group has no customer records');const redundant=group.records.filter(r=>r.id!==master.id);const merged=mergeFields(master,group.records);if(isDemo()){for(const name of duplicateRelatedNames)for(const item of demo[name]||[])if(redundant.some(r=>r.id===item.customerId))item.customerId=master.id;const i=demo.customers.findIndex(c=>c.id===master.id);if(i<0)throw Error(`Master customer ${master.id} not found`);demo.customers[i]={...demo.customers[i],...merged,id:master.id,updatedAt:now()};demo.customers=demo.customers.filter(c=>!redundant.some(r=>r.id===c.id));await addActivity(master.id,'duplicate_merged',`Merged ${redundant.length} duplicate customer record(s) for ${group.phone}`);persist();return {phone:group.phone,masterId:master.id,removed:redundant.length}}
const allRelated=relatedByCustomerId?duplicateRelatedNames.flatMap(name=>(relatedByCustomerId.get(name)||[]).filter(item=>redundant.some(r=>r.id===item.customerId)).map(item=>({name,id:item.id}))):[];
const ops=[{name:'customers',id:master.id,data:{...merged,updatedAt:fb.serverTimestamp()}},...allRelated.map(x=>({name:x.name,id:x.id,data:{customerId:master.id}})),...redundant.map(r=>({name:'customers',id:r.id,delete:true})),{name:'activities',id:null,data:{customerId:master.id,type:'duplicate_merged',note:`Merged ${redundant.length} duplicate customer record(s) for ${group.phone}`,description:`Merged ${redundant.length} duplicate customer record(s) for ${group.phone}`,metadata:{mergedCustomerIds:redundant.map(r=>r.id)},createdAt:fb.serverTimestamp()}}];for(let start=0;start<ops.length;start+=450){const batch=fb.writeBatch(fb.db);for(const op of ops.slice(start,start+450)){if(op.id===null)batch.set(fb.doc(fb.collection(fb.db,op.name)),op.data);else if(op.delete)batch.delete(fb.doc(fb.db,op.name,op.id));else batch.update(fb.doc(fb.db,op.name,op.id),op.data)}await batch.commit()}return {phone:group.phone,masterId:master.id,removed:redundant.length}}
export async function mergeDuplicateGroup(phone,masterId){if(mergeAllRunning)throw Error('A duplicate merge operation is already running');const scan=await scanDuplicates();const group=scan.groups.find(g=>g.phone===phone);if(!group)throw Error('Duplicate group not found');let relatedByCustomerId=null;if(!isDemo()){relatedByCustomerId=new Map();for(const name of duplicateRelatedNames){const snap=await fb.getDocs(fb.collection(fb.db,name));relatedByCustomerId.set(name,snap.docs.map(d=>({id:d.id,customerId:d.data().customerId})))} }return mergeDuplicateGroupSnapshot(group,masterId,relatedByCustomerId)}
export async function deleteDuplicate(id){const scan=await scanDuplicates();const group=scan.groups.find(g=>g.records.some(r=>r.id===id));if(!group)throw Error('Duplicate record not found');const master=group.records.find(r=>r.id!==id);if(!master)throw Error('A retained customer record is required');return mergeDuplicateGroup(group.phone,master.id)}
export async function mergeAllDuplicates({scan:providedScan,onProgress}={}){if(mergeAllRunning)throw Error('A duplicate merge operation is already running');mergeAllRunning=true;const results=[],failed=[];let relatedByCustomerId=null,scan;try{scan=providedScan||await scanDuplicates();if(!isDemo()){relatedByCustomerId=new Map();for(const name of duplicateRelatedNames){const snap=await fb.getDocs(fb.collection(fb.db,name));relatedByCustomerId.set(name,snap.docs.map(d=>({id:d.id,customerId:d.data().customerId})))} }for(let index=0;index<scan.groups.length;index++){const group=scan.groups[index];try{const result=await mergeDuplicateGroupSnapshot(group,group.records[0]?.id,relatedByCustomerId);results.push(result);onProgress?.({completed:index+1,total:scan.groups.length,removed:results.reduce((n,item)=>n+item.removed,0),succeeded:results.length,failed:failed.length,group})}catch(error){const diagnostic={phone:group.phone,masterId:group.records[0]?.id||null,duplicateIds:group.records.slice(1).map(r=>r.id),error};failed.push(diagnostic);console.error('Duplicate group merge failed',diagnostic);onProgress?.({completed:index+1,total:scan.groups.length,removed:results.reduce((n,item)=>n+item.removed,0),succeeded:results.length,failed:failed.length,group,error})}}return {results,failed,succeeded:results.length,groupsProcessed:scan.groups.length,removed:results.reduce((n,item)=>n+item.removed,0),mastersRetained:results.length}}finally{mergeAllRunning=false}}
export async function transition(id,toStatus,note=''){const c=await getCustomer(id);if(!c)throw Error('Customer not found');if(c.status===toStatus&&toStatus!=='contacted')return c;const patch={status:toStatus};if(toStatus==='contacted'){patch.firstContactedAt=c.firstContactedAt||now();patch.lastContactedAt=now();patch.contactAttempts=(c.contactAttempts||0)+1}if(toStatus==='replied'){patch.firstContactedAt=c.firstContactedAt||now();patch.lastContactedAt=c.lastContactedAt||now();patch.lastReplyAt=now()}const updated=await updateCustomer(id,patch);await addActivity(id,toStatus==='contacted'?'message_marked_sent':'status_changed',`${statusLabels[c.status]} -> ${statusLabels[toStatus]}${note?' - '+note:''}`);if(toStatus==='replied')await addActivity(id,'reply_recorded','Reply recorded manually');return updated}
export async function listFollowups(){return listCollection('followups')}
export async function createFollowup(customerId,dueAt,note=''){const f={customerId,dueAt,status:'pending',note,createdAt:now(),completedAt:null};if(isDemo()){f.id=crypto.randomUUID();demo.followups.push(f);persist()}else{const r=await fb.addDoc(fb.collection(fb.db,'followups'),{...f,createdAt:fb.serverTimestamp(),dueAt:fb.Timestamp.fromDate(new Date(dueAt))});f.id=r.id}await updateCustomer(customerId,{nextFollowUpAt:dueAt,status:'follow_up'});await addActivity(customerId,'follow_up_created',note);return f}
export async function completeFollowup(id){const f=demo.followups.find(x=>x.id===id);if(isDemo()){if(!f)throw Error('Follow-up not found');f.status='completed';f.completedAt=now();persist();await addActivity(f.customerId,'follow_up_completed');return f}await fb.updateDoc(fb.doc(fb.db,'followups',id),{status:'completed',completedAt:fb.serverTimestamp()});return true}
const addCollection=async(name,input)=>{const item={...input,createdAt:now(),updatedAt:now()};if(isDemo()){item.id=crypto.randomUUID();demo[name].push(item);persist();return item}const ref=await fb.addDoc(fb.collection(fb.db,name),{...item,createdAt:fb.serverTimestamp(),updatedAt:fb.serverTimestamp()});return {id:ref.id,...item}};
export const productDefaults=[{name:'ChatGPT subscription',durationDays:30,price:0,active:true},{name:'Codex subscription',durationDays:30,price:0,active:true},{name:'Canva subscription',durationDays:30,price:0,active:true},{name:'Other digital subscription',durationDays:30,price:0,active:true}];
export const paymentStatuses=['pending','paid','partial','refunded','cancelled'];
export const subscriptionStatuses=['active','expiring','expired','renewed','cancelled'];
export const listProducts=()=>listCollection('products');
export const createProduct=input=>addCollection('products',{name:input.name||'Unnamed product',description:input.description||'',price:Number(input.price)||0,currency:input.currency||'BDT',durationDays:Number(input.durationDays)||30,active:input.active!==false});
export async function listPurchases(customerId){const all=await listCollection('purchases');return customerId?all.filter(x=>x.customerId===customerId):all}
export async function createPurchase(input){const p=await addCollection('purchases',{customerId:input.customerId,productId:input.productId||null,amount:Number(input.amount)||0,currency:input.currency||'BDT',paymentStatus:input.paymentStatus||'paid',paymentMethod:input.paymentMethod||'',purchasedAt:input.purchasedAt||now(),notes:input.notes||''});await addActivity(input.customerId,'purchase_added',`Purchase recorded: ${p.amount} ${p.currency}`);return p}
export function deriveSubscriptionStatus(expiry,status='active',startDate){const label=productAccessStatus({expiryDate:expiry,status,startDate});return ({Upcoming:'upcoming',Expired:'expired','Expiring soon':'expiring',Active:'active','No expiry':'active','Dates not recorded':'unknown'})[label]||label}
export async function listSubscriptions(customerId){const all=await listCollection('subscriptions');return all.filter(x=>!customerId||x.customerId===customerId).map(x=>({...x,status:deriveSubscriptionStatus(x.expiryDate,x.status,x.startDate)}))}
export async function createSubscription(input){const s=await addCollection('subscriptions',{customerId:input.customerId,productId:input.productId||null,startDate:input.startDate||now().slice(0,10),expiryDate:input.expiryDate,status:deriveSubscriptionStatus(input.expiryDate,input.status||'active'),amount:Number(input.amount)||0,autoRenew:Boolean(input.autoRenew),notes:input.notes||''});await addActivity(input.customerId,'subscription_created',`Subscription expires ${s.expiryDate}`);return s}
export const listTemplates=()=>listCollection('templates');
export const createTemplate=input=>addCollection('templates',{name:input.name||'Custom message',category:input.category||'Custom',body:input.body||''});


// One operator action owns the linked purchase, optional expiry record and timeline.
// A stable request ID also makes retry after an unknown network outcome safe.
export async function recordCustomerPurchase(input,requestId) {
  const data=prepareCustomerPurchase(input);
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(requestId||''))throw Error('Reopen the purchase form and try again.');
  const id='manual-'+requestId;
  const previousResult=previous=>{
    if(Object.keys(data).some(key=>previous[key]!==data[key]))throw Error('This saved purchase differs from the current form. Close and reopen the customer before adding another purchase.');
    return previous;
  };
  const customerPatch=customer=>({customerStatus:'customer',...(['blocked','do_not_contact','inactive','not_interested'].includes(customer.status)?{}:{status:'customer'})});
  const activity={customerId:data.customerId,type:'purchase_added',note:`Manual purchase: ${data.productName}; ${data.paidAmount} ${data.currency} paid of ${data.amount}; start ${data.startDate}; expiry ${data.expiryDate||'none'}`,description:'Purchased product attached manually',metadata:{purchaseId:id,productName:data.productName}};
  const subscription={customerId:data.customerId,purchaseId:id,productId:data.productId,productName:data.productName,startDate:data.startDate,expiryDate:data.expiryDate,status:'active',amount:data.amount,currency:data.currency,autoRenew:false,notes:data.notes};
  if(isDemo()){
    const prior=demo.purchases.find(p=>p.id===id);if(prior)return previousResult(prior);
    const customer=demo.customers.find(c=>c.id===data.customerId);if(!customer)throw Error('Customer not found.');
    const stamp=now(),purchase={id,...data,createdAt:stamp,updatedAt:stamp};
    const next={...demo,purchases:[...demo.purchases,purchase],activities:[...demo.activities,{id,...activity,createdAt:stamp}],
      subscriptions:data.expiryDate?[...demo.subscriptions,{id,...subscription,createdAt:stamp,updatedAt:stamp}]:demo.subscriptions,
      customers:demo.customers.map(c=>c.id===data.customerId?{...c,...customerPatch(c),updatedAt:stamp}:c)};
    try{localStorage.setItem(key,JSON.stringify(next));}catch{throw Error('Could not save in this browser. Free some browser storage and retry.');}
    demo=next;return purchase;
  }
  try{
    return await fb.runTransaction(fb.db,async transaction=>{
      const purchaseRef=fb.doc(fb.db,'purchases',id),customerRef=fb.doc(fb.db,'customers',data.customerId);
      const prior=await transaction.get(purchaseRef);if(prior.exists())return previousResult({id:prior.id,...prior.data()});
      const customer=await transaction.get(customerRef);if(!customer.exists())throw Error('Customer not found.');
      const stamp=fb.serverTimestamp();
      transaction.set(purchaseRef,{...data,createdAt:stamp,updatedAt:stamp});
      if(data.expiryDate)transaction.set(fb.doc(fb.db,'subscriptions',id),{...subscription,createdAt:stamp,updatedAt:stamp});
      transaction.set(fb.doc(fb.db,'activities',id),{...activity,createdAt:stamp});
      transaction.update(customerRef,{...customerPatch(customer.data()),updatedAt:stamp});
      return {id,...data};
    });
  }catch(error){
    if(error.message==='Customer not found.'||error.message?.startsWith('This saved purchase differs'))throw error;
    throw Error('Could not confirm the purchase save. Check your connection and operator sign-in, then retry this form.');
  }
}
