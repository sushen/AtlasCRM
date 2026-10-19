import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.mjs';
import { AtlasCoordinator } from '../worker/coordinator.mjs';
import { supplierConfiguration } from '../server/catalog-settings.mjs';
import { normalizeProduct } from '../server/catalog.mjs';
import { createFirebaseVerifier } from '../worker/firebase-auth.mjs';

const secret='fictional-secret-value-with-more-than-32-characters';
const origin='https://atlascrm-c5722.web.app';
function environment() {
  const calls=[];
  const env={ATLAS_ADMIN_TOKEN:secret,TELEGRAM_WEBHOOK_SECRET:secret,CATALOG_ALLOWED_ORIGINS:origin,
    CATALOG_PUBLIC_ENABLED:'true',ATLAS_COORDINATOR:{idFromName:name=>name,get:()=>({fetch:async request=>{
      calls.push(request);const path=new URL(request.url).pathname;
      return Response.json(path==='/catalog'?{products:[normalizeProduct({name:'Canva Pro',price:{amount:10,currency:'USD'}})]}
        :path==='/state'?{service:'atlas-market',enabled:request.method==='POST'?(await request.json()).enabled:false}:{ok:true});
    }})}};
  return {env,calls};
}
test('unsigned webhook never reaches Telegram processing',async()=>{
  const {env,calls}=environment();
  const response=await worker.fetch(new Request('https://atlas.test/webhooks/telegram',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({update_id:1})}),env);
  assert.equal(response.status,401);assert.equal(calls.length,0);
});
test('verified bounded JSON webhook uses only internal coordinator',async()=>{
  const {env,calls}=environment();
  const request=new Request('https://atlas.test/webhooks/telegram',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify({update_id:2})});
  assert.equal((await worker.fetch(request,env)).status,200);
  assert.equal(new URL(calls[0].url).pathname,'/telegram');
});
test('oversize or malformed webhook is rejected before processing',async()=>{
  const {env,calls}=environment();
  for(const body of ['{invalid',JSON.stringify({update_id:1,padding:'x'.repeat(65536)})]) {
    const response=await worker.fetch(new Request('https://atlas.test/webhooks/telegram',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':secret},body}),env);
    assert.equal(response.status,400);
  }
  assert.equal(calls.length,0);
});
test('admin uses separate bearer auth and refuses browser-origin control',async()=>{
  const {env,calls}=environment();
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/admin/bot-state'),env)).status,401);
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/admin/bot-state',{headers:{Authorization:'Bearer '+secret,Origin:origin}}),env)).status,403);
  const response=await worker.fetch(new Request('https://atlas.test/api/admin/bot-state',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:'{"enabled":true}'}),env);
  assert.equal(response.status,200);assert.equal((await response.json()).enabled,true);assert.equal(calls.length,1);
});
test('catalog CORS restricts exact origins and arbitrary proxy parameters',async()=>{
  const {env,calls}=environment();
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/catalog/products'),env)).status,403);
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/catalog/products',{headers:{Origin:'https://evil.invalid'}}),env)).status,403);
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/catalog/products?url=https://evil.invalid',{headers:{Origin:origin}}),env)).status,405);
  const response=await worker.fetch(new Request('https://atlas.test/api/catalog/products',{headers:{Origin:origin}}),env);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal((await response.json()).products[0].price,11);assert.equal(calls.length,1);
});
test('private storefront requires Firebase authentication by default',async()=>{
  const {env,calls}=environment();env.CATALOG_PUBLIC_ENABLED='false';env.FIREBASE_PROJECT_ID='test-project';
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/catalog/products',{headers:{Origin:origin}}),env)).status,401);
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/catalog/products',{headers:{Origin:origin,Authorization:'Bearer forged.token.invalid'}}),env)).status,401);
  assert.equal(calls.length,0);
});
test('preflight permits GET and authorization only',async()=>{
  const {env}=environment();
  const headers={Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'};
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/catalog/products',{method:'OPTIONS',headers}),env)).status,204);
  headers['Access-Control-Request-Headers']='x-api-key';
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/catalog/products',{method:'OPTIONS',headers}),env)).status,403);
});
test('aliases support old spelling but reject ambiguous keys and alternate suppliers',()=>{
  assert.equal(supplierConfiguration({CANBOSS_BUYER_API_KEY:'fictional'}).key,'fictional');
  assert.equal(supplierConfiguration({CANBOSO_BUYER_API_KEY:'old-fictional'}).key,'old-fictional');
  assert.throws(()=>supplierConfiguration({CANBOSS_BUYER_API_KEY:'a',CANBOSO_BUYER_API_KEY:'b'}));
  assert.throws(()=>supplierConfiguration({CANBOSS_API_BASE_URL:'https://evil.invalid'}));
});
function state() {
  const entries=new Map();let alarm=null;
  return {storage:{get:async key=>entries.get(key),put:async(key,value)=>{entries.set(key,value);},
    list:async({prefix,startAfter='',limit=Infinity})=>new Map([...entries].filter(([key])=>key.startsWith(prefix)&&key>startAfter).sort(([a],[b])=>a<b?-1:a>b?1:0).slice(0,limit)),
    delete:async keys=>{assert.ok(keys.length<=128);keys.forEach(key=>entries.delete(key));},setAlarm:async value=>{alarm=value;},getAlarm:async()=>alarm}};
}
test('coordinator gate persists and disabled bot produces no outbound fetch',async()=>{
  const storage=state();const coordinator=new AtlasCoordinator(storage,{});
  const result=await coordinator.fetch(new Request('https://internal/telegram',{method:'POST',body:'{"update_id":1}'}));
  assert.equal((await result.json()).disabled,true);
  await coordinator.fetch(new Request('https://internal/state',{method:'POST',body:'{"enabled":true}'}));
  const restarted=new AtlasCoordinator(storage,{});
  assert.equal((await (await restarted.fetch(new Request('https://internal/state'))).json()).enabled,true);
});
test('duplicate webhook update is claimed once across coordinator instances',async()=>{
  const storage=state();const env={TELEGRAM_BOT_ENABLED:'true',TELEGRAM_CATALOG_CHAT_IDS:'-123',TELEGRAM_BOT_TOKEN:'123:fictional'};
  const update={update_id:1,message:{chat:{id:-123},text:'ignored text'}};
  const req=()=>new Request('https://internal/telegram',{method:'POST',body:JSON.stringify(update)});
  assert.equal((await (await new AtlasCoordinator(storage,env).fetch(req())).json()).duplicate,undefined);
  assert.equal((await (await new AtlasCoordinator(storage,env).fetch(req())).json()).duplicate,true);
});
test('cached catalog survives restart and markup is not repeated',async()=>{
  const storage=state();await storage.storage.put('catalog',{until:Date.now()+60000,data:{products:[{price:11}]}});
  const result=await new AtlasCoordinator(storage,{}).catalog();assert.equal(result.products[0].price,11);
});
test('recent sanitized cache can support clearly flagged browsing during provider cooldown, never indefinitely',async()=>{
  const storage=state();await storage.storage.put('catalog',{until:Date.now()-1000,data:{products:[{price:11}],fetchedAt:new Date().toISOString()}});
  await storage.storage.put('supplier-cooldown',Date.now()+30000);
  const result=await new AtlasCoordinator(storage,{TELEGRAM_GROUP_URL:'https://t.me/atlascrmshop'}).catalog();
  assert.equal(result.stale,true);assert.equal(result.products[0].price,11);assert.equal(result.storefront.telegramUrl,'https://t.me/atlascrmshop');
  await storage.storage.put('catalog',{until:Date.now()-7*3600000,data:{products:[]}});
  await assert.rejects(new AtlasCoordinator(storage,{}).catalog(),/supplier_cooldown/);
});

test('admin POST rejects null and unexpected shapes',async()=>{
  const {env,calls}=environment();
  for(const value of [null,[],{}, {enabled:true,extra:1}]) {
    assert.equal((await worker.fetch(new Request('https://atlas.test/api/admin/bot-state',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(value)}),env)).status,400);
  }
  assert.equal(calls.length,0);
});
test('shop readiness is authenticated, read-only, and exposes no private admin settings',async()=>{
  const {env}=environment();env.TELEGRAM_SHOP_ENABLED='true';env.TELEGRAM_SHOP_ADMIN_IDS='123';env.TELEGRAM_SHOP_SUPPORT_URL='https://t.me/FictionalAdmin';
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/admin/shop-readiness'),env)).status,401);
  const headers={Authorization:'Bearer '+secret};
  const response=await worker.fetch(new Request('https://atlas.test/api/admin/shop-readiness',{headers}),env);
  assert.deepEqual(await response.json(),{service:'atlas-market',enabled:false,shopConfigured:true});
  assert.equal((await worker.fetch(new Request('https://atlas.test/api/admin/shop-readiness',{method:'POST',headers}),env)).status,405);
});

test('signed Firebase tokens validate signature, claims and cached keys',async()=>{
  const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key'};
  let fetches=0;
  const verify=createFirebaseVerifier(async()=>{fetches++;return Response.json({keys:[jwk]},{headers:{'Cache-Control':'public, max-age=3600'}});});
  const now=Math.floor(Date.now()/1000);
  const claims={aud:'test-project',iss:'https://securetoken.google.com/test-project',sub:'fictional-user',iat:now-10,auth_time:now-20,exp:now+3600};
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  async function token(value=claims,head={alg:'RS256',kid:'test-key'}) {
    const input=encode(head)+'.'+encode(value);
    return 'Bearer '+input+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input))).toString('base64url');
  }
  assert.equal(await verify(await token(),'test-project'),true);
  assert.equal(await verify(await token(),'test-project'),true);assert.equal(fetches,1);
  for(const change of [{aud:'other'},{iss:'other'},{sub:''},{exp:now-1},{iat:now+60},{auth_time:now+60},{iat:'1'}]) assert.equal(await verify(await token({...claims,...change}),'test-project'),false);
  assert.equal(await verify(await token(claims,{alg:'HS256',kid:'test-key'}),'test-project'),false);
  const valid=await token();const parts=valid.split('.');parts[1]=encode({...claims,sub:'tampered'});
  assert.equal(await verify(parts.join('.'),'test-project'),false);
  const unavailable=createFirebaseVerifier(async()=>new Response('',{status:503}));
  assert.equal(await unavailable(valid,'test-project'),false);
});

test('cleanup does not drift, removes expired receipts and leaves live state',async()=>{
  const storage=state();const c=new AtlasCoordinator(storage,{});
  await storage.storage.setAlarm(123);await c.scheduleCleanup();assert.equal(await storage.storage.getAlarm(),123);
  await storage.storage.put('update:old',{until:1});await storage.storage.put('update:live',{until:Date.now()+60000});
  for(let i=0;i<600;i++)await storage.storage.put('update:expired-'+i,{until:1});
  await storage.storage.put('bot-enabled',false);await c.alarm();
  assert.equal(await storage.storage.get('update:old'),undefined);
  assert.ok(await storage.storage.get('update:live'));assert.equal(await c.enabled(),false);
  assert.equal((await storage.storage.list({prefix:'update:'})).size,1);
});

test('supplier failures and Telegram retry cooldown persist across restart',async()=>{
  const original=globalThis.fetch;const storage=state();let calls=0;
  const env={CANBOSS_BUYER_API_KEY:'fictional',TELEGRAM_BOT_ENABLED:'true',TELEGRAM_CATALOG_CHAT_IDS:'-123',TELEGRAM_BOT_TOKEN:'123:fictional'};
  try {
    globalThis.fetch=async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'120'}});};
    await assert.rejects(new AtlasCoordinator(storage,env).catalog());
    await assert.rejects(new AtlasCoordinator(storage,env).catalog());assert.equal(calls,1);
    globalThis.fetch=async()=>{calls++;return Response.json({ok:false,parameters:{retry_after:120}},{status:429});};
    const req=id=>new Request('https://internal/telegram',{method:'POST',body:JSON.stringify({update_id:id,message:{chat:{id:-123},text:'💬 Support'}})});
    await new AtlasCoordinator(storage,env).fetch(req(1));assert.ok(await storage.storage.get('telegram-cooldown')>Date.now());
    await new AtlasCoordinator(storage,env).fetch(req(2));assert.equal(calls,2);
  }finally {globalThis.fetch=original;}
});

test('coordinator serializes concurrent requests and enforces persistent budgets',async()=>{
  const storage=state();const c=new AtlasCoordinator(storage,{});
  await storage.storage.put('catalog',{until:Date.now()+60000,data:{products:[]}});
  const responses=await Promise.all(Array.from({length:31},()=>c.fetch(new Request('https://internal/catalog',{headers:{'x-atlas-client':'fictional'}}))));
  assert.equal(responses.filter(r=>r.status===200).length,30);assert.equal(responses.at(-1).status,429);
  assert.equal((await new AtlasCoordinator(storage,{}).fetch(new Request('https://internal/catalog',{headers:{'x-atlas-client':'fictional'}}))).status,429);
});
