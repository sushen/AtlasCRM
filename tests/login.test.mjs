import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { isOperator,loginDestination,loginError } from '../js/utils/auth-access.js';
import { workspaceOperator } from '../server/operator.mjs';
const html=await readFile(new URL('../login.html',import.meta.url),'utf8');
const source=(await readFile(new URL('../js/login.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function setup({claims={},popupError}={}) {
  const {document}=parseHTML(html);const location={href:'',search:''};
  const calls=[];const user={getIdTokenResult:async refresh=>{calls.push({refresh});return {claims};}};
  class GoogleAuthProvider {setCustomParameters(value){calls.push({parameters:value});}}
  new Function('document','location','configured','auth','onAuthStateChanged','signInWithEmailAndPassword','GoogleAuthProvider','signInWithPopup','loginDestination','loginError',source)(
    document,location,true,{},(_auth,callback)=>{calls.push({callback});},async(_auth,email,password)=>{calls.push({email,password});return {user};},GoogleAuthProvider,
    async()=>{calls.push({popup:true});if(popupError)throw popupError;return {user};},loginDestination,loginError);
  return {document,location,calls};
}
test('only a boolean operator claim permits CRM routing; return targets cannot redirect externally',()=>{
  for(const value of [undefined,{}, {atlasOperator:false},{atlasOperator:'true'}]) {
    assert.equal(isOperator(value),false);assert.equal(loginDestination(value), '/?catalog=1');
  }
  assert.equal(loginDestination({atlasOperator:true}),'/index.html');
  assert.equal(loginDestination({atlasOperator:true},'?next=market'),'/?catalog=1');
  assert.equal(loginDestination({},'?next=https://evil.invalid'),'/?catalog=1');
});
test('Google sign-in opens account selector without email/password and sends buyer to Market',async()=>{
  const {document,location,calls}=setup();
  document.querySelector('#google-login').click();await tick();
  assert.equal(location.href,'/?catalog=1');assert.ok(calls.some(c=>c.popup));
  assert.deepEqual(calls.find(c=>c.parameters).parameters,{prompt:'select_account'});
  assert.ok(calls.some(c=>c.refresh===true));
});
test('email operator sign-in preserves existing flow and CRM destination',async()=>{
  const {document,location,calls}=setup({claims:{atlasOperator:true}});
  document.querySelector('#email').value=' fictional@example.invalid ';
  document.querySelector('#password').value='fictional-password';
  document.querySelector('#login-form').dispatchEvent(new document.defaultView.Event('submit',{cancelable:true}));await tick();
  assert.equal(location.href,'/index.html');assert.equal(calls.find(c=>c.email).email,'fictional@example.invalid');
});
test('popup cancellation safely re-enables buttons without provider detail leakage',async()=>{
  const {document,location}=setup({popupError:{code:'auth/popup-closed-by-user',message:'secret private detail'}});
  document.querySelector('#google-login').click();await tick();
  assert.equal(location.href,'');assert.equal(document.querySelector('#google-login').disabled,false);
  assert.match(document.querySelector('#login-error').textContent,/cancelled/);
  assert.ok(!loginError('unknown').includes('secret'));
});
test('local messaging selects only operator claim across public-user pages and refuses ambiguity',async()=>{
  const pages=[{users:[{uid:'buyer'},{uid:'disabled',disabled:true,customClaims:{atlasOperator:true}}],pageToken:'next'},
    {users:[{uid:'operator',customClaims:{atlasOperator:true}},{uid:'fake',customClaims:{atlasOperator:'true'}}]}];
  let index=0;assert.deepEqual(await workspaceOperator({listUsers:async()=>pages[index++]}),['operator']);
  await assert.rejects(workspaceOperator({listUsers:async()=>({users:[{uid:'buyer'}]})}),/choose_allowed_firebase_user/);
  await assert.rejects(workspaceOperator({listUsers:async()=>({users:[{uid:'one',customClaims:{atlasOperator:true}},{uid:'two',customClaims:{atlasOperator:true}}]})}),/choose_allowed_firebase_user/);
});
