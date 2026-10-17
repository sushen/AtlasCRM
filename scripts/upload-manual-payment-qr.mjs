import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {loadLocalPaymentQr} from '../server/payments/local-qr.mjs';
// Explicit external write: NEVER run as part of preparation/tests. Sends QR to admin.
if(process.argv[2]!=='upload')throw Error('Use upload only after approval to send the receiving QR to the configured private admin');
const env=parseEnv(await readFile(new URL('../.env',import.meta.url),'utf8'));
if(!/^\d+$/.test(env.TELEGRAM_SHOP_ADMIN_IDS||''))throw Error('Exactly one approved private admin is required');
const form=new FormData();form.set('chat_id',env.TELEGRAM_SHOP_ADMIN_IDS);form.set('photo',await loadLocalPaymentQr(env.BINANCE_PAY_QR_PATH,env.BINANCE_PAY_QR_SHA256),'receiving-qr.jpg');
form.set('caption','Atlas receiving QR configuration — confirm recipient in your Binance Pay app before activating checkout. This is not a payment.');
try {
  const response=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendPhoto',{method:'POST',body:form,redirect:'manual',signal:AbortSignal.timeout(20000)});
  const result=await response.json();const fileId=result.result?.photo?.at(-1)?.file_id;
  if(!response.ok||!result.ok||!fileId)throw Error('Upload not confirmed');
  for(const file of ['.env','.dev.vars']) {
    const path=new URL('../'+file,import.meta.url);let text=await readFile(path,'utf8');const line='BINANCE_PAY_QR_FILE_ID='+JSON.stringify(fileId);
    text=/^BINANCE_PAY_QR_FILE_ID=.*$/m.test(text)?text.replace(/^BINANCE_PAY_QR_FILE_ID=.*$/m,()=>line):text.trimEnd()+'\n'+line+'\n';await writeFile(path,text,{mode:0o600});
  }
  console.log('Receiving QR sent to the approved private admin and file reference saved locally. Checkout/deployment unchanged; file ID omitted.');
}catch{console.error('QR upload not confirmed; inspect the admin chat before retrying an uncertain send. Private/provider details omitted.');process.exitCode=1;}
