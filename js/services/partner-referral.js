import {partnerFetch} from './partner-api.js';
const KEY='atlas_partner_referral_v1';
export async function captureReferral({url,storage,request=partnerFetch,uuid=()=>crypto.randomUUID(),now=Date.now}){
  const params=new URL(url).searchParams;
  const campaignId=params.get('campaign')||params.get('utm_campaign');
  let saved;try{saved=JSON.parse(storage.getItem(KEY)||'null');}catch{}
  if(saved?.until>now()&&/^[a-f0-9]{48}$/.test(saved.visit))return saved;
  if(!/^[A-Za-z0-9_-]{1,48}$/.test(params.get('ref')||'')||!/^[A-Za-z0-9_-]{1,48}$/.test(campaignId||''))return null;
  const visitor=uuid();
  const response=await request('/api/partners/click',{body:{partnerId:params.get('ref'),campaignId,visitor}});
  const value=await response.json();
  if(!/^[a-f0-9]{48}$/.test(value.visit)||!Number.isFinite(value.until)||value.until<=now())throw Error('Invalid referral response');
  const result={visit:value.visit,until:value.until};try{storage.setItem(KEY,JSON.stringify(result));}catch{}
  return result;
}
export function installReferralTracking(document,window,{request=partnerFetch}={}){
  let saved;let pending=true;
  const status=document.createElement('p');status.className='muted small';status.setAttribute('role','status');
  const ready=(async()=>{
    try{saved=await captureReferral({url:window.location.href,storage:window.localStorage,request});}
    catch{status.textContent='Partner attribution is temporarily unavailable. You can still browse and contact the shop.';}
    if(saved)status.textContent='Partner referral saved for up to 30 days using an anonymous browser identifier. No payment or sale is counted by opening a link.';
    if(status.textContent)document.querySelector('.market-footer')?.append(status);
  })().finally(()=>{pending=false;});
  document.addEventListener('click',async event=>{
    const anchor=event.target.closest?.('a[href]');if(!anchor)return;
    let url;try{url=new URL(anchor.href);}catch{return;}
    if(url.origin!=='https://t.me'||url.pathname.toLowerCase()!=='/atlascrmmarketbot')return;
    if(!saved&&!pending)return;
    // Wait for an in-flight landing capture before creating the handoff.
    event.preventDefault();await ready;
    if(!saved){window.location.assign(url.href);return;}
    const start=url.searchParams.get('start')||'',productId=start.startsWith('product_')?start.slice(8):'';
    try{
      const response=await request('/api/partners/handoff',{body:{visit:saved.visit,productId}}),value=await response.json();
      if(!/^https:\/\/t\.me\/AtlasCrmMarketBot\?start=r_[a-f0-9]{48}$/.test(value.url))throw Error('Invalid handoff');
      window.location.assign(value.url);
    }catch{status.textContent='Tracking handoff unavailable. Opening the normal shop link; this visit may not be attributed.';window.location.assign(url.href);}
  });
  return ready;
}
