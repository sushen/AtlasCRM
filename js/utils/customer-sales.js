import {normalizePhone} from './phone.js';

export const businessDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function validDate(value) {
  const date=new Date(value+'T00:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function prepareCustomerPurchase(input) {
  const productName=String(input.productName||'').trim();
  if(!productName||productName.length>200)throw Error('Enter a product name (up to 200 characters).');
  if(!input.customerId)throw Error('Select a customer first.');
  const amount=Number(input.amount),paidAmount=Number(input.paidAmount);
  if(String(input.amount??'').trim()===''||!Number.isFinite(amount)||amount<0||amount>1e9)throw Error('Enter a valid total price.');
  if(String(input.paidAmount??'').trim()===''||!Number.isFinite(paidAmount)||paidAmount<0||paidAmount>amount)throw Error('Amount paid must be between zero and the total price.');
  const currency=String(input.currency||'').trim().toUpperCase();
  if(!['BDT','USD','USDT'].includes(currency))throw Error('Select BDT, USD or USDT.');
  for(const field of ['purchasedAt','startDate'])if(!validDate(input[field]))throw Error('Enter valid purchase and start dates.');
  if(input.expiryDate&&(!validDate(input.expiryDate)||input.expiryDate<input.startDate))throw Error('Expiry must be on or after the start date.');
  const notes=String(input.notes||'').trim();if(notes.length>5000)throw Error('Keep notes within 5000 characters.');
  return {customerId:input.customerId,productId:input.productId||null,productName,
    amount,paidAmount,currency,paymentStatus:paidAmount===amount?'paid':paidAmount===0?'pending':'partial',
    purchasedAt:input.purchasedAt,startDate:input.startDate,expiryDate:input.expiryDate||null,notes};
}
export function customerMatches(customer,query) {
  const q=String(query||'').trim().toLowerCase();if(!q)return true;
  if([customer.name,customer.phone,customer.normalizedPhone,customer.whatsappNumber,customer.whatsappUsername,customer.normalizedWhatsAppUsername,customer.notes,...(customer.tags||[])].some(value=>String(value||'').toLowerCase().includes(q)))return true;
  const phone=/^@|[a-z_]/i.test(q)?null:normalizePhone(q);
  return Boolean(phone&&[customer.phone,customer.normalizedPhone,customer.whatsappNumber].some(value=>normalizePhone(value)===phone));
}
export function productAccessStatus(record,today=businessDate()) {
  if(['cancelled','renewed'].includes(record.status))return record.status;
  if(record.expiryUnknown===true)return 'Access term not recorded';
  if(record.startDate>today)return 'Upcoming';
  if(!record.expiryDate)return record.startDate?'No expiry':'Dates not recorded';
  if(record.expiryDate<today)return 'Expired';
  const days=(Date.parse(record.expiryDate)-Date.parse(today))/86400000;
  return days<=7?'Expiring soon':'Active';
}
export function customerSalesSummary(purchases) {
  const totals=new Map();let count=0,unrecordedPayments=0;
  for(const purchase of purchases){
    if(['refunded','cancelled'].includes(purchase.paymentStatus))continue;
    count++;
    if(purchase.paidAmount===null||purchase.paymentStatus==='paid_amount_unknown'){unrecordedPayments++;continue;}
    const currency=String(purchase.currency||'BDT').toUpperCase();
    const amount=Number(purchase.amount);
    const paid=purchase.paidAmount!==undefined?Number(purchase.paidAmount):purchase.paymentStatus==='paid'?amount:0;
    const total=totals.get(currency)||{currency,spent:0,outstanding:0,unknownPayments:0};
    if(Number.isFinite(paid)&&paid>=0)total.spent+=paid;
    if(!(purchase.paymentStatus==='partial'&&purchase.paidAmount===undefined)&&Number.isFinite(amount)&&amount>=0&&Number.isFinite(paid)&&paid>=0)total.outstanding+=Math.max(0,amount-paid);
    if(purchase.paymentStatus==='partial'&&purchase.paidAmount===undefined)total.unknownPayments++;
    totals.set(currency,total);
  }
  return {purchaseCount:count,totals:[...totals.values()],...(unrecordedPayments?{unrecordedPayments}:{})};
}
export const formatMoney=(amount,currency)=>amount==null||!Number.isFinite(Number(amount))?'Not recorded':`${Number(amount).toLocaleString(undefined,{maximumFractionDigits:2})} ${currency}`;
