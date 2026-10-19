export function supplierStockSummary(suppliers,products,{stale=false}={}){
  const count=rows=>({known:rows.reduce((n,p)=>n+(Number.isSafeInteger(p.available)&&p.available>=0?p.available:Number.isSafeInteger(p.knownAvailable)&&p.knownAvailable>=0?p.knownAvailable:0),0),unknown:rows.filter(p=>!Number.isSafeInteger(p.available)||p.available<0||p.unlimited).length});
  return {sources:suppliers.map(s=>({...s,...count(s.enabled?s.products||[]:[]),products:undefined})),...count(products),stale};
}
