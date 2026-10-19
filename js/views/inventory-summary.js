import {inventoryFetch} from '../services/inventory-api.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function renderInventorySummary(root,user,{api=inventoryFetch,onOpen}={}){
  root.innerHTML='<h2>Your owned stock</h2><p class="muted" role="status">Loading private inventory…</p>';
  try{
    const result=await api('/api/inventory/summary',{user});
    const supplier=result.supplier,ready=supplier?.status==='available';
    const partial=ready&&(supplier.unknown>0||supplier.stale||result.truncated||result.sharedAccounts>0);
    const potential=ready&&Number.isFinite(result.available)?(result.potentialKnown??result.available+supplier.known):null;
    const card=(label,value,note)=>`<div class="card stat"><div class="stat-label">${label}</div><div class="stat-value">${value===null?'Not connected':esc(value)}</div><div class="muted small">${note}</div></div>`;
    const sources=supplier?.sources||[];
    const bars=[{name:'Your stock · ready to deliver',value:result.available,color:'owned'},...sources.filter(s=>s.enabled).map(s=>({name:s.name,value:ready?s.known:null,color:'supplier'}))];
    const maximum=Math.max(1,...bars.map(b=>b.value||0));
    root.innerHTML=`<h2>Stock overview</h2><p class="muted">What you own, what enabled suppliers report, and the potential availability together.</p>
      <div class="grid stock-headline">${card('Your owned stock',result.available,'Unassigned, unexpired units you already own')}${card('Supplier availability',ready?supplier.known:'Unavailable',ready?(supplier.unknown?'Known units; some counts are unspecified':'Across enabled suppliers; shared pools counted once'):'Owned stock is still shown below')}${card('Combined potential stock',potential===null?'Unavailable':potential+(partial?' +':''),'Owned available + known supplier units; not all ready for immediate delivery')}</div>
      ${result.sharedAccounts?`<div class="grid stock-headline">${card('Owned reusable accounts',result.sharedAccounts,'Real accounts you own; capacity is not yet recorded')}${card('Customer access allocations',result.sharedAllocations||0,'Each purchase keeps its own access dates')}</div><p class="muted small">Reusable accounts are not added to sellable-unit totals because their customer capacity is unknown.</p>`:''}
      ${supplier?.fetchedAt?`<p class="muted small">Supplier data fetched: ${esc(supplier.fetchedAt)}${supplier.snapshot?' · Build-time snapshot; not a live refresh':''}</p>`:''}
      ${partial?'<p class="stock-note">This total is partial or based on a supplier snapshot. Unknown/unlimited stock is not counted as zero. Refresh before promising availability.</p>':''}
      <div class="stock-chart" role="img" aria-label="Stock comparison: ${esc(bars.map(b=>b.name+': '+(b.value===null?'unavailable':b.value)).join('; '))}">${bars.map(b=>`<div class="stock-chart-row"><span>${esc(b.name)}</span><div class="stock-chart-track"><div class="stock-chart-bar ${b.color}" style="width:${Math.round((b.value||0)/maximum*100)}%"></div></div><strong>${b.value===null?'—':esc(b.value)}</strong></div>`).join('')}</div>
      <div class="stock-sources"><h3>Supplier breakdown</h3>${sources.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Supplier</th><th>Switch</th><th>Reported units</th><th>Count status</th></tr></thead><tbody>${sources.map(s=>`<tr><td>${esc(s.name)}</td><td><span class="badge">${s.enabled?'On':'Off'}</span></td><td>${!s.enabled?'Excluded':ready?esc(s.known):'Unavailable'}</td><td>${!s.enabled?'No contribution':!ready?'Could not refresh':s.unknown?esc(s.unknown)+' unspecified / unlimited listings':'Known count'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Supplier comparison is unavailable.</p>'}<p class="muted small">Per-supplier figures can overlap when sources share stock; use the deduplicated supplier total above. Units across different products are counts, not interchangeable stock or money.</p></div>
      <h3>Your owned stock</h3><p class="muted">Assignment and delivery status of items you have purchased.</p>${result.truncated?'<p class="error">Inventory exceeds this summary’s 10,000-item scan limit. Counts below cover the first 10,000 items.</p>':''}<div class="grid stats-grid">${[['Available to assign',result.available],['Assigned, awaiting delivery',result.assigned],['Delivered',result.delivered],['Expired unassigned',result.expired],['Retired',result.retired],['Total recorded items',result.total]].map(([label,value])=>card(label,value,'')).join('')}</div><button type="button" class="button" data-open-inventory style="margin-top:14px">Manage inventory and suppliers</button>`;
    if(ready&&Array.isArray(supplier.products)){
      const section=root.ownerDocument.createElement('section');section.className='stock-sources';
      section.innerHTML='<details><summary>Availability by product</summary><p class="muted small">Supplier-reported units for each listing. Unknown counts are excluded from the numeric total; these are not owned units.</p><label class="field">Find a product<input type="search" data-product-search placeholder="Search product or plan"></label><p data-product-count role="status"></p><div class="table-wrap"><table class="data-table"><thead><tr><th>Product / plan</th><th>Reported units</th></tr></thead><tbody data-product-rows></tbody></table></div><button class="button" type="button" data-more-products>Show more products</button></details>';
      let shown=30;const search=section.querySelector('[data-product-search]');
      const draw=()=>{
        const query=search.value.trim().toLowerCase(),filtered=supplier.products.filter(p=>String(p.name||'').toLowerCase().includes(query));
        section.querySelector('[data-product-count]').textContent=`Showing ${Math.min(shown,filtered.length)} of ${filtered.length} listings`;
        section.querySelector('[data-product-rows]').innerHTML=filtered.slice(0,shown).map(p=>`<tr><td>${esc(p.name||p.id)}</td><td>${Number.isSafeInteger(p.available)&&p.available>=0?p.available.toLocaleString():Number.isSafeInteger(p.knownAvailable)&&p.knownAvailable>0?p.knownAvailable.toLocaleString()+' + unspecified':'Unspecified / unlimited'}</td></tr>`).join('')||'<tr><td colspan="2">No matching listings.</td></tr>';
        section.querySelector('[data-more-products]').hidden=shown>=filtered.length;
      };
      search.oninput=()=>{shown=30;draw();};section.querySelector('[data-more-products]').onclick=()=>{shown+=30;draw();};
      root.append(section);draw();
    }
    root.querySelector('[data-open-inventory]').onclick=()=>onOpen?.();
  }catch(error){root.innerHTML=`<h2>Your owned stock</h2><p class="muted" role="status">${esc(error.message||'Private inventory totals are unavailable.')}</p>`;}
}
