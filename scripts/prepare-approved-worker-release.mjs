import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parseEnv } from 'node:util';
import { supplierConfiguration } from '../server/catalog-settings.mjs';

// Local review/snapshot only. Never print values from dashboard bindings.
const root=new URL('../',import.meta.url);
const prior=JSON.parse(await readFile(new URL('.worker-private/prior-version.json',root),'utf8'));
const account=JSON.parse(await readFile(new URL('.worker-private/account.json',root),'utf8'));
if(account.accounts?.length!==1)throw Error('Select the correct Cloudflare account before release');
const bindings=Object.fromEntries(prior.resources.bindings.map(b=>[b.name,b.text]));
const local=parseEnv(await readFile(new URL('.env',root),'utf8'));
if(supplierConfiguration(bindings).key!==supplierConfiguration(local).key)throw Error('Supplier key differs between dashboard and local configuration');
if(bindings.TELEGRAM_BOT_TOKEN!==local.TELEGRAM_BOT_TOKEN)throw Error('Bot token differs between dashboard and local configuration');
const toml=await readFile(join(homedir(),'AppData/Roaming/xdg.config/.wrangler/config/default.toml'),'utf8');
const token=/^oauth_token\s*=\s*"([^"]+)"/m.exec(toml)?.[1];
if(!token)throw Error('Wrangler login unavailable');
const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account.accounts[0].id}/workers/scripts/atlas`,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error('Could not snapshot existing atlas source');
const source=await response.text();
await writeFile(new URL('.worker-private/prior-worker-source.txt',root),source,{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
// Convert the existing readable dashboard credentials to encrypted bindings too.
const secrets={CANBOSO_BUYER_API_KEY:bindings.CANBOSO_BUYER_API_KEY,TELEGRAM_BOT_TOKEN:bindings.TELEGRAM_BOT_TOKEN};
for(const name of ['ATLAS_ADMIN_TOKEN','TELEGRAM_WEBHOOK_SECRET']) {
  if(!/^[A-Za-z0-9_-]{32,256}$/.test(local[name]||''))throw Error('Missing valid '+name);
  secrets[name]=local[name];
}
await writeFile(new URL('.worker-private/release-secrets.json',root),JSON.stringify(secrets),{mode:0o600});
console.log('Existing atlas source saved privately; supplier/bot bindings match local setup. Encrypted release bindings prepared. Values omitted.');
console.log('Existing source is '+(source.includes('Hello World')?'a Hello World starter.':'saved for review; inspect privately before deployment.'));
