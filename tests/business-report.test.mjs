import test from 'node:test';
import assert from 'node:assert/strict';
import { businessReport } from '../server/business-report.mjs';
import worker from '../worker/index.mjs';

const now=Date.UTC(2026,9,16,12);const day=86400000;
const order=(id,extra={})=>({id,buyer:123,telegramUsername:'private_buyer',product:{id:'plan',name:'Sample',price:10,currency:'USD'},
  createdAt:now-day,updatedAt:now,quantity:1,totalAmount:10,currency:'USD',paymentStatus:'PENDING_PAYMENT',deliveryStatus:'NOT_DELIVERED',...extra});
function storage(orders){const entries=new Map(orders.map((o,i)=>['order:'+String(i).padStart(6,'0'),o]));return {list:async({prefix,startAfter,limit})=>new Map([...entries].filter(([key])=>key.startsWith(prefix)&&(!startAfter||key>startAfter)).slice(0,limit))};}
test('report separates order values, verified receipts and operating backlogs by currency',async()=>{
  const data=await businessReport(storage([
    order('one'),order('two',{paymentStatus:'PAYMENT_SUBMITTED',submittedAt:now-2*day}),
    order('three',{paymentStatus:'PAYMENT_VERIFIED',verifiedAt:now-day,currency:'USDT',totalAmount:20}),
    order('four',{createdAt:now-60*day,paymentStatus:'PAYMENT_VERIFIED',verifiedAt:now-day,deliveryStatus:'DELIVERED',deliveredAt:now-day})
  ]),{now,days:30});
  assert.equal(data.totals.ordersCreated,3);assert.equal(data.totals.paymentsVerified,2);
  assert.equal(data.totals.awaitingReview,1);assert.equal(data.totals.reviewOver24h,1);assert.equal(data.totals.awaitingDelivery,1);
  assert.equal(data.money.find(row=>row.currency==='USDT').verifiedReceipts,20);
  assert.equal(data.money.find(row=>row.currency==='USD').orderValue,20);
  assert.doesNotMatch(JSON.stringify(data),/private_buyer|submittedTransactionId|123/);
});
test('large reports disclose scan truncation and do not imply full totals',async()=>{
  const data=await businessReport(storage([order('a'),order('b'),order('c')]),{now,limit:2});
  assert.equal(data.coverage.complete,false);assert.equal(data.coverage.scanned,2);
});
test('invalid rows are counted without breaking old compatible orders',async()=>{
  const data=await businessReport(storage([order('valid'),{corrupt:true}]),{now});
  assert.equal(data.coverage.invalid,1);assert.equal(data.coverage.complete,false);
});
test('empty stores produce factual zero counts and explicit limits',async()=>{
  const data=await businessReport(storage([]),{now});
  assert.equal(data.totals.ordersCreated,0);assert.equal(data.coverage.complete,true);
  assert.ok(data.limitations.some(line=>line.includes('Profit')));
});
test('legacy verified payments without dates cannot imply complete receipt coverage',async()=>{
  const data=await businessReport(storage([order('missing',{paymentStatus:'PAYMENT_VERIFIED',verifiedAt:null})]),{now});
  assert.equal(data.coverage.complete,false);assert.equal(data.coverage.undatedVerifiedPayments,1);
  assert.equal(data.totals.paymentsVerified,0);assert.equal(data.totals.awaitingDelivery,1);
});
test('business report endpoint requires admin token and rejects writes and invalid periods',async()=>{
  const secret='fictional-admin-secret-more-than-32-characters';let calls=0;
  const env={ATLAS_ADMIN_TOKEN:secret,ATLAS_COORDINATOR:{idFromName:()=>1,get:()=>({fetch:async request=>{calls++;assert.equal(new URL(request.url).pathname,'/business-report');return Response.json({service:'atlas-market'});}})}};
  const url='https://atlas.test/api/admin/business-report';
  assert.equal((await worker.fetch(new Request(url),env)).status,401);
  assert.equal((await worker.fetch(new Request(url+'?days=-1',{headers:{Authorization:'Bearer '+secret}}),env)).status,400);
  assert.equal((await worker.fetch(new Request(url,{method:'POST',headers:{Authorization:'Bearer '+secret}}),env)).status,405);
  assert.equal((await worker.fetch(new Request(url,{headers:{Authorization:'Bearer '+secret}}),env)).status,200);
  assert.equal(calls,1);
});
