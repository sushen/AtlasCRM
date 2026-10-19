import {inventoryFetch} from '../services/inventory-api.js';
import {businessDate} from '../utils/customer-sales.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cost=offer=>Number.isFinite(offer.unitCost)?`${offer.unitCost.toLocaleString()} ${offer.currency}`:'Acquisition cost unavailable';
export async function renderSupplierComparison(root,{user,api=inventoryFetch,onRecorded=async()=>{}}={}){
  root.innerHTML='<h2>Compare supplier offers</h2><p role="status">Loading supplier products…</p>';
  let listing;
  try{listing=await api('/api/inventory/offers',{user});if(!Array.isArray(listing.sources)||!Array.isArray(listing.offers))throw Error();}
  catch{root.innerHTML='<h2>Compare supplier offers</h2><p class="muted">Supplier comparison could not load. Check the local service and supplier configuration, then reopen this view.</p>';return;}
  const selected=new Set();let shown=30;
  root.innerHTML=`<h2>Supplier products and comparison</h2><p class="muted">Browse products the suppliers already sell. You do not own them until you buy them. Atlas does not place orders.</p>
    <div class="grid stock-headline">${listing.sources.map(s=>{const known=(s.offers||[]).reduce((n,o)=>n+(Number.isSafeInteger(o.available)?o.available:0),0);return `<article class="card stat"><strong>${esc(s.name)}</strong><p>${s.status==='available'?`${s.offers.length} offers · ${known.toLocaleString()} reported units`:s.status==='not_configured'?'API key not configured':s.status==='off'?'Switched off':'Supplier read unavailable'}</p></article>`;}).join('')}</div>
    <div class="toolbar"><label class="field grow">Find a product or plan<input type="search" data-offer-search placeholder="Search supplier products"></label><label class="field">Supplier<select data-offer-source><option value="">All enabled suppliers</option>${listing.sources.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label></div>
    <p class="muted small">Select up to four offers to compare. Check the same plan, duration, account type and delivery terms; matching names alone do not prove equivalence.</p>
    <section data-selected-offers></section><p data-offer-count role="status"></p>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Compare</th><th>Product / plan</th><th>Supplier</th><th>Supplier cost</th><th>Availability</th><th>Manual purchase</th></tr></thead><tbody data-offer-rows></tbody></table></div><button class="button" data-more-offers>Show more offers</button>`;
  const search=root.querySelector('[data-offer-search]'),source=root.querySelector('[data-offer-source]');
  const key=o=>o.sourceId+':'+o.id;
  const openReceive=offer=>{
    const document=root.ownerDocument,wrap=document.createElement('div');wrap.className='modal-backdrop';
    wrap.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="manual-supplier-title"><div class="modal-header"><h2 id="manual-supplier-title">Record completed supplier purchase</h2><button class="button" data-close>Cancel</button></div><div class="modal-body"><strong>${esc(offer.name)}</strong><p>Supplier: ${esc(offer.sourceId)} · Quoted cost: ${esc(cost(offer))}</p><p class="muted">Buy from the supplier yourself first. This form records one purchased item; it does not order or pay the supplier.</p><form class="inventory-form">
      <label>Actual amount paid for this unit<input name="cost" inputmode="decimal" pattern="[0-9]{1,9}([.][0-9]{1,6})?" required ${Number.isFinite(offer.unitCost)?`value="${offer.unitCost}"`:''}></label><p>Currency: ${esc(offer.currency)}</p>
      <label>Purchased on<input type="date" name="acquiredAt" value="${businessDate()}" required></label><label>Item expires on (optional)<input type="date" name="expiresAt"></label>
      <label>Credentials / license delivered by supplier<textarea name="credentials" rows="4" maxlength="12000" required autocomplete="off" spellcheck="false"></textarea></label>
      <label class="checkbox-field"><input type="checkbox" name="confirmPurchased" required> I already purchased and received this item from the supplier.</label><p data-receive-error class="error" role="alert"></p><button type="submit" class="button primary">Record purchased item</button></form></div></div>`;
    document.body.append(wrap);const close=wrap.querySelector('[data-close]');close.onclick=()=>wrap.remove();
    const form=wrap.querySelector('form'),button=form.querySelector('button'),requestId=crypto.randomUUID();let busy=false,saved=false;
    form.onsubmit=async event=>{
      event.preventDefault();if(busy||saved)return;busy=true;button.disabled=true;close.disabled=true;
      const body={action:'receive',requestId,sourceId:offer.sourceId,offerId:offer.id,currency:offer.currency};
      for(const name of ['cost','acquiredAt','expiresAt','credentials'])body[name]=form.querySelector(`[name="${name}"]`).value;
      body.confirmPurchased=form.querySelector('[name="confirmPurchased"]').checked;
      const controls=form.querySelectorAll('input,textarea');controls.forEach(c=>{c.disabled=true;});
      try{await api('/api/inventory/command',{user,body});saved=true;form.querySelector('[name="credentials"]').value='';wrap.remove();await onRecorded();}
      catch(error){if(saved)return;form.querySelector('[data-receive-error]').textContent=error.message||'Save could not be confirmed. Retry this form.';button.disabled=false;close.disabled=false;if(error.confirmedRejected)controls.forEach(c=>{c.disabled=false;});}
      finally{busy=false;}
    };
  };
  const drawSelected=()=>{
    const offers=listing.offers.filter(o=>selected.has(key(o))),known=offers.filter(o=>Number.isFinite(o.unitCost)&&o.unitCost>=0);
    const comparable=offers.length>1&&known.length===offers.length&&new Set(offers.map(o=>o.currency)).size===1;
    const minimum=comparable?Math.min(...known.map(o=>o.unitCost)):null;
    root.querySelector('[data-selected-offers]').innerHTML=offers.length?`<h3>Selected offers</h3><div class="grid stock-headline">${offers.map(o=>`<article class="card card-pad"><strong>${esc(o.name)}</strong><p>${esc(o.sourceId)}</p><h3>${esc(cost(o))}</h3>${minimum!==null&&o.unitCost===minimum?'<span class="badge">Lowest supplier cost in selection</span>':''}<p>Reported stock: ${Number.isSafeInteger(o.available)?o.available:'Unspecified / unlimited'}</p><p class="small">${esc(o.description||'Read the exact supplier listing for terms.')}</p></article>`).join('')}</div>${!comparable&&offers.length>1?'<p class="muted">Prices cannot be ranked until all costs and currencies are available.</p>':''}`:'';
  };
  const draw=()=>{
    const query=search.value.trim().toLowerCase(),offers=listing.offers.filter(o=>(!source.value||o.sourceId===source.value)&&String(o.name).toLowerCase().includes(query));
    root.querySelector('[data-offer-count]').textContent=`Showing ${Math.min(shown,offers.length)} of ${offers.length} supplier offers`;
    root.querySelector('[data-offer-rows]').innerHTML=offers.slice(0,shown).map(o=>`<tr><td><input type="checkbox" data-compare="${esc(key(o))}" ${selected.has(key(o))?'checked':''} aria-label="Compare ${esc(o.name)} from ${esc(o.sourceId)}"></td><td><strong>${esc(o.name)}</strong><div class="muted small">${esc(o.id)}</div></td><td>${esc(o.sourceId)}</td><td>${esc(cost(o))}</td><td>${Number.isSafeInteger(o.available)?o.available.toLocaleString():'Unspecified / unlimited'}</td><td><button class="button small" data-record-offer="${esc(key(o))}">Record manual purchase</button></td></tr>`).join('')||'<tr><td colspan="6">No offers available for this selection.</td></tr>';
    root.querySelector('[data-more-offers]').hidden=shown>=offers.length;
    root.querySelectorAll('[data-compare]').forEach(input=>input.onchange=()=>{if(input.checked&&selected.size<4)selected.add(input.dataset.compare);else{selected.delete(input.dataset.compare);input.checked=false;}drawSelected();});
    root.querySelectorAll('[data-record-offer]').forEach(button=>button.onclick=()=>openReceive(listing.offers.find(o=>key(o)===button.dataset.recordOffer)));
  };
  search.oninput=source.onchange=()=>{shown=30;draw();};root.querySelector('[data-more-offers]').onclick=()=>{shown+=30;draw();};draw();
}
