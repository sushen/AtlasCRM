import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
// Fully mocked workerd + SQLite; no production env, provider or customer writes.
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'inventory-test-key'},encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const makeToken=async operator=>{
  const now=Math.floor(Date.now()/1000),input=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({sub:operator?'operator':'buyer',atlasOperator:operator,aud:'test-project',iss:'https://securetoken.google.com/test-project',iat:now-10,auth_time:now-20,exp:now+3600});
  return input+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input))).toString('base64url');
};
const keyring=JSON.stringify({activeKeyId:'v1',keys:{v1:Buffer.alloc(32,7).toString('base64')},fingerprintKey:Buffer.alloc(32,8).toString('base64')});
const pem='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----';
let supplierOrders=0,namReads=0,stockReads=0;const telegram=[];
let source=await readFile(new URL('../.worker-build/index.js',import.meta.url),'utf8');
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'inventory-smoke',modules:true,script:source,compatibilityDate:'2025-10-01',durableObjects:{ATLAS_COORDINATOR:{className:'AtlasCoordinator',useSQLite:true}},
  bindings:{INVENTORY_ENABLED:'true',INVENTORY_KEYRING:keyring,MULTI_SUPPLIER_ENABLED:'true',NAM_RESELLER_TOKEN:'fictional-token',NAM_RESELLER_CURRENCY:'USD',CANBOSS_BUYER_API_KEY:'fictional',
    TELEGRAM_CATALOG_CHAT_IDS:'-123',TELEGRAM_BOT_ENABLED:'true',TELEGRAM_SHOP_ENABLED:'true',TELEGRAM_SHOP_ADMIN_IDS:'99',TELEGRAM_SHOP_SUPPORT_URL:'https://t.me/FictionalAdmin',TELEGRAM_BOT_TOKEN:'123:fictional',TELEGRAM_WEBHOOK_SECRET:'fictional-webhook-secret-over-32-characters',
    FIREBASE_PROJECT_ID:'test-project',CATALOG_ALLOWED_ORIGINS:'https://atlascrm-c5722.web.app',CATALOG_PUBLIC_ENABLED:'true',
    PARTNER_FIRESTORE_SERVICE_ACCOUNT:JSON.stringify({project_id:'test-project',client_email:'inventory@test-project.iam.gserviceaccount.com',private_key:pem})},
  outboundService:async request=>{
    const url=new URL(request.url);
    if(url.origin==='https://www.googleapis.com')return Response.json({keys:[jwk]});
    if(url.origin==='https://oauth2.googleapis.com')return Response.json({access_token:'fictional-access-token',expires_in:3600});
    if(url.origin==='https://api.telegram.org'){telegram.push(await request.json());return Response.json({ok:true,result:{message_id:1}});}
    if(url.origin==='https://firestore.googleapis.com'){
      assert.equal(request.method,'GET');const fields=url.pathname.includes('/purchases/')?{customerId:{stringValue:'customer'},productId:{stringValue:'plan'},paymentStatus:{stringValue:'paid'}}:url.pathname.includes('/products/')?{name:{stringValue:'Exact plan'},active:{booleanValue:true}}:{name:{stringValue:'Fictional customer'}};
      return Response.json({fields});
    }
    if(url.origin==='https://canboso.com'){assert.equal(request.method,'GET');return Response.json({success:true,products:[{productId:'old',name:'Old plan',price:{amount:10,currency:'USD'},availability:{available:2}}]});}
    if(url.origin==='https://api.nam.qzz.io'){
      if(request.method!=='GET'||url.pathname.includes('/orders')){supplierOrders++;throw Error('Supplier purchase attempted');}
      assert.equal(request.headers.get('authorization'),'Bearer fictional-token');
      if(url.pathname.endsWith('/products')){namReads++;return Response.json({ok:true,data:[{id:123,name:'Plan',apiPrice:8,price:99,stock:3,status:'active'}]},{headers:{'Cache-Control':'no-store'}});}
      if(url.pathname.includes('/stock/')){stockReads++;return Response.json({ok:true,data:{stock:0,status:'out_of_stock',available:false,purchasable:false,refreshCatalog:true}});}
    }
    throw Error('Unexpected external request');
  }}]}));
try{
  const operator=await makeToken(true),buyer=await makeToken(false),origin='https://atlascrm-c5722.web.app';
  const call=(path,token=operator,body)=>mf.dispatchFetch('https://local.test'+path,{method:body?'POST':'GET',headers:{Origin:origin,Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await call('/api/inventory/list',buyer)).status,403);
  const receive={action:'receive',requestId:'receive-fictional-001',productId:'plan',source:'Test supplier',cost:'8',currency:'USD',acquiredAt:'2026-01-01',credentials:'fixture-inventory-secret'};
  let response=await call('/api/inventory/command',operator,receive);assert.equal(response.status,200,response.status!==200?await response.clone().text():'');const unit=(await response.json()).unit;
  assert.equal((await call('/api/inventory/command',operator,receive)).status,200);
  assert.ok(!(await (await call('/api/inventory/list')).text()).includes(receive.credentials));
  const assign={action:'assign',requestId:'assign-fictional-001',unitId:unit.id,customerId:'customer',purchaseId:'purchase'};
  assert.equal((await call('/api/inventory/command',operator,assign)).status,200);
  assert.equal((await call('/api/inventory/command',operator,{...assign,requestId:'assign-fictional-002',purchaseId:'another'})).status,400);
  response=await call('/api/inventory/command',operator,{action:'reveal',requestId:'reveal-fictional-001',unitId:unit.id});assert.equal(response.status,200);assert.equal((await response.json()).credentials,receive.credentials);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal((await call('/api/inventory/command',operator,{action:'deliver',requestId:'deliver-fictional-001',unitId:unit.id,confirmDelivered:true})).status,200);
  for(const [sourceId,offerId,pool]of [['canboso','old','pool-a'],['nam','123','pool-b']])assert.equal((await call('/api/inventory/command',operator,{action:'mapOffer',requestId:'mapping-fictional-'+sourceId,productId:'plan',sourceId,offerId,stockPoolId:pool,enabled:true})).status,200);
  assert.equal((await call('/api/inventory/command',operator,{action:'setSupplier',requestId:'enable-nam-fixture-001',sourceId:'nam',enabled:true})).status,200);
  response=await call('/api/catalog/products');assert.equal(response.status,200);const catalog=await response.json();assert.equal(catalog.products[0].id,'atlas_plan');assert.equal(catalog.products[0].available,5);assert.equal(catalog.products[0].price,9.6);
  const publicText=JSON.stringify(catalog);for(const value of ['fixture-inventory-secret','unitCost','fingerprint','ciphertext','fictional-token'])assert.ok(!publicText.includes(value));
  await call('/api/catalog/products');assert.equal(namReads,2);assert.equal(supplierOrders,0);assert.equal(stockReads,0);
  const update={update_id:1,callback_query:{id:'fixture-callback',from:{id:1},data:'buy:atlas_plan',message:{chat:{id:1,type:'private'},message_id:1}}};
  response=await mf.dispatchFetch('https://local.test/webhooks/telegram',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':'fictional-webhook-secret-over-32-characters'},body:JSON.stringify(update)});
  assert.equal(response.status,200);assert.equal(stockReads,1);assert.ok(telegram.some(p=>p.text?.includes('Stock or price changed')));assert.equal(supplierOrders,0);
  const beforeOff=namReads;
  assert.equal((await call('/api/inventory/command',operator,{action:'setSupplier',sourceId:'nam',enabled:false,requestId:'disable-nam-fixture-001'})).status,200);
  let filtered=await (await call('/api/catalog/products')).json();assert.equal(filtered.products[0].id,'atlas_plan');assert.equal(filtered.products[0].available,2);assert.equal(filtered.products[0].price,13);assert.equal(namReads,beforeOff);
  assert.equal((await call('/api/inventory/command',operator,{action:'setSupplier',sourceId:'canboso',enabled:false,requestId:'disable-current-fixture-001'})).status,200);
  filtered=await (await call('/api/catalog/products')).json();assert.deepEqual(filtered.products,[]);
  const summary=await (await call('/api/inventory/summary')).json();assert.equal(summary.total,1);assert.equal(summary.delivered,1);assert.equal(summary.available,0);
  assert.equal((await call('/api/inventory/summary',buyer)).status,403);
  console.log('Inventory runtime smoke passed: signed operator gate, encrypted SQLite receipt/assignment/reveal, reference validation, delivery and fresh two-supplier stock/pricing. No supplier orders or production data.');
}finally{await mf.dispose();}
