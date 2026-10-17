import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';
import { supplierConfiguration } from '../server/catalog-settings.mjs';

// Local files only. Does not upload secrets, deploy or register a webhook.
const path=new URL('../.env',import.meta.url);
let text=await readFile(path,'utf8');
const values=parseEnv(text);
for(const name of ['TELEGRAM_WEBHOOK_SECRET','ATLAS_ADMIN_TOKEN']) {
  if(!values[name]){values[name]=randomBytes(32).toString('hex');text+='\n'+name+'='+values[name];}
}
await writeFile(path,text.trimEnd()+'\n',{mode:0o600});
const supplier=supplierConfiguration(values);
const local={CANBOSS_BUYER_API_KEY:supplier.key,CANBOSS_API_BASE_URL:supplier.baseUrl,
  TELEGRAM_BOT_TOKEN:values.TELEGRAM_BOT_TOKEN||'',TELEGRAM_CATALOG_CHAT_IDS:values.TELEGRAM_CATALOG_CHAT_IDS||'-5513909100',
  TELEGRAM_GROUP_URL:values.TELEGRAM_GROUP_URL||'',TELEGRAM_WEBHOOK_SECRET:values.TELEGRAM_WEBHOOK_SECRET,
  ATLAS_ADMIN_TOKEN:values.ATLAS_ADMIN_TOKEN,TELEGRAM_BOT_USERNAME:'AtlasCrmMarketBot',TELEGRAM_BOT_ENABLED:'false',
  CATALOG_ALLOWED_ORIGINS:'https://atlascrm-c5722.web.app,https://atlascrm-c5722.firebaseapp.com,http://127.0.0.1:3100',
  FIREBASE_PROJECT_ID:'atlascrm-c5722',CATALOG_PUBLIC_ENABLED:'true'};
await writeFile(new URL('../.dev.vars',import.meta.url),Object.entries(local).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n',{mode:0o600});
console.log('Private local secrets prepared in ignored .env/.dev.vars. Values omitted. No Cloudflare changes made.');
