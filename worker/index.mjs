import { verifyFirebaseToken,verifyFirebaseClaims } from './firebase-auth.mjs';
import {privateHash} from '../server/partners/program.mjs';
export { AtlasCoordinator } from './coordinator.mjs';

const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
async function matches(value,secret) {
  if(!secret || secret.length<32 || !value || value.length>1024)return false;
  const encoder=new TextEncoder();
  const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(value)),crypto.subtle.digest('SHA-256',encoder.encode(secret))]);
  const aa=new Uint8Array(a),bb=new Uint8Array(b);let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0;
}
async function body(request,limit) {
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw Error('json_required');
  const reader=request.body?.getReader();if(!reader)throw Error('invalid_json');let size=0;const parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('body_too_large');}parts.push(value);}
  const all=new Uint8Array(size);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder().decode(all));
}
export default {
  async fetch(request,env) {
    try {
      const url=new URL(request.url);
      if(url.pathname==='/health'&&request.method==='GET')return json({service:'atlas-market',transport:'webhook'});
      if(!env.ATLAS_COORDINATOR)return json({code:'coordinator_not_configured'},503);
      const coordinator=env.ATLAS_COORDINATOR.get(env.ATLAS_COORDINATOR.idFromName('atlas-market'));
      if(url.pathname.startsWith('/api/partners/')){
        const origin=request.headers.get('origin'),allowed=String(env.CATALOG_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim());
        const cors=origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{};
        if(!origin||!allowed.includes(origin))return json({code:'origin_denied'},403);
        if(env.PARTNER_TRACKING_ENABLED!=='true')return json({code:'partner_tracking_disabled'},503,cors);
        if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
        const publicRoute=['/api/partners/click','/api/partners/handoff'].includes(url.pathname);
        const postRoute=publicRoute||url.pathname==='/api/partners/admin';
        if(request.method!==(postRoute?'POST':'GET')||url.search.length>2048)return json({code:'method_not_allowed'},405,cors);
        const claims=publicRoute?null:await verifyFirebaseClaims(request.headers.get('authorization'),env.FIREBASE_PROJECT_ID);
        if(!publicRoute&&!claims)return json({code:'authentication_required'},401,cors);
        const client=await privateHash(env.PARTNER_HASH_SECRET,new Date().toISOString().slice(0,10)+':'+(request.headers.get('cf-connecting-ip')||'unknown'));
        const value=request.method==='POST'?await body(request,8192):null;
        const response=await coordinator.fetch(new Request('https://coordinator/partners',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({path:url.pathname,query:Object.fromEntries(url.searchParams),value,claims,client})}));
        const headers=new Headers(response.headers);for(const [k,v]of Object.entries(cors))headers.set(k,v);
        return new Response(response.body,{status:response.status,headers});
      }
      if(url.pathname==='/api/admin/bot-state'||url.pathname==='/api/admin/shop-readiness'||url.pathname==='/api/admin/business-report') {
        if(!['GET','POST'].includes(request.method))return json({code:'method_not_allowed'},405);
        if(!await matches(request.headers.get('authorization')?.replace(/^Bearer /,''),env.ATLAS_ADMIN_TOKEN))return json({code:'unauthorized'},401);
        if(request.headers.get('origin'))return json({code:'admin_browser_access_denied'},403);
        if(url.pathname==='/api/admin/business-report') {
          if(request.method!=='GET')return json({code:'method_not_allowed'},405);
          const days=Number(url.searchParams.get('days')||30);
          if(!Number.isInteger(days)||days<1||days>365||[...url.searchParams.keys()].some(key=>key!=='days'))return json({code:'invalid_period'},400);
          return coordinator.fetch(new Request('https://coordinator/business-report?days='+days));
        }
        if(url.pathname==='/api/admin/shop-readiness') {
          if(request.method!=='GET')return json({code:'method_not_allowed'},405);
          const state=await coordinator.fetch(new Request('https://coordinator/state'));
          const {enabled}=await state.json();
          return json({service:'atlas-market',enabled,shopConfigured:env.TELEGRAM_SHOP_ENABLED==='true'&&/^\d+(,\d+)*$/.test(env.TELEGRAM_SHOP_ADMIN_IDS||'')&&/^https:\/\/t\.me\/[A-Za-z][A-Za-z0-9_]{4,31}\/?$/.test(env.TELEGRAM_SHOP_SUPPORT_URL||'')});
        }
        const value=request.method==='POST'?await body(request,1024):null;
        if(request.method==='POST' && (!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||typeof value.enabled!=='boolean'))return json({code:'invalid_state'},400);
        return coordinator.fetch(new Request('https://coordinator/state',{method:request.method,...(value?{body:JSON.stringify(value),headers:{'Content-Type':'application/json'}}:{})}));
      }
      if(url.pathname==='/webhooks/telegram') {
        if(request.method!=='POST')return json({code:'method_not_allowed'},405);
        if(!await matches(request.headers.get('x-telegram-bot-api-secret-token'),env.TELEGRAM_WEBHOOK_SECRET))return json({code:'unauthorized'},401);
        const update=await body(request,65536);
        if(!update||!Number.isSafeInteger(update.update_id)||update.update_id<0)return json({code:'invalid_update'},400);
        return coordinator.fetch(new Request('https://coordinator/telegram',{method:'POST',body:JSON.stringify(update),headers:{'Content-Type':'application/json'}}));
      }
      if(url.pathname==='/api/catalog/products') {
        const origin=request.headers.get('origin');
        const allowed=new Set(String(env.CATALOG_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean));
        if(!origin||!allowed.has(origin))return json({code:'origin_denied'},403);
        const cors={'Access-Control-Allow-Origin':origin,'Vary':'Origin'};
        if(request.method==='OPTIONS') {
          if(request.headers.get('access-control-request-method')!=='GET')return json({code:'method_not_allowed'},405,cors);
          const requested=(request.headers.get('access-control-request-headers')||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
          if(requested.some(s=>s!=='authorization'))return json({code:'headers_denied'},403,cors);
          return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET','Access-Control-Allow-Headers':'Authorization','Access-Control-Max-Age':'600'}});
        }
        if(request.method!=='GET'||url.search)return json({code:'method_or_query_denied'},405,cors);
        if(env.CATALOG_PUBLIC_ENABLED!=='true'&&!await verifyFirebaseToken(request.headers.get('authorization'),env.FIREBASE_PROJECT_ID))return json({code:'authentication_required'},401,cors);
        const ip=request.headers.get('cf-connecting-ip')||'unknown';
        const hashed=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
        const client=[...new Uint8Array(hashed)].map(b=>b.toString(16).padStart(2,'0')).join('');
        const response=await coordinator.fetch(new Request('https://coordinator/catalog',{headers:{'x-atlas-client':client}}));
        const headers=new Headers(response.headers);for(const[k,v]of Object.entries(cors))headers.set(k,v);
        if(response.status===429)headers.set('Retry-After','60');return new Response(response.body,{status:response.status,headers});
      }
      return json({code:'not_found'},404);
    }catch{return json({code:'request_failed'},400);}
  }
};
