// All money is integer minor units. These transactions share the order store.
export class PartnerError extends Error {}
const fail=message=>{throw new PartnerError(message);};
const valid=(value,pattern)=>typeof value==='string'&&pattern.test(value);
const ID=/^[A-Za-z0-9_-]{1,48}$/;
const DAY=86400000;
export const WINDOW=30*DAY;
export const hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
export async function privateHash(secret,text){
  if(typeof secret!=='string'||secret.length<32)fail('Tracking identity protection is not configured');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
const random=()=>[...crypto.getRandomValues(new Uint8Array(24))].map(n=>n.toString(16).padStart(2,'0')).join('');
const int=(value,max=1e9)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
export async function records(tx,prefix){
  const result=[];let startAfter;
  for(;;){
    const batch=await tx.list({prefix,limit:100,...(startAfter?{startAfter}:{})});
    result.push(...batch.values());if(result.length>10000)fail('Report scan limit reached; narrow or archive the dataset');
    if(batch.size<100)return result;startAfter=[...batch.keys()].at(-1);
  }
}
// Mirror records and the retry marker commit alongside the canonical write.
export async function put(tx,key,value){
  await tx.put(key,value);
  if(!key.startsWith('pt:ticket:')&&!key.startsWith('pt:visitor:')&&!key.startsWith('pt:visit:'))
    await tx.put('pt:outbox:'+await hash(key),{key,value});
}
export async function reconcileCommission(tx,order,now=Date.now()){
  const attribution=order.partnerAttribution;if(!attribution)return;
  await put(tx,'pt:order:'+order.id,{orderId:order.id,partnerId:attribution.partnerId,campaignId:attribution.campaignId,
    createdAt:order.createdAt,paymentStatus:order.paymentStatus,deliveryStatus:order.deliveryStatus,at:now,
    clickId:attribution.clickId||null,totalAmount:order.totalAmount,currency:order.currency});
  const creditKey='pt:ledger:'+order.id+'_credit',reverseKey='pt:ledger:'+order.id+'_reverse';
  const credit=await tx.get(creditKey),reverse=await tx.get(reverseKey);
  const cancelled=['CANCELLED','REFUNDED'].includes(order.paymentStatus);
  if(!credit&&!cancelled&&order.paymentStatus==='PAYMENT_VERIFIED'&&order.deliveryStatus==='DELIVERED'){
    await put(tx,creditKey,{id:order.id+'_credit',orderId:order.id,partnerId:attribution.partnerId,campaignId:attribution.campaignId,
      minor:attribution.commissionMinor,currency:'BDT',type:'credit',at:now});
  }
  if(credit&&!reverse&&cancelled)await put(tx,reverseKey,{...credit,id:order.id+'_reverse',minor:-credit.minor,type:'reversal',at:now});
}
export async function orderAttribution(tx,buyer,product,now,secret){
  const customer=await tx.get('pt:customer:'+await privateHash(secret,'buyer:'+buyer));
  if(!customer||customer.until<=now)return null;
  const partner=await tx.get('pt:partner:'+customer.partnerId),campaign=await tx.get('pt:campaign:'+customer.campaignId);
  if(!partner?.active||!campaign?.active||campaign.productId&&campaign.productId!==product.id)return null;
  return {...customer,commissionMinor:partner.commissionMinor};
}

export class PartnerProgram{
  constructor(storage,{now=Date.now,secret='',token=random}={}){this.storage=storage;this.now=now;this.secret=secret;this.token=token;}
  async capture({partnerId,campaignId,visitor},client){
    if(!valid(partnerId,ID)||!valid(campaignId,ID)||!valid(visitor,/^[A-Za-z0-9_-]{20,64}$/))fail('Invalid referral');
    const visitorHash=await privateHash(this.secret,'visitor:'+visitor);
    return this.storage.transaction(async tx=>{
      const partner=await tx.get('pt:partner:'+partnerId),campaign=await tx.get('pt:campaign:'+campaignId);
      if(!partner?.active||!campaign?.active||campaign.partnerId!==partnerId)fail('Referral is not active');
      const saved=await tx.get('pt:visitor:'+visitorHash);
      if(saved?.until>this.now())return {visit:saved.visit,duplicate:true,until:saved.until};
      const id=this.token(),visit=this.token(),now=this.now(),until=now+WINDOW;
      const click={id,partnerId,campaignId,productId:campaign.productId||null,source:'facebook',visitor:visitorHash,at:now,until};
      await put(tx,'pt:click:'+id,click);
      await tx.put('pt:visit:'+await hash(visit),click);
      await tx.put('pt:visitor:'+visitorHash,{visit,until});
      // client is a rotating keyed hash, never the raw IP address.
      if(client)await put(tx,'pt:audit:'+id,{action:'click_accepted',at:now,partnerId,campaignId,client});
      return {visit,duplicate:false,until};
    });
  }
  async handoff({visit,productId=''}){
    if(!valid(visit,/^[a-f0-9]{48}$/)||productId&&!valid(productId,ID))fail('Invalid handoff');
    return this.storage.transaction(async tx=>{
      const click=await tx.get('pt:visit:'+await hash(visit));
      if(!click||click.until<=this.now())fail('Referral expired');
      const partner=await tx.get('pt:partner:'+click.partnerId),campaign=await tx.get('pt:campaign:'+click.campaignId);
      if(!partner?.active||!campaign?.active||campaign.productId&&productId&&campaign.productId!==productId)fail('Referral is not active');
      const token=this.token();
      await tx.put('pt:ticket:'+await hash(token),{...click,productId:campaign.productId||productId||null,expires:this.now()+20*60000,usedBy:null});
      return {url:'https://t.me/AtlasCrmMarketBot?start=r_'+token,expiresAt:this.now()+20*60000};
    });
  }
  async start(token,buyer){
    if(!valid(token,/^[a-f0-9]{48}$/)||!Number.isSafeInteger(buyer)||buyer<=0)fail('Invalid referral token');
    const buyerHash=await privateHash(this.secret,'buyer:'+buyer);
    return this.storage.transaction(async tx=>{
      const key='pt:ticket:'+await hash(token),ticket=await tx.get(key);
      if(!ticket||ticket.expires<=this.now()||ticket.until<=this.now()||ticket.usedBy&&ticket.usedBy!==buyerHash)fail('Referral token expired or already used');
      const partner=await tx.get('pt:partner:'+ticket.partnerId),campaign=await tx.get('pt:campaign:'+ticket.campaignId);
      if(!partner?.active||!campaign?.active)fail('Referral is not active');
      if(partner.selfBuyerHash===buyerHash)fail('Self-referrals are not eligible');
      if(!ticket.usedBy){
        await tx.put(key,{...ticket,usedBy:buyerHash});
        const customerKey='pt:customer:'+buyerHash,current=await tx.get(customerKey);
        if(!current||current.until<=this.now())await put(tx,customerKey,{partnerId:ticket.partnerId,campaignId:ticket.campaignId,clickId:ticket.id,at:ticket.at,until:ticket.until});
        await put(tx,'pt:start:'+ticket.id+'_'+buyerHash,{partnerId:ticket.partnerId,campaignId:ticket.campaignId,at:this.now()});
      }
      return {productId:ticket.productId};
    });
  }
  async authorize(claims,partnerId){
    if(!claims?.sub)fail('Authentication required');
    if(claims.atlasOperator===true)return;
    const partner=await this.storage.get('pt:partner:'+partnerId);
    if(!partner?.active||partner.ownerUid!==claims.sub)fail('Partner access denied');
  }
  async list(claims){
    if(!claims?.sub)fail('Authentication required');
    const partners=await records(this.storage,'pt:partner:');
    return partners.filter(p=>claims.atlasOperator===true||p.active&&p.ownerUid===claims.sub);
  }
  async command(actor,input){
    if(actor?.atlasOperator!==true||!actor.sub)fail('Admin access required');
    if(!valid(input.requestId,/^[A-Za-z0-9_-]{8,64}$/))fail('A unique request ID is required');
    const digest=await hash(JSON.stringify(input));
    return this.storage.transaction(async tx=>{
      const receiptKey='pt:request:'+input.requestId,receipt=await tx.get(receiptKey);
      if(receipt){if(receipt.digest!==digest)fail('Request ID conflicts with a previous action');return receipt.result;}
      const at=this.now(),partnerId=input.partnerId;
      if(!valid(partnerId,ID))fail('Invalid partner ID');
      const key='pt:partner:'+partnerId;let partner=await tx.get(key);let result={ok:true};
      if(input.action==='createPartner'){
        if(partner||typeof input.ownerUid!=='string'||!input.ownerUid||input.ownerUid.length>128||typeof input.name!=='string'||!input.name.trim()||input.name.length>120)fail('Invalid or existing partner');
        partner={id:partnerId,name:input.name.trim(),ownerUid:input.ownerUid,active:true,commissionMinor:1000,budgetLimitMinor:10000,budgetCurrency:'USD',createdAt:at};
        if(input.telegramBuyerId){
          if(!/^[1-9][0-9]{0,15}$/.test(input.telegramBuyerId))fail('Invalid partner Telegram identity');
          partner.selfBuyerHash=await privateHash(this.secret,'buyer:'+input.telegramBuyerId);
        }
        await put(tx,key,partner);
      }else{
        if(!partner)fail('Partner not found');
        if(input.action==='updatePartner'){
          if(typeof input.active!=='boolean'||!int(input.commissionMinor,100000)||!int(input.budgetLimitMinor,10000))fail('Invalid policy; monthly maximum is USD 100');
          partner={...partner,active:input.active,commissionMinor:input.commissionMinor,budgetLimitMinor:input.budgetLimitMinor};await put(tx,key,partner);
        }else if(input.action==='campaign'){
          if(!valid(input.campaignId,ID)||input.productId&&!valid(input.productId,ID))fail('Invalid campaign');
          const campaignKey='pt:campaign:'+input.campaignId;if(await tx.get(campaignKey))fail('Campaign already exists');
          const metadata={};
          for(const field of ['label','creative','hypothesis'])if(input[field]!==undefined){
            if(typeof input[field]!=='string'||input[field].length>240)fail('Invalid campaign description');
            metadata[field]=input[field].trim();
          }
          await put(tx,campaignKey,{id:input.campaignId,partnerId,productId:input.productId||null,active:true,createdAt:at,...metadata});
          result={url:'https://atlascrm-c5722.web.app/?catalog=1&ref='+partnerId+'&campaign='+input.campaignId+'&utm_source=facebook&utm_medium=paid&utm_campaign='+input.campaignId+'&utm_content='+input.campaignId+(input.productId?'&product='+input.productId:'')};
        }else if(input.action==='bindMetaAd'){
          const campaignKey='pt:campaign:'+input.campaignId,campaign=await tx.get(campaignKey);
          if(!campaign||campaign.partnerId!==partnerId||!valid(input.metaAccountId,/^[0-9]{1,30}$/)||!valid(input.metaAdId,/^[0-9]{1,30}$/))fail('Select a tracking campaign and numeric Meta account/ad IDs');
          if(campaign.metaAdId&&(campaign.metaAdId!==input.metaAdId||campaign.metaAccountId!==input.metaAccountId))fail('Ad mapping is immutable; create a new tracking campaign for a different ad');
          const duplicate=(await records(tx,'pt:campaign:')).some(c=>c.id!==campaign.id&&c.metaAccountId===input.metaAccountId&&c.metaAdId===input.metaAdId);
          if(duplicate)fail('This Meta ad is already assigned to another tracking campaign');
          await put(tx,campaignKey,{...campaign,metaAccountId:input.metaAccountId,metaAdId:input.metaAdId});
        }else if(input.action==='approveBudget'){
          if(!valid(input.month,/^\d{4}-(0[1-9]|1[0-2])$/)||!int(input.minor,partner.budgetLimitMinor))fail('Budget exceeds the monthly limit');
          await put(tx,'pt:budget:'+partnerId+'_'+input.month,{partnerId,month:input.month,minor:input.minor,currency:'USD',actor:actor.sub,at});
        }else if(input.action==='spend'){
          const campaign=await tx.get('pt:campaign:'+input.campaignId);
          if(!campaign||campaign.partnerId!==partnerId||!valid(input.date,/^\d{4}-\d{2}-\d{2}$/)||!Number.isFinite(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date||!int(input.minor)||!valid(input.currency,/^[A-Z]{3}$/)
            ||typeof input.evidence!=='string'||!input.evidence.trim()||input.evidence.length>500)fail('Spend needs a campaign, date, currency and evidence reference');
          const spendKey='pt:spend:'+partnerId+'_'+input.campaignId+'_'+input.date+'_'+input.currency;
          // One verified aggregate per campaign/day/currency; corrections have an audit trail.
          await put(tx,spendKey,{partnerId,campaignId:input.campaignId,date:input.date,minor:input.minor,currency:input.currency,evidence:input.evidence,actor:actor.sub,at});
        }else if(input.action==='approvePayout'){
          const ledger=(await records(tx,'pt:ledger:')).filter(x=>x.partnerId===partnerId);
          const payouts=(await records(tx,'pt:payout:')).filter(x=>x.partnerId===partnerId);
          const due=ledger.reduce((n,x)=>n+x.minor,0)-payouts.filter(x=>['approved','paid'].includes(x.status)).reduce((n,x)=>n+x.minor,0);
          if(!int(input.minor)||input.minor<=0||input.minor>due)fail('Payout exceeds unreserved commission due');
          await put(tx,'pt:payout:'+input.requestId,{id:input.requestId,partnerId,minor:input.minor,currency:'BDT',status:'approved',at,approvedBy:actor.sub});
        }else if(input.action==='cancelPayout'){
          const payoutKey='pt:payout:'+input.payoutId,payout=await tx.get(payoutKey);
          if(!payout||payout.partnerId!==partnerId||payout.status!=='approved'||typeof input.note!=='string'||!input.note.trim()||input.note.length>500)fail('Approved payout and cancellation reason required');
          await put(tx,payoutKey,{...payout,status:'cancelled',cancelledAt:at,cancelledBy:actor.sub,note:input.note});
        }else if(input.action==='settlePayout'){
          const payoutKey='pt:payout:'+input.payoutId,payout=await tx.get(payoutKey);
          if(!payout||payout.partnerId!==partnerId||payout.status!=='approved'||typeof input.evidence!=='string'||!input.evidence.trim()||input.evidence.length>500)fail('An approved payout and settlement reference are required');
          const net=(await records(tx,'pt:ledger:')).filter(x=>x.partnerId===partnerId).reduce((n,x)=>n+x.minor,0);
          const paid=(await records(tx,'pt:payout:')).filter(x=>x.partnerId===partnerId&&x.status==='paid').reduce((n,x)=>n+x.minor,0);
          if(payout.minor>net-paid)fail('Refund adjustment reduced commission due; review before settling');
          await put(tx,payoutKey,{...payout,status:'paid',settledAt:at,settledBy:actor.sub,evidence:input.evidence});
        }else if(['refund','cancelOrder'].includes(input.action)){
          const order=await tx.get('order:'+input.orderId);
          if(!order||order.partnerAttribution?.partnerId!==partnerId||typeof input.note!=='string'||!input.note.trim()||input.note.length>500)fail('Attributed order and audit note required');
          if(input.action==='refund'&&!['PAYMENT_VERIFIED','REFUNDED'].includes(order.paymentStatus))fail('Only a verified payment can be recorded as refunded');
          if(input.action==='cancelOrder'&&['PAYMENT_VERIFIED','REFUNDED'].includes(order.paymentStatus))fail('Use refund after verification');
          order.paymentStatus=input.action==='refund'?'REFUNDED':'CANCELLED';order.status=input.action==='refund'?'refunded':'cancelled';order.updatedAt=at;
          order.events.push({type:input.action,actor:actor.sub,at,note:input.note});await tx.put('order:'+order.id,order);await reconcileCommission(tx,order,at);
        }else fail('Unknown admin action');
      }
      const auditInput=structuredClone(input);delete auditInput.telegramBuyerId;
      await put(tx,'pt:audit:'+input.requestId,{at,actor:actor.sub,partnerId,action:input.action,input:auditInput});
      await tx.put(receiptKey,{digest,result});return result;
    });
  }
}
