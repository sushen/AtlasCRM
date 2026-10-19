import {mkdir,writeFile} from 'node:fs/promises';
import {paymentConfiguration} from '../server/payments/config.mjs';
const enable=process.argv.includes('--enable');
if(process.argv.slice(2).some(arg=>arg!=='--enable'))throw Error('Use no arguments to prepare disabled bindings, or --enable after QR/link configuration');
// Worker cannot read a laptop file path. Never upload it or bundle QR bytes.
const config=paymentConfiguration({...process.env,BINANCE_PAY_QR_PATH:'',MANUAL_CHECKOUT_ENABLED:String(enable)});
if(enable&&!config.qrFileId&&!config.paymentLink)throw Error('Workers require the receiving QR file ID or a verified payment link');
const bindings={MANUAL_CHECKOUT_ENABLED:String(enable),PAYMENT_PROVIDER:config.provider,PAYMENT_MODE:config.mode,
  BINANCE_PAY_UID:config.uid,BINANCE_PAY_NAME:config.payName,PAYMENT_CURRENCY:config.currency,PAYMENT_DECIMALS:String(config.decimals),
  PAYMENT_USD_USDT_RATE:config.usdUsdtRate,PAYMENT_VERIFICATION_MODE:config.verificationMode,PAYMENT_DELIVERY_MODE:config.deliveryMode,
  BINANCE_PAY_QR_FILE_ID:config.qrFileId,BINANCE_PAY_PAYMENT_LINK:config.paymentLink,BINANCE_PAY_LINK_VERIFIED:String(config.linkVerified)};
await mkdir(new URL('../.worker-private/',import.meta.url),{recursive:true});
await writeFile(new URL('../.worker-private/manual-payment-bindings.json',import.meta.url),JSON.stringify(bindings),{mode:0o600});
console.log('Private Worker payment bindings prepared locally. Checkout enabled in prepared file: '+enable+'. Nothing uploaded/deployed. Receiving values omitted.');
