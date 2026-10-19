export class NamCatalogError extends Error {}
const positive=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:typeof value==='string'&&/^\d+(\.\d+)?$/.test(value)&&Number.isFinite(Number(value))?Number(value):null;
// Read-only adapter. Deliberately offers no balance or order method.
export class NamCatalog {
  constructor({token,currency,fetchImpl=fetch,now=Date.now}={}){
    if(typeof token!=='string'||token.length<8||/[\r\n]/.test(token))throw new NamCatalogError('New supplier token is not configured.');
    if(!/^[A-Z]{3,4}$/.test(currency||''))throw new NamCatalogError('New supplier currency must be explicitly configured.');
    this.token=token;this.currency=currency;this.fetch=(...args)=>fetchImpl.call(globalThis,...args);this.now=now;
  }
  async get(path){
    if(!/^\/(products|stock\/\d{1,16})$/.test(path))throw new NamCatalogError('Unsupported supplier read.');
    try{
      const response=await this.fetch('https://api.nam.qzz.io/api/v1'+path,{method:'GET',headers:{Authorization:'Bearer '+this.token,Accept:'application/json','Cache-Control':'no-cache'},cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error();
      const reader=response.body.getReader(),parts=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000){await reader.cancel();throw Error();}parts.push(value);}
      const all=new Uint8Array(size);let at=0;for(const part of parts){all.set(part,at);at+=part.length;}
      const body=JSON.parse(new TextDecoder().decode(all));if(body.ok!==true)throw Error();return body.data;
    }catch{throw new NamCatalogError('New supplier catalog is unavailable.');}
  }
  async offers(){
    // Response wrapper must be verified against the live supplier before activation.
    const data=await this.get('/products');if(!Array.isArray(data))throw new NamCatalogError('New supplier product response requires validation.');
    return data.filter(p=>p&&p.status==='active'&&/^\d{1,16}$/.test(String(p.id))).map(p=>({
      id:String(p.id),sourceId:'nam',name:String(p.name||'Unnamed product').slice(0,300),
      unitCost:positive(p.apiPrice),currency:this.currency,
      available:Number.isSafeInteger(p.stock)&&p.stock>=0?p.stock:null,unlimited:p.unlimitedSlot===true,
      requiresGmail:p.requiresGmail===true,fetchedAt:this.now()
    }));
  }
  async checkStock(productId){
    if(!/^\d{1,16}$/.test(String(productId)))throw new NamCatalogError('Invalid new supplier product.');
    const data=await this.get('/stock/'+productId);
    if(!data||typeof data!=='object')throw new NamCatalogError('New supplier stock response requires validation.');
    return {available:data.available===true&&data.purchasable===true&&data.status!=='out_of_stock',
      stock:Number.isSafeInteger(data.stock)&&data.stock>=0?data.stock:null,refreshCatalog:data.refreshCatalog===true};
  }
}
