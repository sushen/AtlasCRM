import {readFile,writeFile,mkdir,copyFile,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseEnv} from 'node:util';
import {paymentConfiguration} from '../server/payments/config.mjs';
const args=process.argv.slice(2);const options={};
for(let i=0;i<args.length;i+=2){if(!['--qr','--uid','--name','--usd-usdt-rate'].includes(args[i])||!args[i+1])throw Error('Use --qr FILE --uid RECEIVER_UID --name RECEIVER_NAME --usd-usdt-rate RATE');options[args[i].slice(2)]=args[i+1];}
if(!options.qr||!options.uid||!options.name||!options['usd-usdt-rate'])throw Error('Receiving QR, UID, name and explicit conversion rate are required');
const root=new URL('../',import.meta.url),directory=new URL('.payment-private/',root);
const source=await readFile(resolve(options.qr));
if(source.length>5*1024*1024||source[0]!==255||source[1]!==216)throw Error('Provide the original receiving QR JPEG (under 5 MiB)');
await mkdir(directory,{recursive:true});if((await lstat(directory)).isSymbolicLink())throw Error('Payment directory cannot be a symlink');
if(process.platform==='win32')execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('private-payment-runtime.ps1',import.meta.url)),'-Directory',fileURLToPath(directory)],{windowsHide:true,stdio:'pipe'});
const target=new URL('binance-pay-receiving.jpg',directory),digest=createHash('sha256').update(source).digest('hex');
try{await copyFile(resolve(options.qr),target,constants.COPYFILE_EXCL);}catch(error){if(error.code!=='EEXIST')throw error;if(createHash('sha256').update(await readFile(target)).digest('hex')!==digest)throw Error('Existing receiving image differs; do not overwrite payment assets blindly');}
const settings={MANUAL_CHECKOUT_ENABLED:'false',PAYMENT_PROVIDER:'binance_pay',PAYMENT_MODE:'manual',BINANCE_PAY_UID:options.uid,BINANCE_PAY_NAME:options.name,
  PAYMENT_CURRENCY:'USDT',PAYMENT_DECIMALS:'6',PAYMENT_USD_USDT_RATE:options['usd-usdt-rate'],PAYMENT_VERIFICATION_MODE:'admin_manual',PAYMENT_DELIVERY_MODE:'admin_manual',
  BINANCE_PAY_QR_PATH:fileURLToPath(target),BINANCE_PAY_QR_SHA256:digest};
paymentConfiguration({...settings,MANUAL_CHECKOUT_ENABLED:'true'});
for(const file of ['.env','.dev.vars']) {
  const path=new URL(file,root);let text='';try{text=await readFile(path,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  const previous=parseEnv(text);for(const name of ['BINANCE_PAY_QR_FILE_ID','BINANCE_PAY_PAYMENT_LINK','BINANCE_PAY_LINK_VERIFIED'])settings[name]=previous[name]|| (name==='BINANCE_PAY_LINK_VERIFIED'?'false':'');
  for(const[name,value]of Object.entries(settings)){const line=name+'='+JSON.stringify(value),pattern=new RegExp('^'+name+'=.*$','m');text=pattern.test(text)?text.replace(pattern,()=>line):text.trimEnd()+'\n'+line+'\n';}
  await writeFile(path,text,{mode:0o600});
}
await writeFile(new URL('qr-manifest.json',directory),JSON.stringify({sha256:digest,bytes:source.length,source:'user-supplied receiving QR; not a verified payment link'}),{mode:0o600});
console.log('Receiving QR copied byte-for-byte into ignored private storage; local payment settings prepared with checkout DISABLED. No upload, messages, provider API call or production change.');
