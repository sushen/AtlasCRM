import {partnerFetch} from '../services/partner-api.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=minor=>'BDT '+(minor/100).toFixed(2);
const field=(name,label,type='text',value='')=>`<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" required></label>`;
const form=(action,title,fields)=>`<details class="card card-pad"><summary>${title}</summary><form data-action="${action}" class="partner-form">${fields}<button class="button primary">Record ${title.toLowerCase()}</button></form></details>`;
export function partnerDirectoryHtml(listing){
  if(listing.admin!==true)return '';
  return `<section class="card card-pad" data-partner-directory><h2>Partner accounts</h2><p class="muted small">Firebase UID identifies the login linked to each partner.</p>${listing.partners.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Partner</th><th>Partner ID</th><th>Firebase user UID</th><th>Status</th></tr></thead><tbody>${listing.partners.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.id)}</td><td><input type="text" readonly aria-label="Firebase UID for ${esc(p.name)}" value="${esc(p.ownerUid)}"><button type="button" class="button small" data-copy-uid="${esc(p.ownerUid)}">Copy UID</button></td><td>${p.active?'Active':'Suspended'}</td></tr>`).join('')}</tbody></table></div>`:'<p>No partners created yet.</p>'}</section>`;
}
export function dashboardHtml(r){
  const metrics=[['Tracked clicks',r.clicks],['Telegram starts',r.telegramStarts],['Orders',r.orders],['Verified + delivered',r.verifiedSales],['Conversion',r.conversionRate===null?'—':(r.conversionRate*100).toFixed(1)+'%'],['Commission · period',money(r.commissionMinor)],['Paid · lifetime',money(r.paidMinor)],['Due · lifetime',money(r.dueMinor)]];
  const max=Math.max(1,r.clicks,r.telegramStarts,r.orders,r.verifiedSales);
  return `<div class="grid stats-grid">${metrics.map(([label,value])=>`<div class="card card-pad"><span class="muted small">${label}</span><h2>${esc(value)}</h2></div>`).join('')}</div><div class="card card-pad"><h2>Partner journey · period activity</h2>${[['Clicks',r.clicks],['Bot starts',r.telegramStarts],['Orders',r.orders],['Completed sales',r.verifiedSales]].map(([label,value])=>`<div class="partner-bar"><span>${label}</span><progress max="${max}" value="${value}"></progress><strong>${value}</strong></div>`).join('')}<p class="muted small">These are period activities, not a single-customer funnel.</p></div>
    <div class="card card-pad"><h2>Evidence-backed advertising spend</h2>${r.spend.map(x=>`<p>${esc(x.currency)} ${(x.minor/100).toFixed(2)} · Cost per sale: ${x.costPerSale===null?'—':esc(x.currency)+' '+x.costPerSale.toFixed(2)}</p>`).join('')||'<p>No reported spend yet.</p>'}<p>Reserved payouts: ${money(r.reservedMinor)} · Refund recovery balance: ${money(r.debtMinor)}</p>${r.budgets.map(x=>`<p>Approved ${esc(x.month)}: ${esc(x.currency)} ${(x.minor/100).toFixed(2)}</p>`).join('')}${(r.budgetAlerts||[]).map(x=>`<p class="error">${esc(x)}</p>`).join('')}</div>
    <div class="card card-pad"><h2>Commission audit ledger</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Campaign</th><th>Event</th><th>BDT</th></tr></thead><tbody>${r.ledger.map(x=>`<tr><td>${esc(x.orderId)}</td><td>${esc(x.campaignId)}</td><td>${esc(x.type)}</td><td>${(x.minor/100).toFixed(2)}</td></tr>`).join('')}</tbody></table></div><h3>Payout records</h3>${r.payouts.map(x=>`<p>${esc(x.id)} · ${money(x.minor)} · ${esc(x.status)}</p>`).join('')||'<p>No payouts recorded.</p>'}</div><div class="card card-pad">${r.limitations.map(x=>`<p class="muted small">${esc(x)}</p>`).join('')}</div>`;
}
export async function renderPartners(root,user){
  root.innerHTML='<p>Loading authorized partner workspace…</p>';
  try{
    const listing=await (await partnerFetch('/api/partners/list',{user})).json();
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'}),month=today.slice(0,7);
    root.innerHTML=`<div class="page-heading"><div><span class="catalog-eyebrow">ATLAS PARTNERS</span><h1>Performance & commissions</h1><p class="muted">Verified payment + completed delivery. Every commission has an audit trail.</p></div><a class="button" href="/?catalog=1">Market</a></div>
      ${partnerDirectoryHtml(listing)}<form data-filters class="card card-pad toolbar"><label>Partner<select name="partnerId">${listing.partners.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.id)}${p.active?'':' · suspended'}</option>`).join('')}</select></label>${field('from','From','date',month+'-01')}${field('to','To','date',today)}<label>Campaign<input name="campaignId" placeholder="All campaigns"></label><button class="button primary">Refresh report</button><button class="button" type="button" data-export>Export CSV</button></form>
      <p data-status role="status"></p><section data-report></section>${listing.admin?`<section><h2>Administrator controls</h2><p class="muted">Amounts below use integer minor units: 1000 = BDT 10; 10000 = USD 100. Spend is recorded, never purchased here.</p>
      ${form('createPartner','Create partner',field('partnerId','Unique partner ID','text','PARTNER-'+crypto.randomUUID().slice(0,8))+field('name','Partner name')+field('ownerUid','Firebase user UID')+'<label>Partner Telegram numeric ID (optional, blocks known self-referrals)<input name="telegramBuyerId"></label>')}
      ${form('campaign','Generate campaign link',field('partnerId','Partner ID')+field('campaignId','Unique campaign ID')+'<label>Product ID (optional)<input name="productId"></label>')}
      ${form('updatePartner','Update policy',field('partnerId','Partner ID')+'<label>Status<select name="active"><option value="true">Active</option><option value="false">Suspended</option></select></label>'+field('commissionMinor','Commission per future order · BDT minor','number',1000)+field('budgetLimitMinor','Monthly maximum · USD minor','number',10000))}
      ${form('approveBudget','Approve monthly budget',field('partnerId','Partner ID')+field('month','Month','month',month)+field('minor','Approved amount · USD minor','number',10000))}
      ${form('spend','Record actual spend',field('partnerId','Partner ID')+field('campaignId','Campaign ID')+field('date','Spend date','date',today)+field('currency','Billing currency','text','USD')+field('minor','Total for that campaign/day/currency · minor','number')+field('evidence','Evidence reference (receipt/report ID; no credentials)'))}
      ${form('approvePayout','Approve commission payout',field('partnerId','Partner ID')+field('minor','Amount · BDT minor','number'))}
      ${form('settlePayout','Record settled payout',field('partnerId','Partner ID')+field('payoutId','Approved payout ID')+field('evidence','Actual transfer reference'))}
      ${form('cancelPayout','Cancel unsettled payout',field('partnerId','Partner ID')+field('payoutId','Approved payout ID')+field('note','Cancellation reason'))}
      ${form('refund','Record completed refund',field('partnerId','Partner ID')+field('orderId','Attributed order ID')+field('note','Manual refund evidence / reason'))}
      ${form('cancelOrder','Cancel unpaid order',field('partnerId','Partner ID')+field('orderId','Attributed order ID')+field('note','Cancellation reason'))}</section>`:''}`;
    const status=root.querySelector('[data-status]'),filters=root.querySelector('[data-filters]');
    root.querySelectorAll('[data-copy-uid]').forEach(button=>button.onclick=async()=>{
      try{await navigator.clipboard.writeText(button.dataset.copyUid);status.textContent='Partner Firebase UID copied.';}
      catch{status.textContent='Select the UID field to copy it manually.';button.parentElement.querySelector('input').select();}
    });
    const query=()=>new URLSearchParams(new FormData(filters)).toString();
    const refresh=async()=>{try{status.textContent='Loading…';const report=await (await partnerFetch('/api/partners/report?'+query(),{user})).json();root.querySelector('[data-report]').innerHTML=dashboardHtml(report);status.textContent='Live order-store report. Firestore mirror: '+(report.firestoreSync?.ok?'last batch synced; later writes may be queued':'pending / not configured');}catch(error){status.textContent=error.message;root.querySelector('[data-report]').textContent='Report unavailable. No estimated or demo balances are shown.';}};
    filters.onsubmit=event=>{event.preventDefault();refresh();};
    root.querySelector('[data-export]').onclick=async()=>{try{const response=await partnerFetch('/api/partners/export?'+query(),{user}),url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download='atlas-partner-report.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){status.textContent=error.message;}};
    root.querySelectorAll('[data-action]').forEach(form=>form.onsubmit=async event=>{
      event.preventDefault();const button=form.querySelector('button');button.disabled=true;
      try{
        const input=Object.fromEntries(new FormData(form));input.action=form.dataset.action;
        // Keep the same receipt on an uncertain network outcome; changing inputs starts a new intent.
        const digest=JSON.stringify(input);if(form.dataset.intent!==digest){form.dataset.intent=digest;form.dataset.request=crypto.randomUUID();}input.requestId=form.dataset.request;
        for(const key of ['minor','commissionMinor','budgetLimitMinor'])if(key in input)input[key]=Number(input[key]);
        if('active'in input)input.active=input.active==='true';
        const result=await (await partnerFetch('/api/partners/admin',{user,body:input})).json();
        status.textContent=result.url||'Action saved. Payout ID (if approved): '+input.requestId;
        if(input.action==='createPartner'){await renderPartners(root,user);return;}
        await refresh();if(result.url)status.textContent=result.url;
      }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
    });
    if(listing.partners.length)await refresh();else status.textContent='No partner access assigned. An Atlas operator must create your partner record using your Firebase UID.';
  }catch(error){root.textContent=error.message;}
}
