import {InventoryVault} from './vault.mjs';
import {supplierStates} from './suppliers.mjs';
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value);
const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export class InventoryError extends Error {}
const fail=message=>{throw new InventoryError(message);};
const requireId=(value,label)=>{if(!validId(value))fail('Invalid '+label);return value;};
const text=(value,label,max=200)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail('Enter '+label);return value.trim();};
const publicUnit=unit=>{
  const {id,productId,productName,source,cost,currency,acquiredAt,expiresAt,state,createdAt,updatedAt,customerId,purchaseId,assignedAt,deliveredAt,retiredAt}=unit;
  return {id,productId,productName,source,cost,currency,acquiredAt,expiresAt,state,createdAt,updatedAt,...(customerId?{customerId,purchaseId,assignedAt}:{}),...(deliveredAt?{deliveredAt}:{}),...(retiredAt?{retiredAt}:{})};
};
export class InventoryProgram {
  constructor(storage,{keyring,references,now=Date.now,today=day,supplierReadiness={canboso:true,nam:false}}={}){this.storage=storage;this.vault=new InventoryVault(keyring);this.references=references;this.now=now;this.today=today;this.supplierReadiness=supplierReadiness;}
  authorize(claims){if(claims?.atlasOperator!==true||!claims.sub)fail('Operator access required.');}
  async list(claims,{cursor='',purchaseId=''}={}){
    this.authorize(claims);if(cursor&&!/^iv:unit:[A-Za-z0-9_-]{1,100}$/.test(cursor))fail('Invalid page cursor.');
    if(purchaseId){requireId(purchaseId,'purchase');const linked=await this.storage.get('iv:purchase:'+purchaseId);const unit=linked?await this.storage.get('iv:unit:'+linked.unitId):null;return {units:unit?[publicUnit(unit)]:[],cursor:null};}
    const page=[...await this.storage.list({prefix:'iv:unit:',startAfter:cursor,limit:51})];
    const maps=[...await this.storage.list({prefix:'iv:map:',limit:101})];
    return {units:page.slice(0,50).map(([,unit])=>publicUnit(unit)),cursor:page.length>50?page[49][0]:null,mappings:maps.slice(0,100).map(([,m])=>m),mappingsTruncated:maps.length>100,suppliers:await supplierStates(this.storage,this.supplierReadiness)};
  }
  async summary(claims){
    this.authorize(claims);
    const result={total:0,available:0,expired:0,assigned:0,delivered:0,retired:0,truncated:false};
    let cursor='',scanned=0;
    do{
      const page=[...await this.storage.list({prefix:'iv:unit:',startAfter:cursor,limit:500})];
      for(const [,unit]of page){result.total++;if(unit.state==='available'&&unit.expiresAt&&unit.expiresAt<this.today())result.expired++;else if(['available','assigned','delivered','retired'].includes(unit.state))result[unit.state]++;}
      scanned+=page.length;cursor=page.at(-1)?.[0]||'';
      if(page.length<500)break;
      if(scanned>=10000){result.truncated=!!(await this.storage.list({prefix:'iv:unit:',startAfter:cursor,limit:1})).size;break;}
    }while(cursor);
    return result;
  }
  async audit(tx,claims,type,unitId,requestId){await tx.put('iv:audit:'+this.now()+':'+requestId,{type,unitId,actor:claims.sub,at:this.now()});}
  async command(claims,input){
    this.authorize(claims);
    if(!input||typeof input!=='object'||Array.isArray(input))fail('Invalid inventory request.');
    const action=input.action,requestId=requireId(input.requestId,'save request');
    if(requestId.length<16)fail('Reopen the form and retry.');
    if(!['receive','assign','deliver','retire','reveal','mapOffer','setSupplier'].includes(action))fail('Unknown inventory action.');
    // HMAC receipts contain neither a credential nor a guessable plaintext digest.
    const digest=await this.vault.fingerprint(JSON.stringify(input));
    if(action==='reveal'){
      const unitId=requireId(input.unitId,'unit'),unit=await this.storage.get('iv:unit:'+unitId);
      if(!unit)fail('Inventory item not found.');
      const secret=await this.storage.get('iv:secret:'+unitId);
      const credentials=await this.vault.decrypt(secret,unit.id+':'+unit.productId);
      await this.storage.transaction(tx=>this.audit(tx,claims,'credentials_revealed',unitId,requestId));
      return {unitId,credentials};
    }
    const previous=await this.storage.get('iv:receipt:'+requestId);
    if(previous){if(previous.actor!==claims.sub||previous.digest!==digest)fail('Save request was already used with different details.');return previous.result;}
    if(action==='setSupplier'){
      if(!['canboso','nam'].includes(input.sourceId)||typeof input.enabled!=='boolean')fail('Choose a supplier and on/off state.');
      if(input.enabled&&this.supplierReadiness[input.sourceId]!==true)fail('This supplier is not configured for activation yet.');
      return this.storage.transaction(async tx=>{
        const receipt=await tx.get('iv:receipt:'+requestId);if(receipt){if(receipt.actor!==claims.sub||receipt.digest!==digest)fail('Save request conflict.');return receipt.result;}
        await tx.put('iv:supplier:'+input.sourceId,{enabled:input.enabled,updatedAt:this.now(),updatedBy:claims.sub});
        // Invalidate legacy cache in the same commit so a toggle cannot show old offers.
        await tx.put('catalog',null);await tx.put('supplier-cooldown',0);
        await this.audit(tx,claims,input.enabled?'supplier_enabled':'supplier_disabled',input.sourceId,requestId);
        const result={sourceId:input.sourceId,enabled:input.enabled};await tx.put('iv:receipt:'+requestId,{actor:claims.sub,digest,result});return result;
      });
    }
    if(action==='mapOffer'){
      const productId=requireId(input.productId,'product'),offerId=requireId(input.offerId,'supplier product'),stockPoolId=requireId(input.stockPoolId,'stock pool');
      if(!['canboso','nam'].includes(input.sourceId)||typeof input.enabled!=='boolean')fail('Choose a configured supplier and mapping status.');
      if(input.sourceId==='nam'&&!/^\d{1,16}$/.test(offerId))fail('The new supplier uses numeric product IDs.');
      const product=await this.references.read('products',productId);if(!product)fail('Saved CRM product not found.');
      return this.storage.transaction(async tx=>{
        const receipt=await tx.get('iv:receipt:'+requestId);if(receipt){if(receipt.digest!==digest||receipt.actor!==claims.sub)fail('Save request conflict.');return receipt.result;}
        const prior=await tx.get('iv:map:'+input.sourceId+':'+offerId);
        if(prior&&prior.productId!==productId)fail('This supplier offer is already mapped to a different product. Disable it and review equivalence before changing products.');
        const result={mapping:{productId,productName:product.name,sourceId:input.sourceId,offerId,stockPoolId,enabled:input.enabled,updatedAt:this.now()}};
        await tx.put('iv:map:'+input.sourceId+':'+offerId,result.mapping);await this.audit(tx,claims,'supplier_mapping_saved',productId,requestId);
        await tx.put('iv:receipt:'+requestId,{actor:claims.sub,digest,result});return result;
      });
    }
    if(action==='receive'){
      const productId=requireId(input.productId,'product'),product=await this.references.read('products',productId);
      if(!product||product.active===false)fail('Choose an active saved CRM product.');
      const source=text(input.source,'the supplier/source name'),credentials=text(input.credentials,'delivery credentials',12000);
      const cost=String(input.cost??'').trim(),currency=input.currency;
      if(!/^\d{1,9}(\.\d{1,6})?$/.test(cost)||!['BDT','USD','USDT'].includes(currency))fail('Enter a valid acquisition cost and currency.');
      if(!date(input.acquiredAt)||input.expiresAt&&(!date(input.expiresAt)||input.expiresAt<input.acquiredAt))fail('Enter valid acquisition and stock expiry dates.');
      const id=requestId,fingerprint=await this.vault.fingerprint(credentials),sealed=await this.vault.encrypt(credentials,id+':'+productId);
      return this.storage.transaction(async tx=>{
        const receipt=await tx.get('iv:receipt:'+requestId);if(receipt){if(receipt.digest!==digest||receipt.actor!==claims.sub)fail('Save request conflict.');return receipt.result;}
        if(await tx.get('iv:fingerprint:'+fingerprint))fail('These credentials are already recorded in inventory.');
        const unit={id,productId,productName:text(product.name,'product name'),source,cost,currency,acquiredAt:input.acquiredAt,expiresAt:input.expiresAt||null,state:'available',createdAt:this.now(),updatedAt:this.now()};
        await tx.put('iv:unit:'+id,unit);await tx.put('iv:secret:'+id,sealed);await tx.put('iv:fingerprint:'+fingerprint,{unitId:id});
        await this.audit(tx,claims,'stock_received',id,requestId);
        const result={unit:publicUnit(unit)};await tx.put('iv:receipt:'+requestId,{actor:claims.sub,digest,result});return result;
      });
    }
    const unitId=requireId(input.unitId,'unit');
    let purchase,customer;
    if(action==='assign'){
      requireId(input.customerId,'customer');requireId(input.purchaseId,'purchase');
      [purchase,customer]=await Promise.all([this.references.read('purchases',input.purchaseId),this.references.read('customers',input.customerId)]);
      if(!purchase||!customer||purchase.customerId!==input.customerId)fail('Choose a purchase belonging to this customer.');
      if(['cancelled','refunded'].includes(purchase.paymentStatus))fail('This purchase is cancelled or refunded.');
      if(purchase.paymentStatus!=='paid')fail('Record the paid purchase before assigning stock.');
    }
    return this.storage.transaction(async tx=>{
      const receipt=await tx.get('iv:receipt:'+requestId);if(receipt){if(receipt.digest!==digest||receipt.actor!==claims.sub)fail('Save request conflict.');return receipt.result;}
      const unit=await tx.get('iv:unit:'+unitId);if(!unit)fail('Inventory item not found.');
      if(action==='assign'){
        if(unit.state!=='available')fail('This item is no longer available.');
        if(unit.expiresAt&&unit.expiresAt<this.today())fail('This stock item has expired.');
        if(unit.expiresAt&&purchase.expiryDate&&unit.expiresAt<purchase.expiryDate)fail('This stock item expires before the purchased product term ends.');
        if(purchase.productId!==unit.productId)fail('Purchase and inventory must use the same saved CRM product.');
        if(await tx.get('iv:purchase:'+input.purchaseId))fail('This purchase already has an assigned item.');
        Object.assign(unit,{state:'assigned',customerId:input.customerId,purchaseId:input.purchaseId,assignedAt:this.now(),assignedBy:claims.sub});
        await tx.put('iv:purchase:'+input.purchaseId,{unitId,customerId:input.customerId});
      }else if(action==='deliver'){
        if(unit.state!=='assigned')fail('Only an assigned item can be marked delivered.');
        if(input.confirmDelivered!==true)fail('Confirm you have manually delivered the product.');
        Object.assign(unit,{state:'delivered',deliveredAt:this.now(),deliveredBy:claims.sub});
      }else{
        if(unit.state!=='available')fail('Only an unassigned item can be retired.');
        Object.assign(unit,{state:'retired',retiredAt:this.now(),retiredBy:claims.sub});
      }
      unit.updatedAt=this.now();await tx.put('iv:unit:'+unitId,unit);await this.audit(tx,claims,action,unitId,requestId);
      const result={unit:publicUnit(unit)};await tx.put('iv:receipt:'+requestId,{actor:claims.sub,digest,result});return result;
    });
  }
}
