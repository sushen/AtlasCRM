import { ShopError } from './shop-orders.mjs';
import { formatCatalogPrice } from '../js/utils/catalog-pricing.js';
import { familyMenu,groupMenu,productMessage } from './telegram-catalog.mjs';
import { productFamily } from '../js/utils/catalog-groups.js';
import {telegramProductImage} from '../js/utils/shop-images.js';
import {ManualCheckoutConversation,paymentOrderSummary} from './telegram-manual-checkout.mjs';

export const SHOP_COMMANDS=[{command:'start',description:'Open Atlas Market'},{command:'menu',description:'Open shop menu'},
  {command:'products',description:'Browse products'},{command:'profile',description:'Your shop profile'},
  {command:'history',description:'Your orders'},{command:'payment',description:'Submit order payment reference'},
  {command:'support',description:'Contact admin'}];
export const ADMIN_SHOP_COMMANDS=[...SHOP_COMMANDS,{command:'orders',description:'Active orders and payment review'},
  {command:'approve',description:'Review an order before approval'},{command:'reject',description:'Review an order before rejection'},
  {command:'fulfill',description:'Record fulfillment after approval'}];
export const MANUAL_CHECKOUT_COMMANDS=[{command:'evidence',description:'Attach payment screenshot to your order'},
  {command:'info',description:'Send requested order information'}];
export const MANUAL_CHECKOUT_ADMIN_COMMANDS=[{command:'deliveries',description:'Verified orders awaiting manual delivery'},
  {command:'requestinfo',description:'Ask buyer for payment details'}];
export const STORE_MENU={keyboard:[[{text:'🛒 Buy'}],[{text:'👤 Profile'},{text:'🧾 Purchase history'}],
  [{text:'💬 Support'},{text:'🛡 Warranty'}]],resize_keyboard:true,is_persistent:true};
export function shopContactUrl(value='') {
  if(!value)return '';
  const url=new URL(value);
  if(url.origin!=='https://t.me'||url.search||url.hash||url.username||url.password||!/^\/[A-Za-z][A-Za-z0-9_]{4,31}\/?$/.test(url.pathname))throw Error('Use a public Telegram admin username URL');
  return url.href;
}
export const shopProductLink=(username,id)=>{
  if(!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username)||!/^[A-Za-z0-9_-]{1,48}$/.test(id))return null;
  return 'https://t.me/'+username+'?start=product_'+id;
};
const statusName=status=>({awaiting_payment:'Awaiting contact/payment',awaiting_review:'Awaiting human payment review',approved:'Payment confirmed by admin — awaiting fulfillment',rejected:'Payment review rejected — contact admin',fulfilled:'Fulfilled by admin',cancelled:'Cancelled'}[status]||status);
export function orderSummary(order) {
  if(order.schemaVersion>=2)return paymentOrderSummary(order);
  return ['Order '+order.id,order.product.name,formatCatalogPrice(order.product),'Quantity: 1',statusName(order.status),
    'Reference: '+order.product.id].join('\n');
}
export class TelegramShop {
  constructor({orders,api,catalog,adminIds=[],supportUrl='',channelUrl='',username='AtlasCrmMarketBot',payments,partners}) {
    this.orders=orders;this.api=api;this.catalog=catalog;this.admins=new Set(adminIds.map(String));
    this.supportUrl=shopContactUrl(supportUrl);this.channelUrl=channelUrl;this.username=username;
    this.partners=partners;
    this.checkout=payments?new ManualCheckoutConversation({orders,api,catalog,payments,adminIds,supportUrl:this.supportUrl}):null;
  }
  contactRows(){return this.supportUrl?[[{text:'Contact admin to order',url:this.supportUrl}]]:[];}
  detail(product) {
    const detail=productMessage(product,this.channelUrl);
    if(product.stock!=='out'&&Number.isFinite(product.price)&&product.price>0&&/^[A-Za-z0-9_-]{1,48}$/.test(product.id))detail.reply_markup.inline_keyboard.unshift([{text:'Create order request',callback_data:'buy:'+product.id}]);
    detail.reply_markup.inline_keyboard.push(...this.contactRows());return detail;
  }
  async handle(update) {
    const callback=update.callback_query;const message=callback?.message||update.message;const user=callback?.from||message?.from;
    if(!message||message.chat?.type!=='private'||!user||user.is_bot||message.chat.id!==user.id)return false;
    if(this.checkout&&await this.checkout.handle(update))return true;
    const buyer=user.id;const text=String(message.text||'').trim();const data=callback?.data||'';
    const command=/^\/(start|menu|products|profile|history|payment|support|wallet|api|warranty|order|cancel|orders|approve|reject|fulfill)(?:@([A-Za-z0-9_]+))?(?:\s+([\s\S]+))?$/i.exec(text);
    const menu={'🛒 Buy':'products','🛍 Products':'products','👤 Profile':'profile','🧾 Purchase history':'history','👛 Wallet':'wallet','🔌 API':'api','💬 Support':'support','🛡 Warranty':'warranty'}[text];
    const action=command?.[1]?.toLowerCase()||menu;let args=command?.[3]?.trim()||'';
    if(command?.[2]&&command[2].toLowerCase()!==this.username.toLowerCase())return false;
    if(!action&&!/^(buy:|groups:|family:|product:|review:)/.test(data))return false;
    if(callback)await this.api.call('answerCallbackQuery',{callback_query_id:callback.id});
    const send=body=>this.api.call('sendMessage',{chat_id:buyer,...body,link_preview_options:{is_disabled:true}});
    const basic=(text,inline)=>send({text,reply_markup:inline?{inline_keyboard:inline}:STORE_MENU});
    try {
      if(action==='start'&&args.startsWith('r_')){
        if(!this.partners)return basic('Referral tracking is unavailable. Use /products to continue shopping.');
        try{const referral=await this.partners.start(args.slice(2),buyer);args=referral.productId?'product_'+referral.productId:'shop';}
        catch{return basic('This referral link has expired or was already used. Reopen the website for a fresh link, or use /products.');}
      }
      if(/^review:/.test(data)||['orders','approve','reject','fulfill'].includes(action)) {
        if(!this.admins.has(String(buyer)))throw new ShopError('Admin access required');
        if(action==='orders') {
          const pending=await this.orders.pending();
          if(!pending.length)return basic('No active orders.');
          for(const order of pending)await basic(orderSummary(order)+'\nTransaction reference: '+(order.reference||'Not submitted')+'\nVerify the received amount/currency in your account before approval.',order.status==='awaiting_review'?[[{text:'Review payment',callback_data:'review:show:'+order.id}]]:undefined);
          return true;
        }
        const parts=data.split(':');const reviewAction=data?parts[1]:action;const id=data?parts[2]:args.split(/\s+/)[0];
        if(reviewAction==='show'||action==='approve'||action==='reject') {
          const order=await this.orders.storage.get('order:'+id);if(!order)throw new ShopError('Order not found');
          return basic(orderSummary(order)+'\nTransaction reference: '+(order.reference||'None')+'\nCheck your actual receiving account. A pasted reference is not proof.',[[{text:'I verified payment — approve',callback_data:'review:approve:'+id}],[{text:'Reject payment review',callback_data:'review:reject:'+id}]]);
        }
        const note=action==='fulfill'?args.slice(id.length).trim():'';
        const result=await this.orders.review(id,buyer,reviewAction,note);
        await basic(orderSummary(result.order)+(result.changed?'\nRecorded.':'\nAlready recorded; no duplicate action.'));
        if(result.changed)await this.api.call('sendMessage',{chat_id:result.order.buyer,text:orderSummary(result.order)+(note?'\nAdmin fulfillment note: '+note:''),link_preview_options:{is_disabled:true}});
        return true;
      }
      if(action==='payment') {
        const [id,reference,...extra]=args.split(/\s+/);if(extra.length||!id||!reference)throw new ShopError('Use /payment ORDER_NUMBER TRANSACTION_REFERENCE');
        const result=await this.orders.submitReference(id,buyer,reference);
        await basic(orderSummary(result.order)+'\nYour reference is awaiting human verification. It is not a payment confirmation.');
        if(result.changed)for(const admin of this.admins) {
          try {await this.api.call('sendMessage',{chat_id:Number(admin),text:orderSummary(result.order)+'\nTransaction reference: '+reference+'\nVerify the actual received payment before approval.',reply_markup:{inline_keyboard:[[{text:'Review payment',callback_data:'review:show:'+id}]]}});}catch{}
        }
        return true;
      }
      if(action==='cancel')return basic(orderSummary(await this.orders.cancel(args,buyer)));
      if(action==='order')return basic(orderSummary(await this.orders.getForBuyer(args,buyer)),this.contactRows());
      if(action==='history') {
        const orders=await this.orders.list(buyer);return basic(orders.length?orders.map(orderSummary).join('\n\n').slice(0,3900):'No orders yet. Choose Buy to browse products.');
      }
      if(action==='profile'){const orders=await this.orders.list(buyer);return basic('Atlas Market profile\nYour recent orders: '+orders.length+'\nPayments are reviewed manually. No supplier wallet or credentials are shared.');}
      if(['support','wallet','api','warranty'].includes(action)) {
        const explanation={support:'Contact admin with the product reference or order number.',wallet:'This shop has no customer wallet or stored credit balance. Payments are arranged with admin and reviewed manually.',api:'Customer API access is not offered. Supplier credentials stay private.',warranty:'Terms vary by listing. Confirm the selected product’s exact warranty with admin.'}[action];
        return basic(explanation,this.contactRows());
      }
      const {products,stale}=await this.catalog.list();
      const productId=data.startsWith('product:')?data.slice(8):action==='start'&&args.startsWith('product_')?args.slice(8):null;
      if(productId){
        const product=products.find(p=>p.id===productId);
        if(!product)return send({text:'Listing unavailable. Use /products to refresh.'});
        const image=telegramProductImage(product);const detail=this.detail(product);
        if(image) {
          try{await this.api.call('sendPhoto',{chat_id:buyer,photo:image,caption:product.name.slice(0,180)+'\n'+formatCatalogPrice(product)});}
          catch(error){if(!error.confirmedFailure||error.retryAfter)throw error;}
        }
        return send(detail);
      }
      if(data.startsWith('buy:')) {
        if(stale)throw new ShopError('Live stock/price refresh is unavailable. Please contact admin before requesting this order.');
        if(!this.admins.size||!this.supportUrl)throw new ShopError('Ordering is not configured yet. Contact channel admin.');
        const order=await this.orders.create(buyer,products.find(p=>p.id===data.slice(4)),update.update_id);
        await basic(orderSummary(order)+'\nContact admin first to confirm stock, price and payment instructions. This request does not reserve stock.\nAfter arranging payment, send:\n/payment '+order.id+' YOUR_TRANSACTION_REFERENCE\nDo not send passwords or payment credentials.\nQuote expires in 24 hours.',this.contactRows());
        if(order.isNew)for(const admin of this.admins){try{await this.api.call('sendMessage',{chat_id:Number(admin),text:'New order request\n'+orderSummary(order)+'\nNo payment has been verified. Use /orders to view active orders.'});}catch{}}
        return true;
      }
      const family=/^family:([^:]+):(\d+)$/.exec(data);
      if(family)return send(familyMenu(products,family[1],Number(family[2])));
      if(action==='start'||action==='menu')await basic('Welcome to Atlas Market. Browse products, create an order request and contact admin. Payment references are reviewed by a human before fulfillment.');
      return send(groupMenu(products,Number(/^groups:(\d+)$/.exec(data)?.[1]||0)));
    }catch(error){if(error instanceof ShopError)return basic(error.message);throw error;}
  }
}
