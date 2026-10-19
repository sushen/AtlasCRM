import {PartnerFirestore} from './partner-firestore.mjs';
export class WorkerInventoryStorage {
  constructor(env){this.identity=new PartnerFirestore(env,{fetchImpl:(...args)=>fetch(...args)});this.root='projects/'+env.FIREBASE_PROJECT_ID+'/databases/(default)/documents';this.database='projects/'+env.FIREBASE_PROJECT_ID+'/databases/(default)';}
  async request(path,method='GET',body){
    const response=await fetch('https://firestore.googleapis.com/v1/'+path,{method,headers:{Authorization:'Bearer '+await this.identity.accessToken(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:AbortSignal.timeout(15000)});
    if(response.status===404&&method==='GET')return null;
    if(!response.ok){const error=Error('Inventory database request unavailable');error.retry=response.status===409;throw error;}return response.json();
  }
  async name(key){if(!key.startsWith('iv:')&&!['catalog','supplier-cooldown'].includes(key))throw Error('Invalid inventory key');const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));return this.root+'/atlasInventoryState/'+[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
  async get(key,transaction){const doc=await this.request(await this.name(key)+(transaction?'?transaction='+encodeURIComponent(transaction):''));return doc?JSON.parse(doc.fields.payload.stringValue):undefined;}
  async list({prefix,startAfter='',limit=100},transaction){
    if(!prefix.startsWith('iv:')||!Number.isInteger(limit)||limit<1||limit>1000)throw Error('Invalid inventory query');
    const query={from:[{collectionId:'atlasInventoryState'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'key'},op:'GREATER_THAN_OR_EQUAL',value:{stringValue:prefix}}},{fieldFilter:{field:{fieldPath:'key'},op:'LESS_THAN',value:{stringValue:prefix+'\uf8ff'}}}]}},orderBy:[{field:{fieldPath:'key'},direction:'ASCENDING'}],limit,...(startAfter?{startAt:{values:[{stringValue:startAfter}],before:false}}:{})};
    const rows=await this.request(this.root+':runQuery','POST',{structuredQuery:query,...(transaction?{transaction}:{})});return new Map(rows.filter(r=>r.document).map(r=>[r.document.fields.key.stringValue,JSON.parse(r.document.fields.payload.stringValue)]));
  }
  async transaction(operation){
    for(let attempt=0;attempt<3;attempt++){
      const {transaction}=await this.request(this.database+'/documents:beginTransaction','POST',{options:{readWrite:{}}});const writes=[];
      try{
        const result=await operation({get:key=>this.get(key,transaction),list:options=>this.list(options,transaction),put:async(key,value)=>{writes.push({update:{name:await this.name(key),fields:{key:{stringValue:key},payload:{stringValue:JSON.stringify(value)}}},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]});}});
        await this.request(this.root+':commit','POST',{transaction,writes});return result;
      }catch(error){try{await this.request(this.root+':rollback','POST',{transaction});}catch{}if(!error.retry||attempt===2)throw error;}
    }
  }
}
