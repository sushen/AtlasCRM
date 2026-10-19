import {businessDate,customerSalesSummary,formatMoney,productAccessStatus} from '../utils/customer-sales.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function renderCustomerSales(el,{customer,listPurchases,listSubscriptions,listProducts,recordPurchase,onSaved,onInventory,listInventory,assignInventory,autoOpen=false}) {
  el.innerHTML='<p class="muted" role="status">Loading purchases…</p>';
  let purchases,subscriptions,products,inventory=[];
  try{[purchases,subscriptions,products,inventory]=await Promise.all([listPurchases(customer.id),listSubscriptions(customer.id),listProducts(),listInventory?listInventory():[]]);}
  catch{el.innerHTML='<p class="error" role="alert">Purchase history could not load. Close and reopen the record to retry.</p>';return;}
  const summary=customerSalesSummary(purchases);
  const productName=p=>p.productName||products.find(x=>x.id===p.productId)?.name||'Product name not recorded';
  const rows=purchases.map(p=>{
    const linked=subscriptions.find(s=>s.purchaseId===p.id)||{};
    const access={...linked,startDate:p.startDate||linked.startDate,expiryDate:p.expiryDate||linked.expiryDate,expiryUnknown:p.expiryUnknown||linked.expiryUnknown};
    const paid=p.paidAmount!==undefined?p.paidAmount:p.paymentStatus==='paid'?p.amount:null;
    return `<article class="purchase-card"><h4>${esc(productName(p))}</h4><dl><dt>Purchase date</dt><dd>${esc(String(p.purchasedAt||'Not recorded').slice(0,10))}</dd><dt>Total price</dt><dd>${esc(formatMoney(p.amount,p.currency||'BDT'))}</dd><dt>Paid</dt><dd>${paid===null?'Not recorded':esc(formatMoney(paid,p.currency||'BDT'))} · ${esc(p.paymentStatus||'unknown')}</dd><dt>Start date</dt><dd>${esc(access.startDate||'Not recorded')}</dd><dt>Expiry date</dt><dd>${esc(access.expiryUnknown?'Not recorded':access.expiryDate||(access.startDate?'No expiry':'Not recorded'))}</dd><dt>Product status</dt><dd>${esc(productAccessStatus(access))}</dd></dl>${p.notes?`<p>${esc(p.notes)}</p>`:''}${onInventory?`<button type="button" class="button" data-purchase-stock="${esc(p.id)}">Stock and credentials</button>`:''}</article>`;
  });
  const unlinked=subscriptions.filter(s=>!purchases.some(p=>p.id===s.purchaseId));
  el.innerHTML=`<h3>Products and spending</h3><div class="sales-summary"><strong>${summary.purchaseCount} purchase${summary.purchaseCount===1?'':'s'}</strong>${summary.totals.map(t=>`<p>Spent: <strong>${esc(formatMoney(t.spent,t.currency))}</strong> · Outstanding: ${esc(formatMoney(t.outstanding,t.currency))}${t.unknownPayments?' · Some older partial payments have no recorded paid amount.':''}</p>`).join('')||'<p class="muted">No purchases recorded yet.</p>'}</div>
    <button type="button" class="button primary" data-add-product>Attach purchased product</button>
    <div data-purchase-form hidden></div><div class="purchase-list">${rows.join('')}</div>
    ${unlinked.length?`<h4>Other subscriptions</h4><p class="muted small">Older subscriptions are shown separately; they are not counted as additional spending.</p>${unlinked.map(s=>`<article class="purchase-card"><strong>${esc(productName(s))}</strong><p>Start: ${esc(s.startDate||'Not recorded')} · Expiry: ${esc(s.expiryDate||'Not recorded')} · ${esc(productAccessStatus(s))}</p></article>`).join('')}`:''}`;
  const host=el.querySelector('[data-purchase-form]'),add=el.querySelector('[data-add-product]');
  el.querySelectorAll('[data-purchase-stock]').forEach(button=>button.onclick=()=>onInventory(purchases.find(p=>p.id===button.dataset.purchaseStock)));
  let requestId;
  add.onclick=()=>{
    add.hidden=true;host.hidden=false;requestId=crypto.randomUUID();
    const today=businessDate();
    host.innerHTML=`<form class="sales-form"><h4>${listInventory?'Assign a product from inventory':'Attach purchased product'}</h4><label>Listed product<select name="productId"><option value="">Choose product or enter its name</option>${products.filter(p=>p.active!==false&&p.kind!=='shared_account').map(p=>`<option value="${esc(p.id)}">${esc(Number.isFinite(p.price)?formatMoney(p.price,p.currency)+' · '+p.name:p.name)}</option>`).join('')}</select></label>
      <label>Product name<input name="productName" required maxlength="200" placeholder="Product and plan"></label>
      <div class="sales-fields"><label>Total price<input name="amount" type="number" min="0" max="1000000000" step="0.01" inputmode="decimal" required></label>
      <label>Amount paid<input name="paidAmount" type="number" min="0" step="0.01" inputmode="decimal" required></label>
      <label>Currency<select name="currency"><option>BDT</option><option>USD</option><option>USDT</option></select></label>
      <label>Purchase date<input name="purchasedAt" type="date" required value="${today}"></label>
      <label>Product start date<input name="startDate" type="date" required value="${today}"></label>
      <label>Expiry date<input name="expiryDate" type="date" min="${today}" required></label></div>
      <label class="checkbox-field"><input type="checkbox" name="noExpiry"> This product has no expiry date</label>
      ${listInventory?'<label>Customer access length (days)<input name="accessDays" type="number" min="1" max="3660" step="1" placeholder="Choose 1, 2, 3… days"></label><p class="muted small">Customer access is separate from the underlying account’s two-year plan and supplier warranty. The catalog price is a reference; confirm the amount actually paid.</p>':''}
      ${listInventory?'<label>Owned inventory account<select name="inventoryUnitId" required><option value="">Choose a product first</option></select></label><p class="muted small">Pick an account you already own. Each customer keeps their own access dates.</p>':''}
      <label>Notes (optional)<textarea name="notes" rows="2" maxlength="5000"></textarea></label>
      <p class="muted small">Records a manual purchase and marks this lead as a customer. Contact restrictions stay unchanged. This does not charge, purchase or deliver a product.</p>
      <p class="error" role="alert" data-sales-error></p><p role="status" aria-live="polite" data-sales-status></p>
      <div class="toolbar"><button type="submit" class="button primary" data-save-purchase>Save purchase</button><button type="button" class="button" data-cancel-purchase>Cancel</button></div></form>`;
    const form=host.querySelector('form'),field=name=>form.querySelector(`[name="${name}"]`);
    const updateInventory=()=>{if(!listInventory)return;const productId=field('productId').value;field('inventoryUnitId').innerHTML='<option value="">Choose an owned account</option>'+inventory.filter(u=>u.state==='available'&&(u.sharedAccount?u.enabledProductIds?.includes(productId):u.productId===productId)).map(u=>`<option value="${esc(u.id)}">${esc(u.label||u.productName)}${u.sharedAccount?' · reusable account':''}</option>`).join('');};
    const updateTerm=()=>{const product=products.find(p=>p.id===field('productId').value);if(!product)return;const days=listInventory?Number(field('accessDays').value):Number(product.durationDays);const start=new Date(field('startDate').value+'T00:00:00Z');if(Number.isNaN(start.getTime())||!Number.isInteger(days)||days<1)return;start.setUTCDate(start.getUTCDate()+days);field('noExpiry').checked=false;field('expiryDate').disabled=false;field('expiryDate').required=true;field('expiryDate').value=start.toISOString().slice(0,10);};
    field('productId').onchange=()=>{const product=products.find(p=>p.id===field('productId').value);if(product){field('productName').value=product.name;if(Number.isFinite(product.price))field('amount').value=product.price;field('paidAmount').value='';field('expiryDate').value='';if(listInventory)field('accessDays').value=product.durationDays||'';if(product.currency)field('currency').value=product.currency;updateTerm();}updateInventory();};
    if(listInventory)field('accessDays').oninput=updateTerm;
    field('startDate').oninput=()=>{field('expiryDate').min=field('startDate').value;updateTerm();};
    field('noExpiry').onchange=()=>{field('expiryDate').disabled=field('noExpiry').checked;field('expiryDate').required=!field('noExpiry').checked;};
    host.querySelector('[data-cancel-purchase]').onclick=()=>{host.hidden=true;host.innerHTML='';add.hidden=false;};
    let busy=false,saved=false,savedPurchase=null;
    form.onsubmit=async event=>{
      event.preventDefault();if(busy||saved)return;busy=true;
      const button=host.querySelector('[data-save-purchase]'),cancel=host.querySelector('[data-cancel-purchase]'),error=host.querySelector('[data-sales-error]');
      button.disabled=true;cancel.disabled=true;error.textContent='';
      const names=['productId','productName','amount','paidAmount','currency','purchasedAt','startDate','notes'];
      const input=Object.fromEntries(names.map(name=>[name,field(name).value]));input.customerId=customer.id;input.expiryDate=field('noExpiry').checked?null:field('expiryDate').value;
      if(listInventory&&!field('inventoryUnitId').value){busy=false;button.disabled=false;cancel.disabled=false;error.textContent='Choose an owned inventory account.';return;}
      // Keep one request identifier through retry; a connection failure must not duplicate a sale.
      form.querySelectorAll('input,select,textarea').forEach(control=>{control.disabled=true;});
      try{
        const purchase=savedPurchase||await recordPurchase(input,requestId);savedPurchase=purchase;
        if(listInventory&&assignInventory&&field('inventoryUnitId').value)await assignInventory({unitId:field('inventoryUnitId').value,customerId:customer.id,purchaseId:purchase.id,requestId:'assign-'+requestId});
        saved=true;
        host.querySelector('[data-sales-status]').textContent='Purchase saved.';
        try{await onSaved();}catch{host.querySelector('[data-sales-status]').textContent='Purchase saved. Close and reopen the customer to refresh history.';}
      }catch(e){error.textContent=savedPurchase?'Purchase saved, but account assignment was not confirmed. Retry to finish this same assignment; do not create another purchase.':e.message||'Could not save. Retry this purchase after checking your connection.';button.disabled=false;cancel.disabled=Boolean(savedPurchase);if(savedPurchase){button.textContent='Retry account assignment';}else{form.querySelectorAll('input,select,textarea').forEach(control=>{control.disabled=false;});field('expiryDate').disabled=field('noExpiry').checked;}}
      finally{busy=false;}
    };
    field('productName').focus();
  };
  if(autoOpen)add.click();
}
