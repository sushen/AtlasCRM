import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLocalWorkspace} from '../server/local-workspace.mjs';
test('loopback inventory uses real service code and encrypted file state without production writes',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'atlas-local-test-')),port=33000+Math.floor(Math.random()*1000);
  const keyring=JSON.stringify({activeKeyId:'v1',keys:{v1:Buffer.alloc(32,7).toString('base64')},fingerprintKey:Buffer.alloc(32,8).toString('base64')});
  const methods=[];
  const workspace=await createLocalWorkspace({directory,port,keyring,fetchImpl:async(url,options)=>{methods.push(options?.method||'GET');assert.ok(url.startsWith('https://atlas.meshstocks.workers.dev/api/catalog/products'));return Response.json({products:[{id:'source',name:'Source product',available:5,price:10,currency:'USD'}],fetchedAt:new Date().toISOString()});}});
  await new Promise(resolve=>workspace.server.listen(port,'127.0.0.1',resolve));
  const call=(path,{token=workspace.session,body,origin=workspace.origin}={})=>fetch(workspace.origin+path,{method:body?'POST':'GET',headers:{Origin:origin,Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  try{
    assert.equal((await call('/api/inventory/list',{token:'wrong'})).status,401);
    assert.equal((await call('/api/inventory/list',{origin:'https://evil.invalid'})).status,403);
    assert.equal((await call('/.worker-private/inventory-keyring.json')).status,404);
    let summary=await (await call('/api/inventory/summary')).json();assert.equal(summary.available,0);assert.equal(summary.supplier.known,5);
    const references={products:[{id:'plan',name:'Test plan',active:true}],customers:[{id:'customer'}],purchases:[{id:'purchase',productId:'plan',customerId:'customer',paymentStatus:'paid'}]};
    const command={action:'receive',requestId:'local-receive-request-001',productId:'plan',source:'Test source',cost:'8',currency:'USD',acquiredAt:'2026-10-19',credentials:'fictional-local-license'};
    const response=await call('/api/inventory/command',{body:{command,references}});assert.equal(response.status,200);const {unit}=await response.json();
    assert.ok(!(await readFile(join(directory,'inventory.json'),'utf8')).includes(command.credentials));
    assert.equal((await call('/api/inventory/command',{body:{references,command:{action:'assign',requestId:'local-assign-request-001',unitId:unit.id,customerId:'customer',purchaseId:'purchase'}}})).status,200);
    summary=await (await call('/api/inventory/summary')).json();assert.equal(summary.assigned,1);assert.equal(summary.available,0);
    assert.ok(methods.every(method=>method==='GET'));
  }finally{await new Promise(resolve=>workspace.server.close(resolve));}
});
test('shared Firebase mode requires operator token and local session and ignores browser reference spoofing',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'atlas-shared-test-')),port=34000+Math.floor(Math.random()*1000);
  const keyring=JSON.stringify({activeKeyId:'v1',keys:{v1:Buffer.alloc(32,7).toString('base64')},fingerprintKey:Buffer.alloc(32,8).toString('base64')});
  const {ShopFileStorage}=await import('../server/shop-file-storage.mjs');
  const refs=[];
  const sharedFirebase={storage:new ShopFileStorage(join(directory,'test-state.json')),authenticate:async header=>{
    if(header==='Bearer operator')return {sub:'verified-operator',atlasOperator:true};
    if(header==='Bearer buyer')return {sub:'buyer',atlasOperator:false};throw Error('Invalid token');
  },read:async(collection,id)=>{refs.push({collection,id});return null;}};
  const workspace=await createLocalWorkspace({directory,port,keyring,sharedFirebase,fetchImpl:async()=>{throw Error('No provider requests expected');}});
  await new Promise(resolve=>workspace.server.listen(port,'127.0.0.1',resolve));
  const call=(token,session,command)=>fetch(workspace.origin+'/api/inventory/'+(command?'command':'list'),{method:command?'POST':'GET',headers:{Origin:workspace.origin,Authorization:'Bearer '+token,'X-Atlas-Local-Session':session,...(command?{'Content-Type':'application/json'}:{})},...(command?{body:JSON.stringify({command,references:{products:[{id:'fake-plan',name:'Forged product',active:true}],customers:[],purchases:[]}})}:{})});
  try{
    const entry=await fetch(workspace.origin+'/?quick-add=1',{redirect:'manual'});
    assert.equal(entry.status,302);assert.equal(entry.headers.get('location'),'http://localhost:'+port+'/?quick-add=1');
    assert.equal((await fetch(workspace.origin+'/login.html?next=quick-add',{redirect:'manual'})).headers.get('location'),'http://localhost:'+port+'/login.html?next=quick-add');
    assert.equal((await call('operator','wrong')).status,401);
    assert.equal((await call('invalid',workspace.session)).status,401);
    assert.equal((await call('buyer',workspace.session)).status,403);
    const response=await call('operator',workspace.session);assert.equal(response.status,200);assert.deepEqual((await response.json()).units,[]);
    const attempt=await call('operator',workspace.session,{action:'receive',requestId:'forged-ref-test-001',productId:'fake-plan',source:'Test',cost:'1',currency:'USD',acquiredAt:'2026-10-19',credentials:'fictional'});
    assert.equal(attempt.status,400);assert.deepEqual(refs,[{collection:'products',id:'fake-plan'}]);
    assert.equal((await workspace.storage.list({prefix:'iv:unit:'})).size,0);
  }finally{await new Promise(resolve=>workspace.server.close(resolve));}
});
