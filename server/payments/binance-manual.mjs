import {PaymentConfigurationError} from './config.mjs';

export class PaymentProvider {
  createPaymentInstructions(){throw Error('Provider not implemented');}
  submitPaymentReference(){throw Error('Provider not implemented');}
  getPaymentStatus(){throw Error('Provider not implemented');}
  verifyPayment(){throw Error('Provider not implemented');}
}
function fraction(value) {
  const text=String(value);
  if(!/^\d+(?:\.\d{1,8})?$/.test(text))throw new PaymentConfigurationError('Amount/rate exceeds supported precision');
  const [whole,part='']=text.split('.');return [BigInt(whole+part),10n**BigInt(part.length)];
}
export function formatPaymentAmount(amount,currency,decimals=6) {
  return new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:Math.max(2,decimals)}).format(amount)+' '+currency;
}
export class BinanceManualPaymentProvider extends PaymentProvider {
  constructor(config,orders,{loadQr}={}){super();this.config=config;this.orders=orders;this.loadQr=loadQr;this.enabled=config.enabled;}
  quote(product,quantity=1) {
    if(!this.enabled)throw new PaymentConfigurationError('Manual checkout is disabled');
    if(!this.config.qrFileId&&!this.config.paymentLink&&(!this.config.qrPath||!this.loadQr))throw new PaymentConfigurationError('Receiving QR is not configured for this runtime');
    if(quantity!==1)throw new PaymentConfigurationError('Select one product unit per order');
    let rate='1';
    if(product.currency!==this.config.currency) {
      if(product.currency!=='USD'||this.config.currency!=='USDT'||!this.config.usdUsdtRate)throw new PaymentConfigurationError('No explicit conversion rate is configured for this listing');
      rate=this.config.usdUsdtRate;
    }
    const [amount,amountScale]=fraction(product.price),[factor,factorScale]=fraction(rate);
    const scale=10n**BigInt(this.config.decimals),denominator=amountScale*factorScale;
    const minor=(amount*factor*scale+denominator/2n)/denominator;
    if(minor<=0n||minor>BigInt(Number.MAX_SAFE_INTEGER))throw new PaymentConfigurationError('Payment amount is out of range');
    return {provider:'binance_pay',mode:'manual',currency:this.config.currency,decimals:this.config.decimals,unitPrice:Number(minor)/Number(scale),
      totalAmount:Number(minor)/Number(scale),totalMinor:minor.toString(),quantity,sourceCurrency:product.currency,sourceUnitPrice:product.price,conversionRate:rate,
      receivingUid:this.config.uid,receivingName:this.config.payName,paymentLink:this.config.paymentLink||null,qrFileId:this.config.qrFileId||null,qrSha256:this.config.qrSha256||null,
      verificationMode:'admin_manual',deliveryMode:'admin_manual'};
  }
  async createPaymentInstructions(order) {
    if(!this.enabled)throw new PaymentConfigurationError('Checkout instructions are paused; contact admin');
    const quote=order.paymentQuote;
    if(!quote||quote.provider!=='binance_pay')throw new PaymentConfigurationError('This older order uses its original manual contact instructions');
    if(order.paymentStatus!=='PENDING_PAYMENT'||order.deliveryStatus==='DELIVERED'||order.quoteUntil<this.orders.now())throw new PaymentConfigurationError('This order is not awaiting payment; contact admin');
    let photo=quote.qrFileId;
    if(!photo&&this.config.qrPath&&this.loadQr&&quote.qrSha256) {
      try{photo=await this.loadQr(this.config.qrPath,quote.qrSha256);}catch{throw new PaymentConfigurationError('Receiving QR is unavailable or changed. Contact admin before paying.');}
    }
    if(!photo&&!quote.paymentLink)throw new PaymentConfigurationError('Receiving QR is not configured for this runtime; contact admin');
    return {photo,paymentLink:quote.paymentLink,text:['Binance Pay • manual payment review','Order '+order.id,order.product.name,
      'Amount: '+formatPaymentAmount(order.totalAmount,order.currency,quote.decimals),'Receiving name: '+quote.receivingName,'Receiving UID: '+quote.receivingUid,
      'Scan the receiving QR using Binance Pay. Check the receiving name, UID, currency and exact amount before confirming.',
      'Use Binance Pay, not an on-chain deposit address. The QR does not prefill or prove an order payment.',
      'After paying, tap I Have Paid and submit the Binance Pay transaction reference.',
      'A reference or screenshot is unverified evidence. Only admin can confirm received funds. Delivery is manual.'].join('\n')};
  }
  submitPaymentReference(id,buyer,reference,evidence){return this.orders.submitReference(id,buyer,reference,{evidence});}
  async getPaymentStatus(id,buyer){const order=await this.orders.getForBuyer(id,buyer);return {orderId:order.id,paymentStatus:order.paymentStatus,deliveryStatus:order.deliveryStatus};}
  verifyPayment(id,admin,decision,note='',expectedVersion){
    if(!['approve','reject'].includes(decision))throw new PaymentConfigurationError('A human must explicitly approve or reject payment');
    return this.orders.review(id,admin,decision,note,{expectedVersion});
  }
}
