import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {InventoryProgram} from '../server/inventory/program.mjs';
import {loadSupplierOffers} from '../server/inventory/supplier-offers.mjs';
import {renderSupplierComparison} from '../js/views/supplier-comparison.js';
const ring=JSON.stringify({activeKeyId:'v1',keys:{v1:Buffer.alloc(32,7).toString('base64')},fingerprintKey:Buffer.alloc(32,8).toString('base64')});
const admin={sub:'operator',atlasOperator:true};
function storage(){const values=new Map();return {values,get:async k=>structuredClone(values.get(k)),list:async()=>new Map(),transaction:async operation=>{const copy=new Map(values);const result=await operation({get:async k=>structuredClone(copy.get(k)),put:async(k,v)=>copy.set(k,structuredClone(v))});values.clear();for(const [k,v]of copy)values.set(k,v);return result;}};}
test('supplier purchase receipt creates its internal link without a product-definition step and is retry-safe',async()=>{
 const store=storage(),products=new Map();let definitions=0;
 const program=new InventoryProgram(store,{keyring:ring,resolveSupplierOffer:async()=>({name:'Exact supplier plan',currency:'USD'}),references:{read:async(_collection,id)=>products.get(id),ensureSupplierProduct:async(id,offer)=>{definitions++;const product={id,name:offer.name,active:true};products.set(id,product);return product;}}});
 const input={action:'receive',requestId:'supplier-purchase-request-001',sourceId:'canboso',offerId:'offer-1',cost:'8',currency:'USD',acquiredAt:'2026-10-19',credentials:'fictional-license',confirmPurchased:true};
 await assert.rejects(program.command(admin,{...input,confirmPurchased:false}),/already purchased/);assert.equal(definitions,0);
 const result=await program.command(admin,input);assert.equal(result.unit.productName,'Exact supplier plan');assert.match(result.unit.productId,/^supplier_canboso_[a-f0-9]{32}$/);assert.equal(result.unit.state,'available');
 assert.equal(result.unit.source,'Canboso');await program.command(admin,input);assert.equal(definitions,1);
 assert.ok(!JSON.stringify([...store.values]).includes('fictional-license'));
});
test('supplier comparison reads real configured feeds or public projection without inventing supplier costs',async()=>{
 const store=storage(),calls=[];
 const result=await loadSupplierOffers(store,{}, {fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json({products:[{id:'one',name:'Actual public plan',price:12,currency:'USD',available:5}],fetchedAt:'2026-10-19T00:00:00Z'});}});
 assert.equal(result.offers.length,1);assert.equal(result.offers[0].unitCost,null);assert.equal(result.offers[0].retailPrice,12);
 assert.equal(result.sources.find(s=>s.id==='nam').status,'not_configured');assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith('/api/catalog/products'));
});
test('supplier receipt can add a reusable account and explicitly link a short-term selling offer',async()=>{
 const store=storage(),products=new Map([['daily',{name:'One-day offer',active:true}]]);
 const program=new InventoryProgram(store,{keyring:ring,resolveSupplierOffer:async()=>({name:'Long-lived account',currency:'USD'}),references:{read:async(_collection,id)=>products.get(id),ensureSupplierProduct:async(id,offer)=>{const p={id,name:offer.name,active:true};products.set(id,p);return p;}}});
 const input={action:'receive',requestId:'supplier-shared-receipt-001',sourceId:'canboso',offerId:'offer-1',sharedAccount:true,enabledProductIds:['daily'],label:'Reusable account',supplierTermYears:'2',warrantyHours:'24',cost:'3.28',currency:'USD',acquiredAt:'2026-10-19',credentials:JSON.stringify({email:'fixture@example.test',password:'fixture',totpSeed:'PRIVATE'}),confirmPurchased:true};
 const result=await program.command(admin,input);
 assert.equal(result.unit.sharedAccount,true);assert.equal(result.unit.supplierTermYears,2);assert.equal(result.unit.warrantyHours,24);
 assert.ok(result.unit.enabledProductIds.includes('daily'));assert.ok(result.unit.enabledProductIds.includes(result.unit.productId));
 assert.ok(!JSON.stringify(result).includes('PRIVATE'));await program.command(admin,input);assert.equal([...store.values.keys()].filter(k=>k.startsWith('iv:unit:')).length,1);
});
test('comparison UI shows API setup gaps, available plans and the lowest comparable known cost',async()=>{
 const {document}=parseHTML('<main></main>'),root=document.querySelector('main');
 const offers=[{id:'one',sourceId:'canboso',name:'Same plan <script>',unitCost:10,currency:'USD',available:5},{id:'two',sourceId:'nam',name:'Same plan alternative',unitCost:8,currency:'USD',available:3}];
 await renderSupplierComparison(root,{api:async()=>({sources:[{id:'canboso',name:'Canboso',status:'available',offers:[offers[0]]},{id:'nam',name:'NAM',status:'not_configured',offers:[]}],offers})});
 assert.match(root.textContent,/API key not configured/);assert.equal(root.querySelectorAll('script').length,0);assert.equal(root.querySelectorAll('[data-record-offer]').length,2);
 for(const checkbox of root.querySelectorAll('[data-compare]')){checkbox.checked=true;checkbox.onchange();}
 assert.match(root.querySelector('[data-selected-offers]').textContent,/Lowest supplier cost in selection/);
 root.querySelector('[data-offer-search]').value='alternative';root.querySelector('[data-offer-search]').oninput();assert.equal(root.querySelectorAll('[data-offer-rows] tr').length,1);
});
test('supplier receipt manually collects structured account fields without fetching credentials',async()=>{
 const {document}=parseHTML('<html><body><main></main></body></html>'),root=document.querySelector('main');let saved;
 const offer={id:'fixture',sourceId:'canboso',name:'Fictional account',unitCost:3.28,currency:'USD',available:2};
 await renderSupplierComparison(root,{api:async(path,options)=>{if(path.endsWith('/offers'))return {sources:[],offers:[offer]};saved=options.body;return {};}});
 await root.querySelector('[data-record-offer]').onclick();
 const form=document.querySelector('form');assert.ok(form);assert.equal(form.querySelector('[name="accountPassword"]').type,'password');assert.equal(form.querySelector('[name="accountTotp"]').type,'password');
 for(const [name,value]of Object.entries({accountEmail:'fixture@example.test',accountUsername:'fixture-user',accountPassword:'fictional-password',accountTotp:'FICTIONAL-2FA'}))form.querySelector(`[name="${name}"]`).value=value;
 form.querySelector('[name="confirmPurchased"]').checked=true;
 await form.onsubmit({preventDefault(){}});
 const credentials=JSON.parse(saved.credentials);assert.equal(credentials.email,'fixture@example.test');assert.equal(credentials.username,'fixture-user');assert.equal(credentials.totpSeed,'FICTIONAL-2FA');assert.equal(saved.cost,'3.28');assert.equal(saved.sourceId,'canboso');assert.equal(document.querySelector('form'),null);
});
