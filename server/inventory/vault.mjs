const encode=bytes=>btoa(String.fromCharCode(...bytes));
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const bytes=value=>new TextEncoder().encode(value);
export class InventoryVault {
  constructor(serialized){
    try{this.ring=JSON.parse(serialized);if(!/^[a-z0-9-]{1,32}$/.test(this.ring.activeKeyId)||!this.ring.keys[this.ring.activeKeyId])throw Error();
      for(const key of [...Object.values(this.ring.keys),this.ring.fingerprintKey])if(decode(key).length!==32)throw Error();
    }catch{throw Error('Inventory encryption is not configured.');}
  }
  async fingerprint(value){
    const key=await crypto.subtle.importKey('raw',decode(this.ring.fingerprintKey),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  async encrypt(value,context){
    const keyId=this.ring.activeKeyId,iv=crypto.getRandomValues(new Uint8Array(12));
    const key=await crypto.subtle.importKey('raw',decode(this.ring.keys[keyId]),'AES-GCM',false,['encrypt']);
    const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:bytes(context)},key,bytes(value));
    return {version:1,keyId,iv:encode(iv),ciphertext:encode(new Uint8Array(ciphertext))};
  }
  async decrypt(record,context){
    try{
      if(record.version!==1||!this.ring.keys[record.keyId])throw Error();
      const key=await crypto.subtle.importKey('raw',decode(this.ring.keys[record.keyId]),'AES-GCM',false,['decrypt']);
      return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(record.iv),additionalData:bytes(context)},key,decode(record.ciphertext)));
    }catch{throw Error('Inventory credentials could not be decrypted.');}
  }
}
