import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {shopContactUrl} from '../server/telegram-shop.mjs';
const env=parseEnv(await readFile(new URL('../.env',import.meta.url),'utf8'));
if(!/^\d+(,\d+)*$/.test(env.TELEGRAM_SHOP_ADMIN_IDS||''))throw Error('Inspect/select the channel owner first');
if(!shopContactUrl(env.TELEGRAM_SHOP_SUPPORT_URL||''))throw Error('Configure shop public contact');
await mkdir(new URL('../.worker-private/',import.meta.url),{recursive:true});
await writeFile(new URL('../.worker-private/shop-bindings.json',import.meta.url),JSON.stringify({TELEGRAM_SHOP_ADMIN_IDS:env.TELEGRAM_SHOP_ADMIN_IDS,TELEGRAM_SHOP_SUPPORT_URL:env.TELEGRAM_SHOP_SUPPORT_URL}),{mode:0o600});
console.log('Private shop admin/contact bindings prepared locally. Nothing uploaded.');
