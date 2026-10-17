import {orderAttribution,reconcileCommission} from './partners/program.mjs';
export const ORDER_ID=/^AM-[a-f0-9]{16}$/;
export const PAYMENT_STATUS=Object.freeze({PENDING:'PENDING_PAYMENT',SUBMITTED:'PAYMENT_SUBMITTED',REVIEW:'PAYMENT_UNDER_REVIEW',VERIFIED:'PAYMENT_VERIFIED',REJECTED:'PAYMENT_REJECTED',CANCELLED:'CANCELLED',REFUNDED:'REFUNDED'});
export class ShopError extends Error {}
const fail=message=>{throw new ShopError(message);};
const requireBuyer=id=>{if(!Number.isSafeInteger(id)||id<=0)fail('Private buyer identity required');};
const reviewable=new Set([PAYMENT_STATUS.SUBMITTED,PAYMENT_STATUS.REVIEW]);
const legacyPayment={awaiting_payment:PAYMENT_STATUS.PENDING,awaiting_review:PAYMENT_STATUS.SUBMITTED,approved:PAYMENT_STATUS.VERIFIED,
  fulfilled:PAYMENT_STATUS.VERIFIED,rejected:PAYMENT_STATUS.REJECTED,cancelled:PAYMENT_STATUS.CANCELLED,refunded:PAYMENT_STATUS.REFUNDED};
// Read projection preserves existing records/quotes. No eager destructive migration.
export function normalizeOrder(raw) {
  if(!raw)return null;
  const order=structuredClone(raw);
  return {...order,schemaVersion:order.schemaVersion||1,telegramUsername:order.telegramUsername||null,
    quantity:order.quantity||1,unitPrice:order.unitPrice??order.product.price,totalAmount:order.totalAmount??order.product.price*(order.quantity||1),
    currency:order.currency||order.product.currency,paymentProvider:order.paymentProvider||'manual_contact',
    paymentStatus:order.paymentStatus||legacyPayment[order.status],deliveryStatus:order.deliveryStatus||(order.status==='fulfilled'?'DELIVERED':'NOT_DELIVERED'),
    submittedTransactionId:order.submittedTransactionId||order.reference||null,paymentScreenshotReference:order.paymentScreenshotReference||null,
    submittedAt:order.submittedAt??order.events?.find(e=>e.type==='reference_submitted')?.at??null,
    verifiedAt:order.verifiedAt??order.events?.find(e=>e.type==='approve')?.at??null,verifiedBy:order.verifiedBy??order.events?.find(e=>e.type==='approve')?.actor??null,
    deliveredAt:order.deliveredAt??order.events?.find(e=>e.type==='fulfill')?.at??null,adminNotes:order.adminNotes||[],events:order.events||[],
    submissionVersion:order.submissionVersion||(order.reference?1:0),evidence:order.evidence||[]};
}
function projectLegacyStatus(order) {
  order.status=order.deliveryStatus==='DELIVERED'?'fulfilled':({PENDING_PAYMENT:'awaiting_payment',PAYMENT_SUBMITTED:'awaiting_review',
    PAYMENT_UNDER_REVIEW:'awaiting_review',PAYMENT_VERIFIED:'approved',PAYMENT_REJECTED:'rejected',CANCELLED:'cancelled',REFUNDED:'refunded'}[order.paymentStatus]);
  return order;
}
function validateEvidence(evidence) {
  if(!evidence)return null;
  if(typeof evidence.fileId!=='string'||!/^[A-Za-z0-9_-]{1,512}$/.test(evidence.fileId)
    ||(evidence.fileUniqueId&&!/^[A-Za-z0-9_-]{1,256}$/.test(evidence.fileUniqueId))
    ||!Number.isSafeInteger(evidence.messageId)||evidence.messageId<=0
    ||(evidence.fileSize!==undefined&&(!Number.isSafeInteger(evidence.fileSize)||evidence.fileSize<0||evidence.fileSize>10*1024*1024)))fail('Invalid payment screenshot reference');
  return {fileId:evidence.fileId,fileUniqueId:evidence.fileUniqueId||null,messageId:evidence.messageId};
}
const sameEvidence=(order,evidence)=>order.evidence.some(item=>evidence.fileUniqueId?item.fileUniqueId===evidence.fileUniqueId:item.fileId===evidence.fileId);
const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');
export class ShopOrders {
  constructor(storage,{now=Date.now,uuid=()=>crypto.randomUUID(),adminIds=[],partnerSecret=''}={}) {
    this.storage=storage;this.now=now;this.uuid=uuid;this.adminIds=new Set(adminIds.map(String));
    this.partnerSecret=partnerSecret;
  }
  requireAdmin(admin){requireBuyer(admin);if(!this.adminIds.has(String(admin)))fail('Admin access required');}
  event(order,type,actor,notes={}){order.updatedAt=this.now();order.events.push({type,at:order.updatedAt,...(actor?{actor}:{}),...notes});}
  async readOwned(tx,id,buyer) {
    requireBuyer(buyer);if(!ORDER_ID.test(id||''))fail('Order not found');
    const order=normalizeOrder(await tx.get('order:'+id));if(!order||order.buyer!==buyer)fail('Order not found');return order;
  }
  async create(buyer,product,intent,{username,paymentQuote}={}) {
    requireBuyer(buyer);
    if(!product||!product.id||!Number.isFinite(product.price)||product.price<=0||product.stock==='out')fail('This listing cannot be ordered. Contact support.');
    if(!/^[a-zA-Z0-9_-]{1,48}$/.test(product.id))fail('This listing needs a manual support enquiry.');
    if(!Number.isSafeInteger(intent)||intent<0)fail('Invalid order request');
    if(paymentQuote&&(!Number.isFinite(paymentQuote.totalAmount)||paymentQuote.totalAmount<=0||!Number.isFinite(paymentQuote.unitPrice)
      ||paymentQuote.unitPrice!==paymentQuote.totalAmount||paymentQuote.quantity!==1||paymentQuote.sourceUnitPrice!==product.price||paymentQuote.sourceCurrency!==product.currency
      ||paymentQuote.provider!=='binance_pay'||paymentQuote.mode!=='manual'||paymentQuote.verificationMode!=='admin_manual'||paymentQuote.deliveryMode!=='admin_manual'))fail('Invalid server payment quote');
    return this.storage.transaction(async tx=>{
      const receipt='order-intent:'+buyer+':'+intent;const existing=await tx.get(receipt);
      if(existing){const order=await this.readOwned(tx,existing,buyer);if(order.product.id!==product.id)fail('Conflicting order request');return {...order,isNew:false};}
      const index=await tx.get('buyer-orders:'+buyer)||[];if(index.length>=200)fail('Order limit reached. Contact support.');
      const current=await Promise.all(index.map(async id=>normalizeOrder(await tx.get('order:'+id))));
      if(current.filter(o=>o&&o.deliveryStatus!=='DELIVERED'&&![PAYMENT_STATUS.REJECTED,PAYMENT_STATUS.CANCELLED,PAYMENT_STATUS.REFUNDED].includes(o.paymentStatus)).length>=5)fail('Finish or cancel an existing order first.');
      const id='AM-'+this.uuid().replace(/-/g,'').slice(0,16);if(!ORDER_ID.test(id)||await tx.get('order:'+id))fail('Please request a fresh order');
      const timestamp=this.now();
      const order={schemaVersion:2,id,buyer,telegramUsername:/^[A-Za-z0-9_]{5,32}$/.test(username||'')?username:null,
        product:{id:product.id,name:product.name.slice(0,180),price:product.price,currency:product.currency,stock:product.stock},quantity:1,
        unitPrice:paymentQuote?.unitPrice??product.price,totalAmount:paymentQuote?.totalAmount??product.price,currency:paymentQuote?.currency||product.currency,
        paymentProvider:paymentQuote?.provider||'manual_contact',paymentQuote:paymentQuote?structuredClone(paymentQuote):null,
        paymentStatus:PAYMENT_STATUS.PENDING,deliveryStatus:'NOT_DELIVERED',status:'awaiting_payment',submittedTransactionId:null,
        paymentScreenshotReference:null,submittedAt:null,verifiedAt:null,verifiedBy:null,deliveredAt:null,adminNotes:[],evidence:[],submissionVersion:0,
        createdAt:timestamp,updatedAt:timestamp,quoteUntil:timestamp+24*3600000,events:[{type:'created',at:timestamp}]};
      if(this.partnerSecret)order.partnerAttribution=await orderAttribution(tx,buyer,product,timestamp,this.partnerSecret);
      await tx.put('order:'+id,order);await reconcileCommission(tx,order,timestamp);await tx.put('buyer-orders:'+buyer,[id,...index]);await tx.put(receipt,id);return {...order,isNew:true};
    });
  }
  async list(buyer) {
    requireBuyer(buyer);const index=await this.storage.get('buyer-orders:'+buyer)||[];
    return (await Promise.all(index.slice(0,20).map(async id=>normalizeOrder(await this.storage.get('order:'+id))))).filter(Boolean);
  }
  getForBuyer(id,buyer){return this.readOwned(this.storage,id,buyer);}
  async getForAdmin(id,admin){this.requireAdmin(admin);if(!ORDER_ID.test(id||''))fail('Order not found');const order=normalizeOrder(await this.storage.get('order:'+id));if(!order)fail('Order not found');return order;}
  async submitReference(id,buyer,reference,{evidence}={}) {
    requireBuyer(buyer);
    if(!ORDER_ID.test(id||'')||typeof reference!=='string'||!/^[a-zA-Z0-9_.:-]{6,128}$/.test(reference))fail('Use the order number and a 6–128 character transaction reference.');
    const screenshot=validateEvidence(evidence),canonical=reference.toLowerCase(),referenceHash=await hash(canonical);
    return this.storage.transaction(async tx=>{
      const order=await this.readOwned(tx,id,buyer);
      if(order.submittedTransactionId?.toLowerCase()===canonical) {
        if(screenshot&&!sameEvidence(order,screenshot)&&reviewable.has(order.paymentStatus))return this.attachScreenshot(tx,order,screenshot);
        return {order,changed:false};
      }
      if(order.paymentStatus!==PAYMENT_STATUS.PENDING)fail('This order is not awaiting a payment reference');
      if(order.quoteUntil<this.now()) {
        if(order.paymentProvider!=='binance_pay')fail('Order quote expired. Contact admin before paying.');
        order.quoteExpiredAtSubmission=true;
      }
      const used=await tx.get('payment-ref:'+referenceHash);if(used&&used!==id)fail('This reference is already attached to an order. Contact support.');
      const approved=await tx.get('approved-payment-ref:'+referenceHash);if(approved&&approved!==id)fail('This reference already has an approved payment');
      order.paymentStatus=PAYMENT_STATUS.SUBMITTED;order.reference=reference;order.submittedTransactionId=reference;
      order.submittedAt=this.now();order.submissionVersion++;order.referenceHash=referenceHash;
      if(screenshot){order.evidence.push({...screenshot,submittedAt:this.now()});order.paymentScreenshotReference=screenshot.fileId;}
      this.event(order,'reference_submitted',buyer);projectLegacyStatus(order);
      await tx.put('payment-ref:'+referenceHash,id);await tx.put('order:'+id,order);await reconcileCommission(tx,order,this.now());await this.clearMatchingDialog(tx,buyer,id);
      return {order,changed:true};
    });
  }
  async attachScreenshot(tx,order,evidence) {
    if(sameEvidence(order,evidence))return {order,changed:false};
    if(!reviewable.has(order.paymentStatus))fail('Payment evidence can only be added before verification');
    if(order.evidence.length>=5)fail('Screenshot limit reached. Contact admin.');
    order.evidence.push({...evidence,submittedAt:this.now()});order.paymentScreenshotReference=evidence.fileId;
    order.submissionVersion++;order.paymentStatus=PAYMENT_STATUS.SUBMITTED;this.event(order,'screenshot_submitted',order.buyer);projectLegacyStatus(order);
    await tx.put('order:'+order.id,order);await reconcileCommission(tx,order,this.now());await this.clearMatchingDialog(tx,order.buyer,order.id);return {order,changed:true};
  }
  async addEvidence(id,buyer,evidence) {
    const screenshot=validateEvidence(evidence);if(!screenshot)fail('Send a payment screenshot photo');
    return this.storage.transaction(async tx=>this.attachScreenshot(tx,await this.readOwned(tx,id,buyer),screenshot));
  }
  async addInformation(id,buyer,note) {
    if(typeof note!=='string'||!note.trim()||note.length>500)fail('Use a short information note (up to 500 characters)');
    return this.storage.transaction(async tx=>{
      const order=await this.readOwned(tx,id,buyer);if(!reviewable.has(order.paymentStatus))fail('This order is not awaiting information');
      if(order.buyerInformation===note.trim())return {order,changed:false};
      if(order.events.filter(e=>e.type==='information_submitted').length>=10)fail('Information update limit reached. Contact admin.');
      order.buyerInformation=note.trim();order.submissionVersion++;order.paymentStatus=PAYMENT_STATUS.SUBMITTED;
      this.event(order,'information_submitted',buyer,{note:note.trim()});projectLegacyStatus(order);await tx.put('order:'+id,order);await reconcileCommission(tx,order,this.now());
      await this.clearMatchingDialog(tx,buyer,id);return {order,changed:true};
    });
  }
  async markInstructionsShown(id,buyer) {
    return this.storage.transaction(async tx=>{
      const order=await this.readOwned(tx,id,buyer);if(order.instructionsShownAt)return {order,changed:false};
      order.instructionsShownAt=this.now();this.event(order,'instructions_displayed',buyer);await tx.put('order:'+id,order);return {order,changed:true};
    });
  }
  async cancel(id,buyer) {
    return this.storage.transaction(async tx=>{
      const order=await this.readOwned(tx,id,buyer);if(order.paymentStatus===PAYMENT_STATUS.CANCELLED)return order;
      if(order.paymentStatus!==PAYMENT_STATUS.PENDING)fail('Contact admin to cancel an order after submitting payment.');
      order.paymentStatus=PAYMENT_STATUS.CANCELLED;this.event(order,'cancelled',buyer);projectLegacyStatus(order);
      await tx.put('order:'+id,order);await reconcileCommission(tx,order,this.now());await this.clearMatchingDialog(tx,buyer,id);return order;
    });
  }
  async review(id,admin,action,note='',{expectedVersion}={}) {
    this.requireAdmin(admin);
    if(!ORDER_ID.test(id||'')||!['approve','reject','fulfill','under_review','request_info'].includes(action)||typeof note!=='string'||note.length>500)fail('Invalid review request');
    return this.storage.transaction(async tx=>{
      const order=normalizeOrder(await tx.get('order:'+id));if(!order)fail('Order not found');
      if(action==='approve'&&order.paymentStatus===PAYMENT_STATUS.VERIFIED||action==='reject'&&order.paymentStatus===PAYMENT_STATUS.REJECTED||action==='fulfill'&&order.deliveryStatus==='DELIVERED')return {order,changed:false};
      if(action==='fulfill') {
        if(order.paymentStatus!==PAYMENT_STATUS.VERIFIED||!note.trim())fail('Order is not ready for this action');
        order.deliveryStatus='DELIVERED';order.deliveredAt=this.now();order.deliveredBy=admin;
      } else {
        if(!reviewable.has(order.paymentStatus))fail('Order is not ready for this action');
        if(action!=='under_review'&&(order.paymentProvider==='binance_pay'||order.evidence.length||order.submissionVersion>1)&&expectedVersion!==order.submissionVersion)fail('Payment evidence changed. Open a fresh review before confirming.');
        if(expectedVersion!==undefined&&expectedVersion!==order.submissionVersion)fail('Payment evidence changed. Open a fresh review before confirming.');
        if(action==='under_review') {
          if(order.paymentStatus===PAYMENT_STATUS.REVIEW)return {order,changed:false};
          order.paymentStatus=PAYMENT_STATUS.REVIEW;order.reviewedAt=this.now();order.reviewedBy=admin;
        }
        if(action==='request_info') {
          if(!note.trim())fail('Provide the information you need from the buyer');
          if(order.adminNotes.at(-1)?.type==='request_info'&&order.adminNotes.at(-1)?.note===note.trim()&&order.paymentStatus===PAYMENT_STATUS.SUBMITTED)return {order,changed:false};
          order.paymentStatus=PAYMENT_STATUS.SUBMITTED;
        }
        if(action==='approve') {
          if(!order.submittedTransactionId)fail('A submitted transaction reference is required');
          const referenceHash=order.referenceHash||await hash(order.submittedTransactionId.toLowerCase());
          const approved=await tx.get('approved-payment-ref:'+referenceHash),claimed=await tx.get('payment-ref:'+referenceHash);
          if(approved&&approved!==id||claimed&&claimed!==id)fail('This reference already belongs to another order');
          await tx.put('approved-payment-ref:'+referenceHash,id);await tx.put('payment-ref:'+referenceHash,id);
          order.paymentStatus=PAYMENT_STATUS.VERIFIED;order.verifiedAt=this.now();order.verifiedBy=admin;
        }
        if(action==='reject'){order.paymentStatus=PAYMENT_STATUS.REJECTED;order.rejectedAt=this.now();order.rejectedBy=admin;}
      }
      if(note.trim())order.adminNotes.push({type:action,actor:admin,at:this.now(),note:note.trim()});
      this.event(order,action,admin,note.trim()?{note:note.trim()}:{});projectLegacyStatus(order);
      await tx.put('order:'+id,order);await reconcileCommission(tx,order,this.now());return {order,changed:true};
    });
  }
  async pending(options={}) {return (await this.pendingPage({...options,limit:20})).orders;}
  async pendingPage({deliveryOnly=false,cursor='',limit=10}={}) {
    if(cursor&&!ORDER_ID.test(cursor))fail('Invalid order queue cursor');
    if(!Number.isInteger(limit)||limit<1||limit>20)fail('Invalid order queue size');
    const result=[];let startAfter=cursor?'order:'+cursor:undefined,scanned=0;
    do {
      const batch=await this.storage.list({prefix:'order:',limit:100,...(startAfter?{startAfter}:{})});
      for(const [key,raw]of batch) {
        scanned++;startAfter=key;const order=normalizeOrder(raw);
        if(order.deliveryStatus!=='DELIVERED'&&(deliveryOnly?order.paymentStatus===PAYMENT_STATUS.VERIFIED:![PAYMENT_STATUS.REJECTED,PAYMENT_STATUS.CANCELLED,PAYMENT_STATUS.REFUNDED].includes(order.paymentStatus)))result.push(order);
        if(result.length>=limit||scanned>=500)return {orders:result,cursor:key.slice('order:'.length)};
      }
      if(batch.size<100)return {orders:result,cursor:null};
    }while(scanned<500);
    return {orders:result,cursor:startAfter?.slice('order:'.length)||null};
  }
  async setDialog(actor,id,kind) {
    if(!['reference','evidence','information'].includes(kind))fail('Invalid payment conversation');
    await this.getForBuyer(id,actor);
    await this.storage.transaction(tx=>tx.put('payment-dialog:'+actor,{orderId:id,kind,until:this.now()+30*60000}));
  }
  async getDialog(actor){requireBuyer(actor);const dialog=await this.storage.get('payment-dialog:'+actor);return dialog?.until>this.now()?dialog:null;}
  async clearMatchingDialog(tx,actor,id){const dialog=await tx.get('payment-dialog:'+actor);if(dialog?.orderId===id)await tx.put('payment-dialog:'+actor,null);}
}
