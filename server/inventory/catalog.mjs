import {retailPrice} from '../../js/utils/catalog-pricing.js';
// Explicit product mappings only. This projection is prepared for a future supplier
// integration; the current public catalog does not invoke it until policy is chosen.
export function mergeSupplierOffers(products,mappings,offers,{now=Date.now(),maxAgeMs=300000}={}){
  const output=[];
  for(const product of products){
    if(product.published!==true)continue;
    const selected=mappings.filter(m=>m.productId===product.id&&m.enabled===true);
    const matching=offers.filter(o=>selected.some(m=>m.sourceId===o.sourceId&&m.offerId===o.id)&&o.currency===product.currency&&Number.isFinite(o.fetchedAt)&&now-o.fetchedAt<=maxAgeMs&&o.fetchedAt<=now);
    if(!matching.length)continue;
    // A pool represents underlying stock shared by aliases/resellers: count it once.
    const pools=new Map();
    for(const offer of matching){
      const map=selected.find(m=>m.sourceId===offer.sourceId&&m.offerId===offer.id);
      if(!map.stockPoolId)throw Error('Supplier mapping needs an explicit stock pool.');
      const pool=pools.get(map.stockPoolId)||{available:0,known:false};
      if(Number.isSafeInteger(offer.available)&&offer.available>=0){pool.available=Math.max(pool.available,offer.available);pool.known=true;}
      pools.set(map.stockPoolId,pool);
    }
    const knownAvailable=[...pools.values()].reduce((n,p)=>n+p.available,0);
    const unknown=matching.some(o=>o.unlimited===true)||[...pools.values()].some(p=>!p.known);
    const available=unknown?null:knownAvailable;
    // Cheapest available supplier COST, then apply the Atlas margin exactly once.
    // Cross-currency offers cannot join a total or compete without an explicit FX policy.
    const eligible=matching.filter(o=>Number.isFinite(o.unitCost)&&o.unitCost>0&&(o.unlimited===true||Number.isSafeInteger(o.available)&&o.available>0));
    const price=eligible.length?retailPrice(Math.min(...eligible.map(o=>o.unitCost)),product.currency,available):null;
    output.push({id:product.id,name:product.name,currency:product.currency,price,available,knownAvailable,
      stock:knownAvailable>0?'available':unknown?'unknown':'out'});
  }
  return output;
}
