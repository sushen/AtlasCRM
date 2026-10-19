import {PartnerFirestore} from './partner-firestore.mjs';
// Read-only reference validation. No arbitrary collections, proxy URLs or mutations.
export class InventoryReferences {
  constructor(env,{fetchImpl=fetch}={}){this.env=env;this.fetch=(...args)=>fetchImpl.call(globalThis,...args);this.identity=new PartnerFirestore(env,{fetchImpl:this.fetch});}
  async read(collection,id){
    if(!['customers','products','purchases'].includes(collection)||!/^[A-Za-z0-9_-]{1,100}$/.test(id)||!/^[a-z][a-z0-9-]{4,62}$/.test(this.env.FIREBASE_PROJECT_ID||''))throw Error('Invalid inventory reference.');
    const token=await this.identity.accessToken();
    const url='https://firestore.googleapis.com/v1/projects/'+this.env.FIREBASE_PROJECT_ID+'/databases/(default)/documents/'+collection+'/'+id;
    const response=await this.fetch(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000),redirect:'manual'});
    if(response.status===404)return null;if(!response.ok)throw Error('Inventory reference lookup unavailable.');
    const {fields}=await response.json();if(!fields)throw Error('Invalid inventory reference response.');
    const result={id};for(const key of ['name','active','productId','customerId','paymentStatus','expiryDate'])if(fields[key])result[key]=fields[key].stringValue??fields[key].booleanValue??null;
    return result;
  }
}
