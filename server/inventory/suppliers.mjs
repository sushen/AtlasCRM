export async function supplierStates(storage,readiness={canboso:true,nam:false}){
  return Promise.all([{id:'canboso',name:'Canboso',defaultEnabled:true},{id:'nam',name:'NAM',defaultEnabled:false}].map(async source=>{
    const saved=await storage.get('iv:supplier:'+source.id);
    return {id:source.id,name:source.name,enabled:saved?.enabled??source.defaultEnabled,ready:readiness[source.id]===true};
  }));
}
