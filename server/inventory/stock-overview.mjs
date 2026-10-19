import {supplierStockSummary} from '../../js/utils/stock-overview.js';
export {supplierStockSummary};
export async function attachSupplierOverview(owned,{states,loadCatalog,getSources}){
  try{
    const catalog=await loadCatalog();
    const supplier=supplierStockSummary(getSources(),catalog.products,{stale:catalog.stale===true});
    return {...owned,supplier:{...supplier,status:'available',fetchedAt:catalog.fetchedAt},potentialKnown:owned.available+supplier.known};
  }catch{
    return {...owned,supplier:{status:'unavailable',sources:states.map(s=>({id:s.id,name:s.name,enabled:s.enabled,ready:s.ready})),known:null,unknown:null},potentialKnown:null};
  }
}
