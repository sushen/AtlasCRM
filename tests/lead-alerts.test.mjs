import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { createHmac } from 'node:crypto';
import { MessageRepository, messageKey } from '../server/repository.mjs';
import { parseWebhook } from '../server/webhook.mjs';
import { leadFeedAllowed, publicAlert, referralEvidence } from '../server/lead-alerts.mjs';
import { createAtlasServer } from '../server/http.mjs';

const config={phoneNumberId:'123',businessAccountId:'456',appSecret:'fictional-secret',verifyToken:'fictional-verify',leadAlertToken:'fictional-private-token-at-least-32-characters'};
function memory() {
  const data=new Map();
  const adapter={now:()=> '2026-10-18T10:00:00.000Z',transaction:async callback=>{
    const pending=[];
    const result=await callback({get:async(c,id)=>data.get(c+'/'+id)||null,
      findCustomer:async phone=>{const entry=[...data].find(([k,v])=>k.startsWith('customers/')&&v.normalizedPhone===phone);return entry?{...entry[1],id:entry[0].slice(10)}:null;},
      set:(c,id,value)=>pending.push([c+'/'+id,value])});
    pending.forEach(([key,value])=>data.set(key,value));return result;
  }};
  return {data,repository:new MessageRepository(adapter)};
}
const inbound=(referral)=>({object:'whatsapp_business_account',entry:[{id:'456',changes:[{field:'messages',value:{metadata:{phone_number_id:'123',display_phone_number:'15550001111'},
  contacts:[{wa_id:'8801712345678',profile:{name:'Fictional lead'}}],messages:[{id:'fictional-message',from:'8801712345678',timestamp:'1792317600',type:'text',text:{body:'Private fictional enquiry'},referral}]}}]}]});

test('referral evidence is bounded and never inferred from message text',()=>{
  assert.equal(referralEvidence({body:'I saw an ad'}),null);
  assert.equal(referralEvidence({source_type:'website',source_id:'123'}),null);
  assert.deepEqual(referralEvidence({source_type:'ad',source_id:'123',ctwa_clid:'click-1',source_url:'private'}),
    {sourceType:'ad',sourceId:'123',clickId:'click-1',evidence:'meta_webhook_referral'});
});

test('signed inbound processing creates one lead and one alert; retries cannot duplicate',async()=>{
  const {data,repository}=memory();
  const event=parseWebhook(inbound({source_type:'ad',source_id:'12345'}),config)[0];
  await repository.accept(event);await repository.accept(event);
  assert.equal([...data.keys()].filter(k=>k.startsWith('whatsappLeadAlerts/')).length,1);
  assert.equal([...data.keys()].filter(k=>k.startsWith('customers/')).length,1);
  const value=data.get('whatsappLeadAlerts/'+messageKey(event.externalMessageId));
  const alert=publicAlert(messageKey(event.externalMessageId),value);
  assert.equal(alert.source,'ad_referral');assert.equal(alert.sourceId,'12345');
  assert.equal(alert.maskedPhone,'••••5678');
  assert.equal(JSON.stringify(alert).includes('Private fictional enquiry'),false);
  assert.equal(JSON.stringify(alert).includes('8801712345678'),false);
});

test('manual enquiry records product interest and one followup without fabricating a sale or message',async()=>{
  const {data,repository}=memory();
  const value={requestId:'11111111-1111-4111-8111-111111111111',name:'Fictional buyer',phone:'01712345678',note:'Asked about availability',interest:'Example product',followUpAt:'2026-10-19T10:00:00+06:00'};
  const first=await repository.captureManualLead(value);const repeat=await repository.captureManualLead(value);
  assert.equal(first.customerId,repeat.customerId);assert.equal(repeat.duplicate,true);
  assert.equal([...data.keys()].filter(k=>k.startsWith('followups/')).length,1);
  assert.equal([...data.keys()].filter(k=>k.startsWith('messages/')).length,0);
  const customer=data.get('customers/'+first.customerId);
  assert.equal(customer.status,'new');assert.equal(customer.customerStatus,'lead');
  assert.equal(customer.nextFollowUpAt,value.followUpAt);assert.match(customer.notes,/Example product/);
  assert.ok([...data.values()].some(v=>v.type==='manual_whatsapp_enquiry'&&v.note.includes(value.note)));
  await assert.rejects(repository.captureManualLead({...value,note:'Changed content'}),/lead_request_conflict/);
});

test('manual capture preserves existing customer/suppression state and rejects unwanted followup',async()=>{
  const {data,repository}=memory();
  data.set('customers/existing',{name:'Existing customer',normalizedPhone:'+8801712345678',status:'customer',notes:'History'});
  const value={requestId:'22222222-2222-4222-8222-222222222222',name:'New label',phone:'01712345678',note:'New enquiry'};
  await repository.captureManualLead(value);
  assert.equal(data.get('customers/existing').name,'Existing customer');assert.equal(data.get('customers/existing').status,'customer');
  data.get('customers/existing').status='do_not_contact';
  await assert.rejects(repository.captureManualLead({...value,requestId:'33333333-3333-4333-8333-333333333333',followUpAt:'2026-10-19T10:00:00+06:00'}),/recipient_suppressed/);
});

test('private lead feed rejects browsers, wrong tokens and remote callers',()=>{
  const req={headers:{host:'127.0.0.1:3000',authorization:'Bearer '+config.leadAlertToken},socket:{remoteAddress:'127.0.0.1'}};
  assert.equal(leadFeedAllowed(req,config.leadAlertToken),true);
  for(const bad of [{...req,headers:{...req.headers,origin:'https://example.test'}},{...req,socket:{remoteAddress:'203.0.113.1'}},
    {...req,headers:{...req.headers,authorization:'Bearer incorrect'}},{...req,headers:{...req.headers,'sec-fetch-site':'none'}}]) assert.equal(leadFeedAllowed(bad,config.leadAlertToken),false);
});

test('HTTP private feed checks authorization and method; manual API never sends WhatsApp',async()=>{
  const {repository}=memory();repository.listLeadAlerts=async()=>({version:1,items:[],cursor:'',hasMore:false});
  const server=createAtlasServer({config,repository});server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  const headers={host:'127.0.0.1:3000',Authorization:'Bearer '+config.leadAlertToken};
  const call=(path,{method='GET',headers:extra={},body}={})=>new Promise((resolve,reject)=>{
    const req=httpRequest(base+path,{method,headers:extra},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,json:async()=>JSON.parse(Buffer.concat(chunks).toString())}));});
    req.on('error',reject);if(body)req.write(body);req.end();
  });
  try{
    assert.equal((await call('/api/genie/lead-alerts')).status,403);
    assert.equal((await call('/api/genie/lead-alerts',{headers})).status,200);
    assert.equal((await call('/api/genie/lead-alerts',{headers:{...headers,Origin:'https://example.test'}})).status,403);
    assert.equal((await call('/api/genie/lead-alerts',{headers,method:'POST'})).status,405);
    const response=await call('/api/genie/manual-leads',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({requestId:'44444444-4444-4444-8444-444444444444',name:'Fictional',phone:'01712345678',note:'Wants product'})});
    assert.equal(response.status,200);assert.equal((await response.json()).duplicate,false);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
