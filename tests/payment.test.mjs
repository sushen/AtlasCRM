import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {paymentConfiguration} from '../server/payments/config.mjs';
import {BinanceManualPaymentProvider} from '../server/payments/binance-manual.mjs';
import {ShopOrders,normalizeOrder,PAYMENT_STATUS as P} from '../server/shop-orders.mjs';
import {ShopFileStorage} from '../server/shop-file-storage.mjs';
import {TelegramShop} from '../server/telegram-shop.mjs';
import {TelegramApi} from '../server/telegram-catalog.mjs';
import {normalizeProduct} from '../server/catalog.mjs';
import {paymentCopyRows,paymentInstructionText,paymentQrCaption} from '../server/payments/presentation.mjs';

const env={MANUAL_CHECKOUT_ENABLED:'true',BINANCE_PAY_UID:'987654321',BINANCE_PAY_NAME:'FictionalReceiver',
  BINANCE_PAY_QR_FILE_ID:'fixture_receiving_qr_123456',PAYMENT_USD_USDT_RATE:'1'};
const product=normalizeProduct({productId:'fixture_product',name:'Canva Pro fictional',price:{amount:10,currency:'USD'},availability:{available:5}});
function memory() {
  const values=new Map();let tail=Promise.resolve();
  const read=async key=>structuredClone(values.get(key));
  return {get:read,list:async({prefix,startAfter='',limit=100})=>new Map([...values].filter(([key])=>key.startsWith(prefix)&&key>startAfter).sort(([a],[b])=>a<b?-1:a>b?1:0).slice(0,limit)),
    transaction:operation=>{
      const result=tail.then(async()=>{const next=structuredClone(values);
        const result=await operation({get:async key=>structuredClone(next.get(key)),put:async(k,v)=>{next.set(k,structuredClone(v));}});
        values.clear();for(const [k,v]of next)values.set(k,v);return result;
      });tail=result.catch(()=>{});return result;
    }};
}
function setup(overrides={},storage=memory()) {
  let now=1700000000000;
  const orders=new ShopOrders(storage,{adminIds:[99],now:()=>now});
  const config=paymentConfiguration({...env,...overrides});const payments=new BinanceManualPaymentProvider(config,orders);
  const calls=[];const api={call:async(method,payload)=>{calls.push({method,payload});return {message_id:1};}};
  const shop=new TelegramShop({orders,api,catalog:{list:async()=>({products:[product]})},adminIds:[99],supportUrl:'https://t.me/FictionalAdmin',payments});
  const message=(id,text,update_id=1,extra={})=>({update_id,message:{message_id:update_id,chat:{id,type:'private'},from:{id,username:'fixture_buyer'},text,...extra}});
  const callback=(id,data,update_id=1)=>({update_id,callback_query:{id:'fixture_callback',from:{id},data,message:{message_id:1,chat:{id,type:'private'}}}});
  const create=(buyer=1,intent=1)=>orders.create(buyer,product,intent,{username:'fixture_buyer',paymentQuote:payments.quote(product)});
  return {orders,payments,calls,shop,create,message,callback,storage,advance:ms=>{now+=ms;}};
}
const screenshot={fileId:'fixture_screenshot_123',fileUniqueId:'fixture_unique_123',messageId:2,fileSize:2048};

test('retail markup applies once, explicit 1:1 conversion and receiving snapshot are immutable',async()=>{
  const s=setup();const order=await s.create();assert.equal(product.price,12);assert.equal(order.totalAmount,12);assert.equal(order.currency,'USDT');
  assert.equal(order.paymentQuote.sourceCurrency,'USD');assert.equal(order.paymentQuote.conversionRate,'1');assert.equal(order.paymentStatus,P.PENDING);assert.equal(order.deliveryStatus,'NOT_DELIVERED');
  const other=new BinanceManualPaymentProvider(paymentConfiguration({...env,BINANCE_PAY_UID:'1234',BINANCE_PAY_NAME:'ChangedReceiver'}),s.orders);
  const instructions=await other.createPaymentInstructions(order);assert.match(instructions.text,/FictionalReceiver/);assert.match(instructions.text,/12.00 USDT/);
  const scarce=normalizeProduct({productId:product.id,name:product.name,price:{amount:10,currency:'USD'},availability:{available:1}});
  assert.equal(s.payments.quote(scarce).totalAmount,14);
  assert.equal((await s.orders.getForBuyer(order.id,1)).totalAmount,12);
  assert.equal(instructions.photo,env.BINANCE_PAY_QR_FILE_ID);assert.equal(instructions.paymentLink,null);assert.ok(!instructions.text.includes('pay.binance.com'));
});
test('missing rates, unsupported conversion and unverified/arbitrary links fail closed',()=>{
  const s=setup({PAYMENT_USD_USDT_RATE:''});assert.throws(()=>s.payments.quote(product),/explicit conversion/);
  assert.throws(()=>setup({PAYMENT_USD_USDT_RATE:'NaN'}),/positive explicit/);
  assert.throws(()=>setup({BINANCE_PAY_PAYMENT_LINK:'https://evil.invalid/pay',BINANCE_PAY_LINK_VERIFIED:'true'}),/verified HTTPS/);
  assert.throws(()=>setup({BINANCE_PAY_PAYMENT_LINK:'https://pay.binance.com/fixture'}),/verified HTTPS/);
  assert.throws(()=>setup({PAYMENT_MODE:'automatic'}),/Only manually/);
  assert.throws(()=>setup({BINANCE_PAY_UID:''}),/Receiving identity/);
  assert.throws(()=>setup({MANUAL_CHECKOUT_ENABLED:'false'}).payments.quote(product),/disabled/);
  assert.throws(()=>setup({PAYMENT_CURRENCY:'EUR'}).payments.quote(product),/conversion/);
});
test('decimal conversion is deterministic and no fictitious Binance URL is constructed',()=>{
  const s=setup({PAYMENT_USD_USDT_RATE:'1.25'});assert.equal(s.payments.quote(product).totalAmount,15);
  const small=setup({PAYMENT_USD_USDT_RATE:'0.33333333'}).payments.quote({...product,price:0.1});assert.equal(small.totalMinor,'33333');
  const linked=setup({BINANCE_PAY_PAYMENT_LINK:'https://pay.binance.com/fixture-supplied-link',BINANCE_PAY_LINK_VERIFIED:'true'});
  assert.equal(linked.payments.quote(product).paymentLink,'https://pay.binance.com/fixture-supplied-link');
});
test('older fulfilled and pending orders project separate statuses without rewriting stored quotes',async()=>{
  const s=setup();const id='AM-1234567890abcdef';const legacy={id,buyer:1,product:{...product,price:7,currency:'USD'},status:'fulfilled',createdAt:1,events:[{type:'approve',actor:99,at:2},{type:'fulfill',actor:99,at:3}]};
  await s.storage.transaction(tx=>tx.put('order:'+id,legacy));const order=await s.orders.getForBuyer(id,1);
  assert.equal(order.paymentStatus,P.VERIFIED);assert.equal(order.deliveryStatus,'DELIVERED');assert.equal(order.currency,'USD');assert.equal(order.totalAmount,7);assert.equal(order.verifiedAt,2);
  assert.equal((await s.storage.get('order:'+id)).paymentStatus,undefined);
  assert.equal(normalizeOrder({...legacy,status:'awaiting_payment',events:[]}).paymentStatus,P.PENDING);
});
test('checkout buttons, QR instructions, I Have Paid dialogue and plain reference submission work privately',async()=>{
  const s=setup();await s.shop.handle(s.callback(1,'buy:fixture_product',10));const order=(await s.orders.list(1))[0];
  const created=s.calls.find(c=>c.payload.chat_id===1&&c.payload.parse_mode==='HTML'&&c.payload.text?.includes('<b>💳 Binance Pay</b>'));
  assert.deepEqual(created.payload.reply_markup.inline_keyboard.slice(2,5).map(row=>row[0].text),['Pay with Binance','I Have Paid','Cancel Order']);
  assert.match(created.payload.text,/<code>12.00<\/code> <b>USDT<\/b>/);
  const copies=created.payload.reply_markup.inline_keyboard.flat().filter(b=>b.copy_text);
  assert.deepEqual(copies.map(b=>b.copy_text.text),[env.BINANCE_PAY_UID,env.BINANCE_PAY_NAME,'12.00',order.id]);
  assert.ok(copies.every(b=>!b.callback_data&&!b.url));
  await s.shop.handle(s.callback(1,'pay:'+order.id,11));assert.ok(s.calls.some(c=>c.method==='sendPhoto'&&c.payload.photo===env.BINANCE_PAY_QR_FILE_ID));
  await s.shop.handle(s.callback(1,'paid:'+order.id,12));assert.equal((await s.orders.getDialog(1)).orderId,order.id);
  const prompt=s.calls.at(-1).payload;assert.equal(prompt.parse_mode,'HTML');assert.equal(prompt.reply_markup.force_reply,true);assert.match(prompt.text,/Paste your Binance Pay transaction ID/);assert.match(prompt.text,/next message/);assert.match(prompt.text,/manually/);

  await s.shop.handle(s.message(1,'BN-123456',13));const submitted=await s.orders.getForBuyer(order.id,1);
  assert.equal(submitted.paymentStatus,P.SUBMITTED);assert.equal(submitted.deliveryStatus,'NOT_DELIVERED');assert.equal(submitted.verifiedBy,null);
  const receipt=s.calls.find(c=>c.payload.chat_id===1&&c.payload.text?.includes('Payment reference received'));assert.match(receipt.payload.text,/Awaiting manual verification/);assert.match(receipt.payload.text,/BN-123456/);
  const notice=s.calls.find(c=>c.payload.chat_id===99&&c.payload.text?.includes('BN-123456'));assert.match(notice.payload.text,/Customer Telegram ID: 1/);assert.match(notice.payload.text,/Submitted at:/);
  assert.equal(await s.orders.getDialog(1),null);
});
test('duplicate references notify once; same reference cannot pay for another order',async()=>{
  const s=setup();const order=await s.create();await s.shop.handle(s.message(1,'/payment '+order.id+' BN-123456'));
  const notices=s.calls.filter(c=>c.payload.chat_id===99).length;
  await s.shop.handle(s.message(1,'/payment '+order.id+' bn-123456',2));assert.equal(s.calls.filter(c=>c.payload.chat_id===99).length,notices);
  const other=await s.create(2,2);await assert.rejects(s.orders.submitReference(other.id,2,'BN-123456'),/already attached/);
});
test('screenshot evidence cannot approve payment and invalidates old admin confirmations',async()=>{
  const s=setup();const order=await s.create();await s.orders.submitReference(order.id,1,'BN-123456');
  await s.shop.handle(s.callback(99,'review:show:'+order.id));assert.equal((await s.orders.getForBuyer(order.id,1)).paymentStatus,P.REVIEW);
  const oldVersion=(await s.orders.getForBuyer(order.id,1)).submissionVersion;
  await s.orders.addEvidence(order.id,1,screenshot);
  await assert.rejects(s.orders.review(order.id,99,'approve','',{expectedVersion:oldVersion}),/evidence changed/);
  const result=await s.orders.getForBuyer(order.id,1);assert.equal(result.paymentStatus,P.SUBMITTED);assert.equal(result.deliveryStatus,'NOT_DELIVERED');
  assert.equal((await s.orders.addEvidence(order.id,1,screenshot)).changed,false);assert.equal(result.paymentScreenshotReference,screenshot.fileId);
});
test('explicit approval is atomic/idempotent; delivery remains a distinct manual action',async()=>{
  const s=setup();const order=await s.create();await s.orders.submitReference(order.id,1,'BN-123456');
  const version=(await s.orders.getForBuyer(order.id,1)).submissionVersion;
  await assert.rejects(s.payments.verifyPayment(order.id,99,'approve','checked',version+1),/evidence changed/);
  const results=await Promise.all([s.payments.verifyPayment(order.id,99,'approve','checked',version),s.payments.verifyPayment(order.id,99,'approve','checked',version)]);
  assert.equal(results.filter(r=>r?.changed).length,1);
  const verified=await s.orders.getForBuyer(order.id,1);assert.equal(verified.paymentStatus,P.VERIFIED);assert.equal(verified.verifiedBy,99);assert.ok(verified.verifiedAt);assert.equal(verified.deliveryStatus,'NOT_DELIVERED');
  assert.equal((await s.orders.pending({deliveryOnly:true})).length,1);
  await assert.rejects(s.orders.review(order.id,99,'fulfill'),/not ready/);
  await s.orders.review(order.id,99,'fulfill','Sent manually');assert.equal((await s.orders.getForBuyer(order.id,1)).deliveryStatus,'DELIVERED');
  assert.equal((await s.orders.review(order.id,99,'fulfill','No resend')).changed,false);
  assert.equal((await s.orders.review(order.id,99,'approve','',{expectedVersion:version})).changed,false);
});
test('unauthorized review, cross-buyer callbacks and malformed/oversized evidence never mutate orders',async()=>{
  const s=setup();const order=await s.create();await s.orders.submitReference(order.id,1,'BN-123456');
  await s.shop.handle(s.callback(2,'review:approve:'+order.id+':1'));assert.match(s.calls.at(-1).payload.text,/Admin access/);
  await s.shop.handle(s.callback(2,'paid:'+order.id));assert.match(s.calls.at(-1).payload.text,/not found/);
  await assert.rejects(s.orders.review(order.id,2,'approve','',{expectedVersion:1}),/Admin access/);
  await assert.rejects(s.orders.addEvidence(order.id,1,{...screenshot,fileSize:20*1024*1024}),/Invalid/);
  await assert.rejects(s.orders.addEvidence(order.id,1,{...screenshot,fileId:'https://bad.invalid/'}),/Invalid/);
  assert.equal((await s.orders.getForBuyer(order.id,1)).paymentStatus,P.SUBMITTED);
});
test('admin rejection and request-information notifications never imply verification',async()=>{
  const s=setup();const order=await s.create();await s.orders.submitReference(order.id,1,'BN-123456');
  await s.shop.handle(s.callback(99,'review:info:'+order.id+':1'));
  assert.ok(s.calls.some(c=>c.payload.chat_id===1&&c.payload.text?.includes('Admin requests information')));
  await s.shop.handle(s.message(1,'My transfer was sent from the agreed account.',3));
  const latest=await s.orders.getForBuyer(order.id,1);assert.equal(latest.paymentStatus,P.SUBMITTED);assert.ok(latest.buyerInformation);
  await s.shop.handle(s.callback(99,'review:reject:'+order.id+':'+latest.submissionVersion));
  const rejected=await s.orders.getForBuyer(order.id,1);assert.equal(rejected.paymentStatus,P.REJECTED);assert.equal(rejected.deliveryStatus,'NOT_DELIVERED');
  await assert.rejects(s.orders.review(order.id,99,'fulfill','x'),/not ready/);
});
test('cancel is owned/idempotent; dialogs are isolated, expire, and survive order service restart',async()=>{
  const s=setup();const order=await s.create();await s.shop.handle(s.callback(1,'paid:'+order.id));
  const restarted=new ShopOrders(s.storage,{adminIds:[99],now:s.orders.now});assert.equal((await restarted.getDialog(1)).orderId,order.id);assert.equal(await restarted.getDialog(2),null);
  s.advance(31*60000);assert.equal(await s.orders.getDialog(1),null);
  await s.shop.handle(s.callback(1,'cancel:'+order.id));await s.orders.cancel(order.id,1);
  assert.equal((await s.orders.getForBuyer(order.id,1)).paymentStatus,P.CANCELLED);
  await assert.rejects(s.orders.getForBuyer(order.id,2),/not found/);
});
test('late already-paid references can be reviewed but expired quotes cannot display pay instructions',async()=>{
  const s=setup();const order=await s.create();s.advance(25*3600000);
  await assert.rejects(s.payments.createPaymentInstructions(order),/not awaiting payment/);
  await s.orders.submitReference(order.id,1,'LATE-123456');assert.equal((await s.orders.getForBuyer(order.id,1)).quoteExpiredAtSubmission,true);
});
test('photo caption submission and separate screenshot dialogue notify only the private admin',async()=>{
  const s=setup();const order=await s.create();
  await s.shop.handle(s.message(1,undefined,20,{caption:'/payment '+order.id+' PHOTO-123456',photo:[{file_id:screenshot.fileId,file_unique_id:screenshot.fileUniqueId,file_size:1000}]}));
  assert.equal((await s.orders.getForBuyer(order.id,1)).paymentScreenshotReference,screenshot.fileId);
  assert.ok(s.calls.some(c=>c.method==='sendPhoto'&&c.payload.chat_id===99));assert.ok(s.calls.every(c=>[1,99].includes(c.payload.chat_id)));
  const version=(await s.orders.getForBuyer(order.id,1)).submissionVersion;
  await s.shop.handle(s.callback(1,'evidence:'+order.id));
  await s.shop.handle(s.message(1,undefined,21,{photo:[{file_id:screenshot.fileId,file_unique_id:screenshot.fileUniqueId,file_size:1000}]}));
  assert.equal((await s.orders.getForBuyer(order.id,1)).submissionVersion,version);
});
test('confirmed transaction index prevents two imported orders from being approved for the same payment',async()=>{
  const s=setup();const first=await s.create(1,1),second=await s.create(2,2);
  for(const order of [first,second])await s.storage.transaction(tx=>tx.put('order:'+order.id,{...order,paymentStatus:P.SUBMITTED,status:'awaiting_review',reference:'IMPORTED123',submittedTransactionId:'IMPORTED123',submissionVersion:1}));
  const results=await Promise.allSettled([s.orders.review(first.id,99,'approve','',{expectedVersion:1}),s.orders.review(second.id,99,'approve','',{expectedVersion:1})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
});
test('private QR Blob uploads as multipart without leaking local paths or credentials in JSON',async()=>{
  let sent;
  const api=new TelegramApi('123:fictional',{fetchImpl:async(_url,options)=>{sent=options;return Response.json({ok:true,result:{message_id:1}});}});
  await api.call('sendPhoto',{chat_id:99,photo:new Blob([new Uint8Array([255,216,255])],{type:'image/jpeg'}),caption:'Fictional receiving QR'});
  assert.ok(sent.body instanceof FormData);assert.equal(sent.headers,undefined);assert.equal(sent.body.get('chat_id'),'99');assert.ok(sent.body.get('photo') instanceof Blob);
});
test('file-backed payment state and dialogue survive restart and failed transactions do not partially save',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'atlas-fictional-payment-'));
  try {
    const path=join(dir,'orders.json'),s=setup({},new ShopFileStorage(path));const order=await s.create();
    await s.orders.setDialog(1,order.id,'reference');await s.orders.submitReference(order.id,1,'FILE-123456');
    const restarted=new ShopOrders(new ShopFileStorage(path),{adminIds:[99],now:s.orders.now});
    assert.equal((await restarted.getForBuyer(order.id,1)).paymentStatus,P.SUBMITTED);assert.equal(await restarted.getDialog(1),null);
    const before=await readFile(path,'utf8');await assert.rejects(restarted.review(order.id,2,'approve','',{expectedVersion:1}));assert.equal(await readFile(path,'utf8'),before);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('admin queues paginate beyond the first page without leaking them to buyers',async()=>{
  const s=setup();for(let i=1;i<=23;i++)await s.create(i,i);
  const ids=[];let cursor='';
  do {const page=await s.orders.pendingPage({cursor,limit:10});ids.push(...page.orders.map(o=>o.id));cursor=page.cursor;}while(cursor);
  assert.equal(ids.length,23);assert.equal(new Set(ids).size,23);
  await s.shop.handle(s.message(2,'/orders'));assert.match(s.calls.at(-1).payload.text,/Admin access/);
  const order=(await s.orders.list(1))[0];await s.shop.handle(s.callback(2,'queue:orders:'+order.id));assert.match(s.calls.at(-1).payload.text,/Admin access/);
});
test('malformed checkout callbacks and mismatched private actors do not create orders',async()=>{
  const s=setup();await s.shop.handle(s.callback(1,'paid:../../private'));assert.equal((await s.orders.list(1)).length,0);
  const bad=s.callback(1,'buy:fixture_product');bad.callback_query.from.id=2;assert.equal(await s.shop.handle(bad),false);
});
test('local-QR snapshots require a checksum and fail safely if the asset changed',async()=>{
  assert.throws(()=>setup({BINANCE_PAY_QR_FILE_ID:'',BINANCE_PAY_QR_PATH:'.payment-private/fixture.jpg'}),/checksum/);
  const config=paymentConfiguration({...env,BINANCE_PAY_QR_FILE_ID:'',BINANCE_PAY_QR_PATH:'.payment-private/fixture.jpg',BINANCE_PAY_QR_SHA256:'a'.repeat(64)});
  const s=setup();const provider=new BinanceManualPaymentProvider(config,s.orders,{loadQr:async()=>{throw Error('Private path/detail must not escape');}});
  const quote=provider.quote(product),order=await s.orders.create(1,product,1,{paymentQuote:quote});
  await assert.rejects(provider.createPaymentInstructions(order),/Receiving QR is unavailable or changed/);
});
test('a payment prompt does not swallow ordinary catalog navigation or Support menu actions',async()=>{
  const s=setup();const order=await s.create();await s.orders.setDialog(1,order.id,'reference');
  await s.shop.handle(s.message(1,'/products'));assert.ok(s.calls.at(-1).payload.reply_markup.inline_keyboard);
  await s.shop.handle(s.message(1,'💬 Support'));assert.match(s.calls.at(-1).payload.text,/Contact admin/);
  assert.equal((await s.orders.getForBuyer(order.id,1)).paymentStatus,P.PENDING);
});


test('payment presentation escapes untrusted fields and keeps exact quoted clipboard values',async()=>{
  const s=setup({BINANCE_PAY_NAME:'Receiver & <team>'});const order=await s.create();
  order.product.name='<a href="https://evil.invalid">Fake recipient</a>';
  const text=paymentInstructionText(order),caption=paymentQrCaption(order);
  assert.ok(!text.includes('<a href='));assert.match(text,/&lt;a href=&quot;/);
  assert.match(text,/Receiver &amp; &lt;team&gt;/);assert.match(caption,/Receiver &amp; &lt;team&gt;/);
  assert.equal(paymentCopyRows(order)[0][1].copy_text.text,'Receiver & <team>');
  assert.ok(caption.length<1024);assert.ok(text.length<4096);
});
test('copy amount omits grouping and currency while retaining small decimal amounts',async()=>{
  const s=setup();const order=await s.create();order.totalAmount=12345.678901;
  assert.equal(paymentCopyRows(order)[1][0].copy_text.text,'12345.678901');
  order.totalAmount=0.000001;assert.equal(paymentCopyRows(order)[1][0].copy_text.text,'0.000001');
});
