import {ORDER_ID,PAYMENT_STATUS,ShopError,normalizeOrder} from './shop-orders.mjs';
import {PaymentConfigurationError} from './payments/config.mjs';
import {formatPaymentAmount} from './payments/binance-manual.mjs';
import {paymentCopyRows,paymentInstructionText,paymentQrCaption,paymentReferencePrompt,paymentReferenceReceipt} from './payments/presentation.mjs';

export function paymentOrderSummary(raw) {
  const order=normalizeOrder(raw);
  const status={PENDING_PAYMENT:'Awaiting payment',PAYMENT_SUBMITTED:'Payment submitted — not yet verified',PAYMENT_UNDER_REVIEW:'Payment under human review',
    PAYMENT_VERIFIED:'Payment confirmed by admin — awaiting fulfillment',PAYMENT_REJECTED:'Payment review rejected — contact admin',CANCELLED:'Cancelled'}[order.paymentStatus];
  return ['Order '+order.id,order.product.name,'Amount: '+formatPaymentAmount(order.totalAmount,order.currency,order.paymentQuote?.decimals||2),
    'Quantity: '+order.quantity,order.deliveryStatus==='DELIVERED'?'Fulfilled by admin':status,'Delivery: '+order.deliveryStatus,
    'Reference: '+order.product.id].join('\n');
}
const reviewable=order=>[PAYMENT_STATUS.SUBMITTED,PAYMENT_STATUS.REVIEW].includes(order.paymentStatus);
const photoEvidence=message=>{
  const photo=message.photo?.at(-1);return photo?{fileId:photo.file_id,fileUniqueId:photo.file_unique_id,messageId:message.message_id,fileSize:photo.file_size}:undefined;
};
export class ManualCheckoutConversation {
  constructor({orders,api,catalog,payments,adminIds,supportUrl}) {
    Object.assign(this,{orders,api,catalog,payments,supportUrl});this.admins=new Set(adminIds.map(String));
  }
  send(chat,text,rows,extra={}) {
    return this.api.call('sendMessage',{chat_id:chat,text,...(rows?.length?{reply_markup:{inline_keyboard:rows}}:{}),...extra,link_preview_options:{is_disabled:true}});
  }
  contact(){return this.supportUrl?[[{text:'Contact admin',url:this.supportUrl}]]:[];}
  checkoutButtons(order) {
    if(order.paymentStatus===PAYMENT_STATUS.PENDING)return [[{text:'Pay with Binance',callback_data:'pay:'+order.id}],
      [{text:'I Have Paid',callback_data:'paid:'+order.id}],[{text:'Cancel Order',callback_data:'cancel:'+order.id}],...this.contact()];
    if(reviewable(order))return [[{text:'Add payment screenshot',callback_data:'evidence:'+order.id}],[{text:'Send additional information',callback_data:'information:'+order.id}],...this.contact()];
    return this.contact();
  }
  instructionRows(order,instructions) {
    return [...paymentCopyRows(order),...(instructions.paymentLink?[[{text:'Open verified Binance payment link',url:instructions.paymentLink}]]:[]),...this.checkoutButtons(order)];
  }
  async notifyAdmins(order) {
    const text=[paymentOrderSummary(order),'Customer Telegram ID: '+order.buyer,
      order.telegramUsername?'Customer username: @'+order.telegramUsername:'Customer username: not provided',
      'Submitted transaction ID: '+(order.submittedTransactionId||'Not submitted'),
      'Submitted at: '+(order.submittedAt?new Date(order.submittedAt).toISOString():'Not submitted'),
      order.buyerInformation?'Additional information: '+order.buyerInformation:'',order.quoteExpiredAtSubmission?'WARNING: quote expired before reference submission. Confirm amount with buyer.':'',
      'Unverified buyer evidence. Compare the actual received amount, currency, receiving account, reference, status and transaction history.'].filter(Boolean).join('\n');
    for(const admin of this.admins) {
      try {
        if(order.paymentScreenshotReference)await this.api.call('sendPhoto',{chat_id:Number(admin),photo:order.paymentScreenshotReference,caption:'Buyer-submitted evidence • '+order.id+' • not proof of payment'});
        await this.send(Number(admin),text,[[{text:'Review payment',callback_data:'review:show:'+order.id}]]);
      }catch{/* State is committed; /orders recovers missed/uncertain notifications. */}
    }
  }
  async submit(buyer,id,reference,evidence) {
    const result=await this.payments.submitPaymentReference(id,buyer,reference,evidence);
    await this.send(buyer,paymentReferenceReceipt(result.order,result.changed),this.checkoutButtons(result.order),{parse_mode:'HTML'});
    if(result.changed)await this.notifyAdmins(result.order);return true;
  }
  async showReview(admin,id) {
    let order=await this.orders.getForAdmin(id,admin);
    if(reviewable(order)) {
      const result=await this.orders.review(id,admin,'under_review');order=result.order;
      if(result.changed)await this.send(order.buyer,paymentOrderSummary(order)+'\nAn authorized administrator is reviewing your submitted information.');
    }
    if(order.paymentScreenshotReference)await this.api.call('sendPhoto',{chat_id:admin,photo:order.paymentScreenshotReference,caption:'Submitted payment screenshot • unverified • '+id});
    const details=[paymentOrderSummary(order),'Customer Telegram ID: '+order.buyer,
      'Customer username: '+(order.telegramUsername?'@'+order.telegramUsername:'Not provided'),
      'Transaction reference: '+(order.submittedTransactionId||'None'),'Submitted at: '+(order.submittedAt?new Date(order.submittedAt).toISOString():'Not submitted'),
      order.paymentQuote?'Expected recipient: '+order.paymentQuote.receivingName+' • UID '+order.paymentQuote.receivingUid:'Use this original order’s agreed payment destination.',
      order.buyerInformation?'Buyer information: '+order.buyerInformation:'',
      'Check actual transaction history: reference, received amount, currency, completed payment status and receiving account. A pasted reference or screenshot is not proof.',
      order.quoteExpiredAtSubmission?'Quote expired before submission: resolve any amount difference with the buyer.':'',
      order.paymentStatus===PAYMENT_STATUS.VERIFIED&&order.deliveryStatus!=='DELIVERED'?'/fulfill '+id+' YOUR_MANUAL_DELIVERY_NOTE':''].filter(Boolean).join('\n');
    const v=order.submissionVersion;
    const rows=reviewable(order)?[[{text:'Approve Payment — I checked received funds',callback_data:'review:approve:'+id+':'+v}],
      [{text:'Reject Payment',callback_data:'review:reject:'+id+':'+v}],
      [{text:'Request Information',callback_data:'review:info:'+id+':'+v}]]:undefined;
    await this.send(admin,details,rows);return true;
  }
  async handle(update) {
    const callback=update.callback_query,message=callback?.message||update.message,user=callback?.from||message?.from;
    if(!message||message.chat?.type!=='private'||!user||user.is_bot||message.chat.id!==user.id)return false;
    const buyer=user.id,data=String(callback?.data||''),text=String(message.text||message.caption||'').trim();
    const cmd=/^\/(payment|evidence|info|order|cancel|orders|deliveries|approve|reject|requestinfo|fulfill)(?:@([A-Za-z0-9_]+))?(?:\s+([\s\S]+))?$/i.exec(text);
    if(cmd?.[2]&&cmd[2].toLowerCase()!=='atlascrmmarketbot')return false;
    const action=cmd?.[1]?.toLowerCase(),args=cmd?.[3]?.trim()||'';
    const buy=/^buy:([A-Za-z0-9_-]{1,48})$/.exec(data);
    const checkout=/^(pay|paid|cancel|evidence|information):(AM-[a-f0-9]{16})$/.exec(data);
    const review=/^review:(show|approve|reject|info):(AM-[a-f0-9]{16})(?::(\d{1,10}))?$/.exec(data);
    const queue=/^queue:(orders|deliveries):(AM-[a-f0-9]{16})$/.exec(data);
    const menu=/^(🛒 Buy|🛍 Products|👤 Profile|🧾 Purchase history|👛 Wallet|🔌 API|💬 Support|🛡 Warranty)$/.test(text);
    const dialog=callback||text.startsWith('/')||menu?null:await this.orders.getDialog(buyer);
    if(!checkout&&!review&&!queue&&!action&&!dialog&&!(buy&&this.payments.enabled)) {
      if(/^(pay|paid|cancel|evidence|information|queue):/.test(data)){if(callback)await this.api.call('answerCallbackQuery',{callback_query_id:callback.id,text:'Invalid order action'});return true;}
      return false;
    }
    if(callback)await this.api.call('answerCallbackQuery',{callback_query_id:callback.id});
    try {
      if(buy&&this.payments.enabled) {
        if(!this.admins.size||!this.supportUrl)throw new ShopError('Ordering is not configured; contact admin');
        const catalog=await this.catalog.list();if(catalog.stale)throw new ShopError('Live stock/price refresh is unavailable. Contact admin before paying.');
        const product=catalog.products.find(p=>p.id===buy[1]);if(!product)throw new ShopError('This listing is unavailable');
        const quote=this.payments.quote(product);
        const order=await this.orders.create(buyer,product,update.update_id,{username:user.username,paymentQuote:quote});
        const instructions=await this.payments.createPaymentInstructions(order);
        await this.send(buyer,paymentInstructionText(order),this.instructionRows(order,instructions),{parse_mode:'HTML'});
        await this.orders.markInstructionsShown(order.id,buyer);
        if(order.isNew)await this.notifyAdmins(order);return true;
      }
      if(checkout) {
        const [,operation,id]=checkout,order=await this.orders.getForBuyer(id,buyer);
        if(operation==='cancel'){const cancelled=await this.orders.cancel(id,buyer);await this.send(buyer,paymentOrderSummary(cancelled));return true;}
        if(operation==='pay') {
          const instructions=await this.payments.createPaymentInstructions(order);
          if(instructions.photo) {
            try{await this.api.call('sendPhoto',{chat_id:buyer,photo:instructions.photo,caption:paymentQrCaption(order),parse_mode:'HTML'});}
            catch(error){if(error.confirmedFailure&&!error.retryAfter)throw new ShopError('The receiving QR could not be displayed. Contact admin before paying.');throw error;}
          }
          await this.send(buyer,paymentInstructionText(order),this.instructionRows(order,instructions),{parse_mode:'HTML'});await this.orders.markInstructionsShown(id,buyer);return true;
        }
        if(operation==='paid') {
          if(order.paymentStatus!==PAYMENT_STATUS.PENDING){await this.send(buyer,paymentOrderSummary(order),this.checkoutButtons(order));return true;}
          await this.orders.setDialog(buyer,id,'reference');
          await this.send(buyer,paymentReferencePrompt(order),undefined,{parse_mode:'HTML',reply_markup:{force_reply:true,input_field_placeholder:'Paste Binance Pay transaction ID'}});return true;
        }
        if(!reviewable(order))throw new ShopError('This order is not awaiting payment information');
        await this.orders.setDialog(buyer,id,operation==='evidence'?'evidence':'information');
        await this.send(buyer,operation==='evidence'?'Send a payment screenshot photo for order '+id+'. It is supporting evidence, not proof of payment.':'Send a short information note for order '+id+'. Do not include passwords or payment-account credentials.');return true;
      }
      if(review||queue||['orders','deliveries','approve','reject','requestinfo','fulfill'].includes(action)) {
        if(!this.admins.has(String(buyer)))throw new ShopError('Admin access required');this.orders.requireAdmin(buyer);
        if(action==='orders'||action==='deliveries'||queue) {
          const mode=queue?.[1]||action;const page=await this.orders.pendingPage({deliveryOnly:mode==='deliveries',cursor:queue?.[2]||''});const pending=page.orders;
          if(!pending.length)await this.send(buyer,page.cursor?'No matching orders in this page. Continue to the next page.':mode==='deliveries'?'No verified orders await manual delivery.':'No active orders.');
          for(const order of pending)await this.send(buyer,paymentOrderSummary(order)+'\nTransaction reference: '+(order.submittedTransactionId||'Not submitted'),[[{text:reviewable(order)?'Review Payment':'Order details',callback_data:'review:show:'+order.id}]]);
          if(page.cursor)await this.send(buyer,'More '+(mode==='deliveries'?'delivery':'active')+' orders',[[{text:'Next page',callback_data:'queue:'+mode+':'+page.cursor}]]);
          return true;
        }
        const id=review?.[2]||args.split(/\s+/)[0];if(!ORDER_ID.test(id||''))throw new ShopError('Use a valid order number');
        if(review?.[1]==='show'||action==='approve'||action==='reject')return this.showReview(buyer,id);
        const operation=review?{info:'request_info'}[review[1]]||review[1]:action==='requestinfo'?'request_info':action;
        const order=await this.orders.getForAdmin(id,buyer);
        const note=operation==='request_info'?(review?'Please confirm the sending account name, exact amount, currency and transaction reference. Do not send credentials.':args.slice(id.length).trim()):operation==='fulfill'?args.slice(id.length).trim():'';
        const version=review?.[3]===undefined?undefined:Number(review[3]);
        const result=['approve','reject'].includes(operation)?await this.payments.verifyPayment(id,buyer,operation,note,version):
          await this.orders.review(id,buyer,operation,note,{expectedVersion:review?version:order.submissionVersion});
        await this.send(buyer,paymentOrderSummary(result.order)+(result.changed?'\nRecorded.':'\nAlready recorded; no duplicate action.'));
        if(result.changed) {
          if(operation==='request_info')await this.orders.setDialog(result.order.buyer,id,'information');
          const extra=operation==='request_info'?'\nAdmin requests information: '+note:operation==='fulfill'?'\nAdmin fulfillment note: '+note:operation==='reject'?'\nAdmin could not verify your payment. Contact admin to resolve.':'\nAdmin has manually confirmed received payment. Delivery remains manual.';
          await this.send(result.order.buyer,paymentOrderSummary(result.order)+extra,this.checkoutButtons(result.order));
        }
        return true;
      }
      if(action==='payment') {
        const [id,reference,...extra]=args.split(/\s+/);if(!id||!reference||extra.length)throw new ShopError('Use /payment ORDER_NUMBER TRANSACTION_REFERENCE');
        return this.submit(buyer,id,reference,photoEvidence(message));
      }
      if(action==='order'){const order=await this.orders.getForBuyer(args,buyer);await this.send(buyer,paymentOrderSummary(order),order.paymentProvider==='binance_pay'?this.checkoutButtons(order):this.contact());return true;}
      if(action==='cancel'){await this.send(buyer,paymentOrderSummary(await this.orders.cancel(args,buyer)));return true;}
      const targetId=action==='info'?args.split(/\s+/)[0]:action==='evidence'?args:dialog?.orderId;
      if(action==='evidence'&&!message.photo?.length){await this.orders.setDialog(buyer,targetId,'evidence');await this.send(buyer,'Send a screenshot photo for order '+targetId+'. You may also send a photo captioned /evidence '+targetId);return true;}
      const kind=action==='info'?'information':action==='evidence'?'evidence':dialog?.kind;
      if(kind==='reference') {
        if(message.photo?.length&&!text){await this.send(buyer,'Send the transaction reference first, then use Add payment screenshot.');return true;}
        return this.submit(buyer,targetId,text,photoEvidence(message));
      }
      if(kind==='evidence') {
        const result=await this.orders.addEvidence(targetId,buyer,photoEvidence(message));await this.send(buyer,paymentOrderSummary(result.order)+'\nScreenshot '+(result.changed?'saved as unverified supporting evidence.':'already recorded.'),this.checkoutButtons(result.order));
        if(result.changed)await this.notifyAdmins(result.order);return true;
      }
      if(kind==='information') {
        const note=action==='info'?args.slice(targetId.length).trim():text;
        const result=await this.orders.addInformation(targetId,buyer,note);await this.send(buyer,paymentOrderSummary(result.order)+'\nAdditional information '+(result.changed?'saved for admin review.':'already recorded.'));
        if(result.changed)await this.notifyAdmins(result.order);return true;
      }
      return false;
    }catch(error){
      if(error instanceof ShopError||error instanceof PaymentConfigurationError){await this.send(buyer,error.message,this.contact());return true;}
      throw error;
    }
  }
}
