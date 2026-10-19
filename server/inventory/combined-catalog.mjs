import {mergeSupplierOffers} from './catalog.mjs';
// Costs stay in this function's private inputs, never in its returned products.
export function combinedCatalog(current,newOffers,mappings,products,{now=Date.now()}={}){
  const offers=[...current.offers,...newOffers],selected=mappings.filter(m=>m.enabled===true);
  const canonical=products.map(p=>{
    const mapped=selected.filter(m=>m.productId===p.id);
    const currencies=new Set(offers.filter(o=>mapped.some(m=>m.sourceId===o.sourceId&&m.offerId===o.id)).map(o=>o.currency));
    if(currencies.size>1)throw Error('Mapped suppliers use different currencies; conversion policy is required.');
    return {...p,published:p.active!==false,currency:[...currencies][0]||''};
  });
  const merged=mergeSupplierOffers(canonical,selected,offers,{now,maxAgeMs:60000}),selections=new Map();
  const result=merged.map(p=>{
    const eligible=offers.filter(o=>o.currency===p.currency&&Number.isFinite(o.unitCost)&&o.unitCost>0&&(o.unlimited||o.available>0)&&selected.some(m=>m.productId===p.id&&m.sourceId===o.sourceId&&m.offerId===o.id)).sort((a,b)=>a.unitCost-b.unitCost);
    const winner=eligible[0];if(winner)selections.set('atlas_'+p.id,{sourceId:winner.sourceId,offerId:winner.id});
    const base=winner?.sourceId==='canboso'?current.products.find(x=>x.id===winner.id):null;
    return {...(base||{description:'',image:'',type:winner?.requiresGmail?'slot':'account',sold:null,promotions:[],requirements:{email:winner?.requiresGmail===true,accounts:false,months:false,allowedMonths:[]}}),...p,id:'atlas_'+p.id};
  });
  const mapped=(sourceId,id)=>selected.some(m=>m.sourceId===sourceId&&m.offerId===id);
  for(const p of current.products)if(!mapped('canboso',p.id))result.push(p);
  for(const o of newOffers)if(!mapped('nam',o.id)){
    const [p]=mergeSupplierOffers([{id:o.id,name:o.name,currency:o.currency,published:true}],[{enabled:true,productId:o.id,sourceId:'nam',offerId:o.id,stockPoolId:'nam-'+o.id}],[o],{now,maxAgeMs:60000});
    if(p){result.push({...p,id:'nam_'+o.id,description:'',image:'',type:o.requiresGmail?'slot':'account',sold:null,promotions:[],requirements:{email:o.requiresGmail,accounts:false,months:false,allowedMonths:[]}});selections.set('nam_'+o.id,{sourceId:'nam',offerId:o.id});}
  }
  return {products:result,selections};
}
