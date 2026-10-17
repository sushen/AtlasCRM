import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';

test('manual sent confirmations record every attempt and reject missing customers',async()=>{
  const stored=new Map();
  globalThis.localStorage={getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)};
  globalThis.location={search:'?demo=1'};
  if(!globalThis.crypto)globalThis.crypto=webcrypto;
  // Isolate demo persistence from the browser-only Firebase CDN module.
  const phoneModule=new URL('../js/utils/phone.js',import.meta.url).href;
  const source=(await readFile(new URL('../js/services/store.js',import.meta.url),'utf8'))
    .replace("import * as fb from '../firebase.js';",'const fb={configured:false};')
    .replace("'../utils/phone.js'",JSON.stringify(phoneModule));
  const store=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const {customer}=await store.createCustomer({name:'Demo Contact',phone:'+8801712345678'});
  await store.transition(customer.id,'contacted');
  const first=await store.getCustomer(customer.id);
  const firstContactedAt=first.firstContactedAt;
  await store.transition(customer.id,'contacted');
  const updated=await store.getCustomer(customer.id);
  assert.equal(updated.contactAttempts,2);
  assert.equal(updated.firstContactedAt,firstContactedAt);
  assert.equal(updated.status,'contacted');
  assert.equal((await store.listActivities(customer.id)).filter(a=>a.type==='message_marked_sent').length,2);
  await assert.rejects(store.transition('missing-customer','contacted'),/Customer not found/);
});
