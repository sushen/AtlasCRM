import test from 'node:test';
import assert from 'node:assert/strict';
import {PartnerProgram,reconcileCommission} from '../server/partners/program.mjs';
import {partnerPerformance} from '../server/partners/performance.mjs';
import worker from '../worker/index.mjs';
import {AtlasCoordinator} from '../worker/coordinator.mjs';

function storage(){
  const map=new Map();
  const value={get:async k=>structuredClone(map.get(k)),put:async(k,v)=>map.set(k,structuredClone(v)),
    list:async({prefix='',startAfter='',limit=100})=>new Map([...map].filter(([k])=>k.startsWith(prefix)&&k>startAfter).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit))};
  value.transaction=async op=>op(value);return value;
}
const admin={sub:'fictional-admin',atlasOperator:true},secret='fictional-test-secret-longer-than-thirty-two-characters';
let receipt=0;
async function setup(){
  const store=storage(),now=Date.parse('2026-10-17T08:00:00Z');
  const program=new PartnerProgram(store,{secret,now:()=>now});
  const command=(action,extra={})=>program.command(admin,{action,partnerId:'P1',requestId:'request_'+(++receipt),...extra});
  await command('createPartner',{name:'Fictional collaborator',ownerUid:'private-uid'});
  await command('campaign',{campaignId:'C1',label:'Creative one',creative:'Version A',hypothesis:'Clearer headline'});
  return {store,program,now,command};
}

test('each creative link is stable and Meta mapping is unique and immutable',async()=>{
  const {store,command}=await setup();
  await command('bindMetaAd',{campaignId:'C1',metaAccountId:'123',metaAdId:'456'});
  await command('campaign',{campaignId:'C2'});
  await assert.rejects(command('bindMetaAd',{campaignId:'C2',metaAccountId:'123',metaAdId:'456'}),/already assigned/);
  await assert.rejects(command('bindMetaAd',{campaignId:'C1',metaAccountId:'123',metaAdId:'789'}),/immutable/);
  const report=await partnerPerformance(store);
  assert.equal(report.rows[0].creative,'Version A');
  assert.match(report.rows[0].link,/campaign=C1.*utm_content=C1/);
});

test('cohort joins delayed sales to original visits and removes refunded sales',async()=>{
  const {store,now}=await setup();
  const scope={partnerId:'P1',campaignId:'C1'};
  await store.put('pt:click:visit-one',{...scope,id:'visit-one',at:now-2*86400000});
  await store.put('pt:click:old',{...scope,id:'old',at:now-40*86400000});
  const order={id:'AM-111',createdAt:now-86400000,totalAmount:12,currency:'USDT',paymentStatus:'PAYMENT_VERIFIED',deliveryStatus:'DELIVERED',
    buyer:'private-buyer',submittedTransactionId:'private-reference',partnerAttribution:{...scope,clickId:'visit-one',commissionMinor:1000}};
  await reconcileCommission(store,order,now);
  await reconcileCommission(store,{...order,id:'AM-old',partnerAttribution:{...order.partnerAttribution,clickId:'old'}},now);
  let report=await partnerPerformance(store,{now});
  assert.equal(report.rows[0].visits,1);
  assert.equal(report.rows[0].verifiedSales,2);
  assert.equal(report.rows[0].cohortSales,1);
  assert.equal(report.rows[0].cohortConversion,1);
  assert.deepEqual(report.rows[0].revenue,[{currency:'USDT',value:12}]);
  for(const privateValue of ['private-buyer','private-reference','private-uid','visit-one'])assert.equal(JSON.stringify(report).includes(privateValue),false);
  await reconcileCommission(store,{...order,paymentStatus:'REFUNDED'},now+1);
  report=await partnerPerformance(store,{now:now+2});
  assert.equal(report.rows[0].cohortSales,0);
  assert.equal(report.rows[0].verifiedSales,1);
});

test('legacy orders and pending work are disclosed without invented attribution',async()=>{
  const {store,now}=await setup();
  await store.put('pt:order:legacy',{partnerId:'P1',campaignId:'C1',orderId:'legacy',createdAt:now,paymentStatus:'PAYMENT_VERIFIED',deliveryStatus:'DELIVERED'});
  const report=await partnerPerformance(store,{now});
  assert.equal(report.rows[0].legacyOrders,1);
  assert.equal(report.rows[0].cohortSales,0);
  assert.equal(report.rows[0].cohortConversion,null);
  assert.equal(report.from,'2026-10-11');assert.equal(report.to,'2026-10-17');
  await assert.rejects(partnerPerformance(store,{days:8}),/Choose/);
});

test('performance endpoint requires admin, refuses browser use and writes',async()=>{
  const token='fictional-admin-token-over-thirty-two-characters',calls=[];
  const env={ATLAS_ADMIN_TOKEN:token,ATLAS_COORDINATOR:{idFromName:()=>1,get:()=>({fetch:async req=>{calls.push(req.url);return Response.json({ok:true});}})}};
  const url='https://atlas.test/api/admin/partner-performance';
  assert.equal((await worker.fetch(new Request(url),env)).status,401);
  const headers={Authorization:'Bearer '+token};
  assert.equal((await worker.fetch(new Request(url,{headers:{...headers,Origin:'https://atlascrm-c5722.web.app'}}),env)).status,403);
  assert.equal((await worker.fetch(new Request(url,{headers,method:'POST'}),env)).status,405);
  assert.equal((await worker.fetch(new Request(url+'?days=8',{headers}),env)).status,400);
  assert.equal((await worker.fetch(new Request(url+'?days=7',{headers}),env)).status,200);
  assert.deepEqual(calls,['https://coordinator/partner-performance?days=7']);
});

test('coordinator aggregates the existing store and respects the partner feature gate',async()=>{
  const {store}=await setup();
  const disabled=new AtlasCoordinator({storage:store},{});
  assert.equal((await disabled.fetch(new Request('https://coordinator/partner-performance?days=7'))).status,503);
  const enabled=new AtlasCoordinator({storage:store},{PARTNER_TRACKING_ENABLED:'true'});
  const response=await enabled.fetch(new Request('https://coordinator/partner-performance?days=7'));
  assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.rows.length,1);
  assert.equal(result.rows[0].partnerName,'Fictional collaborator');
});
