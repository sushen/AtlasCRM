import {inventoryFetch} from '../services/inventory-api.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function renderInventorySummary(root,user,{api=inventoryFetch,onOpen}={}){
  root.innerHTML='<h2>Your owned stock</h2><p class="muted" role="status">Loading private inventory…</p>';
  try{
    const result=await api('/api/inventory/summary',{user});
    root.innerHTML=`<h2>Your owned stock</h2><p class="muted">Items you have purchased, separate from supplier availability.</p>${result.truncated?'<p class="error">Inventory exceeds this summary’s 10,000-item scan limit. Counts below cover the first 10,000 items.</p>':''}<div class="grid stats-grid">${[['Available to assign',result.available],['Assigned, awaiting delivery',result.assigned],['Delivered',result.delivered],['Expired unassigned',result.expired],['Retired',result.retired],['Total recorded items',result.total]].map(([label,value])=>`<div class="card stat"><div class="stat-label">${label}</div><div class="stat-value">${esc(value)}</div></div>`).join('')}</div><button type="button" class="button" data-open-inventory style="margin-top:14px">Manage inventory and suppliers</button>`;
    root.querySelector('[data-open-inventory]').onclick=()=>onOpen?.();
  }catch(error){root.innerHTML=`<h2>Your owned stock</h2><p class="muted" role="status">${esc(error.message||'Private inventory totals are unavailable.')}</p>`;}
}
