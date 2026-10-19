import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const origin='https://atlascrm-c5722.web.app';
const assets=['js/views/inventory-summary.js','js/views/inventory.js','js/services/inventory-api.js','js/utils/customer-identity.js','js/views/customer-sales.js','js/utils/customer-sales.js','js/views/quick-add.js','js/services/quick-add.js','js/services/store.js','index.html','login.html','js/login.js','js/firebase.js','js/utils/auth-access.js','css/components.css','css/layout.css','js/views/catalog-branding.js','css/catalog.css','js/catalog-preview.js','js/services/catalog-api-config.js','js/services/catalog-api.js','js/views/catalog.js','js/app.js','js/utils/catalog-pricing.js','js/utils/shop-images.js','js/telegram-preview.js'];
for(const path of assets) {
  const response=await fetch(origin+'/'+path+'?release-check='+Date.now(),{signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,'Live asset missing: '+path);
  assert.equal(await response.text(),await readFile(new URL('../'+path,import.meta.url),'utf8'),'Live asset differs: '+path);
  console.log('Live asset matches: '+path);
}
for(const path of ['.env','server/catalog.mjs','worker/index.mjs']) {
  const response=await fetch(origin+'/'+path,{signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,404,'Private source must not be hosted: '+path);
}
for(const name of ['welcome','chatgpt','claude','gemini','canva','notion']) {
  const path='images/shop/'+name+'.jpg';const response=await fetch(origin+'/'+path,{signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type')?.split(';')[0],'image/jpeg');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile(new URL('../'+path,import.meta.url)));
}
{const path='images/brand/atlas-logo.jpg';const response=await fetch(origin+'/'+path,{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile(new URL('../'+path,import.meta.url)));}
console.log('Firebase Hosting release verified; private source paths return 404.');
