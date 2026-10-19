import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSandboxShop, SandboxCatalog, sandboxProduct, sandboxProductMenu, SANDBOX_COMMANDS } from '../server/telegram-sandbox-shop.mjs';
import { TelegramApi } from '../server/telegram-catalog.mjs';
import { catalogGroups } from '../js/utils/catalog-groups.js';
import { ShopFileStorage } from '../server/shop-file-storage.mjs';

const own = {id:'atlas_one_day_one_usd',name:'ChatGPT — 1 day',price:1,currency:'USD',durationDays:1,active:true,credentials:'must-not-leak'};
const supplier = {id:'fixture_supplier',name:'Canva fixture',price:12,currency:'USD',stock:'available',available:3,description:'Supplier listing',requirements:{}};
const msg = (text,id=123,update_id=1) => ({update_id,message:{message_id:update_id,chat:{id,type:'private'},from:{id},text}});
const cb = (data,update_id=1,id=123) => ({update_id,callback_query:{id:'fixture_callback',from:{id},message:{message_id:1,chat:{id,type:'private'}},data}});
async function setup(t) {
  const dir=await mkdtemp(join(tmpdir(),'atlas-sandbox-')); t.after(()=>rm(dir,{recursive:true,force:true}));
  const calls=[],storage=new ShopFileStorage(join(dir,'test-orders.json'));
  const bot=createSandboxShop({api:{call:async(method,data)=>{calls.push({method,data});return {message_id:1};}},
    supplierCatalog:{list:async()=>({products:[supplier],fetchedAt:new Date().toISOString()})},listProducts:async()=>[own],storage,operatorIds:['123']});
  return {bot,calls,storage};
}
test('sandbox combines real supplier and custom offers without reapplying markup or inventing owned stock',async()=>{
  const catalog=new SandboxCatalog({supplierCatalog:{list:async()=>({products:[supplier]})},listProducts:async()=>[own]});
  const result=await catalog.list();assert.equal(result.products.length,2);
  const product=result.products[1];assert.equal(product.price,1);assert.equal(product.available,null);assert.equal(product.stock,'unknown');
  assert.match(product.description,/1 day/);assert.ok(!JSON.stringify(product).includes('must-not-leak'));
  assert.equal(sandboxProduct({...own,active:false}),null);
});
test('full menu and custom offer navigation use shared shop rendering',async t=>{
  const {bot,calls}=await setup(t);await bot.handle(msg('/menu'));
  assert.ok(calls.some(c=>c.data.reply_markup?.remove_keyboard===true));
  assert.ok(!calls.some(c=>c.data.reply_markup?.keyboard));
  assert.ok(calls.some(c=>c.data.reply_markup?.inline_keyboard?.some(row=>row.some(b=>b.callback_data==='product:own_atlas_one_day_one_usd'))));
  await bot.handle(cb('product:own_atlas_one_day_one_usd'));
  assert.ok(calls.some(c=>c.data.text?.includes('<b>⏳ Duration</b>\n1 day')));
});
test('Products has all category buttons and direct custom offers without category Next pages',()=>{
  const names=['ChatGPT Plus','Claude Pro','Gemini Advanced','Canva Pro','Notion Plus','ElevenLabs','CapCut','Windows','YouTube','Adobe','Figma','Kling AI','Midjourney','Perplexity','Cursor','GitHub','Spotify','Netflix','Disney+','Amazon','Grammarly','Duolingo','LinkedIn','Zoom','Runway','Freepik','Envato','Suno','Sora','HeyGen','Leonardo AI','Lovable','Replit'];
  const products=[...names.map((name,i)=>({...supplier,id:'fixture_'+i,name})),sandboxProduct(own)];
  const menu=sandboxProductMenu(products),buttons=menu.reply_markup.inline_keyboard.flat();
  assert.ok(buttons.some(b=>b.callback_data==='product:own_atlas_one_day_one_usd'));
  assert.ok(catalogGroups(products).length>24);
  assert.equal(buttons.filter(b=>b.callback_data?.startsWith('family:')).length,catalogGroups(products).length);
  assert.equal(buttons.filter(b=>b.callback_data?.startsWith('groups:')).length,0);
  assert.ok(!menu.text.includes('Page 1 of'));
  assert.ok(!buttons.some(b=>b.callback_data?.startsWith('sandbox:nav:')));
});
test('inline mobile menu opens profile without needing the reply keyboard',async t=>{
  const {bot,calls}=await setup(t);await bot.handle(cb('sandbox:nav:profile'));
  assert.ok(calls.some(c=>c.data.text?.includes('Atlas Market profile')));
});
test('Menu contains the general actions and replies remove the persistent keyboard',async t=>{
  for(const command of ['products','profile','history','support','warranty'])assert.ok(SANDBOX_COMMANDS.some(c=>c.command===command));
  const {bot,calls}=await setup(t);await bot.handle(msg('/profile'));await bot.handle(msg('/menu'));
  assert.ok(!calls.some(c=>c.data.reply_markup?.keyboard));
  assert.ok(calls.some(c=>c.data.reply_markup?.remove_keyboard===true));
});
test('product card has exactly one Buy button and no channel, refresh, compare or contact links',async t=>{
  const {bot,calls}=await setup(t);await bot.handle(cb('product:own_atlas_one_day_one_usd'));
  const card=calls.find(c=>c.method==='sendMessage'&&c.data.text?.includes('<b>⏳ Duration</b>'));
  assert.match(card.data.text,/<b>USD 1 · ChatGPT — 1 day<\/b>/);
  assert.deepEqual(card.data.reply_markup.inline_keyboard,[[{text:'Buy',callback_data:'buy:own_atlas_one_day_one_usd'}]]);
  assert.ok(!card.data.text.includes('Contact admin to confirm the terms before paying'));
});
test('Telegram API permits command menu setup and readback methods',async()=>{
  const methods=[];
  const api=new TelegramApi('123:fixture_token',{fetchImpl:async(url)=>{methods.push(url.split('/').at(-1));return {ok:true,json:async()=>({ok:true,result:true})};}});
  for(const method of ['setMyCommands','getMyCommands','setChatMenuButton','getChatMenuButton'])await api.call(method,{});
  assert.equal(methods.length,4);
});
test('sandbox test checkout supports reference, review, approval and delivery in isolated storage',async t=>{
  const {bot,calls,storage}=await setup(t);
  await bot.handle(cb('buy:own_atlas_one_day_one_usd',10));
  let orders=await bot.orders.list(123);assert.equal(orders.length,1);const id=orders[0].id;
  assert.equal(orders[0].totalAmount,1);assert.equal(orders[0].paymentQuote.receivingUid,'TEST-NOT-PAYABLE');
  await bot.handle(cb('pay:'+id,11));
  assert.ok(calls.some(c=>c.data.text?.includes('No payment account, QR or transfer link is connected')));
  await bot.handle(cb('paid:'+id,12));
  await bot.handle(msg('FICTIONAL-TEST-REFERENCE',123,13));
  await bot.handle(cb('review:show:'+id,14));
  orders=await bot.orders.list(123);const version=orders[0].submissionVersion;
  await bot.handle(cb(`review:approve:${id}:${version}`,15));
  await bot.handle(msg('/deliveries',123,16));
  await bot.handle(msg(`/fulfill ${id} Test delivery only`,123,17));
  assert.equal((await bot.orders.list(123))[0].deliveryStatus,'DELIVERED');
  assert.ok(await storage.get('order:'+id));
  for(const call of calls.filter(c=>c.method!=='answerCallbackQuery')){
    assert.equal(String(call.data.chat_id),'123');assert.match(call.data.text||call.data.caption,/ATLAS TEST/);
    assert.ok(!JSON.stringify(call).includes('pay.binance.com'));
    assert.ok(!JSON.stringify(call).includes('Copy Binance ID'));
  }
});
test('unauthorized users and groups cannot read catalog or create test orders',async t=>{
  const {bot,calls}=await setup(t);await bot.handle(msg('/products',456));
  const group=msg('/menu');group.message.chat.type='group';await bot.handle(group);
  await bot.handle(cb('buy:own_atlas_one_day_one_usd',20,456));assert.deepEqual(calls,[]);
  assert.deepEqual(await bot.orders.list(123),[]);
});
test('local Add lead warns that Firebase saves are real and keeps the live site out of the test shortcut',async t=>{
  const {bot,calls}=await setup(t);await bot.handle(msg('/addlead'));
  const reply=calls.find(c=>c.method==='sendMessage');assert.match(reply.data.text,/deliberate saves are real/);
  assert.equal(reply.data.reply_markup.inline_keyboard[0][0].url,'http://localhost:3199/?quick-add=1');
});
test('supplier failure preserves actual Firebase offers, Firebase failure fails closed',async()=>{
  const catalog=new SandboxCatalog({supplierCatalog:{list:async()=>{throw Error('offline');}},listProducts:async()=>[own]});
  assert.equal((await catalog.list()).supplierUnavailable,true);assert.equal((await catalog.list()).products.length,1);
  const failed=new SandboxCatalog({supplierCatalog:{list:async()=>({products:[supplier]})},listProducts:async()=>{throw Error('private-error');}});
  await assert.rejects(()=>failed.list(),/Firebase catalog unavailable/);
});
test('bot-addressed checkout commands target only Atlas Test',async t=>{
  const {bot,calls}=await setup(t);await bot.handle(msg('/orders@AtlasCrmMarketBot'));
  assert.equal(calls.length,0);await bot.handle(msg('/orders@AtlasCrmSandboxBot'));
  assert.ok(calls.some(c=>c.data.text?.includes('No active orders')));
});
