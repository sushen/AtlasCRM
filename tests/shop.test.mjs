import test from 'node:test';
import assert from 'node:assert/strict';
import {ShopOrders} from '../server/shop-orders.mjs';
import {TelegramShop,shopProductLink,shopContactUrl} from '../server/telegram-shop.mjs';
import {channelShopPosts} from '../server/channel-shop.mjs';
import {ShopFileStorage} from '../server/shop-file-storage.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function storage() {
  const values=new Map();let tail=Promise.resolve();
  const get=async key=>structuredClone(values.get(key));
  const list=async({prefix,startAfter='',limit=100})=>new Map([...values].filter(([key])=>key.startsWith(prefix)&&key>startAfter).sort(([a],[b])=>a<b?-1:a>b?1:0).slice(0,limit).map(([k,v])=>[k,structuredClone(v)]));
  return {get,list,transaction:operation=>{
    const result=tail.then(async()=>{
      const next=new Map([...values].map(([k,v])=>[k,structuredClone(v)]));
      const answer=await operation({get:async key=>structuredClone(next.get(key)),put:async(k,v)=>next.set(k,structuredClone(v))});
      values.clear();for(const[k,v]of next)values.set(k,v);return answer;
    });tail=result.catch(()=>{});return result;
  }};
}
const product={id:'canva_1',name:'Canva Pro',price:11,currency:'USD',stock:'available',available:3,description:'Fictional product',requirements:{}};
test('concurrent duplicate order intents create one order, retain single markup and isolate buyers',async()=>{
  const state=storage();const a=new ShopOrders(state),b=new ShopOrders(state);
  const orders=await Promise.all([a.create(1,product,1),b.create(1,product,1)]);
  assert.equal(orders[0].id,orders[1].id);assert.equal((await a.list(1)).length,1);assert.equal(orders[0].product.price,11);
  await assert.rejects(a.getForBuyer(orders[0].id,2),/not found/);assert.deepEqual(await a.list(2),[]);
  await assert.rejects(a.create(1,{...product,id:'other'},1),/Conflicting/);
});
test('reference submission is pending review, cannot be reused across orders and is not payment confirmation',async()=>{
  const orders=new ShopOrders(storage());const first=await orders.create(1,product,1),second=await orders.create(2,product,2);
  const receipt=await orders.submitReference(first.id,1,'TX-123456');assert.equal(receipt.order.status,'awaiting_review');
  assert.equal((await orders.submitReference(first.id,1,'TX-123456')).changed,false);
  await assert.rejects(orders.submitReference(second.id,2,'tx-123456'),/already attached/);
  await assert.rejects(orders.submitReference(first.id,2,'OTHER123'),/not found/);
  await assert.rejects(orders.submitReference(second.id,2,'https://bad.invalid'),/transaction reference/);
});
test('approval and fulfillment are distinct audited transitions and repeats are idempotent',async()=>{
  const orders=new ShopOrders(storage(),{adminIds:[99]});const order=await orders.create(1,product,1);
  await assert.rejects(orders.review(order.id,99,'approve'),/not ready/);
  await orders.submitReference(order.id,1,'TX-123456');
  const approved=await orders.review(order.id,99,'approve');assert.equal(approved.order.status,'approved');
  assert.equal((await orders.review(order.id,99,'approve')).changed,false);
  await assert.rejects(orders.review(order.id,99,'fulfill'),/not ready/);
  const result=await orders.review(order.id,99,'fulfill','Delivered separately; contact support if missing.');
  assert.equal(result.order.status,'fulfilled');assert.equal(result.order.events.at(-1).actor,99);
  assert.equal((await orders.review(order.id,99,'fulfill','same')).changed,false);
  await assert.rejects(orders.review(order.id,99,'reject'),/not ready/);
});
test('out of stock, bad price, quote expiry, and excessive pending orders fail safely',async()=>{
  let now=100;const orders=new ShopOrders(storage(),{now:()=>now});
  await assert.rejects(orders.create(1,{...product,stock:'out'},1),/cannot be ordered/);
  await assert.rejects(orders.create(1,{...product,price:null},1),/cannot be ordered/);
  const order=await orders.create(1,product,1);now+=25*3600000;
  await assert.rejects(orders.submitReference(order.id,1,'TX-123456'),/expired/);
  for(let i=2;i<=5;i++)await orders.create(1,product,i);
  await assert.rejects(orders.create(1,product,6),/existing order/);
  await orders.cancel(order.id,1);assert.equal((await orders.getForBuyer(order.id,1)).status,'cancelled');
});
function shop() {
  const calls=[];const orders=new ShopOrders(storage(),{adminIds:[99]});
  const api={call:async(method,payload)=>{calls.push({method,payload});return {};}};
  const bot=new TelegramShop({orders,api,catalog:{list:async()=>({products:[product]})},adminIds:[99],supportUrl:'https://t.me/FictionalAdmin',channelUrl:'https://t.me/atlascrmshop'});
  const message=(id,text,update_id=1)=>({update_id,message:{chat:{id,type:'private'},from:{id},text}});
  const callback=(id,data,update_id=1)=>({update_id,callback_query:{id:'fictional-callback',from:{id},data,message:{chat:{id,type:'private'},message_id:1}}});
  return {bot,orders,calls,message,callback};
}
test('shop product deep link and private order flow preserve manual contact and review boundary',async()=>{
  const {bot,orders,calls,message,callback}=shop();
  await bot.handle(message(1,'/start product_canva_1'));assert.match(calls.at(-1).payload.text,/Canva/);
  assert.equal(calls.at(-1).payload.reply_markup.inline_keyboard[0][0].callback_data,'buy:canva_1');
  await bot.handle(callback(1,'buy:canva_1',2));const order=(await orders.list(1))[0];
  assert.ok(calls.some(c=>c.payload.chat_id===1&&c.payload.text?.includes('Contact admin first')));
  assert.ok(calls.some(c=>c.payload.chat_id===99&&c.payload.text?.includes('New order request')));
  await bot.handle(message(1,'/payment '+order.id+' TX-123456',3));
  assert.equal((await orders.getForBuyer(order.id,1)).status,'awaiting_review');
  assert.ok(calls.some(c=>c.payload.chat_id===99));assert.ok(!calls.some(c=>['sendInvoice','purchase','pay'].includes(c.method)));
});
test('nonadmin review and group order callbacks cannot mutate private orders',async()=>{
  const {bot,orders,message,callback,calls}=shop();const order=await orders.create(1,product,1);await orders.submitReference(order.id,1,'TX-123456');
  await bot.handle(callback(2,'review:approve:'+order.id));assert.match(calls.at(-1).payload.text,/Admin access/);
  assert.equal((await orders.getForBuyer(order.id,1)).status,'awaiting_review');
  const group=message(1,'/history');group.message.chat={id:-123,type:'group'};assert.equal(await bot.handle(group),false);
  await bot.handle(callback(99,'review:show:'+order.id));assert.match(calls.at(-1).payload.text,/not proof/);
  await bot.handle(callback(99,'review:approve:'+order.id));assert.equal((await orders.getForBuyer(order.id,1)).status,'approved');
});
test('channel storefront uses price snapshots and buyer-specific bot links, no shared callback order controls',()=>{
  const posts=channelShopPosts([product],{supportUrl:'https://t.me/FictionalAdmin'});
  assert.equal(posts.length,2);assert.match(posts[1].text,/\$11.00/);
  assert.equal(posts[1].text.split('\n')[0],'ATLAS MARKET • Canva • $11.00');
  assert.equal(posts[1].reply_markup.inline_keyboard[0][0].text,'$11.00 · Order request');
  assert.equal(posts[1].photo,'https://atlascrm-c5722.web.app/images/shop/canva.jpg');
  assert.ok(posts.every(post=>post.text.length<=1024));
  assert.equal(posts[1].reply_markup.inline_keyboard[0][0].url,'https://t.me/AtlasCrmMarketBot?start=product_canva_1');
  for(const post of posts)for(const row of post.reply_markup.inline_keyboard)for(const button of row)assert.ok(button.url&&!button.callback_data);
  assert.equal(shopProductLink('AtlasCrmMarketBot','bad?url'),null);
  assert.throws(()=>shopContactUrl('https://evil.invalid/user'));
});
test('local order file preserves orders across restart and serializes duplicate intent',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'atlas-fictional-orders-'));
  try {
    const path=join(dir,'orders.json');const orders=new ShopOrders(new ShopFileStorage(path));
    const result=await Promise.all([orders.create(1,product,1),orders.create(1,product,1)]);assert.equal(result[0].id,result[1].id);
    assert.equal((await new ShopOrders(new ShopFileStorage(path)).list(1)).length,1);
  }finally {await rm(dir,{recursive:true,force:true});}
});
