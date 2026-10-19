import test from 'node:test';
import assert from 'node:assert/strict';
import {PartnerProgram,records,hash} from '../server/partners/program.mjs';
import {partnerReport,reportCsv} from '../server/partners/report.mjs';
import {ShopOrders} from '../server/shop-orders.mjs';
import {TelegramShop} from '../server/telegram-shop.mjs';
import {PartnerFirestore} from '../worker/partner-firestore.mjs';
import {captureReferral} from '../js/services/partner-referral.js';
import {dashboardHtml,partnerDirectoryHtml} from '../js/views/partners.js';
import worker from '../worker/index.mjs';
import {AtlasCoordinator} from '../worker/coordinator.mjs';
import {readFile} from 'node:fs/promises';

export function storage(){
  const values=new Map();let tail=Promise.resolve(),alarm=null;
  const clone=value=>value===undefined?undefined:structuredClone(value);
  const list=(map,{prefix='',startAfter='',limit=100})=>new Map([...map].filter(([key])=>key.startsWith(prefix)&&key>startAfter).sort(([a],[b])=>a.localeCompare(b,'en')).slice(0,limit).map(([k,v])=>[k,clone(v)]));
  return {get:async key=>clone(values.get(key)),put:async(k,v)=>{values.set(k,clone(v));},delete:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])values.delete(key);},
    list:async options=>list(values,options),getAlarm:async()=>alarm,setAlarm:async value=>{alarm=value;},transaction:operation=>{
      const result=tail.then(async()=>{const next=new Map([...values].map(([k,v])=>[k,clone(v)]));
        const answer=await operation({get:async k=>clone(next.get(k)),put:async(k,v)=>{next.set(k,clone(v));},list:async o=>list(next,o)});
        values.clear();for(const[k,v]of next)values.set(k,v);return answer;});tail=result.catch(()=>{});return result;
    }};
}
const secret='fictional-partner-secret-with-at-least-32-characters';
const admin={sub:'fictional-operator',atlasOperator:true};
const product={id:'canva1',name:'Canva example',price:11,currency:'USD',stock:'available',requirements:{},description:'Fictional product'};
let request=0;
async function setup(){
  const store=storage();let now=Date.parse('2026-10-16T03:00:00Z');
  const program=new PartnerProgram(store,{secret,now:()=>now});
  const command=(action,extra={})=>program.command(admin,{action,partnerId:'PARTNER-001',requestId:'request_'+(++request),...extra});
  await command('createPartner',{name:'Fictional partner',ownerUid:'user-one'});
  await command('campaign',{campaignId:'AI_TEST'});
  const orders=new ShopOrders(store,{adminIds:[99],partnerSecret:secret,now:()=>now});
  const click=()=>program.capture({partnerId:'PARTNER-001',campaignId:'AI_TEST',visitor:'fictional_visitor_identifier_001'},'keyed-ip-hash');
  const report=()=>partnerReport(store,{partnerId:'PARTNER-001',from:'2026-10-01',to:'2026-10-31',now});
  const enter=async(buyer=1)=>{const capture=await click(),link=await program.handoff({visit:capture.visit,productId:'canva1'});await program.start(link.url.split('r_')[1],buyer);return link;};
  return {store,program,orders,command,click,report,enter,setNow:value=>{now=value;}};
}
test('full journey: tracking URL, click, bot start, order, manual payment, delivery and one BDT 10 credit',async()=>{
  const s=await setup();const link=await s.enter();assert.ok(link.url.split('start=')[1].length<=64);
  const order=await s.orders.create(1,product,1);
  assert.equal(order.partnerAttribution.partnerId,'PARTNER-001');assert.equal((await s.report()).verifiedSales,0);
  await s.orders.submitReference(order.id,1,'FICTIONAL-TXN-001');assert.equal((await s.report()).commissionMinor,0);
  await s.orders.review(order.id,99,'approve');assert.equal((await s.report()).verifiedSales,0);
  await s.orders.review(order.id,99,'fulfill','Delivery completed manually');
  await s.orders.review(order.id,99,'fulfill','Duplicate callback');
  const report=await s.report();assert.deepEqual([report.clicks,report.telegramStarts,report.orders,report.verifiedSales,report.commissionMinor,report.dueMinor],[1,1,1,1,1000,1000]);
  assert.equal((await records(s.store,'pt:ledger:')).length,1);
});
test('duplicate clicks, concurrent creates and token replays do not double count',async()=>{
  const s=await setup();const [a,b]=await Promise.all([s.click(),s.click()]);assert.equal(a.visit,b.visit);
  const handoff=await s.program.handoff({visit:a.visit});const token=handoff.url.split('r_')[1];
  await Promise.all([s.program.start(token,1),s.program.start(token,1)]);
  await assert.rejects(s.program.start(token,2),/already used/);
  const [first,second]=await Promise.all([s.orders.create(1,product,1),s.orders.create(1,product,1)]);assert.equal(first.id,second.id);
  assert.equal((await s.report()).telegramStarts,1);
});
test('expired tokens and interrupted handoffs do not create starts or sales',async()=>{
  const s=await setup(),capture=await s.click(),link=await s.program.handoff({visit:capture.visit});
  assert.equal((await s.report()).telegramStarts,0);
  s.setNow(Date.parse('2026-10-16T04:00:00Z'));
  await assert.rejects(s.program.start(link.url.split('r_')[1],1),/expired/);
  const fresh=await s.program.handoff({visit:capture.visit});await s.program.start(fresh.url.split('r_')[1],1);
  assert.equal((await s.report()).telegramStarts,1);
});
test('multiple partners: first touch is preserved and existing orders cannot be rewritten',async()=>{
  const s=await setup();await s.enter();const first=await s.orders.create(1,product,1);
  await s.command('createPartner',{partnerId:'PARTNER-002',name:'Second partner',ownerUid:'user-two'});
  await s.command('campaign',{partnerId:'PARTNER-002',campaignId:'SECOND'});
  const capture=await s.program.capture({partnerId:'PARTNER-002',campaignId:'SECOND',visitor:'second_browser_identifier_001'});
  const link=await s.program.handoff({visit:capture.visit});await s.program.start(link.url.split('r_')[1],1);
  const second=await s.orders.create(1,product,2);
  assert.equal(second.partnerAttribution.partnerId,'PARTNER-001');assert.equal((await s.orders.getForBuyer(first.id,1)).partnerAttribution.partnerId,'PARTNER-001');
  await assert.rejects(s.program.authorize({sub:'user-two'},'PARTNER-001'),/denied/);
  assert.deepEqual((await s.program.list({sub:'user-two'})).map(x=>x.id),['PARTNER-002']);
});
test('repeat sales within window qualify; later orders do not inherit expired attribution',async()=>{
  const s=await setup();await s.enter();
  for(let i=1;i<=2;i++){const order=await s.orders.create(1,product,i);await s.orders.submitReference(order.id,1,'FICTIONAL-TXN-'+i);await s.orders.review(order.id,99,'approve');await s.orders.review(order.id,99,'fulfill','Delivered');}
  assert.equal((await s.report()).commissionMinor,2000);
  s.setNow(Date.parse('2026-11-17T00:00:00Z'));const order=await s.orders.create(1,product,3);assert.equal(order.partnerAttribution,null);
});
test('refund reversals, payout approval and settlement are audited and idempotent',async()=>{
  const s=await setup();await s.enter();const order=await s.orders.create(1,product,1);
  await s.orders.submitReference(order.id,1,'FICTIONAL-TXN');await s.orders.review(order.id,99,'approve');await s.orders.review(order.id,99,'fulfill','Delivered');
  const intent={action:'approvePayout',partnerId:'PARTNER-001',minor:1000,requestId:'payout_001'};
  await Promise.all([s.program.command(admin,intent),s.program.command(admin,intent)]);
  await assert.rejects(s.command('approvePayout',{minor:1000}),/exceeds/);
  await s.command('settlePayout',{payoutId:'payout_001',evidence:'FICTIONAL transfer receipt'});
  assert.equal((await s.report()).paidMinor,1000);
  await s.command('refund',{orderId:order.id,note:'Actual refund recorded manually'});
  await s.command('refund',{orderId:order.id,note:'Duplicate refund notification'});
  const r=await s.report();assert.equal(r.commissionMinor,0);assert.equal(r.verifiedSales,0);assert.equal(r.debtMinor,1000);assert.equal(r.dueMinor,0);
  assert.equal((await records(s.store,'pt:ledger:')).length,2);
});
test('refund before settlement blocks stale payout reservation',async()=>{
  const s=await setup();await s.enter();const o=await s.orders.create(1,product,1);await s.orders.submitReference(o.id,1,'REFUND-TXN');await s.orders.review(o.id,99,'approve');await s.orders.review(o.id,99,'fulfill','Done');
  await s.program.command(admin,{action:'approvePayout',partnerId:'PARTNER-001',minor:1000,requestId:'payout_002'});
  await s.command('refund',{orderId:o.id,note:'Funds returned'});
  await assert.rejects(s.command('settlePayout',{payoutId:'payout_002',evidence:'not yet transferred'}),/reduced/);
});
test('suspension, authorization and rate changes preserve existing order snapshots',async()=>{
  const s=await setup();await s.enter();const original=await s.orders.create(1,product,1);
  await s.command('updatePartner',{active:true,commissionMinor:2000,budgetLimitMinor:10000});
  const next=await s.orders.create(1,product,2);assert.equal(original.partnerAttribution.commissionMinor,1000);assert.equal(next.partnerAttribution.commissionMinor,2000);
  await s.command('updatePartner',{active:false,commissionMinor:2000,budgetLimitMinor:10000});
  await assert.rejects(s.click(),/not active/);await assert.rejects(s.program.authorize({sub:'user-one'},'PARTNER-001'),/denied/);
  await assert.rejects(s.program.command({sub:'user-one'},{action:'createPartner'}),/Admin/);
});
test('known partner self-referrals are refused and raw Telegram identity is not mirrored',async()=>{
  const s=await setup();await s.command('createPartner',{partnerId:'SELF_TEST',name:'Self test',ownerUid:'self-user',telegramBuyerId:'3'});
  await s.command('campaign',{partnerId:'SELF_TEST',campaignId:'SELF_CAMPAIGN'});
  const click=await s.program.capture({partnerId:'SELF_TEST',campaignId:'SELF_CAMPAIGN',visitor:'self_browser_identifier_001'});
  const link=await s.program.handoff({visit:click.visit});await assert.rejects(s.program.start(link.url.split('r_')[1],3),/Self-referrals/);
  assert.ok(!(await records(s.store,'pt:audit:')).some(row=>row.input?.telegramBuyerId));
});
test('spend evidence is manual, corrections replace daily totals, budgets require explicit approval',async()=>{
  const s=await setup();await assert.rejects(s.command('approveBudget',{month:'2026-10',minor:10001}),/limit/);
  await s.command('approveBudget',{month:'2026-10',minor:10000});
  await assert.rejects(s.command('spend',{campaignId:'AI_TEST',date:'2026-10-16',minor:100,currency:'USD',evidence:''}),/evidence/);
  for(const minor of [100,250])await s.command('spend',{campaignId:'AI_TEST',date:'2026-10-16',minor,currency:'USD',evidence:'fictional receipt'});
  await s.command('spend',{campaignId:'AI_TEST',date:'2026-10-16',minor:1000,currency:'BDT',evidence:'fictional receipt'});
  const r=await s.report();assert.equal(r.spend.find(x=>x.currency==='USD').minor,250);assert.equal(r.spend.length,2);assert.equal(r.spend[0].costPerSale,null);
  assert.equal(r.budgets[0].minor,10000);
});
test('product campaign matching, date filtering, privacy and CSV output',async()=>{
  const s=await setup();await s.command('campaign',{campaignId:'CANVA',productId:'canva1'});
  const capture=await s.program.capture({partnerId:'PARTNER-001',campaignId:'CANVA',visitor:'product_visitor_identifier_001'});
  await assert.rejects(s.program.handoff({visit:capture.visit,productId:'wrong'}),/not active/);
  const report=await s.report(),csv=reportCsv(report);assert.match(csv,/verified_sales/);assert.match(csv,/reported_spend/);
  assert.ok(!JSON.stringify(report).includes('keyed-ip-hash'));assert.ok(!JSON.stringify(report).includes('FICTIONAL-TXN'));
  const html=dashboardHtml({...report,ledger:[{orderId:'<script>',campaignId:'AI_TEST',type:'credit',minor:1000}]});assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);
  await assert.rejects(partnerReport(s.store,{partnerId:'PARTNER-001',from:'invalid',to:'2026-10-31'}),/period/);
});
test('browser referral persists through navigation and resumes an interrupted journey',async()=>{
  const s=await setup(),values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  let calls=0;const request=async(path,{body})=>{calls++;return Response.json(await s.program.capture(body));};
  const options={url:'https://atlascrm-c5722.web.app/?ref=PARTNER-001&utm_campaign=AI_TEST',storage,request,uuid:()=> 'anonymous_browser_identifier_001',now:()=>Date.parse('2026-10-16T03:00:00Z')};
  const first=await captureReferral(options),again=await captureReferral({...options,url:'https://atlascrm-c5722.web.app/?catalog=1'});assert.equal(first.visit,again.visit);assert.equal(calls,1);
});
test('bot resolves referral start before product selection and existing callbacks keep working',async()=>{
  const s=await setup(),click=await s.click(),link=await s.program.handoff({visit:click.visit,productId:'canva1'}),calls=[];
  const bot=new TelegramShop({orders:s.orders,partners:s.program,catalog:{list:async()=>({products:[product]})},api:{call:async(method,payload)=>{calls.push({method,payload});}},adminIds:[99],supportUrl:'https://t.me/FictionalAdmin'});
  await bot.handle({update_id:1,message:{chat:{id:1,type:'private'},from:{id:1},text:'/start '+link.url.split('start=')[1]}});
  assert.ok(calls.some(x=>x.payload.text?.includes('Canva')));
  await bot.handle({update_id:2,callback_query:{id:'cb',from:{id:1},data:'buy:canva1',message:{chat:{id:1,type:'private'}}}});
  assert.equal((await s.orders.list(1))[0].partnerAttribution.partnerId,'PARTNER-001');
});
test('Firestore outage retains durable outbox and a later acknowledged batch removes only mirrored records',async()=>{
  const s=await setup(),mirror=new PartnerFirestore({FIREBASE_PROJECT_ID:'fictional-project'},{fetchImpl:async()=>new Response('',{status:503})});
  const before=(await s.store.list({prefix:'pt:outbox:'})).size;assert.ok(before>0);
  assert.equal((await mirror.flush(s.store)).pending,true);assert.equal((await s.store.list({prefix:'pt:outbox:'})).size,before);
  mirror.accessToken=async()=> 'fictional-private-oauth-token';let posted;
  mirror.fetch=async(url,options)=>{posted=JSON.parse(options.body);assert.ok(url.startsWith('https://firestore.googleapis.com/'));return Response.json({writeResults:posted.writes.map(()=>({}))});};
  assert.equal((await mirror.flush(s.store)).pending,false);assert.ok(posted.writes.some(x=>x.update.name.includes('/atlasPartnerProfiles/')));
  assert.ok(!JSON.stringify(posted).includes('fictional-private-oauth-token'));
});
test('public routes reject bad origins, forged auth and rate-limited traffic',async()=>{
  const state=storage(),coordinator=new AtlasCoordinator({storage:state},{PARTNER_TRACKING_ENABLED:'true',PARTNER_HASH_SECRET:secret});
  const env={PARTNER_TRACKING_ENABLED:'true',PARTNER_HASH_SECRET:secret,CATALOG_ALLOWED_ORIGINS:'https://atlascrm-c5722.web.app',ATLAS_COORDINATOR:{idFromName:()=> 'one',get:()=>coordinator}};
  const request=(origin,path='/api/partners/list')=>new Request('https://atlas.test'+path,{headers:{Origin:origin,Authorization:'Bearer forged.token.invalid'}});
  assert.equal((await worker.fetch(request('https://evil.test'),env)).status,403);
  assert.equal((await worker.fetch(request('https://atlascrm-c5722.web.app'),env)).status,401);
  for(let i=0;i<20;i++)await coordinator.rate('client:partner:client-hash',20);
  const response=await coordinator.fetch(new Request('https://internal/partners',{method:'POST',body:JSON.stringify({path:'/api/partners/click',query:{},value:{},client:'client-hash'})}));assert.equal(response.status,429);
});
test('Firestore partner writes are denied and no public private-collection read is introduced',async()=>{
  const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  assert.match(rules,/atlasPartnerProfiles/);assert.match(rules,/resource.data.ownerUid == request.auth.uid/);
  assert.match(rules,/atlasPartnerPrivate\/[\s\S]*?allow read: if signedIn\(\); allow write: if false/);
});

test('admin partner directory shows copyable linked UIDs and escapes untrusted names',()=>{
  const html=partnerDirectoryHtml({admin:true,partners:[{id:'PARTNER-QA',name:'<img src=x onerror=alert(1)>',ownerUid:'fictional-owner-uid',active:false}]});
  assert.match(html,/Firebase user UID/);assert.match(html,/value="fictional-owner-uid"/);
  assert.match(html,/data-copy-uid="fictional-owner-uid"/);assert.match(html,/Suspended/);
  assert.ok(!html.includes('<img'));assert.match(html,/&lt;img/);
  assert.equal(partnerDirectoryHtml({admin:false,partners:[{ownerUid:'other-private-uid'}]}),'');
  assert.equal(partnerDirectoryHtml({admin:'true',partners:[{ownerUid:'other-private-uid'}]}),'');
});
