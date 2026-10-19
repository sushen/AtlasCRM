import {SupplierCatalog} from '../catalog.mjs';
import {NamCatalog} from '../suppliers/nam.mjs';
import {supplierConfiguration} from '../catalog-settings.mjs';
import {supplierStates} from './suppliers.mjs';
export async function loadSupplierOffers(storage,env,{fetchImpl=fetch}={}){
  const readiness={canboso:Boolean(supplierConfiguration(env).key),nam:Boolean(env.NAM_RESELLER_TOKEN)&&env.NAM_RESELLER_CURRENCY==='USD'};
  const states=await supplierStates(storage,readiness);
  const sources=await Promise.all(states.map(async source=>{
    if(!source.enabled)return {...source,status:source.ready?'off':'not_configured',offers:[]};
    try{
      if(source.id==='nam'){
        const offers=await new NamCatalog({token:env.NAM_RESELLER_TOKEN,currency:env.NAM_RESELLER_CURRENCY,fetchImpl}).offers();
        return {...source,status:'available',offers};
      }
      const adapter=new SupplierCatalog({...supplierConfiguration(env),fetchImpl});
      let catalog;
      if(readiness.canboso){try{catalog=await adapter.list();}catch{/* Fall back only to the existing public product projection. */}}
      if(!catalog){
        const response=await fetchImpl('https://atlas.meshstocks.workers.dev/api/catalog/products',{headers:{Origin:'https://atlascrm-c5722.web.app'},redirect:'manual',signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw Error();catalog=await response.json();
      }
      if(!Array.isArray(catalog.products))throw Error();
      const offers=catalog.products.map(product=>({id:product.id,sourceId:'canboso',name:product.name,description:product.description||'',
        unitCost:adapter.offerSnapshot?.find(o=>o.id===product.id)?.unitCost??null,retailPrice:product.price,currency:product.currency,
        available:product.available,requiresGmail:product.requirements?.email===true,fetchedAt:catalog.fetchedAt}));
      return {...source,status:'available',offers,fetchedAt:catalog.fetchedAt};
    }catch{return {...source,status:'unavailable',offers:[]};}
  }));
  return {sources,offers:sources.flatMap(s=>s.offers)};
}
