import { readFile,writeFile,mkdir,rename } from 'node:fs/promises';
import { dirname } from 'node:path';
export class ShopFileStorage {
  constructor(path){this.path=path;this.tail=Promise.resolve();}
  transaction(operation) {
    const pending=this.tail.then(async()=>{
      let values={};try{values=JSON.parse(await readFile(this.path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw Error('Private order state could not be read');}
      const tx={get:async key=>structuredClone(values[key]),put:async(key,value)=>{values[key]=structuredClone(value);},
        list:async({prefix,startAfter='',limit=100})=>new Map(Object.entries(values).filter(([key])=>key.startsWith(prefix)&&key>startAfter).sort(([a],[b])=>a<b?-1:a>b?1:0).slice(0,limit))};
      const result=await operation(tx);await mkdir(dirname(this.path),{recursive:true});
      await writeFile(this.path+'.tmp',JSON.stringify(values),{mode:0o600,flush:true});await rename(this.path+'.tmp',this.path);return result;
    });this.tail=pending.catch(()=>{});return pending;
  }
  get(key){return this.transaction(tx=>tx.get(key));}
  list(options) {return this.transaction(tx=>tx.list(options));}
}
