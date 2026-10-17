// Telegram presentation uses the immutable order quote, never current receiving settings.
const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function paymentCopyAmount(order) {
  return new Intl.NumberFormat('en-US',{useGrouping:false,minimumFractionDigits:2,maximumFractionDigits:Math.max(2,order.paymentQuote?.decimals??6)}).format(order.totalAmount);
}
export function paymentCopyRows(order) {
  const q=order.paymentQuote;
  return [[{text:'📋 Copy Binance ID',copy_text:{text:q.receivingUid}},{text:'📋 Copy recipient name',copy_text:{text:q.receivingName}}],
    [{text:'📋 Copy amount',copy_text:{text:paymentCopyAmount(order)}},{text:'📋 Copy order ID',copy_text:{text:order.id}}]];
}
export function paymentInstructionText(order) {
  const q=order.paymentQuote;
  return ['<b>💳 Binance Pay</b>','<i>Payment details · manual review</i>','',
    '<b>'+html(order.product.name)+'</b>','Order: <code>'+html(order.id)+'</code>','',
    '<b>Amount to send</b>','<code>'+html(paymentCopyAmount(order))+'</code> <b>'+html(order.currency)+'</b>','',
    '<b>Recipient name</b>','<code>'+html(q.receivingName)+'</code>','',
    '<b>Binance Pay ID</b>','<code>'+html(q.receivingUid)+'</code>','',
    '<b>How to pay</b>',
    '1. Open Binance Pay. Scan the QR or use the Binance Pay ID above.',
    '2. Check the recipient and send the exact amount in '+html(order.currency)+'.',
    '3. Return here, tap <b>I Have Paid</b>, and send the transaction reference.','',
    '<i>Use Binance Pay, not an on-chain transfer. Copy buttons are below; you can also select the individual values.</i>','',
    '⏳ Your reference goes to admin for verification. Delivery follows manual payment approval.',
    '<i>Price valid for 24 hours from order creation. Stock is not reserved; confirm availability before paying.</i>'
  ].join('\n');
}
export function paymentQrCaption(order) {
  return '<b>Scan with Binance Pay</b>\n\n<b>'+html(paymentCopyAmount(order))+' '+html(order.currency)+'</b>\nRecipient: '+html(order.paymentQuote.receivingName)+'\nOrder: <code>'+html(order.id)+'</code>\n\nCheck the recipient and amount in Binance before confirming.';
}

export function paymentReferencePrompt(order) {
  return ['<b>📩 Paste your Binance Pay transaction ID</b>','',
    'Open your completed payment in Binance Pay and copy its transaction ID (payment reference).','',
    '<b>Paste that ID here and send it as your next message.</b>','',
    'Order: <code>'+html(order.id)+'</code>','',
    '⏳ Admin will check the actual received payment manually and update your order.',
    '<i>Submitting an ID does not confirm payment. Never send your password or verification codes.</i>'
  ].join('\n');
}
export function paymentReferenceReceipt(order,changed) {
  const waiting=['PAYMENT_SUBMITTED','PAYMENT_UNDER_REVIEW'].includes(order.paymentStatus);
  const status={PAYMENT_SUBMITTED:'Awaiting manual verification',PAYMENT_UNDER_REVIEW:'Under manual review',PAYMENT_VERIFIED:'Payment confirmed by admin',PAYMENT_REJECTED:'Payment review rejected',CANCELLED:'Order cancelled'}[order.paymentStatus]||'Check your order status';
  return ['<b>📨 '+(changed?'Payment reference received':'Payment reference already saved')+'</b>','',
    '<b>Status: '+status+'</b>','',
    'Order: <code>'+html(order.id)+'</code>',
    'Transaction ID: <code>'+html(order.submittedTransactionId)+'</code>','',
    waiting?'Admin will check your received payment and update this order. Please wait for confirmation.':'The existing order status is shown above. Contact admin if you need help.',
    '<i>This receipt confirms your submission, not your payment.</i>'
  ].join('\n');
}
