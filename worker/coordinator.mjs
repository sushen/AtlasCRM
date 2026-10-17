import { SupplierCatalog } from '../server/catalog.mjs';
import { supplierConfiguration, storefrontSettings } from '../server/catalog-settings.mjs';
import { TelegramApi, TelegramCatalogBot } from '../server/telegram-catalog.mjs';
import { ShopOrders } from '../server/shop-orders.mjs';
import { TelegramShop } from '../server/telegram-shop.mjs';
import { paymentConfiguration } from '../server/payments/config.mjs';
import { BinanceManualPaymentProvider } from '../server/payments/binance-manual.mjs';
import { businessReport } from '../server/business-report.mjs';
import {PartnerProgram,PartnerError} from '../server/partners/program.mjs';
import {partnerReport,reportCsv} from '../server/partners/report.mjs';
import {PartnerFirestore} from './partner-firestore.mjs';

const reply = (data, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
// Single coordinator per Atlas Worker: cache and replay/disable state survive eviction.
export class AtlasCoordinator {
  constructor(state, env) { this.state=state; this.env=env; this.tail=Promise.resolve();this.partnerMirror=new PartnerFirestore(env); }
  fetch(request) {
    return this.serialize(()=>this.handle(request));
  }
  serialize(operation) {
    const result=this.tail.then(operation);
    this.tail=result.catch(()=>{}); return result;
  }
  async scheduleCleanup() {
    // Do not postpone an existing alarm on every new webhook.
    if(!await this.state.storage.getAlarm())await this.state.storage.setAlarm(Date.now()+3600000);
  }
  async schedulePartnerSync(){
    if(this.env.PARTNER_TRACKING_ENABLED!=='true')return;
    const alarm=await this.state.storage.getAlarm();
    if(!alarm||alarm>Date.now()+30000)await this.state.storage.setAlarm(Date.now()+30000);
  }
  async enabled() { return (await this.state.storage.get('bot-enabled')) ?? (this.env.TELEGRAM_BOT_ENABLED === 'true'); }
  async catalog() {
    const saved=await this.state.storage.get('catalog');
    if(saved?.until>Date.now()) return saved.data;
    const fallback=()=>saved?.until>Date.now()-6*3600000?{...saved.data,stale:true,storefront:storefrontSettings(this.env)}:null;
    const cooldown=await this.state.storage.get('supplier-cooldown') || 0;
    if(cooldown>Date.now()) {const data=fallback();if(data)return data;throw Error('supplier_cooldown');}
    const supplier=supplierConfiguration(this.env);
    const adapter=new SupplierCatalog({...supplier,settings:storefrontSettings(this.env)});
    try {
      const data=await adapter.list();
      await this.state.storage.put('catalog',{data,until:Date.now()+60000});
      return data;
    } catch {
      await this.state.storage.put('supplier-cooldown',Math.max(Date.now()+30000,adapter.blockedUntil));
      const fallbackData=fallback();if(fallbackData)return fallbackData;
      throw Error('catalog_unavailable');
    }
  }
  async rate(key, maximum) {
    await this.scheduleCleanup();
    const now=Date.now(); const saved=await this.state.storage.get(key);
    const value=saved?.until>now ? saved : {count:0,until:now+60000};
    if(value.count>=maximum)return false;
    value.count++;await this.state.storage.put(key,value);return true;
  }
  async handle(request) {
    const path=new URL(request.url).pathname;
    if(path==='/partners'){
      if(this.env.PARTNER_TRACKING_ENABLED!=='true')return reply({code:'partner_tracking_disabled'},503);
      const {path:route,query,value,claims,client}=await request.json();
      const partners=new PartnerProgram(this.state.storage,{secret:this.env.PARTNER_HASH_SECRET});
      try{
        if(!await this.rate('partner-global',180)||!await this.rate('client:partner:'+client,20))return reply({code:'rate_limited'},429);
        let result;
        if(route==='/api/partners/click')result=await partners.capture(value,client);
        else if(route==='/api/partners/handoff')result=await partners.handoff(value);
        else if(route==='/api/partners/admin')result=await partners.command(claims,value);
        else if(route==='/api/partners/list')result={partners:await partners.list(claims),admin:claims?.atlasOperator===true};
        else if(['/api/partners/report','/api/partners/export'].includes(route)){
          await partners.authorize(claims,query.partnerId);
          result=await partnerReport(this.state.storage,query);
          if(route.endsWith('/export'))return new Response(reportCsv(result),{headers:{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'no-store','Content-Disposition':'attachment; filename="atlas-partner-report.csv"'}});
        }else return reply({code:'not_found'},404);
        await this.schedulePartnerSync();
        // Queued durable projection is explicit; an outage never rolls back a sale.
        return reply({...result,firestoreSync:await this.state.storage.get('pt:sync')||{ok:false,pending:true}});
      }catch(error){return reply({code:'partner_request_rejected',message:error instanceof PartnerError?error.message:'Partner service unavailable'},error instanceof PartnerError?400:503);}
    }
    if(path==='/business-report') {
      const days=Number(new URL(request.url).searchParams.get('days')||30);
      return reply(await businessReport(this.state.storage,{days}));
    }
    if(path==='/state') {
      if(request.method==='POST') {
        const body=await request.json();
        if(Object.keys(body).length!==1||typeof body.enabled!=='boolean')return reply({code:'invalid_state'},400);
        await this.state.storage.put('bot-enabled',body.enabled);
      }
      return reply({service:'atlas-market',enabled:await this.enabled()});
    }
    if(path==='/catalog') {
      if(!await this.rate('website-global',300))return reply({code:'catalog_rate_limited'},429);
      const client=request.headers.get('x-atlas-client');
      if(client && !await this.rate('client:'+client,30))return reply({code:'catalog_rate_limited'},429);
      try{return reply(await this.catalog());}catch{return reply({code:'catalog_unavailable'},503);}
    }
    if(path==='/telegram') {
      if(!await this.enabled())return reply({ok:true,disabled:true});
      const update=await request.json();
      const chat=update.callback_query?.message?.chat||update.message?.chat;
      const allowed=String(this.env.TELEGRAM_CATALOG_CHAT_IDS||'').split(',').map(s=>s.trim()).filter(s=>/^-?\d+$/.test(s));
      const publicPrivate=this.env.TELEGRAM_SHOP_ENABLED==='true'&&chat?.type==='private';
      if(!chat || (!publicPrivate&&!allowed.includes(String(chat.id))))return reply({ok:true});
      const receiptKey='update:'+update.update_id;
      const receipt=await this.state.storage.get(receiptKey);
      if(receipt?.until>Date.now())return reply({ok:true,duplicate:true});
      // Claim before any outgoing message; unknown send outcomes are not replayed.
      await this.state.storage.put(receiptKey,{until:Date.now()+48*3600000});
      await this.scheduleCleanup();
      if(!await this.rate('telegram-global',120))return reply({ok:true,limited:true});
      if(!await this.rate('chat:'+chat.id,20))return reply({ok:true,limited:true});
      const blocked=await this.state.storage.get('telegram-cooldown')||0;
      if(blocked>Date.now())return reply({ok:true,limited:true});
      const api=new TelegramApi(this.env.TELEGRAM_BOT_TOKEN);
      const bot=new TelegramCatalogBot({api,catalog:{list:()=>this.catalog()},allowedChatIds:allowed,
        groupUrl:storefrontSettings(this.env).telegramUrl,username:this.env.TELEGRAM_BOT_USERNAME||'AtlasCrmMarketBot'});
      try {
        const adminIds=String(this.env.TELEGRAM_SHOP_ADMIN_IDS||'').split(',').filter(id=>/^\d+$/.test(id));
        const partnerEnabled=this.env.PARTNER_TRACKING_ENABLED==='true';
        const partners=partnerEnabled?new PartnerProgram(this.state.storage,{secret:this.env.PARTNER_HASH_SECRET}):null;
        const orders=new ShopOrders(this.state.storage,{adminIds,partnerSecret:partnerEnabled?this.env.PARTNER_HASH_SECRET:''});
        const payments=new BinanceManualPaymentProvider(paymentConfiguration(this.env),orders);
        const shop=this.env.TELEGRAM_SHOP_ENABLED==='true'?new TelegramShop({api,orders,payments,partners,catalog:{list:()=>this.catalog()},adminIds,
          supportUrl:this.env.TELEGRAM_SHOP_SUPPORT_URL||'',channelUrl:storefrontSettings(this.env).telegramUrl,username:this.env.TELEGRAM_BOT_USERNAME||'AtlasCrmMarketBot'}):null;
        if(!shop||!await shop.handle(update))await bot.handleUpdate(update);
      }catch(error){
        if(error.retryAfter)await this.state.storage.put('telegram-cooldown',Date.now()+error.retryAfter*1000);
        // Catalog bot never pays; a lost reply can be requested again by the buyer.
      }
      await this.schedulePartnerSync();
      return reply({ok:true});
    }
    return reply({code:'not_found'},404);
  }
  async alarm() {
    return this.serialize(()=>this.cleanup());
  }
  async cleanup() {
    let pendingProjection=false;
    if(this.env.PARTNER_TRACKING_ENABLED==='true')pendingProjection=(await this.partnerMirror.flush(this.state.storage)).pending;
    for(const prefix of ['update:','client:','chat:','payment-dialog:']) {
      let startAfter;
      while(true) {
        const values=await this.state.storage.list({prefix,limit:128,...(startAfter?{startAfter}:{})});
        const expired=[...values].filter(([,value])=>!value||value.until<=Date.now()).map(([key])=>key);
        if(expired.length)await this.state.storage.delete(expired);
        if(values.size<128)break;
        startAfter=[...values.keys()].at(-1);
      }
    }
    // Expired short-lived capabilities are deleted; accounting records are retained.
    for(const prefix of ['pt:ticket:','pt:visit:','pt:visitor:']){
      const values=await this.state.storage.list({prefix,limit:128});
      const expired=[...values].filter(([,v])=>(v.expires??v.until)<=Date.now()).map(([key])=>key);
      if(expired.length)await this.state.storage.delete(expired);
    }
    await this.state.storage.setAlarm(Date.now()+(pendingProjection?60000:3600000));
  }
}
