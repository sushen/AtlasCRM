import {auth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithEmailAndPassword,signOut} from './firebase.js';
import {renderPartners} from './views/partners.js';
const root=document.querySelector('#app');root.className='content';
onAuthStateChanged(auth,async user=>{
  if(user){await renderPartners(root,user);const button=document.createElement('button');button.className='button';button.textContent='Sign out';button.onclick=()=>signOut(auth);root.prepend(button);return;}
  root.innerHTML='<div class="card card-pad"><h1>Atlas partner workspace</h1><p>Sign in with the Firebase account assigned by Atlas. This does not grant CRM access.</p><form><label class="field">Email<input name="email" type="email" required></label><label class="field">Password<input name="password" type="password" required></label><button class="button primary">Sign in</button></form><button class="button" data-google>Continue with Google</button><p data-error role="status"></p><a href="/?catalog=1">Back to Market</a></div>';
  const error=root.querySelector('[data-error]');
  root.querySelector('form').onsubmit=async event=>{event.preventDefault();const form=new FormData(event.target);try{await signInWithEmailAndPassword(auth,form.get('email'),form.get('password'));}catch{error.textContent='Sign-in failed. Check the account credentials.';}};
  root.querySelector('[data-google]').onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch{error.textContent='Google sign-in could not complete.';}};
});
