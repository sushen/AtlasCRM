import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {parseHTML} from 'linkedom';
import {normalizeWhatsAppUsername,customerIdentity} from '../js/utils/customer-identity.js';
import {normalizePhone} from '../js/utils/phone.js';
import {prepareCustomerPurchase,productAccessStatus,customerMatches} from '../js/utils/customer-sales.js';
import {saveQuickLead} from '../js/services/quick-add.js';
import {renderQuickAdd} from '../js/views/quick-add.js';
const source=(await readFile(new URL('../js/services/store.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
function store(firebase=false){
  const queries=[],writes=[];let serial=0,existing=null;
  const fb={configured:firebase,db:{},collection:(_db,name)=>name,where:(field,op,value)=>{queries.push({field,op,value});return {};},limit:()=>1,query:()=>{},
    getDocs:async()=>({empty:!existing,docs:existing?[{id:existing.id,data:()=>existing}]:[]}),doc:collection=>({id:String(++serial),collection}),serverTimestamp:()=>({server:true}),
    writeBatch:()=>{const batch=[];return {set:(ref,data)=>batch.push({ref,data}),commit:async()=>writes.push(batch)};}};
  const api=new Function('fb','normalizePhone','normalizeWhatsAppUsername','prepareCustomerPurchase','productAccessStatus','localStorage','location','crypto',source+';return {createCustomer,listCustomers,listActivities,recordCustomerPurchase,listPurchases,scanDuplicates};')(
    fb,normalizePhone,normalizeWhatsAppUsername,prepareCustomerPurchase,productAccessStatus,{getItem:()=>null,setItem:()=>{}},{search:''},webcrypto);
  return {...api,queries,writes,setExisting:value=>{existing=value;}};
}
test('usernames normalize independently of phone numbers; invalid handles never become a number',async()=>{
  assert.equal(normalizeWhatsAppUsername(' @Fictional.Lead '),'fictional.lead');
  assert.equal(normalizeWhatsAppUsername('@12345678'),'12345678');
  for(const bad of ['a','contains space','https://example.invalid','@abc/def','x'.repeat(36)])assert.equal(normalizeWhatsAppUsername(bad),null);
  let calls=0;
  await assert.rejects(saveQuickLead({phone:'not a handle 12345678'},()=>{calls++;}),/valid WhatsApp username/);assert.equal(calls,0);
});
test('distinct username-only leads remain separate; matching handle returns untouched record with linked purchases',async()=>{
  const api=store();const first=await saveQuickLead({identifierType:'username',phone:'@Fictional.Lead'},api.createCustomer);
  const second=await saveQuickLead({identifierType:'username',phone:'another.lead'},api.createCustomer);
  assert.notEqual(first.customer.id,second.customer.id);assert.equal(first.customer.normalizedPhone,null);assert.equal(first.customer.phone,null);
  assert.equal(first.customer.whatsappUsername,'@fictional.lead');assert.equal(customerIdentity(first.customer),'@fictional.lead');
  assert.equal(customerMatches(first.customer,'FICTIONAL.LEAD'),true);
  await api.recordCustomerPurchase({customerId:first.customer.id,productName:'Fictional product',amount:200,paidAmount:200,currency:'BDT',purchasedAt:'2026-10-19',startDate:'2026-10-19',expiryDate:'2026-11-19'},'fictional-username-purchase');
  const before=structuredClone(await api.listCustomers()),history=structuredClone(await api.listActivities(first.customer.id));
  const duplicate=await saveQuickLead({phone:' @FICTIONAL.LEAD ',name:'Overwrite',notes:'Overwrite'},api.createCustomer);
  assert.equal(duplicate.duplicate,true);assert.equal(duplicate.customer.id,first.customer.id);
  assert.deepEqual(await api.listCustomers(),before);assert.deepEqual(await api.listActivities(first.customer.id),history);
  assert.equal((await api.listPurchases(first.customer.id)).length,1);
  assert.equal((await api.scanDuplicates()).duplicateGroups,0);
});
test('phone and numeric username stay in separate namespaces; Firebase username lookup never queries null phone',async()=>{
  const demo=store();const phone=await saveQuickLead({phone:'+12025550123'},demo.createCustomer);
  const handle=await saveQuickLead({phone:'@12025550123'},demo.createCustomer);assert.notEqual(handle.customer.id,phone.customer.id);assert.equal(customerMatches(phone.customer,'@12025550123'),false);assert.equal(customerMatches(handle.customer,'@12025550123'),true);
  const api=store(true);const saved=await saveQuickLead({phone:'@fictional.lead'},api.createCustomer);
  assert.deepEqual(api.queries,[{field:'normalizedWhatsAppUsername',op:'==',value:'fictional.lead'}]);
  assert.equal(api.writes[0][0].data.normalizedPhone,null);assert.equal(api.writes[0][0].data.normalizedWhatsAppUsername,'fictional.lead');
  api.setExisting(saved.customer);await saveQuickLead({phone:'@FICTIONAL.LEAD'},api.createCustomer);assert.equal(api.writes.length,1);
});
test('Quick Add shared field accepts no phone and opens the same record',async()=>{
  if(!globalThis.crypto)globalThis.crypto=webcrypto;
  const {document}=parseHTML('<main></main>'),el=document.querySelector('main');const api=store(),opened=[];
  renderQuickAdd(el,{createCustomer:api.createCustomer,openCustomer:async id=>opened.push(id)});
  assert.equal(el.querySelector('#lead-phone').type,'text');el.querySelector('#lead-phone').value='@Fictional.Lead';
  await el.querySelector('form').onsubmit({preventDefault(){}});
  assert.equal(opened.length,1);assert.equal((await api.listCustomers())[0].whatsappUsername,'@fictional.lead');
});
test('username contact dialog copies handle without constructing a phone URL or sending a message',async()=>{
  const app=await readFile(new URL('../js/app.js',import.meta.url),'utf8');
  const helper=app.slice(app.indexOf('function usernameContactModal(customer)'),app.indexOf('\nfunction waModal(id)'));
  const {document}=parseHTML('<html><body></body></html>'),copied=[];
  const show=new Function('document','esc','navigator',helper+';return usernameContactModal;')(document,String,{clipboard:{writeText:async value=>copied.push(value)}});
  show({whatsappUsername:'@fictional.lead'});await document.querySelector('[data-copy]').onclick();
  assert.deepEqual(copied,['@fictional.lead']);assert.equal(document.querySelectorAll('a[href]').length,0);
  assert.match(app,/if\(!c.normalizedPhone\)\{usernameContactModal\(c\);return;\}/);
});
