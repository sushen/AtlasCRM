import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const root=join(import.meta.dirname,'..');
const names=new Set(['CANBOSS_BUYER_API_KEY','CANBOSO_BUYER_API_KEY','TELEGRAM_BOT_TOKEN','TELEGRAM_WEBHOOK_SECRET','ATLAS_ADMIN_TOKEN',
  'BINANCE_PAY_UID','BINANCE_PAY_NAME','BINANCE_PAY_QR_FILE_ID']);
const env=await readFile(join(root,'.env'),'utf8');
const secrets=env.split(/\r?\n/).flatMap(line=>{
  const index=line.indexOf('=');const name=line.slice(0,index).trim();
  if(index<0||!names.has(name))return [];
  const value=line.slice(index+1).trim().replace(/^(['"])(.*)\1$/,'$2');
  return value.length>=8?[[name,value]]:[];
});
async function files(path) {
  const entries=await readdir(path,{withFileTypes:true});const result=[];
  for(const item of entries) {const full=join(path,item.name);result.push(...(item.isDirectory()?await files(full):[full]));}
  return result;
}
const targets=[...await files(join(root,'js')),...await files(join(root,'css')),...await files(join(root,'.worker-build')),
  ...['index.html','login.html','404.html'].map(name=>join(root,name))];
try{targets.push(...await files(join(root,'.firebase/hosting-public')));}catch(error){if(error.code!=='ENOENT')throw error;}
let leaks=0;
for(const file of targets) {
  const content=await readFile(file,'utf8');
  for(const [name,value] of secrets) if(content.includes(value)) {console.error('Private value detected for '+name+' in '+file);leaks++;}
}
if(leaks)process.exitCode=1;
else console.log('No configured Market secret values found in browser assets or Worker bundle. Values omitted.');
