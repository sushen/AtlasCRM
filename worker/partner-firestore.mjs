// Worker-native Firestore projection; no Node firebase-admin bundle or client keys.
import {hash} from '../server/partners/program.mjs';
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const text=value=>encode(new TextEncoder().encode(JSON.stringify(value)));
export class PartnerFirestore{
  constructor(env,{fetchImpl=fetch,now=Date.now}={}){this.env=env;this.fetch=fetchImpl;this.now=now;this.cached=null;}
  async accessToken(){
    if(this.cached?.until>this.now())return this.cached.token;
    const account=JSON.parse(this.env.PARTNER_FIRESTORE_SERVICE_ACCOUNT||'null');
    if(!account||account.project_id!==this.env.FIREBASE_PROJECT_ID||!account.client_email?.endsWith('.iam.gserviceaccount.com'))throw Error('projection_not_configured');
    const now=Math.floor(this.now()/1000),header=text({alg:'RS256',typ:'JWT'});
    const payload=text({iss:account.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
    const bytes=Uint8Array.from(atob(account.private_key.replace(/-----[^-]+-----|\s/g,'')),c=>c.charCodeAt(0));
    const key=await crypto.subtle.importKey('pkcs8',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
    const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(header+'.'+payload));
    const response=await this.fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(10000),
      headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:header+'.'+payload+'.'+encode(new Uint8Array(signature))})});
    if(!response.ok)throw Error('projection_auth_unavailable');const data=await response.json();
    if(typeof data.access_token!=='string'||!Number.isFinite(Number(data.expires_in)))throw Error('projection_auth_unavailable');
    this.cached={token:data.access_token,until:this.now()+Math.min(Number(data.expires_in),3500)*1000-60000};return data.access_token;
  }
  async flush(storage){
    const pending=await storage.list({prefix:'pt:outbox:',limit:25});if(!pending.size)return {pending:false};
    try{
      if(!/^[a-z][a-z0-9-]{4,62}$/.test(this.env.FIREBASE_PROJECT_ID||''))throw Error('invalid_project');
      const token=await this.accessToken(),root='projects/'+this.env.FIREBASE_PROJECT_ID+'/databases/(default)/documents';
      const writes=[];
      for(const [,entry]of pending){
        const profile=entry.key.startsWith('pt:partner:'),collection=profile?'atlasPartnerProfiles':'atlasPartnerPrivate';
        const fields={payload:{stringValue:JSON.stringify(entry.value)}};
        if(profile){fields.ownerUid={stringValue:entry.value.ownerUid};fields.active={booleanValue:entry.value.active};}
        writes.push({update:{name:root+'/'+collection+'/'+(profile?entry.value.id:await hash(entry.key)),fields}});
      }
      const response=await this.fetch('https://firestore.googleapis.com/v1/'+root+':commit',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(10000),
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({writes})});
      if(!response.ok)throw Error('projection_unavailable');
      const acknowledgement=await response.json();
      if(!Array.isArray(acknowledgement.writeResults)||acknowledgement.writeResults.length!==writes.length)throw Error('projection_unconfirmed');
      await storage.delete([...pending.keys()]);
      await storage.put('pt:sync',{at:this.now(),ok:true});
      return {pending:!!(await storage.list({prefix:'pt:outbox:',limit:1})).size};
    }catch{await storage.put('pt:sync',{at:this.now(),ok:false});return {pending:true};}
  }
}
