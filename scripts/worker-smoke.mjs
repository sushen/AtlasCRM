import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

// No .env/.dev.vars loaded; every outbound request is intercepted locally.
const secret='fictional-smoke-secret-over-thirty-two-characters';
const manual=process.argv.includes('--manual-payments');
let supplierCalls=0,telegramCalls=0;
const telegramPayloads=[];
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'smoke-key'};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const now=Math.floor(Date.now()/1000);
const input=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({aud:'smoke-project',iss:'https://securetoken.google.com/smoke-project',sub:'fictional-user',iat:now-10,auth_time:now-20,exp:now+3600});
const token=input+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input))).toString('base64url');
const source=await readFile(join(import.meta.dirname,'../.worker-build/index.js'),'utf8');
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'atlas-smoke',modules:true,script:source,
  compatibilityDate:'2025-10-01',durableObjects:{ATLAS_COORDINATOR:{className:'AtlasCoordinator',useSQLite:true}},
  bindings:{CANBOSS_BUYER_API_KEY:'fictional',TELEGRAM_BOT_TOKEN:'123:fictional',TELEGRAM_WEBHOOK_SECRET:secret,
    ATLAS_ADMIN_TOKEN:secret,TELEGRAM_CATALOG_CHAT_IDS:'-123',CATALOG_ALLOWED_ORIGINS:'https://atlascrm-c5722.web.app',FIREBASE_PROJECT_ID:'smoke-project',
    TELEGRAM_SHOP_ENABLED:'true',TELEGRAM_SHOP_ADMIN_IDS:'99',TELEGRAM_SHOP_SUPPORT_URL:'https://t.me/FictionalAdmin',
    ...(manual?{MANUAL_CHECKOUT_ENABLED:'true',BINANCE_PAY_UID:'987654321',BINANCE_PAY_NAME:'FictionalReceiver',
      BINANCE_PAY_QR_FILE_ID:'fixture_receiving_qr_123456',PAYMENT_USD_USDT_RATE:'1'}:{})},
  outboundService:async request=>{
    const url=new URL(request.url);
    if(url.origin==='https://canboso.com') {supplierCalls++;return Response.json({success:true,products:[{productId:'smoke_product',name:'Canva Pro',price:{amount:10,currency:'USD'},availability:{available:5}}]});}
    if(url.origin==='https://api.telegram.org') {telegramCalls++;telegramPayloads.push(await request.json());return Response.json({ok:true,result:{message_id:1}});}
    if(url.origin==='https://www.googleapis.com')return Response.json({keys:[jwk]},{headers:{'Cache-Control':'max-age=3600'}});
    throw Error('Unexpected outbound request in smoke test');
  }}]}));
try {
  const call=(path,options)=>mf.dispatchFetch('https://local.test'+path,options);
  assert.equal((await call('/health')).status,200);
  assert.equal((await call('/api/admin/bot-state')).status,401);
  const auth={Authorization:'Bearer '+secret,'Content-Type':'application/json'};
  assert.equal((await (await call('/api/admin/bot-state',{headers:auth})).json()).enabled,false);
  const webhook=id=>({method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify({update_id:id,message:{chat:{id:-123},text:'💬 Support'}})});
  assert.equal((await (await call('/webhooks/telegram',webhook(1))).json()).disabled,true);assert.equal(telegramCalls,0);
  assert.equal((await call('/api/admin/bot-state',{method:'POST',headers:auth,body:'{"enabled":true}'})).status,200);
  const first=await call('/webhooks/telegram',webhook(2));assert.equal(first.status,200);
  await call('/webhooks/telegram',webhook(2));assert.equal(telegramCalls,1);
  assert.equal((await call('/api/catalog/products',{headers:{Origin:'https://atlascrm-c5722.web.app'}})).status,401);
  const headers={Origin:'https://atlascrm-c5722.web.app',Authorization:'Bearer '+token};
  const catalog=await (await call('/api/catalog/products',{headers})).json();assert.equal(catalog.products[0].price,11);
  await call('/api/catalog/products',{headers});assert.equal(supplierCalls,1);
  assert.equal((await call('/api/catalog/products',{headers:{Origin:'https://unapproved.invalid'}})).status,403);
  const shopUpdate=async(update)=>{
    const response=await call('/webhooks/telegram',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify(update)});
    assert.equal(response.status,200);
  };
  const buyerMessage=(id,text,update_id)=>({update_id,message:{chat:{id,type:'private'},from:{id},text}});
  const buyerCallback=(id,data,update_id)=>({update_id,callback_query:{id:'smoke-callback',from:{id},data,message:{chat:{id,type:'private'},message_id:1}}});
  await shopUpdate(buyerCallback(1,'buy:smoke_product',10));
  const order=/AM-[a-f0-9]{16}/.exec(telegramPayloads.at(-1).text)?.[0];assert.ok(order,'Private shop order must persist');
  if(manual) {
    const created=telegramPayloads.find(p=>p.chat_id===1&&p.parse_mode==='HTML'&&p.text?.includes('<b>💳 Binance Pay</b>'));
    assert.match(created.text,/<code>11.00<\/code> <b>USDT<\/b>/);assert.equal(created.reply_markup.inline_keyboard[2][0].text,'Pay with Binance');
    await shopUpdate(buyerCallback(1,'pay:'+order,11));assert.ok(telegramPayloads.some(p=>p.photo==='fixture_receiving_qr_123456'));
    await shopUpdate(buyerCallback(1,'paid:'+order,12));
    await shopUpdate(buyerMessage(1,'TX-123456',13));const count=telegramCalls;
    await shopUpdate(buyerMessage(1,'TX-123456',13));assert.equal(telegramCalls,count);
    await shopUpdate(buyerCallback(1,'evidence:'+order,14));
    const evidence=buyerMessage(1,undefined,15);evidence.message.message_id=15;evidence.message.photo=[{file_id:'fixture_evidence_123',file_unique_id:'fixture_unique_123',file_size:1000}];
    await shopUpdate(evidence);assert.ok(telegramPayloads.some(p=>p.chat_id===99&&p.photo==='fixture_evidence_123'));
    await shopUpdate(buyerCallback(2,'review:approve:'+order+':2',16));assert.match(telegramPayloads.at(-1).text,/Admin access/);
    await shopUpdate(buyerCallback(99,'review:show:'+order,17));const approval=telegramPayloads.at(-1).reply_markup.inline_keyboard[0][0].callback_data;
    await shopUpdate(buyerCallback(99,'review:approve:'+order+':1',18));assert.match(telegramPayloads.at(-1).text,/evidence changed/);
    await shopUpdate(buyerCallback(99,approval,19));assert.match(telegramPayloads.at(-1).text,/Payment confirmed by admin/);
    const verifiedCount=telegramPayloads.filter(p=>p.chat_id===1&&p.text?.includes('Payment confirmed by admin')).length;
    await shopUpdate(buyerCallback(99,approval,20));assert.equal(telegramPayloads.filter(p=>p.chat_id===1&&p.text?.includes('Payment confirmed by admin')).length,verifiedCount);
    await shopUpdate(buyerMessage(99,'/fulfill '+order+' Delivered separately.',21));assert.match(telegramPayloads.at(-1).text,/Fulfilled by admin/);
  }else {
    await shopUpdate(buyerMessage(1,'/payment '+order+' TX-123456',11));
    assert.ok(telegramPayloads.some(p=>p.chat_id===99&&p.text?.includes('TX-123456')));
    await shopUpdate(buyerCallback(2,'review:approve:'+order,12));assert.match(telegramPayloads.at(-1).text,/Admin access/);
    await shopUpdate(buyerCallback(99,'review:approve:'+order,13));assert.match(telegramPayloads.at(-1).text,/Payment confirmed by admin/);
    await shopUpdate(buyerMessage(99,'/fulfill '+order+' Delivered separately.',14));assert.match(telegramPayloads.at(-1).text,/Fulfilled by admin/);
  }
  const countBefore=telegramCalls;
  assert.equal((await call('/api/admin/bot-state',{method:'POST',headers:auth,body:'{"enabled":false}'})).status,200);
  await call('/webhooks/telegram',webhook(3));assert.equal(telegramCalls,countBefore);
  console.log('Workers runtime smoke passed ('+(manual?'manual payment checkout':'existing contact ordering')+'): SQLite order creation, reference review, admin isolation, fulfillment, signed Firebase identity, webhook deduplication and cache. All providers mocked.');
} finally {await mf.dispose();}
