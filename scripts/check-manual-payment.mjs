import {paymentConfiguration} from '../server/payments/config.mjs';
import {loadLocalPaymentQr} from '../server/payments/local-qr.mjs';
const config=paymentConfiguration(process.env);
const localQr=config.qrPath?await loadLocalPaymentQr(config.qrPath,config.qrSha256):null;
console.log(JSON.stringify({enabled:config.enabled,provider:config.provider,mode:config.mode,currency:config.currency,explicitConversionConfigured:Boolean(config.usdUsdtRate),
  receivingUidConfigured:Boolean(config.uid),receivingNameConfigured:Boolean(config.payName),localQrValid:Boolean(localQr),
  workerQrFileConfigured:Boolean(config.qrFileId),verifiedPaymentLinkConfigured:Boolean(config.paymentLink&&config.linkVerified),verification:'admin_manual',delivery:'admin_manual'}));
