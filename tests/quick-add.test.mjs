import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {webcrypto} from 'node:crypto';
import {saveQuickLead} from '../js/services/quick-add.js';
import {renderQuickAdd} from '../js/views/quick-add.js';
import {normalizePhone} from '../js/utils/phone.js';
import {loginDestination} from '../js/utils/auth-access.js';
import {TelegramShop,STORE_MENU,SHOP_COMMANDS,ADMIN_SHOP_COMMANDS,QUICK_ADD_URL} from '../server/telegram-shop.mjs';

const storeSource=(await readFile(new URL('../js/services/store.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
function store(firebase=false) {
  const writes=[],records=[],activities=[];let serial=0;
  const fb={configured:firebase,db:{},collection:(_db,name)=>name,where:(...args)=>args,limit:()=>1,query:(...args)=>args,
    getDocs:async()=>({empty:!records.length,docs:records.map(c=>({id:c.id,data:()=>c}))}),
    doc:collection=>({id:String(++serial),collection}),serverTimestamp:()=>({server:true}),
    writeBatch:()=>{const batch=[];return {set:(ref,data)=>batch.push({ref,data}),commit:async()=>writes.push(batch)};}};
  const localStorage={getItem:()=>null,setItem:()=>{}};
  const api=new Function('fb','normalizePhone','localStorage','location','crypto',storeSource+';return {createCustomer,listCustomers,listActivities,updateCustomer};')(fb,normalizePhone,localStorage,{search:''},webcrypto);
  return {...api,writes,records,activities};
}
test('Quick Add normalizes equivalent phones and preserves existing customer and history',async()=>{
  const api=store();const first=await saveQuickLead({phone:'01712345678',name:' Fictional lead ',notes:' Interest '},api.createCustomer);
  assert.equal(first.customer.name,'Fictional lead');assert.equal(first.customer.notes,'Interest');assert.equal(first.customer.status,'new');
  assert.equal(first.customer.source,'WhatsApp Quick Add');
  await api.updateCustomer(first.customer.id,{status:'do_not_contact',notes:'Existing private history'});
  const before=structuredClone(await api.listCustomers());const history=structuredClone(await api.listActivities(first.customer.id));
  for(const phone of ['+8801712345678','8801712345678','008801712345678']){
    const result=await saveQuickLead({phone,name:'Replacement',notes:'Overwrite'},api.createCustomer);
    assert.equal(result.duplicate,true);assert.equal(result.customer.id,first.customer.id);
  }
  assert.deepEqual(await api.listCustomers(),before);assert.deepEqual(await api.listActivities(first.customer.id),history);
  assert.equal(history[0].type,'lead_added');assert.match(history[0].note,/manually/);
  await assert.rejects(saveQuickLead({phone:'12'},api.createCustomer),/valid phone/);
});
test('Firebase creation commits lead and manual activity together with server timestamps; duplicate does not write',async()=>{
  const api=store(true);await saveQuickLead({phone:'+12025550123'},api.createCustomer);
  assert.equal(api.writes.length,1);const batch=api.writes[0];assert.equal(batch.length,2);
  assert.equal(batch[0].ref.collection,'customers');assert.deepEqual(batch[0].data.createdAt,{server:true});
  assert.equal(batch[1].data.customerId,batch[0].ref.id);assert.equal(batch[1].data.type,'lead_added');
  api.records.push({id:'existing',normalizedPhone:'+12025550123',status:'customer'});
  const result=await saveQuickLead({phone:'+12025550123',notes:'New notes'},api.createCustomer);
  assert.equal(result.duplicate,true);assert.equal(api.writes.length,1);
});
test('fixed Quick Add return route is restricted to operators',()=>{
  assert.equal(loginDestination({atlasOperator:true},'?next=quick-add'),'/?quick-add=1');
  for(const claims of [{},{atlasOperator:false},{atlasOperator:'true'}])assert.equal(loginDestination(claims,'?next=quick-add'),'/?catalog=1');
  for(const next of ['https://evil.invalid','//evil.invalid','quick-add%26phone%3D123'])assert.equal(loginDestination({atlasOperator:true},'?next='+next),'/index.html');
});
test('Quick Add startup preserves destination when signed out and renders only after operator refresh',async()=>{
  const source=(await readFile(new URL('../js/app.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
  for(const role of ['signed-out','buyer','operator']){
    const {document}=parseHTML('<div id="app"></div>');const location={search:'?quick-add=1',href:''};let callback;
    new Function('document','location','configured','auth','onAuthStateChanged','isOperator','renderQuickAdd','createCustomer','isDemo',source)(
      document,location,true,{currentUser:{}},(_auth,fn)=>{callback=fn;},claims=>claims?.atlasOperator===true,
      renderQuickAdd,async()=>{throw Error('Must not save on startup');},()=>false);
    await callback(role==='signed-out'?null:{getIdTokenResult:async refresh=>{assert.equal(refresh,true);return {claims:{atlasOperator:role==='operator'}};}});
    if(role==='signed-out')assert.equal(location.href,'login.html?next=quick-add');
    if(role==='buyer')assert.equal(location.href,'/?catalog=1');
    assert.equal(Boolean(document.querySelector('#quick-lead-form')),role==='operator');
  }
});
function form(createCustomer,openCustomer=async()=>{}){
  const {document}=parseHTML('<main></main>');const el=document.querySelector('main');renderQuickAdd(el,{createCustomer,openCustomer});
  el.querySelector('#lead-phone').value='01712345678';
  return {el,submit:()=>el.querySelector('form').onsubmit({preventDefault(){}})};
}
test('form allows phone only, blocks repeat taps, opens saved customer and retains recoverable success',async()=>{
  let finish,calls=0;const opened=[];
  const {el,submit}=form(()=>{calls++;return new Promise(resolve=>{finish=resolve;});},async id=>opened.push(id));
  const pending=submit();await submit();assert.equal(calls,1);assert.equal(el.querySelector('[data-save]').disabled,true);
  finish({customer:{id:'saved'},duplicate:true});await pending;
  assert.deepEqual(opened,['saved']);assert.match(el.querySelector('[data-result]').textContent,/Already in Atlas/);
  assert.equal(el.querySelector('[data-next]').hidden,false);await submit();assert.equal(calls,1);
  assert.equal(el.querySelector('#lead-phone').getAttribute('type'),'text');assert.ok(el.querySelector('details #lead-name'));
});
test('save and profile failures allow safe retries without private error leakage or a second save',async()=>{
  const failed=form(async()=>{throw Error('private backend detail');});await failed.submit();
  assert.equal(failed.el.querySelector('[data-save]').disabled,false);assert.doesNotMatch(failed.el.querySelector('[data-error]').textContent,/private backend/);
  let calls=0;const saved=form(async()=>{calls++;return {customer:{id:'saved'},duplicate:false};},async()=>{throw Error('profile read failed');});
  await saved.submit();assert.match(saved.el.querySelector('[data-error]').textContent,/lead is saved/);
  await saved.el.querySelector('[data-open]').onclick();assert.equal(calls,1);
});
test('Telegram exposes link only to configured admin in matching private chat; public menus stay free of CRM controls',async()=>{
  const calls=[];const bot=new TelegramShop({orders:{},api:{call:async(method,payload)=>{calls.push({method,payload});return {};}},catalog:{list:async()=>({products:[]})},adminIds:[99]});
  const update=(id,text,type='private',actor=id)=>({message:{chat:{id,type},from:{id:actor},text}});
  await bot.handle(update(99,'/menu'));assert.match(JSON.stringify(calls),/Add lead/);calls.length=0;
  await bot.handle(update(99,'➕ Add lead'));assert.equal(calls[0].payload.reply_markup.inline_keyboard[0][0].url,QUICK_ADD_URL);calls.length=0;
  await bot.handle(update(1,'/menu'));assert.doesNotMatch(JSON.stringify(calls),/Add lead|quick-add/);calls.length=0;
  await bot.handle(update(1,'/addlead'));assert.doesNotMatch(JSON.stringify(calls),/quick-add/);calls.length=0;
  assert.equal(await bot.handle(update(99,'/addlead','group')),false);
  assert.equal(await bot.handle(update(99,'/addlead','private',1)),false);assert.equal(calls.length,0);
  assert.doesNotMatch(JSON.stringify([STORE_MENU,SHOP_COMMANDS]),/Add lead|addlead|quick-add/);
  assert.ok(ADMIN_SHOP_COMMANDS.some(c=>c.command==='addlead'));
  assert.equal(new URL(QUICK_ADD_URL).search,'?quick-add=1');
});
