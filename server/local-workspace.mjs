import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ShopFileStorage} from './shop-file-storage.mjs';
import {InventoryProgram,InventoryError} from './inventory/program.mjs';
import {supplierStates} from './inventory/suppliers.mjs';
import {attachSupplierOverview} from './inventory/stock-overview.mjs';
import {SupplierCatalog} from './catalog.mjs';
import {NamCatalog} from './suppliers/nam.mjs';
import {combinedCatalog} from './inventory/combined-catalog.mjs';
import {supplierConfiguration,storefrontSettings} from './catalog-settings.mjs';
import {loadSupplierOffers} from './inventory/supplier-offers.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function createLocalWorkspace({env={},port=3199,directory=join(root,'.worker-private/local-workspace'),keyring,fetchImpl=fetch,sharedFirebase=null}={}){
  if(!keyring)throw Error('Private local encryption keyring required.');
  await mkdir(directory,{recursive:true});
  if(process.platform==='win32'){
    const owner=process.env.USERDOMAIN+'\\'+process.env.USERNAME;
    execFileSync('icacls.exe',[resolve(directory),'/inheritance:r','/grant:r',owner+':(OI)(CI)(F)','SYSTEM:(OI)(CI)(F)'],{stdio:'ignore',windowsHide:true});
  }
  const storage=sharedFirebase?.storage||new ShopFileStorage(join(directory,'inventory.json')),session=randomBytes(32).toString('hex'),origin='http://127.0.0.1:'+port;
  let references={customers:[],products:[],purchases:[]},sources=[];
  const readiness={canboso:Boolean(supplierConfiguration(env).key),nam:Boolean(env.NAM_RESELLER_TOKEN)&&env.NAM_RESELLER_CURRENCY==='USD'};
  const read=async(collection,id)=>sharedFirebase?sharedFirebase.read(collection,id):references[collection]?.find(row=>row.id===id)||null;
  const inventory=new InventoryProgram(storage,{keyring,references:{read,ensureSupplierProduct:sharedFirebase?.ensureSupplierProduct},supplierReadiness:readiness,
    resolveSupplierOffer:async(sourceId,offerId)=>(await loadSupplierOffers(storage,env,{fetchImpl})).offers.find(o=>o.sourceId===sourceId&&o.id===offerId)});
  const claims={sub:'local-workspace-operator',atlasOperator:true};
  const catalog=async()=>{
    const states=await supplierStates(storage,readiness);sources=states.map(s=>({...s,products:[]}));
    const currentOn=states.find(s=>s.id==='canboso').enabled,namOn=states.find(s=>s.id==='nam').enabled;
    const current=new SupplierCatalog({...supplierConfiguration(env),settings:{brand:'Atlas local workspace',telegramUrl:''},fetchImpl});
    let data={products:[],fetchedAt:new Date().toISOString(),storefront:{brand:'Atlas local workspace',telegramUrl:''}};
    if(currentOn){
      let loaded=false;
      if(readiness.canboso){try{data=await current.list();loaded=true;}catch{/* Existing public catalog is a read-only fallback, never invented stock. */}}
      if(!loaded){
        const response=await fetchImpl('https://atlas.meshstocks.workers.dev/api/catalog/products',{headers:{Origin:'https://atlascrm-c5722.web.app'},redirect:'manual',signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw Error('Public catalog unavailable');data=await response.json();
      }
    }
    let offers=[];
    if(namOn){const nam=new NamCatalog({token:env.NAM_RESELLER_TOKEN,currency:env.NAM_RESELLER_CURRENCY,fetchImpl});offers=await nam.offers();}
    sources=states.map(s=>({...s,products:s.id==='canboso'?data.products:offers}));
    const maps=[...await storage.list({prefix:'iv:map:',limit:501})].map(([,m])=>m).filter(m=>m.sourceId==='nam'?namOn:currentOn);
    if(namOn){
      if(currentOn&&!current.offerSnapshot)throw Error('Supplier key required for comparable cost pricing');
      const products=sharedFirebase?await Promise.all([...new Set(maps.filter(m=>m.enabled).map(m=>m.productId))].map(id=>read('products',id))):references.products;
      if(products.some(p=>!p))throw Error('Mapped product missing');
      data={...data,...combinedCatalog({products:data.products,offers:current.offerSnapshot||[]},offers,maps,products)};
      delete data.selections;
    }
    return {...data,storefront:{brand:'Atlas local workspace',telegramUrl:''}};
  };
  const server=createServer(async(req,res)=>{
    const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
    try{
      if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send({message:'Loopback only'},403);
      const requestOrigin='http://'+req.headers.host;
      if(req.headers.origin&&req.headers.origin!==requestOrigin||req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))return send({message:'Origin denied'},403);
      const url=new URL(req.url,requestOrigin);
      // Firebase already authorizes localhost. Keep the operator's existing
      // allowlist intact and canonicalize browser entry pages before sign-in.
      if(sharedFirebase&&req.method==='GET'&&req.headers.host==='127.0.0.1:'+port&&['/','/index.html','/login.html'].includes(url.pathname)){
        res.writeHead(302,{Location:'http://localhost:'+port+url.pathname+url.search,'Cache-Control':'no-store'});return res.end();
      }
      if(url.pathname==='/js/local-runtime.js'&&req.method==='GET'){
        res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
        return res.end(`export const localSession=${JSON.stringify(session)},localStoreKey='atlas_local_workspace_store_v1',sharedFirebase=${Boolean(sharedFirebase)};const banner=document.createElement('aside');banner.style.cssText='padding:16px;background:#fff3cd;font:14px system-ui';banner.textContent=${JSON.stringify(sharedFirebase?'LOCAL CODE · SHARED FIREBASE DATA — signed-in saves update the real CRM and inventory. No supplier purchases or messages are sent.':'LOCAL WORKSPACE — real supplier reads; inventory on this computer. Production writes and messages disconnected.')};document.body.prepend(banner);`);
      }
      if(url.pathname.startsWith('/api/inventory/')){
        let actor=claims;
        if(sharedFirebase){
          if(req.headers['x-atlas-local-session']!==session)return send({message:'Reload the local workspace'},401);
          try{actor=await sharedFirebase.authenticate(req.headers.authorization);}catch{return send({message:'Sign in with your CRM operator account.'},401);}
          if(actor?.atlasOperator!==true)return send({message:'Operator access required'},403);
        }else if(req.headers.authorization!=='Bearer '+session)return send({message:'Local session required'},401);
        if(req.method==='GET'&&url.pathname==='/api/inventory/offers')return send(await loadSupplierOffers(storage,env,{fetchImpl}));
        if(req.method==='GET'&&url.pathname==='/api/inventory/list')return send(await inventory.list(actor,Object.fromEntries(url.searchParams)));
        if(req.method==='GET'&&url.pathname==='/api/inventory/summary')return send(await attachSupplierOverview(await inventory.summary(actor),{states:await supplierStates(storage,readiness),loadCatalog:catalog,getSources:()=>sources}));
        if(req.method==='POST'&&url.pathname==='/api/inventory/command'){
          if(!/^application\/json/.test(req.headers['content-type']||''))return send({message:'JSON required'},400);
          const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1000000)return send({message:'Request too large'},413);chunks.push(chunk);}
          const body=JSON.parse(Buffer.concat(chunks));
          if(!sharedFirebase){if(!body.references||['customers','products','purchases'].some(k=>!Array.isArray(body.references[k])||body.references[k].length>5000))return send({message:'Invalid local reference data'},400);references=body.references;}
          return send(await inventory.command(actor,body.command));
        }
        return send({message:'Unsupported local inventory request'},405);
      }
      if(url.pathname==='/api/catalog/products'&&req.method==='GET')return send(await catalog());
      if(req.method!=='GET')return send({message:'Method not allowed'},405);
      const path=url.pathname==='/'?'index.html':url.pathname.slice(1);
      if(!/^(?:index\.html|login\.html|404\.html|(?:js|css)\/[a-zA-Z0-9_/-]+\.(?:js|css)|images\/(?:brand|shop)\/[a-zA-Z0-9_-]+\.jpg)$/.test(path)||path.includes('..'))return send({message:'Not found'},404);
      try{const data=await readFile(join(root,'.firebase/local-workspace',path));res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.jpg')?'image/jpeg':'text/html','Cache-Control':'no-store'});res.end(data);}catch{return send({message:'Not found'},404);}
    }catch(error){send({message:error instanceof InventoryError?error.message:'Local service could not complete this request. Check supplier availability and retry.'},error instanceof InventoryError?400:503);}
  });
  return {server,session,storage,origin};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const envPath=process.argv.slice(2).find(arg=>!arg.startsWith('--'));let env={...process.env};if(envPath)env={...parseEnv(await readFile(envPath,'utf8')),...env};
  const keyring=await readFile(join(root,'.worker-private/inventory-keyring.json'),'utf8');
  let sharedFirebase=null;
  if(process.argv.includes('--firebase')){
    const {prepareLocalFirebase}=await import('./local-firebase.mjs');
    const cleanup=await prepareLocalFirebase('atlascrm-c5722',process.env);process.on('exit',cleanup);
    const {initializeApp,applicationDefault}=await import('firebase-admin/app');const {getFirestore,FieldValue}=await import('firebase-admin/firestore');const {getAuth}=await import('firebase-admin/auth');
    const app=initializeApp({credential:applicationDefault(),projectId:'atlascrm-c5722'}),db=getFirestore(app),auth=getAuth(app);
    const {FirestoreInventoryStorage}=await import('./inventory/firestore-storage.mjs');
    sharedFirebase={storage:new FirestoreInventoryStorage(db,{serverTimestamp:()=>FieldValue.serverTimestamp()}),
      ensureSupplierProduct:async(id,offer)=>db.runTransaction(async tx=>{const ref=db.collection('products').doc(id),prior=await tx.get(ref);if(prior.exists)return {id:prior.id,...prior.data()};
        const product={name:offer.name,sourceId:offer.sourceId,offerId:offer.offerId,active:true,description:'Linked from a manually purchased supplier offer',createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};tx.set(ref,product);return {id,...product};}),
      authenticate:async header=>{if(!header?.startsWith('Bearer '))throw Error();const claims=await auth.verifyIdToken(header.slice(7),true);return {...claims,sub:claims.uid};},
      read:async(collection,id)=>{if(!['products','customers','purchases'].includes(collection)||!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw Error('Invalid CRM reference');const doc=await db.collection(collection).doc(id).get();return doc.exists?{id:doc.id,...doc.data()}:null;}};
    await db.collection('atlasInventoryState').limit(1).get();
    console.log('Shared Firebase inventory read verified. Browser operations require the existing operator sign-in.');
  }
  const workspace=await createLocalWorkspace({env,keyring,sharedFirebase});workspace.server.listen(3199,'127.0.0.1',()=>console.log('Atlas local workspace: '+(sharedFirebase?'http://localhost:3199/':workspace.origin)+(sharedFirebase?' — shared Firebase data, authenticated operator saves.':' — isolated local data.')));
}
