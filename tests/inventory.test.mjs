import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {InventoryVault} from '../server/inventory/vault.mjs';
import {InventoryProgram} from '../server/inventory/program.mjs';
import {InventoryReferences} from '../worker/inventory-firestore.mjs';
import {NamCatalog} from '../server/suppliers/nam.mjs';
import {mergeSupplierOffers} from '../server/inventory/catalog.mjs';
import {combinedCatalog} from '../server/inventory/combined-catalog.mjs';
import {inventoryFetch} from '../js/services/inventory-api.js';
import {renderInventory,showInventoryCredentials,openPurchaseInventory} from '../js/views/inventory.js';
import {renderInventorySummary} from '../js/views/inventory-summary.js';
import worker from '../worker/index.mjs';
import {AtlasCoordinator} from '../worker/coordinator.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const keyring=JSON.stringify({activeKeyId:'v1',keys:{v1:Buffer.alloc(32,7).toString('base64')},fingerprintKey:Buffer.alloc(32,8).toString('base64')});
const admin={sub:'fictional-operator',atlasOperator:true};
function storage(){
  const values=new Map();let tail=Promise.resolve();
  const clone=value=>value===undefined?undefined:structuredClone(value);
  const list=(map,{prefix='',startAfter='',limit=100})=>new Map([...map].filter(([key])=>key.startsWith(prefix)&&key>startAfter).sort(([a],[b])=>a<b?-1:a>b?1:0).slice(0,limit).map(([k,v])=>[k,clone(v)]));
  return {values,get:async k=>clone(values.get(k)),put:async(k,v)=>{values.set(k,clone(v));},list:async o=>list(values,o),getAlarm:async()=>1,
    transaction:fn=>{const result=tail.then(async()=>{const next=new Map([...values].map(([k,v])=>[k,clone(v)]));const answer=await fn({get:async k=>clone(next.get(k)),put:async(k,v)=>{next.set(k,clone(v));},list:async o=>list(next,o)});values.clear();for(const[k,v]of next)values.set(k,v);return answer;});tail=result.catch(()=>{});return result;}};
}
const received={action:'receive',requestId:'receive-fictional-0001',productId:'plan',source:'Fictional supplier',cost:'10.25',currency:'USD',acquiredAt:'2026-10-19',expiresAt:'2027-01-01',credentials:'fictional-license-secret'};
function setup(){const state=storage(),refs=new Map([['products/plan',{name:'Fictional plan',active:true}],['customers/customer',{name:'Fictional customer'}],['purchases/purchase',{customerId:'customer',productId:'plan',paymentStatus:'paid'}],['purchases/other',{customerId:'customer',productId:'plan',paymentStatus:'paid'}]]);
 const program=new InventoryProgram(state,{keyring,references:{read:async(c,id)=>refs.get(c+'/'+id)},now:()=>1000,today:()=> '2026-10-19'});return {state,refs,program};}
test('vault encrypts randomized ciphertext and binds it to the unit/product; rotation retains old-key decryption',async()=>{
 const vault=new InventoryVault(keyring),one=await vault.encrypt('fictional-secret','unit:plan'),two=await vault.encrypt('fictional-secret','unit:plan');
 assert.notEqual(one.ciphertext,two.ciphertext);assert.equal(await vault.decrypt(one,'unit:plan'),'fictional-secret');
 await assert.rejects(vault.decrypt(one,'other:plan'),/could not/);assert.ok(!JSON.stringify(one).includes('fictional-secret'));
 const ring=JSON.parse(keyring);ring.activeKeyId='v2';ring.keys.v2=Buffer.alloc(32,9).toString('base64');assert.equal(await new InventoryVault(JSON.stringify(ring)).decrypt(one,'unit:plan'),'fictional-secret');
 assert.throws(()=>new InventoryVault('{}'),/not configured/);
});
test('receive is idempotent, duplicate secrets are refused, and lists/receipts/audit never contain plaintext credentials',async()=>{
 const {state,program}=setup();const first=await program.command(admin,received);await program.command(admin,received);
 assert.equal((await program.list(admin)).units.length,1);assert.equal(first.unit.state,'available');
 assert.ok(!JSON.stringify([...state.values]).includes(received.credentials));assert.ok(!JSON.stringify(await program.list(admin)).includes('ciphertext'));
 await assert.rejects(program.command(admin,{...received,requestId:'another-receive-0002'}),/already recorded/);
 await assert.rejects(program.command(admin,{...received,cost:'20'}),/different details/);
 const reveal=await program.command(admin,{action:'reveal',unitId:first.unit.id,requestId:'reveal-request-0001'});assert.equal(reveal.credentials,received.credentials);
 assert.ok([...state.values.values()].some(x=>x.type==='credentials_revealed'));assert.ok(!JSON.stringify([...state.values]).includes(received.credentials));
});
test('two operators cannot allocate one unit twice and two units cannot claim one purchase',async()=>{
 const {program}=setup();const one=await program.command(admin,received);const two=await program.command(admin,{...received,requestId:'receive-fictional-0002',credentials:'another-fictional-secret'});
 const assign={action:'assign',requestId:'assign-fictional-0001',unitId:one.unit.id,customerId:'customer',purchaseId:'purchase'};
 const results=await Promise.allSettled([program.command(admin,assign),program.command({...admin,sub:'another-operator'},{...assign,requestId:'assign-fictional-0002',purchaseId:'other'})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await program.command(admin,assign)).unit.state,'assigned');
 await assert.rejects(program.command(admin,{...assign,unitId:two.unit.id,requestId:'assign-fictional-0003'}),/already has/);
 assert.equal((await program.list(admin,{purchaseId:'purchase'})).units[0].id,one.unit.id);
});
test('assignment validates customer, product, payment, expiry and terminal states; manual delivery is explicit',async()=>{
 const {program,refs}=setup();await program.command(admin,received);
 const assign={action:'assign',requestId:'assign-fictional-0001',unitId:received.requestId,customerId:'customer',purchaseId:'purchase'};
 refs.get('purchases/purchase').customerId='someone-else';await assert.rejects(program.command(admin,assign),/belonging/);refs.get('purchases/purchase').customerId='customer';
 refs.get('purchases/purchase').productId='wrong';await assert.rejects(program.command(admin,assign),/same saved/);refs.get('purchases/purchase').productId='plan';
 refs.get('purchases/purchase').paymentStatus='pending';await assert.rejects(program.command(admin,assign),/paid/);refs.get('purchases/purchase').paymentStatus='paid';
 await program.command(admin,assign);await assert.rejects(program.command(admin,{action:'retire',unitId:received.requestId,requestId:'retire-fictional-001'}),/unassigned/);
 await assert.rejects(program.command(admin,{action:'deliver',unitId:received.requestId,requestId:'deliver-fictional-01'}),/Confirm/);
 const delivered=await program.command(admin,{action:'deliver',unitId:received.requestId,requestId:'deliver-fictional-01',confirmDelivered:true});assert.equal(delivered.unit.state,'delivered');
 const expired=setup();await expired.program.command(admin,{...received,expiresAt:'2026-10-18',acquiredAt:'2026-01-01'});await assert.rejects(expired.program.command(admin,assign),/expired/);
});
test('inventory rejects buyer/string claims, invalid references and metadata validation without writes',async()=>{
 const {state,program}=setup();for(const claims of [null,{sub:'buyer'},{sub:'x',atlasOperator:'true'}]){await assert.rejects(program.list(claims),/Operator/);await assert.rejects(program.command(claims,received),/Operator/);}
 for(const patch of [{productId:'../secret'},{cost:'NaN'},{currency:'BAD'},{acquiredAt:'2026-02-30'},{credentials:''}])await assert.rejects(program.command(admin,{...received,...patch}));
 assert.equal(state.values.size,0);
 const refs=new InventoryReferences({FIREBASE_PROJECT_ID:'fake-project'});await assert.rejects(refs.read('messages','id'),/Invalid/);
});
test('stock list paginates metadata and exact supplier mapping preserves equivalence boundaries',async()=>{
 const {state,program}=setup();for(let i=0;i<55;i++)await state.put('iv:unit:unit-'+String(i).padStart(3,'0'),{id:'unit-'+i,state:'available',ciphertext:'never-visible'});
 const page=await program.list(admin);assert.equal(page.units.length,50);assert.ok(page.cursor);assert.equal((await program.list(admin,{cursor:page.cursor})).units.length,5);
 const map={action:'mapOffer',requestId:'mapping-fictional-001',productId:'plan',sourceId:'nam',offerId:'123',stockPoolId:'nam-direct',enabled:true};
 await program.command(admin,map);assert.equal((await program.list(admin)).mappings.length,1);
 await assert.rejects(program.command(admin,{...map,requestId:'mapping-fictional-002',productId:'other'}),/not found/);
});
test('merged catalog sums independent pools once, excludes owned units/costs, and applies margin once to cheapest in-stock cost',()=>{
 const now=100000,products=[{id:'plan',name:'Plan',currency:'USD',published:true}];
 const mappings=[{enabled:true,productId:'plan',sourceId:'a',offerId:'1',stockPoolId:'pool-a'},{enabled:true,productId:'plan',sourceId:'b',offerId:'2',stockPoolId:'pool-b'},{enabled:true,productId:'plan',sourceId:'b',offerId:'alias',stockPoolId:'pool-b'}];
 const offers=[{id:'1',sourceId:'a',unitCost:10,currency:'USD',available:2,fetchedAt:now},{id:'2',sourceId:'b',unitCost:8,currency:'USD',available:3,fetchedAt:now},{id:'alias',sourceId:'b',unitCost:9,currency:'USD',available:3,fetchedAt:now}];
 const [result]=mergeSupplierOffers(products,mappings,offers,{now});assert.equal(result.available,5);assert.equal(result.price,9.6);assert.ok(!JSON.stringify(result).includes('unitCost'));
 offers[1].available=0;offers[2].available=0;assert.equal(mergeSupplierOffers(products,mappings,offers,{now})[0].price,13);
 offers[1].currency='VND';offers[2].fetchedAt=0;assert.equal(mergeSupplierOffers(products,mappings,offers,{now})[0].available,2);
 offers[0].available=null;assert.equal(mergeSupplierOffers(products,mappings,offers,{now})[0].available,null);
});
test('combined catalog preserves unmapped IDs, maps equivalent plans explicitly and never converts currencies implicitly',()=>{
 const now=1000,current={products:[{id:'old',name:'Old',price:14,currency:'USD'}],offers:[{id:'old',name:'Old',sourceId:'canboso',unitCost:10,currency:'USD',available:1,fetchedAt:now}]};
 const nam=[{id:'123',name:'Equivalent',sourceId:'nam',unitCost:8,currency:'USD',available:2,fetchedAt:now}];
 let result=combinedCatalog(current,nam,[],[],{now});assert.deepEqual(result.products.map(p=>p.id),['old','nam_123']);
 const maps=[{productId:'plan',sourceId:'canboso',offerId:'old',stockPoolId:'a',enabled:true},{productId:'plan',sourceId:'nam',offerId:'123',stockPoolId:'b',enabled:true}];
 result=combinedCatalog(current,nam,maps,[{id:'plan',name:'Exact plan'}],{now});assert.equal(result.products.length,1);assert.equal(result.products[0].price,10.4);assert.equal(result.selections.get('atlas_plan').sourceId,'nam');
 assert.throws(()=>combinedCatalog(current,[{...nam[0],currency:'VND'}],maps,[{id:'plan',name:'Exact plan'}],{now}),/currencies/);
});
test('new supplier adapter performs only fresh fixed-origin GETs with private bearer; filters inactive rows and handles removed stock',async()=>{
 const calls=[];const adapter=new NamCatalog({token:'fictional-token',currency:'USD',now:()=>1000,fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json({ok:true,data:url.endsWith('/products')?[{id:123,name:'Plan',apiPrice:8,price:99,stock:2,status:'active'},{id:124,status:'inactive'}]:{stock:0,status:'out_of_stock',available:false,purchasable:false,refreshCatalog:true}});}});
 const offers=await adapter.offers();await adapter.offers();assert.equal(calls.length,2);assert.equal(offers.length,1);assert.equal(offers[0].unitCost,8);assert.equal(offers[0].currency,'USD');
 assert.equal(calls[0].options.cache,'no-store');assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.headers.Authorization,'Bearer fictional-token');assert.ok(!calls[0].url.includes('fictional-token'));
 assert.equal((await adapter.checkStock(123)).available,false);await assert.rejects(adapter.get('/orders'),/Unsupported/);assert.equal(calls.length,3);
 const unavailable=new NamCatalog({token:'fictional-token',currency:'USD',fetchImpl:async()=>new Response('secret provider detail',{status:502})});await assert.rejects(unavailable.offers(),error=>!error.message.includes('secret'));
});
test('HTTP routes require feature flag, trusted browser origin and valid operator identity; coordinator refuses buyer',async()=>{
 const env={ATLAS_COORDINATOR:{idFromName:()=>'',get:()=>({fetch:async()=>Response.json({})})},CATALOG_ALLOWED_ORIGINS:'https://atlascrm-c5722.web.app',FIREBASE_PROJECT_ID:'fake-project'};
 const url='https://atlas.test/api/inventory/list',origin={Origin:'https://atlascrm-c5722.web.app'};
 assert.equal((await worker.fetch(new Request(url,{headers:origin}),env)).status,503);env.INVENTORY_ENABLED='true';
 assert.equal((await worker.fetch(new Request(url),env)).status,403);assert.equal((await worker.fetch(new Request(url,{headers:origin}),env)).status,401);
 assert.equal((await worker.fetch(new Request(url,{method:'OPTIONS',headers:{...origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}}),env)).status,204);
 const coordinator=new AtlasCoordinator({storage:storage()},{INVENTORY_ENABLED:'true',INVENTORY_KEYRING:keyring});
 assert.equal((await coordinator.fetch(new Request('https://internal/inventory',{method:'POST',body:JSON.stringify({claims:{sub:'buyer'},command:false})}))).status,403);
});
test('inventory client refuses arbitrary URLs and redirects; it never stores credentials locally',async()=>{
 await assert.rejects(inventoryFetch('https://evil.invalid',{user:{}}),/destination/);
 let calls=0;await assert.rejects(inventoryFetch('/api/inventory/list',{fetchImpl:()=>{calls++;}}),/Sign in/);assert.equal(calls,0);
 await inventoryFetch('/api/inventory/command',{user:{getIdToken:async()=> 'fictional'},body:{action:'reveal'},fetchImpl:async(url,options)=>{assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.ok(url.startsWith('https://atlas.meshstocks.workers.dev/'));return Response.json({});}});
});
test('inventory receive retry preserves locked credentials and request; successful save removes secret from form',async()=>{
 const {document}=parseHTML('<main></main>');const root=document.querySelector('main');const calls=[];
 const api=async(path,options)=>{if(path.includes('/list'))return {units:[],cursor:null};calls.push(options.body);if(calls.length===1)throw Error('Connection unknown');return {unit:{id:'saved'}};};
 await renderInventory(root,{user:{},listProducts:async()=>[{id:'plan',name:'Plan'}],createProduct:async()=>{},listCustomers:async()=>[],listPurchases:async()=>[],api});
 const form=root.querySelector('[data-receive]');for(const [key,value]of Object.entries(received)){const field=form.querySelector('[name="'+key+'"]');if(!field)continue;if(field.tagName==='SELECT'){for(const o of field.querySelectorAll('option'))o.selected=o.value===value||o.textContent===value;}else field.value=value;}
 form.dispatchEvent(new document.defaultView.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));
 assert.equal(form.querySelector('[name="credentials"]').disabled,true);form.dispatchEvent(new document.defaultView.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));
 assert.equal(calls[0].requestId,calls[1].requestId);assert.equal(calls[1].credentials,received.credentials);assert.ok(!root.innerHTML.includes(received.credentials));
});
test('credential reveal uses literal text and clears on expiry or visibility change',async()=>{
 const source=await readFile(new URL('../js/views/inventory.js',import.meta.url),'utf8');
 const helper=source.slice(source.indexOf('export function showInventoryCredentials'),source.indexOf('\nexport async function openPurchaseInventory')).replace('export ','');
 const {document}=parseHTML('<html><body></body></html>');const timers=[];
 const show=new Function('document','crypto','setTimeout','clearTimeout',helper+';return showInventoryCredentials;')(document,webcrypto,fn=>{timers.push(fn);return 1;},()=>{});
 const api=async()=>({credentials:'<script>fixture-secret</script>'});show('unit',{}, {api});await new Promise(r=>setTimeout(r,0));
 assert.equal(document.querySelectorAll('script').length,0);assert.match(document.querySelector('[data-secret]').textContent,/fixture-secret/);
 timers[0]();assert.equal(document.querySelector('[data-secret]'),null);
 show('unit',{}, {api});await new Promise(r=>setTimeout(r,0));document.hidden=true;document.dispatchEvent(new document.defaultView.Event('visibilitychange'));assert.equal(document.querySelector('[data-secret]'),null);
});
test('supplier toggles persist, invalidate catalog and retain owned stock; unconfigured suppliers cannot be enabled',async()=>{
 const {program,state}=setup();await program.command(admin,received);await state.put('catalog',{data:{products:[{id:'old'}]},until:999999});
 const toggle={action:'setSupplier',requestId:'supplier-off-fixture-001',sourceId:'canboso',enabled:false};
 await program.command(admin,toggle);await program.command(admin,toggle);
 const listing=await program.list(admin);assert.equal(listing.suppliers.find(s=>s.id==='canboso').enabled,false);assert.equal(listing.units.length,1);assert.equal(await state.get('catalog'),null);
 await assert.rejects(program.command(admin,{...toggle,sourceId:'nam',enabled:true,requestId:'supplier-on-fixture-0001'}),/not configured/);
 const next=new InventoryProgram(state,{keyring,references:{},supplierReadiness:{canboso:true,nam:true}});
 assert.equal((await next.list(admin)).suppliers.find(s=>s.id==='canboso').enabled,false);
 await next.command(admin,{...toggle,sourceId:'nam',enabled:true,requestId:'supplier-on-fixture-0001'});assert.equal((await next.list(admin)).suppliers.find(s=>s.id==='nam').enabled,true);
});
test('catalog does not fetch or serve cached offers from a disabled source, including when all suppliers are off',async()=>{
 const state=storage();await state.put('catalog',{until:Date.now()+60000,data:{products:[{id:'cached'}]}});await state.put('iv:supplier:canboso',{enabled:false});
 const coordinator=new AtlasCoordinator({storage:state},{CANBOSS_BUYER_API_KEY:'fictional',CATALOG_ALLOWED_ORIGINS:'https://atlascrm-c5722.web.app'});
 assert.deepEqual((await coordinator.catalog()).products,[]);
 await state.put('iv:supplier:nam',{enabled:true});await assert.rejects(coordinator.catalog(),/not configured/);
});
test('owned summary spans pages and separates available, expired, assigned and delivered inventory',async()=>{
 const {state,program}=setup();for(let i=0;i<520;i++)await state.put('iv:unit:'+String(i).padStart(4,'0'),{state:'available'});
 await state.put('iv:unit:expired',{state:'available',expiresAt:'2026-01-01'});await state.put('iv:unit:assigned',{state:'assigned'});await state.put('iv:unit:delivered',{state:'delivered'});await state.put('iv:unit:retired',{state:'retired'});
 assert.deepEqual(await program.summary(admin),{total:524,available:520,expired:1,assigned:1,delivered:1,retired:1,truncated:false});
 await assert.rejects(program.summary({sub:'buyer'}),/Operator/);
});
test('dashboard summary distinguishes owned stock from supplier stock and never invents zeros on failure',async()=>{
 const {document}=parseHTML('<main></main>');const root=document.querySelector('main');let opened=0;
 await renderInventorySummary(root,{}, {api:async()=>({available:3,assigned:2,delivered:1,expired:4,retired:0,total:10,truncated:false}),onOpen:()=>{opened++;}});
 assert.match(root.textContent,/Your owned stock/);assert.match(root.textContent,/Available to assign3/);root.querySelector('[data-open-inventory]').onclick();assert.equal(opened,1);
 await renderInventorySummary(root,{}, {api:async()=>{throw Error('Inventory unavailable');}});assert.match(root.textContent,/Inventory unavailable/);assert.equal(root.querySelectorAll('.stat-value').length,0);
});
