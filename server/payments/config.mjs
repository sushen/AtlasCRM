export class PaymentConfigurationError extends Error {}
const fail=message=>{throw new PaymentConfigurationError(message);};
export function paymentConfiguration(env={}) {
  const config={enabled:env.MANUAL_CHECKOUT_ENABLED==='true',provider:env.PAYMENT_PROVIDER||'binance_pay',mode:env.PAYMENT_MODE||'manual',
    uid:String(env.BINANCE_PAY_UID||''),payName:String(env.BINANCE_PAY_NAME||''),currency:env.PAYMENT_CURRENCY||'USDT',
    decimals:Number(env.PAYMENT_DECIMALS||6),usdUsdtRate:env.PAYMENT_USD_USDT_RATE||'',verificationMode:env.PAYMENT_VERIFICATION_MODE||'admin_manual',
    deliveryMode:env.PAYMENT_DELIVERY_MODE||'admin_manual',qrFileId:env.BINANCE_PAY_QR_FILE_ID||'',qrPath:env.BINANCE_PAY_QR_PATH||'',
    qrSha256:env.BINANCE_PAY_QR_SHA256||'',paymentLink:env.BINANCE_PAY_PAYMENT_LINK||'',linkVerified:env.BINANCE_PAY_LINK_VERIFIED==='true'};
  if(config.provider!=='binance_pay'||config.mode!=='manual'||config.verificationMode!=='admin_manual'||config.deliveryMode!=='admin_manual')fail('Only manually verified Binance Pay configuration is implemented');
  if(!/^[A-Z]{3,8}$/.test(config.currency)||!Number.isInteger(config.decimals)||config.decimals<0||config.decimals>8)fail('Invalid payment currency or precision');
  if(config.usdUsdtRate&&(!/^\d+(?:\.\d{1,8})?$/.test(config.usdUsdtRate)||Number(config.usdUsdtRate)<=0||Number(config.usdUsdtRate)>1000000))fail('Configure a positive explicit USD to USDT rate');
  if(config.uid&&!/^\d{1,24}$/.test(config.uid))fail('Invalid receiving UID');
  if(config.payName.length>100||/[\r\n\x00-\x1f]/.test(config.payName))fail('Invalid receiving account name');
  if(config.qrFileId&&!/^[A-Za-z0-9_-]{16,512}$/.test(config.qrFileId))fail('Invalid receiving QR Telegram file reference');
  if(config.qrSha256&&!/^[a-f0-9]{64}$/.test(config.qrSha256))fail('Invalid receiving QR checksum');
  if(config.paymentLink) {
    let url;try{url=new URL(config.paymentLink);}catch{fail('Invalid payment link');}
    if(url.protocol!=='https:'||!['pay.binance.com','app.binance.com'].includes(url.hostname)||url.port||url.username||url.password||url.hash||!config.linkVerified)fail('Payment links require a verified HTTPS Binance URL');
  }
  if(config.enabled&&(!config.uid||!config.payName||(!config.qrPath&&!config.qrFileId&&!config.paymentLink)))fail('Receiving identity and QR image/file reference or verified payment link are required');
  if(config.enabled&&config.qrPath&&!config.qrFileId&&!config.paymentLink&&!config.qrSha256)fail('Prepare the receiving QR checksum before enabling local checkout');
  return Object.freeze(config);
}
