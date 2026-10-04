import {configured,auth,signInWithEmailAndPassword,onAuthStateChanged} from './firebase.js';
if(configured)onAuthStateChanged(auth,user=>{if(user)location.href='index.html'});
document.querySelector('#login-form').addEventListener('submit',async e=>{e.preventDefault();const error=document.querySelector('#login-error');if(!configured){error.textContent='Firebase is not configured. Use index.html?demo=1 for local preview.';return}try{await signInWithEmailAndPassword(auth,email.value,password.value);location.href='index.html'}catch(err){error.textContent=err.message}});
