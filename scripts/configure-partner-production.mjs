// Run only after operator approval. Values are written privately, never printed.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {prepareLocalFirebase} from '../server/local-firebase.mjs';
import {applicationDefault} from 'firebase-admin/app';
if(!process.argv.includes('--approved'))throw Error('Explicit deployment approval required');
const project='atlascrm-c5722',email='atlas-partner-sync@'+project+'.iam.gserviceaccount.com';
const directory=join(process.env.LOCALAPPDATA,'AtlasCRM/runtime/partner-cloudflare');
await mkdir(directory,{recursive:true});
execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('private-runtime.ps1',import.meta.url)),'-Directory',directory],{stdio:'pipe',windowsHide:true});
const cleanup=await prepareLocalFirebase(project);
try{
  const {access_token}=await applicationDefault().getAccessToken();
  const api=async(url,body)=>{
    const response=await fetch(url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000),redirect:'error'});
    if(!response.ok){const error=await response.json().catch(()=>({}));throw Error('Google configuration failed: '+response.status+' '+(error.error?.status||'request_error'));}
    return response.json();
  };
  const accounts=await api('https://iam.googleapis.com/v1/projects/'+project+'/serviceAccounts');
  if(!accounts.accounts?.some(x=>x.email===email))await api('https://iam.googleapis.com/v1/projects/'+project+'/serviceAccounts',{accountId:'atlas-partner-sync',serviceAccount:{displayName:'Atlas partner Firestore projection'}});
  const resource='https://cloudresourcemanager.googleapis.com/v1/projects/'+project;
  const policy=await api(resource+':getIamPolicy',{options:{requestedPolicyVersion:3}});
  const member='serviceAccount:'+email;let role=policy.bindings?.find(x=>x.role==='roles/datastore.user'&&!x.condition);
  if(!role?.members.includes(member)){
    policy.bindings??=[];if(!role){role={role:'roles/datastore.user',members:[]};policy.bindings.push(role);}role.members.push(member);
    await api(resource+':setIamPolicy',{policy});
  }
  let credential;
  try{credential=JSON.parse(await readFile(join(directory,'service-account.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!credential){
    const key=await api('https://iam.googleapis.com/v1/projects/'+project+'/serviceAccounts/'+email+'/keys',{privateKeyType:'TYPE_GOOGLE_CREDENTIALS_FILE',keyAlgorithm:'KEY_ALG_RSA_2048'});
    credential=JSON.parse(Buffer.from(key.privateKeyData,'base64').toString('utf8'));
    if(credential.project_id!==project||credential.client_email!==email)throw Error('Unexpected service identity');
    await writeFile(join(directory,'service-account.json'),JSON.stringify(credential),{mode:0o600,flag:'wx'});
  }
  let secret;
  try{secret=await readFile(join(directory,'identity-secret.txt'),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;secret=randomBytes(32).toString('hex');await writeFile(join(directory,'identity-secret.txt'),secret,{mode:0o600,flag:'wx'});}
  await writeFile(join(directory,'worker-secrets.json'),JSON.stringify({PARTNER_HASH_SECRET:secret,PARTNER_FIRESTORE_SERVICE_ACCOUNT:JSON.stringify(credential)}),{mode:0o600});
  await writeFile(new URL('../.worker-private/partner-private-path.txt',import.meta.url),directory,{mode:0o600});
  console.log('Dedicated same-project Firestore identity configured with datastore.user only. Partner secrets prepared in a current-user/SYSTEM-only directory. Values omitted; nothing uploaded to Cloudflare yet.');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{cleanup();}
