import { readFile,writeFile } from 'node:fs/promises';
import { telegramGroupUrl } from '../server/catalog-settings.mjs';
const value=telegramGroupUrl(process.argv[2]||'');
if(!value)throw Error('Provide the Telegram destination URL');
for(const file of ['.env','.dev.vars']) {
  const url=new URL('../'+file,import.meta.url);
  let source;
  try {source=await readFile(url,'utf8');}catch(error){if(error.code==='ENOENT')continue;throw error;}
  const line='TELEGRAM_GROUP_URL='+JSON.stringify(value);
  const updated=/^TELEGRAM_GROUP_URL=.*$/m.test(source)?source.replace(/^TELEGRAM_GROUP_URL=.*$/m,line):source.trimEnd()+'\n'+line+'\n';
  await writeFile(url,updated,{mode:0o600});
}
console.log('Saved local Telegram destination updated; secrets and approved chat IDs preserved. Running services were not restarted.');
