import {inventoryFetch} from '../services/inventory-api.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function renderInventorySummary(root,user,{api=inventoryFetch,onOpen}={}){
  root.innerHTML='<h2>Your owned stock</h2><p class="muted" role="status">Loading private inventory…</p>';
  try{
    const result=await api('/api/inventory/summary',{user});
    const supplier=result.supplier,ready=supplier?.status==='available';
    const partial=ready&&(supplier.unknown>0||supplier.stale||result.truncated);
    const potential=ready?(result.potentialKnown??result.available+supplier.known):null;
    const card=(label,value,note)=>`<div class="card stat"><div class="stat-label">${label}</div><div class="stat-value">${esc(value)}</div><div class="muted small">${note}</div></div>`;
    const sources=supplier?.sources||[];
    const bars=[{name:'Your stock · ready to deliver',value:result.available,color:'owned'},...sources.filter(s=>s.enabled).map(s=>({name:s.name,value:ready?s.known:null,color:'supplier'}))];
    const maximum=Math.max(1,...bars.map(b=>b.value||0));
    root.innerHTML=`<h2>Stock overview</h2><p class="muted">What you own, what enabled suppliers report, and the potential availability together.</p>
      <div class="grid stock-headline">${card('Your owned stock',result.available,'Unassigned, unexpired units you already own')}${card('Supplier availability',ready?supplier.known:'Unavailable',ready?(supplier.unknown?'Known units; some counts are unspecified':'Across enabled suppliers; shared pools counted once'):'Owned stock is still shown below')}${card('Combined potential stock',potential===null?'Unavailable':potential+(partial?' +':''),'Owned available + known supplier units; not all ready for immediate delivery')}</div>
      ${partial?'<p class="stock-note">This total is partial or based on stale supplier data. Unknown/unlimited stock is not counted as zero. Refresh before promising availability.</p>':''}
      <div class="stock-chart" role="img" aria-label="Stock comparison: ${esc(bars.map(b=>b.name+': '+(b.value===null?'unavailable':b.value)).join('; '))}">${bars.map(b=>`<div class="stock-chart-row"><span>${esc(b.name)}</span><div class="stock-chart-track"><div class="stock-chart-bar ${b.color}" style="width:${Math.round((b.value||0)/maximum*100)}%"></div></div><strong>${b.value===null?'—':esc(b.value)}</strong></div>`).join('')}</div>
      <div class="stock-sources"><h3>Supplier breakdown</h3>${sources.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Supplier</th><th>Switch</th><th>Reported units</th><th>Count status</th></tr></thead><tbody>${sources.map(s=>`<tr><td>${esc(s.name)}</td><td><span class="badge">${s.enabled?'On':'Off'}</span></td><td>${!s.enabled?'Excluded':ready?esc(s.known):'Unavailable'}</td><td>${!s.enabled?'No contribution':!ready?'Could not refresh':s.unknown?esc(s.unknown)+' unspecified / unlimited listings':'Known count'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Supplier comparison is unavailable.</p>'}<p class="muted small">Per-supplier figures can overlap when sources share stock; use the deduplicated supplier total above. Units across different products are counts, not interchangeable stock or money.</p></div>
      <h3>Your owned stock</h3><p class="muted">Assignment and delivery status of items you have purchased.</p>${result.truncated?'<p class="error">Inventory exceeds this summary’s 10,000-item scan limit. Counts below cover the first 10,000 items.</p>':''}<div class="grid stats-grid">${[['Available to assign',result.available],['Assigned, awaiting delivery',result.assigned],['Delivered',result.delivered],['Expired unassigned',result.expired],['Retired',result.retired],['Total recorded items',result.total]].map(([label,value])=>card(label,value,'')).join('')}</div><button type="button" class="button" data-open-inventory style="margin-top:14px">Manage inventory and suppliers</button>`;
    root.querySelector('[data-open-inventory]').onclick=()=>onOpen?.();
  }catch(error){root.innerHTML=`<h2>Your owned stock</h2><p class="muted" role="status">${esc(error.message||'Private inventory totals are unavailable.')}</p>`;}
}
