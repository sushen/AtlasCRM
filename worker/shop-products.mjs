import {PartnerFirestore} from './partner-firestore.mjs';
import {ownedShopProduct} from '../server/telegram-shop-layout.mjs';

// Publishing is an explicit allowlist, never all active private CRM products.
export class ShopProducts {
  constructor(env,{fetchImpl=fetch}={}){this.env=env;this.fetch=(...args)=>fetchImpl.call(globalThis,...args);this.identity=new PartnerFirestore(env,{fetchImpl:this.fetch});}
  async list(){
    const ids=String(this.env.TELEGRAM_OWN_PRODUCT_IDS||'').split(',').map(id=>id.trim()).filter(Boolean);
    if(!ids.length)return [];
    if(ids.length>40||ids.some(id=>!/^[A-Za-z0-9_-]{1,40}$/.test(id))||!/^[a-z][a-z0-9-]{4,62}$/.test(this.env.FIREBASE_PROJECT_ID||''))throw Error('Invalid shop publication configuration');
    const token=await this.identity.accessToken();
    const products=await Promise.all([...new Set(ids)].map(async id=>{
      const url=new URL(`https://firestore.googleapis.com/v1/projects/${this.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/products/${id}`);
      for(const name of ['name','price','currency','durationDays','active'])url.searchParams.append('mask.fieldPaths',name);
      const response=await this.fetch(url,{headers:{Authorization:'Bearer '+token},redirect:'manual',signal:AbortSignal.timeout(10000)});
      if(response.status===404)return null;
      if(!response.ok)throw Error('Published product read unavailable');
      const {fields:f}=await response.json();if(!f)throw Error('Published product invalid');
      const number=field=>field?.doubleValue??(field?.integerValue!==undefined?Number(field.integerValue):null);
      return ownedShopProduct({id,name:f.name?.stringValue,price:number(f.price),currency:f.currency?.stringValue,durationDays:number(f.durationDays),active:f.active?.booleanValue});
    }));return products.filter(Boolean);
  }
}
