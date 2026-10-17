import assert from 'node:assert/strict';
const origin='https://atlas.meshstocks.workers.dev';
const request=(path,options={})=>fetch(origin+path,{...options,redirect:'manual',signal:AbortSignal.timeout(20000)});
const health=await request('/health');assert.equal(health.status,200);assert.equal((await health.json()).service,'atlas-market');
assert.equal((await request('/webhooks/telegram',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
assert.equal((await request('/api/catalog/products',{headers:{Origin:'https://unapproved.invalid'}})).status,403);
const response=await request('/api/catalog/products',{headers:{Origin:'https://atlascrm-c5722.web.app'}});
assert.equal(response.status,200,'Public catalog must load without a Firebase token');
const catalog=await response.json();assert.ok(catalog.products.length>0);assert.equal(catalog.pricing.markupPercent,10);
assert.equal(catalog.storefront.telegramUrl,'https://t.me/atlascrmshop');
console.log('Public catalog products:',catalog.products.length,'Atlas Telegram channel link verified.');
const state=await request('/api/admin/bot-state',{headers:{Authorization:'Bearer '+process.env.ATLAS_ADMIN_TOKEN}});
const active=process.argv.includes('--shop-active');
assert.equal(state.status,200);assert.equal((await state.json()).enabled,active);
if(active) {
  const response=await request('/api/admin/shop-readiness',{headers:{Authorization:'Bearer '+process.env.ATLAS_ADMIN_TOKEN}});
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{service:'atlas-market',enabled:true,shopConfigured:true});
}
console.log('Live public catalog, health, webhook authentication, CORS and expected bot/shop readiness verified. Read-only checks; no Telegram messages or remote toggles performed.');
