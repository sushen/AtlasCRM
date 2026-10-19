import {supplierStockSummary} from '../utils/stock-overview.js';
export async function inventoryFetch(path){
  if(path==='/api/inventory/summary'){
    const response=await fetch(new URL('../preview/catalog-snapshot.json',import.meta.url),{cache:'no-store'});
    if(!response.ok)throw Error('Real catalog snapshot is unavailable.');
    const catalog=await response.json();
    const summary=supplierStockSummary([{id:'canboso',name:'Canboso',enabled:true,products:catalog.products},{id:'nam',name:'NAM (not connected)',enabled:false,products:[]}],catalog.products,{stale:true});
    return {total:null,available:null,assigned:null,delivered:null,expired:null,retired:null,truncated:false,potentialKnown:null,
      supplier:{...summary,status:'available',fetchedAt:catalog.fetchedAt,snapshot:true,products:catalog.products.map(p=>({id:p.id,name:p.name,available:p.available,knownAvailable:p.knownAvailable??null}))}};
  }
  throw Error('Private inventory and supplier switches require an isolated staging backend. No simulated stock or credentials are shown here.');
}
