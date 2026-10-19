import {createHash} from 'node:crypto';
// Server-only inventory ledger. Browser rules deny access by default.
export class FirestoreInventoryStorage {
  constructor(db,{serverTimestamp=()=>new Date()}={}){this.db=db;this.stamp=serverTimestamp;}
  ref(key){if(!/^iv:/.test(key)&&!['catalog','supplier-cooldown'].includes(key))throw Error('Invalid inventory storage key');return this.db.collection('atlasInventoryState').doc(createHash('sha256').update(key).digest('hex'));}
  query({prefix,startAfter='',limit=100}){
    if(!prefix.startsWith('iv:')||!Number.isInteger(limit)||limit<1||limit>1000)throw Error('Invalid inventory query');
    let query=this.db.collection('atlasInventoryState').where('key','>=',prefix).where('key','<',prefix+'\uf8ff').orderBy('key').limit(limit);
    if(startAfter)query=query.startAfter(startAfter);return query;
  }
  async get(key){const result=await this.ref(key).get();return result.exists?JSON.parse(result.data().payload):undefined;}
  async list(options){const result=await this.query(options).get();return new Map(result.docs.map(doc=>[doc.data().key,JSON.parse(doc.data().payload)]));}
  transaction(operation){return this.db.runTransaction(async transaction=>operation({
    get:async key=>{const doc=await transaction.get(this.ref(key));return doc.exists?JSON.parse(doc.data().payload):undefined;},
    put:async(key,value)=>{transaction.set(this.ref(key),{key,payload:JSON.stringify(value),updatedAt:this.stamp()});},
    list:async options=>{const result=await transaction.get(this.query(options));return new Map(result.docs.map(doc=>[doc.data().key,JSON.parse(doc.data().payload)]));}
  }));}
}
