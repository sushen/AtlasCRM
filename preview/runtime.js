export const storeKey='atlas_branch_review_store_v2';
const initial={customers:[],products:[],purchases:[],subscriptions:[],activities:[],followups:[],templates:[],messages:[]};
if(!localStorage.getItem(storeKey))localStorage.setItem(storeKey,JSON.stringify(initial));
export const previewState={suppliers:[],units:[],mappings:[]};
const banner=document.createElement('aside');banner.className='preview-notice';
banner.innerHTML='<strong>BRANCH PREVIEW — REAL PUBLIC CATALOG SNAPSHOT</strong><p>Real supplier products, prices and availability fetched at build time. Private inventory and customer records are not connected. Supplier orders, payments and messages are disabled. Do not enter real credentials or customer details.</p><span data-preview-revision></span> <button type="button">Reset local test data</button>';
banner.querySelector('[data-preview-revision]').textContent=document.querySelector('meta[name="atlas-preview-revision"]')?.content||'';
banner.querySelector('button').onclick=()=>{localStorage.removeItem(storeKey);location.reload();};document.body.prepend(banner);
const style=document.createElement('style');style.textContent='.preview-notice{background:#fff3cd;color:#382e0b;padding:16px;font:14px/1.4 system-ui;border-bottom:2px solid #d6ac32}.preview-notice p{margin:8px 0}.preview-notice button{padding:8px;margin-left:10px}';document.head.append(style);
