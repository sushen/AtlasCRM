import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageRepository} from '../server/repository.mjs';
import {customerJourney} from '../js/utils/customer-journey.js';
import {prepareCustomerPurchase} from '../js/utils/customer-sales.js';
import {renderCustomerJourney} from '../js/views/customer-journey.js';
import {parseHTML} from 'linkedom';

function fixture(){
  const data=new Map();let now='2026-10-19T08:00:00Z';
  const repository=new MessageRepository({now:()=>now,transaction:async callback=>{
    const writes=[];const result=await callback({get:async(c,id)=>structuredClone(data.get(c+'/'+id)||null),
      findCustomer:async phone=>{const entry=[...data].find(([key,value])=>key.startsWith('customers/')&&value.normalizedPhone===phone);return entry?{...entry[1],id:entry[0].split('/')[1]}:null;},
      set:(c,id,value)=>writes.push([c+'/'+id,structuredClone(value)])});for(const [key,value]of writes)data.set(key,value);return result;
  }});
  return {repository,data,setTime:value=>{now=value;},rows:collection=>[...data].filter(([key])=>key.startsWith(collection+'/')).map(([key,value])=>({id:key.split('/')[1],...value}))};
}
test('verified inbound → deduplicated lead → reply acceptance → purchase → subscription → renewal is one linked journey',async()=>{
  const f=fixture();
  const event={kind:'message',externalMessageId:'wamid.fictional-journey',sender:'+15550001234',profileName:'Fictional customer',body:'I want a subscription',timestamp:'2026-10-19T08:00:00Z',messageType:'text',channel:'whatsapp',direction:'inbound',metadata:{}};
  await f.repository.accept(event);await f.repository.accept(event);
  let customer=f.rows('customers')[0];assert.equal(f.rows('customers').length,1);assert.equal(f.rows('messages').length,1);
  let journey=customerJourney(customer,{activities:f.rows('activities'),today:'2026-10-19'});
  assert.equal(journey.stage,'conversation');assert.equal(journey.replyNeeded,true);assert.equal(customer.status,'new');
  f.setTime('2026-10-19T08:05:00Z');const attempt=await f.repository.prepareSend('+15550001234','How can I help?');
  await f.repository.finishSend(attempt,{externalMessageId:'wamid.fictional-reply',phoneNumberId:'fixture'});
  journey=customerJourney(customer,{activities:f.rows('activities'),today:'2026-10-19'});
  assert.equal(journey.replyNeeded,false);assert.equal(f.rows('messages').find(m=>m.direction==='outbound').deliveryStatus,'accepted');
  customer={...customer,status:'interested'};assert.equal(customerJourney(customer).stage,'interested');
  const purchase=prepareCustomerPurchase({customerId:customer.id,productName:'Fictional monthly plan',amount:'10',paidAmount:'10',currency:'USD',purchasedAt:'2026-10-19',startDate:'2026-10-19',expiryDate:'2026-11-19'});
  const pending={...purchase,paidAmount:0,paymentStatus:'pending'};
  assert.equal(customerJourney(customer,{purchases:[pending]}).next,'Review outstanding payment');
  assert.equal(customerJourney(customer,{purchases:[purchase]}).stage,'purchase');
  const subscription={...purchase,status:'active'};
  assert.equal(customerJourney(customer,{purchases:[purchase],subscriptions:[subscription],today:'2026-10-19'}).stage,'subscription');
  journey=customerJourney(customer,{purchases:[purchase],subscriptions:[subscription],today:'2026-11-15'});
  assert.equal(journey.stage,'renewal');assert.equal(journey.next,'Review subscription renewal');
  assert.equal(customerJourney(customer,{purchases:[purchase],subscriptions:[subscription],today:'2026-11-20'}).access[0].access,'Expired');
  assert.equal(f.rows('customers')[0].status,'new','Projection must not overwrite business qualification');
});
test('suppression wins over reply and renewal actions; other customer data never leaks into a journey',()=>{
  const customer={id:'one',status:'do_not_contact'};
  const journey=customerJourney(customer,{activities:[{customerId:'one',type:'whatsapp_message_received',createdAt:'2026-10-19',note:'Hello'},{customerId:'other',type:'whatsapp_message_received',note:'private-other'}],purchases:[{customerId:'other',paidAmount:100,currency:'USD'}]});
  assert.equal(journey.replyNeeded,false);assert.equal(journey.next,'Do not contact');assert.ok(!JSON.stringify(journey).includes('private-other'));assert.equal(journey.summary.purchaseCount,0);
});
test('opening WhatsApp or marking sent is not a provider message or proof of delivery',()=>{
  const journey=customerJourney({id:'one',status:'new'},{activities:[{customerId:'one',type:'whatsapp_opened',note:'Opened'},{customerId:'one',type:'message_marked_sent',note:'Manual'}]});
  assert.equal(journey.stage,'lead');assert.deepEqual(journey.messages,[]);
});
test('empty workspace is honest and never invents messages or customers',async()=>{
  const {document}=parseHTML('<html><body><main></main></body></html>'),root=document.querySelector('main');
  await renderCustomerJourney(root,{listCustomers:async()=>[],listActivities:async()=>[],listPurchases:async()=>[],listSubscriptions:async()=>[],listFollowups:async()=>[]});
  assert.match(root.textContent,/No customer records are available/);assert.ok(!root.querySelector('[data-send]'));
});
test('real records without verified messages show the setup gap and a disabled reply action',async()=>{
  const {document}=parseHTML('<html><body><main></main></body></html>'),root=document.querySelector('main');
  await renderCustomerJourney(root,{listCustomers:async()=>[{id:'one',name:'<img src=x>',normalizedPhone:'+15550001234',status:'new'}],listActivities:async()=>[],listPurchases:async()=>[],listSubscriptions:async()=>[],listFollowups:async()=>[]});
  assert.match(root.textContent,/No verified WhatsApp messages yet/);assert.equal(root.querySelectorAll('img').length,0);assert.equal(root.querySelector('[data-send]').disabled,true);
});
test('focused paying customer shows the real purchase total and assigned account above stage queues',async()=>{
  const {document}=parseHTML('<html><body><main></main></body></html>'),root=document.querySelector('main');
  await renderCustomerJourney(root,{initialCustomerId:'one',listCustomers:async()=>[{id:'one',name:'Fictional customer',status:'customer',customerStatus:'customer',normalizedPhone:'+15550001234'}],listActivities:async()=>[],
    listPurchases:async()=>[{id:'purchase',customerId:'one',productName:'Fictional plan',paymentStatus:'paid',paidAmount:1,amount:1,currency:'USD',startDate:'2026-10-19',expiryDate:'2026-10-20'}],
    listSubscriptions:async()=>[],listFollowups:async()=>[],getAssignment:async()=>({units:[{label:'Account 1',sharedAccount:true}]})});
  await new Promise(resolve=>setImmediate(resolve));
  const summary=root.querySelector('[data-case-summary]');assert.match(summary.textContent,/1 recorded purchase/);assert.match(summary.textContent,/1 USD paid/);assert.match(summary.textContent,/Account 1/);
  assert.equal(root.querySelector('[data-stages]').hasAttribute('hidden'),true);
  assert.ok(root.querySelector('[data-send]').disabled);
});
