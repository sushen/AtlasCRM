import test from 'node:test';
import assert from 'node:assert/strict';
import {FirestoreInventoryStorage} from '../server/inventory/firestore-storage.mjs';
import {WorkerInventoryStorage} from '../worker/inventory-storage.mjs';
test('Node and hosted inventory adapters share the same collection, hashed IDs and payload format',async()=>{
  const values=new Map();let commits=0;
  const db={collection:name=>{assert.equal(name,'atlasInventoryState');return {doc:id=>({id,get:async()=>({exists:values.has(id),data:()=>values.get(id)})})};},runTransaction:async operation=>operation({get:async ref=>({exists:values.has(ref.id),data:()=>values.get(ref.id)}),set:(ref,data)=>{values.set(ref.id,data);commits++;}})};
  const node=new FirestoreInventoryStorage(db,{serverTimestamp:()=> 'server-time'}),worker=new WorkerInventoryStorage({FIREBASE_PROJECT_ID:'test-project'});
  const key='iv:unit:shared-unit';assert.equal(node.ref(key).id,(await worker.name(key)).split('/').at(-1));
  await node.transaction(async tx=>{assert.equal(await tx.get(key),undefined);await tx.put(key,{state:'available'});});
  assert.deepEqual(await node.get(key),{state:'available'});assert.equal(commits,1);assert.equal([...values.values()][0].updatedAt,'server-time');
  assert.throws(()=>node.ref('messages/private'),/Invalid/);await assert.rejects(worker.name('messages/private'),/Invalid/);
});
test('Worker Firestore transactions retain retry identities and use server timestamps without exposing keys',async()=>{
  const worker=new WorkerInventoryStorage({FIREBASE_PROJECT_ID:'test-project'});let commits=0,rollbacks=0;const bodies=[];
  worker.request=async(path,method,body)=>{
    if(path.endsWith(':beginTransaction'))return {transaction:'private-transaction'};
    if(path.endsWith(':rollback')){rollbacks++;return {};}
    if(path.endsWith(':commit')){bodies.push(body);if(commits++===0){const error=Error('Conflict');error.retry=true;throw error;}return {};}
    return null;
  };
  const result=await worker.transaction(async tx=>{assert.equal(await tx.get('iv:unit:unit'),undefined);await tx.put('iv:unit:unit',{state:'available'});return 'saved';});
  assert.equal(result,'saved');assert.equal(rollbacks,1);assert.equal(commits,2);assert.equal(bodies[0].writes[0].update.name,bodies[1].writes[0].update.name);
  assert.equal(bodies[1].writes[0].updateTransforms[0].setToServerValue,'REQUEST_TIME');assert.equal(JSON.parse(bodies[1].writes[0].update.fields.payload.stringValue).state,'available');
});
