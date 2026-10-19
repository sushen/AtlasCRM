import {configured,auth,signInWithEmailAndPassword,onAuthStateChanged,GoogleAuthProvider,signInWithPopup} from './firebase.js';
import {loginDestination,loginError} from './utils/auth-access.js';
const form=document.querySelector('#login-form');
const error=document.querySelector('#login-error');
let navigating=false;
async function continueTo(user) {
  if(!user||navigating)return;
  navigating=true;
  try {
    const {claims}=await user.getIdTokenResult(true);
    location.href=loginDestination(claims,location.search);
  }catch {navigating=false;error.textContent='Could not finish sign-in. Please try again.';}
}
if(configured)onAuthStateChanged(auth,continueTo,()=>{error.textContent='Could not restore sign-in. Please reload.';});
async function signIn(action) {
  error.textContent='';
  if(!configured){error.textContent='Sign-in is unavailable. Please contact support.';return;}
  form.querySelectorAll('button').forEach(button=>{button.disabled=true;});
  try {const result=await action();await continueTo(result.user);}
  catch(err){error.textContent=loginError(err.code);}
  finally{form.querySelectorAll('button').forEach(button=>{button.disabled=false;});}
}
form.addEventListener('submit',event=>{
  event.preventDefault();
  return signIn(()=>signInWithEmailAndPassword(auth,document.querySelector('#email').value.trim(),document.querySelector('#password').value));
});
document.querySelector('#google-login').addEventListener('click',()=>signIn(()=>{
  const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  return signInWithPopup(auth,provider);
}));
