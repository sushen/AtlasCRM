import test from 'node:test';
import assert from 'node:assert/strict';
import {TelegramShop} from '../server/telegram-shop.mjs';
import {productGridMenu,ownedShopProduct} from '../server/telegram-shop-layout.mjs';
import {ShopProducts} from '../worker/shop-products.mjs';
const product=ownedShopProduct({id:'fixture_offer',name:'ChatGPT — 1 day',active:true,price:1,currency:'USD',durationDays:1});
test('approved live layout has one Buy action, price first and no permanent keyboard',async()=>{
  const calls=[],shop=new TelegramShop({orders:{},api:{call:async(method,data)=>calls.push({method,data})},catalog:{list:async()=>({products:[product]})},cleanMenu:true});
  const detail=shop.detail(product,{});
  assert.match(detail.text,/<b>USD 1 · ChatGPT — 1 day<\/b>/);
  assert.match(detail.text,/<b>⏳ Duration<\/b>\n1 day/);
  assert.ok(!detail.text.includes('own_fixture_offer'));
  assert.ok(!detail.text.includes('Product reference'));
  assert.deepEqual(detail.reply_markup.inline_keyboard,[[{text:'Buy',callback_data:'buy:own_fixture_offer'}]]);
  await shop.handle({update_id:1,message:{chat:{id:123,type:'private'},from:{id:123},text:'/menu'}});
  assert.ok(calls.some(c=>c.data.reply_markup?.remove_keyboard));
  assert.ok(!calls.some(c=>c.data.reply_markup?.keyboard));
  const buttons=productGridMenu([product]).reply_markup.inline_keyboard.flat();
  assert.ok(buttons.some(b=>b.text==='USD 1 · ChatGPT — 1 day'));assert.ok(!buttons.some(b=>b.text.includes('Next')));
});
test('live publication reads only explicit product IDs with a narrow field mask',async()=>{
  const urls=[];
  const reader=new ShopProducts({FIREBASE_PROJECT_ID:'smoke-project',TELEGRAM_OWN_PRODUCT_IDS:'fixture_offer'}, {fetchImpl:async url=>{
    urls.push(new URL(url));return Response.json({fields:{name:{stringValue:'ChatGPT — 1 day'},active:{booleanValue:true},price:{integerValue:'1'},currency:{stringValue:'USD'},durationDays:{integerValue:'1'},privateSecret:{stringValue:'must-not-leak'}}});
  }});
  reader.identity.accessToken=async()=> 'fixture_token';
  const products=await reader.list();assert.equal(products[0].price,1);assert.equal(products[0].available,null);
  assert.ok(!JSON.stringify(products).includes('must-not-leak'));
  assert.equal(urls.length,1);assert.ok(urls[0].pathname.endsWith('/products/fixture_offer'));
  assert.deepEqual(urls[0].searchParams.getAll('mask.fieldPaths'),['name','price','currency','durationDays','active']);
});
test('unpublished, removed and inactive products are not listed',async()=>{
  assert.deepEqual(await new ShopProducts({}).list(),[]);
  for(const response of [new Response('',{status:404}),Response.json({fields:{active:{booleanValue:false}}})]){
    const reader=new ShopProducts({FIREBASE_PROJECT_ID:'smoke-project',TELEGRAM_OWN_PRODUCT_IDS:'fixture_offer'},{fetchImpl:async()=>response});reader.identity.accessToken=async()=> 'fixture';
    assert.deepEqual(await reader.list(),[]);
  }
  await assert.rejects(()=>new ShopProducts({FIREBASE_PROJECT_ID:'smoke-project',TELEGRAM_OWN_PRODUCT_IDS:'../customers'}).list());
});
