import { prepareLocalFirebase } from '../server/local-firebase.mjs';
import { initializeApp, applicationDefault, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const command=process.argv[2]||'inspect';
if(!['inspect','grant-existing-operator','enable-existing-google'].includes(command))throw Error('Invalid setup command');
const projectId='atlascrm-c5722';
const cleanup=await prepareLocalFirebase(projectId);
const credential=applicationDefault();const app=initializeApp({credential,projectId});
try {
  const auth=getAuth(app);
  const users=await auth.listUsers(2);
  await mkdir(new URL('../.firebase/google-login/',import.meta.url),{recursive:true});
  if(command==='inspect') {
    await writeFile(new URL('../.firebase/google-login/prior-users.json',import.meta.url),JSON.stringify(users.users.map(u=>({uid:u.uid,disabled:u.disabled,customClaims:u.customClaims||{}}))),{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
    console.log('Existing Firebase accounts:',users.users.length,'More accounts:',Boolean(users.pageToken),'Active:',users.users.filter(u=>!u.disabled).length);
  }
  if(command==='grant-existing-operator') {
    const saved=JSON.parse(await readFile(new URL('../.firebase/google-login/prior-users.json',import.meta.url),'utf8'));
    if(saved.length!==1||saved[0].disabled)throw Error('A single existing active operator must be selected before opening Google signup');
    const user=await auth.getUser(saved[0].uid);
    await auth.setCustomUserClaims(user.uid,{...user.customClaims,atlasOperator:true});
    console.log('The existing workspace operator now has the CRM operator claim. Identity/details omitted.');
  }
  const {access_token}=await credential.getAccessToken();
  const url=`https://identitytoolkit.googleapis.com/v2/projects/${projectId}/defaultSupportedIdpConfigs/google.com`;
  const response=await fetch(url,{headers:{Authorization:'Bearer '+access_token},signal:AbortSignal.timeout(20000)});
  if(!response.ok) {console.log('Google provider configuration unavailable:',response.status);if(command!=='inspect')process.exitCode=1;}
  else {
    const config=await response.json();
    if(command==='inspect')await writeFile(new URL('../.firebase/google-login/prior-google.json',import.meta.url),JSON.stringify(config),{mode:0o600});
    console.log('Google provider enabled:',Boolean(config.enabled),'OAuth client configured:',Boolean(config.clientId));
    if(command==='enable-existing-google') {
      if(!config.clientId)throw Error('Google OAuth client must first be configured in Firebase console');
      const enabled=await fetch(url+'?updateMask=enabled',{method:'PATCH',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:JSON.stringify({name:config.name,enabled:true}),signal:AbortSignal.timeout(20000)});
      if(!enabled.ok)throw Error('Google provider enable failed');
      console.log('Existing Google provider enabled; OAuth credential values omitted.');
    }
  }
} catch {console.error('Google setup did not complete. Private credentials and account details omitted.');process.exitCode=1;}
finally {await deleteApp(app);cleanup();}
