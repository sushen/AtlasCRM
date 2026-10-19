import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {parseHTML} from 'linkedom';
import {prepareCustomerPurchase,customerSalesSummary,customerMatches,productAccessStatus,businessDate} from '../js/utils/customer-sales.js';
import {normalizePhone} from '../js/utils/phone.js';
import {customerIdentity} from '../js/utils/customer-identity.js';
import {renderCustomerSales} from '../js/views/customer-sales.js';

const input={customerId:'fictional-customer',productName:'Fictional plan',amount:'500',paidAmount:'300',currency:'BDT',purchasedAt:'2026-10-19',startDate:'2026-10-20',expiryDate:'2026-11-20'};
const request='fictional-request-123456';
const source=(await readFile(new URL('../js/services/store.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
function store({firebase=false,status='new',fail=false,storageFail=false}={}) {
  const data=new Map([['customers/'+input.customerId,{id:input.customerId,name:'Fictional',normalizedPhone:'+8801712345678',status,notes:'Keep history',nextFollowUpAt:'2026-11-01'}]]);
  const transactions=[];let writes=0;
  const fb={configured:firebase,db:{},doc:(_db,collection,id)=>({id,path:collection+'/'+id}),serverTimestamp:()=>({server:true}),
    runTransaction:async(_db,callback)=>{
      const pending=[];const result=await callback({get:async ref=>({id:ref.id,exists:()=>data.has(ref.path),data:()=>structuredClone(data.get(ref.path))}),
        set:(ref,value)=>pending.push({ref,value}),update:(ref,value)=>pending.push({ref,value,update:true})});
      if(fail)throw Error('sensitive provider details');
      for(const {ref,value,update} of pending)data.set(ref.path,update?{...data.get(ref.path),...value}:structuredClone(value));
      transactions.push(pending);writes+=pending.length;return result;
    }};
  const localStorage={getItem:()=>JSON.stringify({customers:[data.get('customers/'+input.customerId)],activities:[{id:'old',customerId:input.customerId,type:'note_added',note:'Existing history'}]}),setItem:()=>{if(storageFail)throw Error('Quota');}};
  const api=new Function('fb','normalizePhone','prepareCustomerPurchase','productAccessStatus','localStorage','location','crypto',source+';return {recordCustomerPurchase,listPurchases,listSubscriptions,listActivities,getCustomer};')(
    fb,normalizePhone,prepareCustomerPurchase,productAccessStatus,localStorage,{search:''},webcrypto);
  return {...api,data,transactions,get writes(){return writes;}};
}
test('purchase validation requires explicit price/paid amounts, real dates, sensible expiry and currency',()=>{
  assert.equal(prepareCustomerPurchase(input).paymentStatus,'partial');
  assert.equal(prepareCustomerPurchase({...input,paidAmount:'500'}).paymentStatus,'paid');
  for(const patch of [{productName:''},{amount:''},{amount:'NaN'},{paidAmount:'-1'},{paidAmount:'501'},{currency:'abc'},{startDate:'2026-02-30'},{expiryDate:'2026-10-01'},{purchasedAt:'2026-99-99'}])assert.throws(()=>prepareCustomerPurchase({...input,...patch}));
  assert.equal(prepareCustomerPurchase({...input,expiryDate:null}).expiryDate,null);
});
test('phone search accepts pasted local/international formatting, and access dates use inclusive Bangladesh days',()=>{
  const customer={normalizedPhone:'+8801712345678',name:'Demo'};
  for(const query of ['017 1234-5678','+880 1712 345678','8801712345678','Demo'])assert.equal(customerMatches(customer,query),true);
  assert.equal(customerMatches(customer,'other'),false);
  assert.equal(businessDate(new Date('2026-10-18T19:00:00Z')),'2026-10-19');
  assert.equal(productAccessStatus({startDate:'2026-10-20',expiryDate:'2026-11-20'},'2026-10-19'),'Upcoming');
  assert.equal(productAccessStatus({expiryDate:'2026-10-19'},'2026-10-19'),'Expiring soon');
  assert.equal(productAccessStatus({expiryDate:'2026-10-18'},'2026-10-19'),'Expired');
});
test('spending does not combine currencies, count subscriptions twice, or invent unknown partial payments',()=>{
  const report=customerSalesSummary([{amount:500,paidAmount:300,currency:'BDT',paymentStatus:'partial'},
    {amount:10,currency:'USD',paymentStatus:'paid'},{amount:100,currency:'BDT',paymentStatus:'pending'},
    {amount:80,currency:'BDT',paymentStatus:'partial'},{amount:20,currency:'USD',paymentStatus:'refunded'}]);
  assert.equal(report.purchaseCount,4);
  assert.deepEqual(report.totals,[{currency:'BDT',spent:300,outstanding:300,unknownPayments:1},{currency:'USD',spent:10,outstanding:0,unknownPayments:0}]);
});
test('demo save links two purchases, preserves timeline/follow-up, promotes customer and safely retries',async()=>{
  const api=store();await api.recordCustomerPurchase(input,request);
  await api.recordCustomerPurchase(input,request);
  await api.recordCustomerPurchase({...input,productName:'Second product'},request+'-two');
  assert.equal((await api.listPurchases(input.customerId)).length,2);
  const subscriptions=await api.listSubscriptions(input.customerId);assert.equal(subscriptions.length,2);assert.ok(subscriptions[0].purchaseId);
  const c=await api.getCustomer(input.customerId);assert.equal(c.status,'customer');assert.equal(c.notes,'Keep history');assert.equal(c.nextFollowUpAt,'2026-11-01');
  const activities=await api.listActivities(input.customerId);assert.equal(activities.length,3);assert.equal(activities[0].note,'Existing history');
  await assert.rejects(api.recordCustomerPurchase({...input,amount:900},request),/differs/);
});
test('Firestore commits linked records and server timestamps atomically; existing request makes no writes',async()=>{
  const api=store({firebase:true,status:'do_not_contact'});await api.recordCustomerPurchase(input,request);
  assert.equal(api.writes,4);assert.deepEqual(api.data.get('purchases/manual-'+request).createdAt,{server:true});
  assert.equal(api.data.get('subscriptions/manual-'+request).purchaseId,'manual-'+request);
  assert.equal(api.data.get('customers/'+input.customerId).status,'do_not_contact');
  assert.equal(api.data.get('customers/'+input.customerId).customerStatus,'customer');
  await api.recordCustomerPurchase(input,request);assert.equal(api.writes,4);
  const failed=store({firebase:true,fail:true});await assert.rejects(failed.recordCustomerPurchase(input,request),/Could not confirm/);assert.equal(failed.writes,0);assert.equal(failed.data.size,1);
});
test('demo quota failure leaves all in-memory records untouched; no-expiry product needs no subscription',async()=>{
  const failed=store({storageFail:true});await assert.rejects(failed.recordCustomerPurchase(input,request),/browser/);
  assert.equal((await failed.listPurchases(input.customerId)).length,0);assert.equal((await failed.getCustomer(input.customerId)).status,'new');
  const api=store();await api.recordCustomerPurchase({...input,expiryDate:null},request);
  assert.equal((await api.listSubscriptions(input.customerId)).length,0);assert.equal((await api.listPurchases(input.customerId)).length,1);
});
async function view(overrides={}){
  const {document}=parseHTML('<main></main>');const el=document.querySelector('main');
  await renderCustomerSales(el,{customer:{id:input.customerId},listPurchases:async()=>[],listSubscriptions:async()=>[],listProducts:async()=>[],recordPurchase:async()=>{},onSaved:async()=>{},...overrides});
  return {el,document};
}
test('profile displays escaped product snapshots and separate legacy subscriptions without double-counting',async()=>{
  const {el}=await view({listPurchases:async()=>[{id:'p',...prepareCustomerPurchase({...input,productName:'<script>fake</script>'})}],
    listSubscriptions:async()=>[{purchaseId:'p',startDate:input.startDate,expiryDate:input.expiryDate},{productName:'Older plan',startDate:'2026-01-01',expiryDate:'2026-02-01'}]});
  assert.match(el.textContent,/300 BDT/);assert.match(el.textContent,/1 purchase/);assert.match(el.textContent,/2026-11-20/);assert.match(el.textContent,/Older plan/);assert.equal(el.querySelectorAll('script').length,0);
});
test('form prevents repeated taps and preserves request ID through save retry; refresh failure cannot resave',async()=>{
  if(!globalThis.crypto)globalThis.crypto=webcrypto;
  const calls=[];let finish;
  const {el}=await view({recordPurchase:async(data,id)=>{calls.push({data,id});if(calls.length===1)throw Error('Could not confirm. Retry.');await new Promise(r=>{finish=r;});},onSaved:async()=>{throw Error('refresh failed');}});
  el.querySelector('[data-add-product]').onclick();const form=el.querySelector('form');
  for(const [key,value] of Object.entries(input)){const f=form.querySelector(`[name="${key}"]`);if(f?.tagName==='SELECT'){for(const option of f.querySelectorAll('option'))option.selected=option.textContent===value;}else if(f)f.value=value;}
  await form.onsubmit({preventDefault(){}});assert.equal(el.querySelector('[data-save-purchase]').disabled,false);
  const retry=form.onsubmit({preventDefault(){}});await form.onsubmit({preventDefault(){}});assert.equal(calls.length,2);
  assert.equal(calls[0].id,calls[1].id);finish();await retry;await form.onsubmit({preventDefault(){}});assert.equal(calls.length,2);
  assert.match(el.querySelector('[data-sales-status]').textContent,/Purchase saved/);
});
test('inventory assignment uses a short customer term rather than supplier years and requires actual paid amount',async()=>{
 const products=[{id:'k12',name:'Fictional K12 account',price:4.19,currency:'USD',durationYears:2}];
 const {el}=await view({listProducts:async()=>products,listInventory:async()=>[{id:'owned',state:'available',sharedAccount:true,label:'Owned account',enabledProductIds:['k12']}]});
 el.querySelector('[data-add-product]').onclick();const form=el.querySelector('form'),field=name=>form.querySelector(`[name="${name}"]`);
 Object.defineProperty(field('currency'),'value',{configurable:true,get(){return this.querySelector('option[selected]')?.textContent||'BDT';},set(value){this.querySelectorAll('option').forEach(o=>{o.selected=o.textContent===value;});}});
 field('productId').querySelectorAll('option').forEach(o=>o.selected=o.value==='k12');field('productId').onchange();
 assert.equal(field('amount').value,'4.19');assert.equal(field('paidAmount').value,'');assert.equal(field('expiryDate').value,'');
 assert.match(field('inventoryUnitId').textContent,/Owned account/);
 field('startDate').value='2026-10-19';field('accessDays').value='3';field('accessDays').oninput();
 assert.equal(field('expiryDate').value,'2026-10-22');
});
test('unknown paid amount is excluded from totals and unknown expiry is not perpetual access',()=>{
 const summary=customerSalesSummary([{amount:1,paidAmount:1,currency:'USD',paymentStatus:'paid'},{amount:4.19,paidAmount:null,currency:'USD',paymentStatus:'paid_amount_unknown'}]);
 assert.equal(summary.purchaseCount,2);assert.equal(summary.totals[0].spent,1);assert.equal(summary.unrecordedPayments,1);
 assert.equal(productAccessStatus({startDate:'2026-10-19',expiryDate:null,expiryUnknown:true},'2026-10-19'),'Access term not recorded');
});
test('real profile connects sales outside timeline and phone search uses shared normalization',async()=>{
  const app=await readFile(new URL('../js/app.js',import.meta.url),'utf8');
  const profileSource=app.slice(app.indexOf('async function profile(id)'),app.indexOf('\nfunction waModal(id)'));
  const {document}=parseHTML('<html><body></body></html>');let salesArgs;
  const profile=new Function('document','getCustomer','listActivities','esc','formatDate','formatDateTime','statusLabels','renderCustomerSales','listPurchases','listSubscriptions','listProducts','recordCustomerPurchase','customerIdentity',profileSource+';return profile;')(
    document,async()=>({id:input.customerId,name:'Fictional',status:'new'}),async()=>[],String,()=>'',()=>'',{new:'New'},
    async(el,args)=>{assert.equal(el.parentElement.className,'modal-body');salesArgs=args;},async()=>[],async()=>[],async()=>[],async()=>{},customerIdentity);
  await profile(input.customerId);assert.equal(salesArgs.customer.id,input.customerId);
  assert.equal(document.querySelectorAll('.customer-profile').length,1);
  assert.match(app,/filtered\.filter\(c=>customerMatches\(c,q\)/);
});
