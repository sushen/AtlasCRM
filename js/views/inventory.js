import {inventoryFetch} from '../services/inventory-api.js';
import {businessDate} from '../utils/customer-sales.js';
import {customerIdentity} from '../utils/customer-identity.js';
import {renderSupplierComparison} from './supplier-comparison.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=(rows,label)=>rows.map(row=>`<option value="${esc(row.id)}">${esc(label(row))}</option>`).join('');
export function showInventoryCredentials(unitId,user,{api=inventoryFetch}={}){
  const wrap=document.createElement('div');wrap.className='modal-backdrop';
  wrap.innerHTML='<div class="modal" role="dialog" aria-modal="true" aria-labelledby="inventory-reveal-title"><div class="modal-header"><h2 id="inventory-reveal-title">Private delivery credentials</h2><button class="button" data-close>Close</button></div><div class="modal-body"><p>Use these only to deliver the assigned product. This view clears after 30 seconds or when you leave the page.</p><pre class="inventory-secret" data-secret role="status">Loading…</pre><p data-result role="status"></p></div></div>';
  document.body.append(wrap);let timer,closed=false;
  const close=()=>{closed=true;clearTimeout(timer);wrap.querySelector('[data-secret]').textContent='';wrap.remove();document.removeEventListener('visibilitychange',visibility);};
  const visibility=()=>{if(document.hidden)close();};
  wrap.querySelector('[data-close]').onclick=close;document.addEventListener('visibilitychange',visibility);
  api('/api/inventory/command',{user,body:{action:'reveal',unitId,requestId:crypto.randomUUID()}}).then(result=>{
    if(closed||!wrap.isConnected)return;
    wrap.querySelector('[data-secret]').textContent=result.credentials;result.credentials='';timer=setTimeout(close,30000);
  }).catch(()=>{if(!closed)wrap.querySelector('[data-secret]').textContent='Credentials could not be revealed. Close and retry.';});
  return close;
}
export async function openPurchaseInventory(purchase,user,onManage,{api=inventoryFetch}={}){
  const wrap=document.createElement('div');wrap.className='modal-backdrop';
  wrap.innerHTML='<div class="modal" role="dialog" aria-modal="true" aria-labelledby="purchase-stock-title"><div class="modal-header"><h2 id="purchase-stock-title">Assigned inventory</h2><button class="button" data-close>Close</button></div><div class="modal-body" data-stock-body><p>Loading…</p></div></div>';
  document.body.append(wrap);wrap.querySelector('[data-close]').onclick=()=>wrap.remove();
  const body=wrap.querySelector('[data-stock-body]');
  try{
    const result=await api('/api/inventory/list?purchaseId='+encodeURIComponent(purchase.id),{user});if(!wrap.isConnected)return;
    const unit=result.units[0];
    body.innerHTML=unit?`<p><strong>${esc(unit.productName)}</strong> · ${esc(unit.state)}</p><p>Acquired from ${esc(unit.source)}</p><button class="button" data-reveal>Reveal credentials</button>`:'<p>No owned stock item is assigned to this purchase.</p><button class="button" data-manage>Assign from inventory</button>';
    body.querySelector('[data-reveal]')?.addEventListener('click',()=>showInventoryCredentials(unit.id,user,{api}));
    body.querySelector('[data-manage]')?.addEventListener('click',()=>{wrap.remove();onManage(purchase);});
  }catch(error){body.textContent=error.message||'Private inventory is unavailable.';}
}
export async function renderInventory(root,{user,listProducts,createProduct,listCustomers,listPurchases,context=null,api=inventoryFetch}){
  root.innerHTML='<h1>Private inventory</h1><p role="status">Loading owned stock…</p>';
  let listing,products,customers,purchases;
  try{[listing,products,customers,purchases]=await Promise.all([api('/api/inventory/list',{user}),listProducts(),listCustomers(),listPurchases()]);}
  catch(error){root.innerHTML=`<h1>Private inventory</h1><p class="error" role="alert">${esc(error.message||'Inventory is unavailable.')}</p><p class="muted">No credentials are stored in this browser. Your public catalog is unchanged.</p>`;return;}
  root.innerHTML=`<div class="page-heading"><div><h1>Suppliers and purchased items</h1><p class="muted">Compare supplier offers, buy manually, then record what you received and assign it to a customer.</p></div></div>
    <p data-inventory-status role="status" aria-live="polite"></p>
    <section class="card card-pad" data-supplier-comparison></section>
    <section class="card card-pad"><h2>Supplier switches</h2><p class="muted">Only enabled suppliers contribute products, prices and availability to the shop. Your owned items stay here when a supplier is off.</p>${(listing.suppliers||[]).map(s=>`<div class="list-item"><div><strong>${esc(s.name)}</strong><div class="muted small">${s.enabled?'On':'Off'}${!s.ready?' · configuration needed before enabling':''}</div></div><button class="button" data-supplier="${esc(s.id)}" data-enabled="${!s.enabled}" ${!s.enabled&&!s.ready?'disabled':''}>Turn ${s.enabled?'off':'on'}</button></div>`).join('')}</section>
    <details class="card card-pad"><summary>Add your own product or plan</summary><p class="muted small">Set the selling price and duration for your own Atlas offer. This does not add purchased inventory or publish a Telegram message.</p><form data-product-form class="inventory-form"><label>Product and plan name<input name="name" maxlength="200" required></label><div class="sales-fields"><label>Selling price<input name="price" type="number" min="0" step="0.01" required></label><label>Currency<select name="currency"><option>USD</option><option>BDT</option><option>USDT</option></select></label><label>Duration (days)<input name="durationDays" type="number" min="1" max="36500" step="1" required></label></div><button class="button">Save custom product</button></form></details>
    <details class="card card-pad"><summary>Record a purchase for an existing custom product</summary><form data-receive class="inventory-form">
    <label>Saved CRM product<select name="productId" required><option value="">Choose a product and plan</option>${options(products.filter(p=>p.active!==false),p=>p.name)}</select></label>
    <label>Supplier / source name<input name="source" maxlength="200" required placeholder="Source label only"></label>
    <div class="sales-fields"><label>Acquisition cost<input name="cost" inputmode="decimal" required pattern="[0-9]{1,9}([.][0-9]{1,6})?"></label><label>Currency<select name="currency"><option>BDT</option><option>USD</option><option>USDT</option></select></label>
    <label>Purchased on<input name="acquiredAt" type="date" required value="${businessDate()}"></label><label>Stock expires on (optional)<input name="expiresAt" type="date"></label></div>
    <label>Private delivery credentials<textarea name="credentials" rows="4" maxlength="12000" autocomplete="off" spellcheck="false" required placeholder="Account credentials, license key, code, or seat instructions"></textarea></label>
    <p class="muted small">One assignable item per save. For a shared account, record only the individual seat's delivery details. Credentials are never included in the public catalog.</p><button class="button primary">Save owned item</button></form></details>
    <details class="card card-pad" ${context?'open':''}><summary>Assign stock to a paid purchase</summary><form data-assign class="inventory-form">
    <label>Find customer<input data-customer-search placeholder="Name, phone or username"></label><label>Customer<select name="customerId"><option value="">Choose customer</option>${options(customers,c=>c.name||customerIdentity(c))}</select></label>
    <label>Paid purchase<select name="purchaseId" required><option value="">Choose customer first</option></select></label>
    <label>Available owned item<select name="unitId" required><option value="">Choose a purchase first</option></select></label>
    <p class="muted small">Purchase and stock must use the same saved CRM product. A purchase can have one assigned item. Assignment does not send credentials.</p><button class="button primary">Assign item</button></form></details>
    <details class="card card-pad"><summary>Map an equivalent supplier offer</summary><p class="muted">Map only the same product, plan and term. Offers sharing underlying stock must use the same stock pool ID.</p><form data-map class="inventory-form">
    <label>Saved CRM product<select name="productId" required><option value="">Choose product</option>${options(products,p=>p.name)}</select></label>
    <label>Supplier<select name="sourceId"><option value="canboso">Current supplier · Canboso</option><option value="nam">New supplier · NAM</option></select></label>
    <label>Supplier's product ID<input name="offerId" required pattern="[A-Za-z0-9_-]{1,100}"></label><label>Underlying stock pool ID<input name="stockPoolId" required pattern="[A-Za-z0-9_-]{1,100}" placeholder="Use the same ID for offers sharing stock"></label>
    <label>Status<select name="enabled"><option value="true">Enabled mapping</option><option value="false">Disabled mapping</option></select></label><button class="button">Save mapping</button></form>
    <div>${(listing.mappings||[]).map(m=>`<p>${esc(m.productName)} ← ${esc(m.sourceId)} / ${esc(m.offerId)} · Pool ${esc(m.stockPoolId)} · ${m.enabled?'enabled':'disabled'}</p>`).join('')||'<p>No supplier mappings saved.</p>'}</div>${listing.mappingsTruncated?'<p>More than 100 mappings exist; this view shows the first 100.</p>':''}</details>
    <section class="card card-pad"><h2>Items already purchased from suppliers</h2><div data-units></div><button class="button" data-more ${listing.cursor?'':'hidden'}>Load more owned items</button></section>`;
  const status=root.querySelector('[data-inventory-status]'),units=[...listing.units];let cursor=listing.cursor;
  const reload=()=>renderInventory(root,{user,listProducts,createProduct,listCustomers,listPurchases,context,api});
  root.querySelectorAll('[data-supplier]').forEach(button=>button.onclick=async()=>{
    button.disabled=true;button.dataset.request||=crypto.randomUUID();
    try{await api('/api/inventory/command',{user,body:{action:'setSupplier',sourceId:button.dataset.supplier,enabled:button.dataset.enabled==='true',requestId:button.dataset.request}});await reload();}
    catch(error){status.textContent=error.message||'Supplier change could not be confirmed. Retry.';button.disabled=false;}
  });
  root.querySelector('[data-product-form]').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;
    try{await createProduct({name:form.elements.namedItem('name').value.trim(),price:Number(form.elements.namedItem('price').value),currency:form.elements.namedItem('currency').value,durationDays:Number(form.elements.namedItem('durationDays').value),active:true});await reload();}catch{status.textContent='Could not create product. Check your connection before retrying.';button.disabled=false;}
  };
  const assign=root.querySelector('[data-assign]'),field=(form,name)=>form.querySelector(`[name="${name}"]`);
  const unitOptions=()=>{
    const purchase=purchases.find(p=>p.id===field(assign,'purchaseId').value);
    field(assign,'unitId').innerHTML='<option value="">Choose an available item</option>'+options(units.filter(u=>u.state==='available'&&u.productId===purchase?.productId&&(!u.expiresAt||u.expiresAt>=businessDate())),u=>u.productName+' · '+u.source+' · '+u.acquiredAt+' · '+u.id.slice(0,8));
  };
  const purchaseOptions=()=>{field(assign,'purchaseId').innerHTML='<option value="">Choose a paid purchase</option>'+options(purchases.filter(p=>p.customerId===field(assign,'customerId').value&&p.paymentStatus==='paid'&&p.productId),p=>(p.productName||products.find(x=>x.id===p.productId)?.name||p.productId)+' · '+String(p.purchasedAt||'').slice(0,10)+' · '+p.id.slice(0,8));unitOptions();};
  field(assign,'customerId').onchange=purchaseOptions;field(assign,'purchaseId').onchange=unitOptions;
  root.querySelector('[data-customer-search]').oninput=event=>{
    const q=event.target.value.toLowerCase();field(assign,'customerId').innerHTML='<option value="">Choose customer</option>'+options(customers.filter(c=>[c.name,c.normalizedPhone,c.whatsappUsername].some(v=>String(v||'').toLowerCase().includes(q))),c=>c.name||customerIdentity(c));purchaseOptions();
  };
  if(context){field(assign,'customerId').value=context.customerId;purchaseOptions();field(assign,'purchaseId').value=context.id;unitOptions();}
  const run=async(form,action)=>{
    const button=form.querySelector('button'),controls=form.querySelectorAll('input,textarea,select');
    const input=Object.fromEntries([...form.querySelectorAll('[name]')].map(control=>[control.name,control.value]));input.action=action;
    if(action==='mapOffer')input.enabled=input.enabled==='true';
    // Preserve intent on unknown outcomes. Credentials remain only in this form until acknowledged.
    if(!form.dataset.request)form.dataset.request=crypto.randomUUID();input.requestId=form.dataset.request;
    button.disabled=true;controls.forEach(c=>{c.disabled=true;});status.textContent='Saving…';
    try{await api('/api/inventory/command',{user,body:input});if(action==='receive')field(form,'credentials').value='';status.textContent='Saved.';await reload();}
    catch(error){status.textContent=error.message||'Save could not be confirmed. Retry the same form.';button.disabled=false;if(error.confirmedRejected){controls.forEach(c=>{c.disabled=false;});delete form.dataset.request;}}
  };
  root.querySelector('[data-receive]').onsubmit=event=>{event.preventDefault();run(event.currentTarget,'receive');};
  assign.onsubmit=event=>{event.preventDefault();run(event.currentTarget,'assign');};
  root.querySelector('[data-map]').onsubmit=event=>{event.preventDefault();run(event.currentTarget,'mapOffer');};
  const draw=()=>{
    root.querySelector('[data-units]').innerHTML=units.map(u=>`<article class="purchase-card"><h3>${esc(u.productName)}</h3><p>${esc(u.state)} · ${esc(u.source)} · Cost ${esc(u.cost)} ${esc(u.currency)}</p><p>Purchased ${esc(u.acquiredAt)} · Stock expiry ${esc(u.expiresAt||'None')}</p>${u.customerId?`<p>Assigned to ${esc(customers.find(c=>c.id===u.customerId)?.name||customerIdentity(customers.find(c=>c.id===u.customerId)))} · Purchase ${esc(u.purchaseId)}</p>`:''}<div class="toolbar"><button type="button" class="button" data-reveal="${esc(u.id)}">Reveal credentials</button>${u.state==='assigned'?`<button class="button" data-deliver="${esc(u.id)}">Record manual delivery</button>`:''}${u.state==='available'?`<button class="button" data-retire="${esc(u.id)}">Retire item</button>`:''}</div></article>`).join('')||'<p>No owned stock recorded.</p>';
    root.querySelectorAll('[data-reveal]').forEach(button=>button.onclick=()=>showInventoryCredentials(button.dataset.reveal,user,{api}));
    for(const action of ['deliver','retire'])root.querySelectorAll('[data-'+action+']').forEach(button=>button.onclick=async()=>{
      if(!confirm(action==='deliver'?'Confirm you manually delivered this product to the assigned customer.':'Retire this unassigned item? It will no longer be available for assignment.'))return;
      button.disabled=true;button.dataset.request||=crypto.randomUUID();
      try{await api('/api/inventory/command',{user,body:{action,unitId:button.dataset[action],requestId:button.dataset.request,...(action==='deliver'?{confirmDelivered:true}:{})}});await reload();}catch(error){status.textContent=error.message;button.disabled=false;}
    });
  };
  root.querySelector('[data-more]').onclick=async event=>{
    event.target.disabled=true;try{const next=await api('/api/inventory/list?cursor='+encodeURIComponent(cursor),{user});units.push(...next.units);cursor=next.cursor;draw();unitOptions();event.target.hidden=!cursor;}catch(error){status.textContent=error.message;}finally{event.target.disabled=false;}
  };
  draw();
  await renderSupplierComparison(root.querySelector('[data-supplier-comparison]'),{user,api,onRecorded:reload});
}
