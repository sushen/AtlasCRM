// Actual local workerd + SQLite, fictional JWTs and fully intercepted outbound requests.
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'partner-smoke'};
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
async function identity(sub,admin=false){
  const now=Math.floor(Date.now()/1000),input=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({aud:'smoke-project',iss:'https://securetoken.google.com/smoke-project',sub,atlasOperator:admin,iat:now-10,auth_time:now-20,exp:now+3600});
  return input+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input))).toString('base64url');
}
const secret='fictional-webhook-and-partner-secret-long-enough',sent=[];
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'atlas-partner-smoke',modules:true,script:await readFile(new URL('../.worker-build/index.js',import.meta.url),'utf8'),compatibilityDate:'2025-10-01',
  durableObjects:{ATLAS_COORDINATOR:{className:'AtlasCoordinator',useSQLite:true}},bindings:{PARTNER_TRACKING_ENABLED:'true',PARTNER_HASH_SECRET:secret,FIREBASE_PROJECT_ID:'smoke-project',CATALOG_PUBLIC_ENABLED:'true',CATALOG_ALLOWED_ORIGINS:'https://atlascrm-c5722.web.app',
    TELEGRAM_BOT_ENABLED:'true',TELEGRAM_SHOP_ENABLED:'true',TELEGRAM_CATALOG_CHAT_IDS:'-123',TELEGRAM_SHOP_ADMIN_IDS:'99',TELEGRAM_SHOP_SUPPORT_URL:'https://t.me/FictionalAdmin',TELEGRAM_BOT_TOKEN:'123:fictional',TELEGRAM_WEBHOOK_SECRET:secret,CANBOSS_BUYER_API_KEY:'fictional'},
  outboundService:async request=>{
    const url=new URL(request.url);
    if(url.origin==='https://www.googleapis.com')return Response.json({keys:[jwk]},{headers:{'Cache-Control':'max-age=3600'}});
    if(url.origin==='https://canboso.com')return Response.json({success:true,products:[{productId:'smoke_product',name:'Canva Pro',price:{amount:10,currency:'USD'},availability:{available:5}}]});
    if(url.origin==='https://api.telegram.org'){sent.push(await request.json());return Response.json({ok:true,result:{message_id:1}});}
    throw Error('Unexpected outbound request; no live external service allowed');
  }}]}));
try{
  const admin=await identity('fictional-operator',true),partner=await identity('fictional-partner'),other=await identity('fictional-other');
  const call=async(path,{body,token}={})=>mf.dispatchFetch('https://local.test/api/partners/'+path,{method:body?'POST':'GET',headers:{Origin:'https://atlascrm-c5722.web.app',...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const command=async(action,extra={})=>{const response=await call('admin',{token:admin,body:{action,partnerId:'PARTNER-001',requestId:crypto.randomUUID(),...extra}});assert.equal(response.status,200,await response.clone().text());return response.json();};
  await command('createPartner',{name:'Fictional partner',ownerUid:'fictional-partner'});
  const campaign=await command('campaign',{campaignId:'SMOKE'});assert.match(campaign.url,/ref=PARTNER-001/);
  assert.equal((await call('admin',{token:partner,body:{action:'createPartner',requestId:crypto.randomUUID()}})).status,400);
  const click=await (await call('click',{body:{partnerId:'PARTNER-001',campaignId:'SMOKE',visitor:'fictional_visitor_identifier_001'}})).json();
  const handoff=await(await call('handoff',{body:{visit:click.visit,productId:'smoke_product'}})).json();assert.match(handoff.url,/start=r_/);
  let update=1;
  const message=(buyer,text)=>({update_id:update++,message:{chat:{id:buyer,type:'private'},from:{id:buyer},text}});
  const webhook=async value=>{const r=await mf.dispatchFetch('https://local.test/webhooks/telegram',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify(value)});assert.equal(r.status,200,await r.text());};
  await webhook(message(1,'/start '+handoff.url.split('start=')[1]));
  await webhook({update_id:update++,callback_query:{id:'cb',from:{id:1},data:'buy:smoke_product',message:{chat:{id:1,type:'private'}}}});
  const id=sent.map(x=>/AM-[a-f0-9]{16}/.exec(x.text||'')?.[0]).find(Boolean);assert.ok(id);
  await webhook(message(1,'/payment '+id+' FICTIONAL-TXN-001'));
  await webhook({update_id:update++,callback_query:{id:'cb2',from:{id:99},data:'review:approve:'+id,message:{chat:{id:99,type:'private'}}}});
  await webhook(message(99,'/fulfill '+id+' Delivered manually'));
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'}),query='report?partnerId=PARTNER-001&from='+today+'&to='+today;
  const response=await call(query,{token:partner});assert.equal(response.status,200);const report=await response.json();
  assert.equal(report.verifiedSales,1);assert.equal(report.commissionMinor,1000);assert.equal(report.dueMinor,1000);
  assert.equal((await call(query,{token:other})).status,400);
  await command('refund',{orderId:id,note:'Fictional manual refund'});
  const reversed=await(await call(query,{token:partner})).json();assert.equal(reversed.verifiedSales,0);assert.equal(reversed.dueMinor,0);
  console.log('Local workerd/SQLite partner journey passed: verified delivery credits BDT 10 once; cross-partner access denied; refund reversed. No live external calls.');
}finally{await mf.dispose();}
