import {previewState,storeKey} from './preview/runtime.js';
import {supplierStockSummary} from '../utils/stock-overview.js';
const receipts=new Map();
const reject=message=>{const error=Error(message);error.confirmedRejected=true;throw error;};
export async function inventoryFetch(path,{body}={}){
  if(path==='/api/inventory/summary'){
    const result={total:previewState.units.length,available:0,assigned:0,delivered:0,expired:0,retired:0,truncated:false};for(const unit of previewState.units)result[unit.state]++;
    const sources=previewState.suppliers.map(s=>({...s,products:[{available:s.id==='canboso'?2:3}]}));
    const supplier=supplierStockSummary(sources,sources.filter(s=>s.enabled).flatMap(s=>s.products));
    return {...result,supplier:{...supplier,status:'available',fetchedAt:new Date().toISOString()},potentialKnown:result.available+supplier.known};
  }
  if(path.startsWith('/api/inventory/list')){
    const purchaseId=new URLSearchParams(path.split('?')[1]).get('purchaseId');
    return structuredClone({...previewState,units:purchaseId?previewState.units.filter(u=>u.purchaseId===purchaseId):previewState.units,cursor:null});
  }
  if(path!=='/api/inventory/command'||!body)reject('Unsupported preview operation.');
  if(receipts.has(body.requestId))return structuredClone(receipts.get(body.requestId));
  const unit=previewState.units.find(u=>u.id===body.unitId);let result;
  if(body.action==='setSupplier'){
    const supplier=previewState.suppliers.find(s=>s.id===body.sourceId);if(!supplier)reject('Unknown simulated supplier.');supplier.enabled=body.enabled===true;result={...supplier};
  }else if(body.action==='receive'){
    // This build never stores arbitrary user credentials, even in browser storage.
    if(body.credentials!=='DEMO-ONLY')reject('Preview accepts only the literal DEMO-ONLY as fictional credentials. Never enter real credentials.');
    const data=JSON.parse(localStorage.getItem(storeKey));const product=data.products.find(p=>p.id===body.productId);if(!product)reject('Choose a saved fictional product.');
    const item={id:body.requestId,productId:product.id,productName:product.name,source:body.source,cost:body.cost,currency:body.currency,acquiredAt:body.acquiredAt,expiresAt:body.expiresAt||null,state:'available'};previewState.units.push(item);result={unit:item};
  }else if(body.action==='mapOffer'){
    previewState.mappings.push({productId:body.productId,sourceId:body.sourceId,offerId:body.offerId,stockPoolId:body.stockPoolId,enabled:body.enabled});result={simulated:true};
  }else{
    if(!unit)reject('Fictional inventory item not found.');
    if(body.action==='reveal')return {unitId:unit.id,credentials:'FICTIONAL PREVIEW ONLY — no real delivery credentials exist.'};
    if(body.action==='assign'){
      const data=JSON.parse(localStorage.getItem(storeKey)),purchase=data.purchases.find(p=>p.id===body.purchaseId&&p.customerId===body.customerId&&p.productId===unit.productId&&p.paymentStatus==='paid');
      if(unit.state!=='available'||!purchase||previewState.units.some(u=>u.purchaseId===body.purchaseId))reject('Choose an available fictional item and a matching paid purchase.');
      Object.assign(unit,{state:'assigned',customerId:body.customerId,purchaseId:body.purchaseId});
    }else if(body.action==='deliver'&&unit.state==='assigned'&&body.confirmDelivered)unit.state='delivered';
    else if(body.action==='retire'&&unit.state==='available')unit.state='retired';
    else reject('This simulated transition is unavailable.');result={unit};
  }
  receipts.set(body.requestId,structuredClone(result));return structuredClone(result);
}
