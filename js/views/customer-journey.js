import {customerJourney,journeyStages} from '../utils/customer-journey.js';
import {customerIdentity} from '../utils/customer-identity.js';
import {customerMatches,formatMoney} from '../utils/customer-sales.js';
import {formatDate,formatDateTime} from '../utils/dates.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function renderCustomerJourney(root,{user,listCustomers,listActivities,listPurchases,listSubscriptions,listFollowups,checkSending,sendMessage,onCustomer,onFollowup,initialCustomerId=null,getAssignment=async()=>null,onInventory=()=>{},onAssignProduct=()=>{}}={}){
  root.innerHTML='<p role="status">Loading customer journeys…</p>';
  const [customers,purchases,subscriptions,followups]=await Promise.all([listCustomers(),listPurchases(),listSubscriptions(),listFollowups()]);
  let selected=customers.some(c=>c.id===initialCustomerId)?initialCustomerId:customers.find(c=>c.lastReplyAt)?.id||customers[0]?.id,query='',filter='',selection=0,ready=false;
  const focused=customers.some(c=>c.id===initialCustomerId);
  const drafts=new Map(),locked=new Set();
  root.innerHTML=`<div class="page-heading"><div><p class="journey-eyebrow">ATLAS WORKSPACE</p><h1>${focused?'Customer & assigned products':'Conversations that move forward'}</h1><p class="muted">${focused?'The saved purchase, access dates and assigned account for this person.':'See the person, their next step and every product they use.'}</p></div>${focused?'<a class="button" href="?inbox=1">All customer journeys</a>':''}<button class="button" data-connection>Check WhatsApp connection</button></div>
    <section data-case-summary></section>
    <div class="card card-pad journey-connection"><strong>Incoming message → lead → conversation → purchase → renewal</strong><p class="muted small" data-connection-status role="status">Existing Firebase records are shown. Live automatic capture needs a connected WhatsApp webhook. No automated replies or reminders are enabled.</p></div>
    ${focused?'':'<h2>Customers by current stage</h2><p class="muted small">These counts show where people are now, rather than how many purchases they have made.</p>'}<div class="journey-stages" data-stages ${focused?'hidden':''}></div>
    <div class="journey-workspace ${focused?'journey-focused':''}"><aside class="card card-pad" ${focused?'hidden':''}><h2>People & next steps</h2><label class="field">Find a person<input data-search placeholder="Name, phone or WhatsApp username"></label><div data-people></div></aside>
    <section class="card card-pad" data-conversation></section><aside class="card card-pad" data-context></aside></div>`;
  const state=c=>customerJourney(c,{purchases,subscriptions,followups});
  root.querySelector('[data-stages]').innerHTML=journeyStages.map(([id,label],i)=>`<button class="card journey-stage" data-stage="${id}"><span class="muted small">0${i+1} · ${label}</span><strong>${customers.filter(c=>state(c).stage===id).length}</strong></button>`).join('');
  const people=()=>{
    const rows=customers.filter(c=>customerMatches(c,query)&&(!filter||state(c).stage===filter));
    root.querySelector('[data-people]').innerHTML=rows.slice(0,50).map(c=>`<button class="journey-person ${c.id===selected?'selected':''}" data-person="${esc(c.id)}"><strong>${esc(c.name||'Unnamed lead')}</strong><span>${esc(state(c).next)}</span><small>${esc(customerIdentity(c))} · ${esc(journeyStages.find(([id])=>id===state(c).stage)?.[1]||'Lead')}</small></button>`).join('')||'<p class="muted">No people in this stage yet.</p>';
    if(rows.length>50)root.querySelector('[data-people]').insertAdjacentHTML('beforeend','<p class="muted small">Showing 50 people. Search to narrow the list.</p>');
    root.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>{selected=b.dataset.person;people();show();});
  };
  const show=async()=>{
    const revision=++selection,c=customers.find(c=>c.id===selected),pane=root.querySelector('[data-conversation]'),context=root.querySelector('[data-context]');
    if(!c){pane.innerHTML='<h2>Your next conversation starts here</h2><p class="muted">No customer records are available. Incoming messages will appear after the official WhatsApp connection is active.</p>';context.innerHTML='<h2>Customer journey</h2><p class="muted">No customer selected.</p>';return;}
    pane.innerHTML='<p role="status">Loading the conversation history…</p>';
    let activities;
    try{activities=await listActivities(c.id);}catch{if(revision===selection)pane.innerHTML='<p class="error">Conversation history could not load. Reopen this person to retry.</p>';return;}
    if(revision!==selection||!root.isConnected)return;
    const journey=customerJourney(c,{activities,purchases,subscriptions,followups});
    const summary=root.querySelector('[data-case-summary]');
    if(focused)summary.innerHTML=`<article class="card card-pad case-purchase-overview"><h2>${esc(c.name||customerIdentity(c))} <span class="badge">${esc(c.customerStatus||c.status)}</span></h2><p><strong>${journey.summary.purchaseCount} recorded purchase${journey.summary.purchaseCount===1?'':'s'}</strong> · ${journey.summary.totals.map(t=>esc(formatMoney(t.spent,t.currency))+' paid').join(' · ')||'No payments recorded'}</p>${journey.sales.map(p=>`<div class="case-purchase-row"><h3>${esc(p.productName||'Purchased product')}</h3><dl><div><dt>Amount paid</dt><dd>${esc(formatMoney(p.paidAmount,p.currency))}</dd></div><div><dt>Customer access</dt><dd>${esc(formatDate(p.startDate))} → ${p.expiryUnknown?'Access term not recorded':esc(formatDate(p.expiryDate))}</dd></div><div><dt>Assigned account</dt><dd data-case-account="${esc(p.id)}">Loading assignment…</dd></div></dl></div>`).join('')||'<p class="muted">No purchased products recorded yet.</p>'}${journey.summary.unrecordedPayments?'<p class="muted small">Payment amount is not recorded for one or more purchases; those amounts are excluded from spending totals.</p>':''}</article>`;
    pane.innerHTML=`<div class="journey-person-heading"><div><h2>${esc(c.name||'Unnamed lead')}</h2><p class="muted small">${esc(customerIdentity(c))}</p></div><button class="button small" data-open-customer>Full profile</button></div><div class="journey-next"><span class="muted small">NEXT STEP</span><strong>${esc(journey.next)}</strong></div>
      <div class="journey-messages">${journey.messages.map(a=>`<article class="journey-message ${a.type==='whatsapp_message_received'?'inbound':'outbound'}"><strong>${a.type==='whatsapp_message_received'?'Customer message':a.type==='whatsapp_message_accepted'?'API accepted · delivery not confirmed':'WhatsApp status update'}</strong><p>${esc(a.note||a.description||'')}</p><small>${esc(formatDateTime(a.createdAt))}</small></article>`).join('')||'<div class="journey-empty"><h3>No verified WhatsApp messages yet</h3><p>Saved numbers and manual notes are not incoming messages. Connect the official webhook to receive real enquiries automatically.</p></div>'}</div>
      <form data-reply><label class="field">Reply on WhatsApp<textarea data-draft rows="3" maxlength="4096" placeholder="Write your reply…" ${journey.suppressed?'disabled':''}></textarea></label><button class="button primary" type="submit" data-send disabled>Send reply</button><p class="muted small" data-send-status role="status">${journey.suppressed?'Messaging is blocked for this customer.':!c.normalizedPhone?'Official API sending requires a linked phone identity; a username alone is not enough.':'Check the WhatsApp connection before sending. Sending is always an explicit action.'}</p></form>`;
    context.innerHTML=`<p class="journey-eyebrow">CUSTOMER JOURNEY</p><h2>${esc(journeyStages.find(([id])=>id===journey.stage)?.[1])}</h2><ol class="journey-progress">${journeyStages.map(([id,label])=>`<li class="${id===journey.stage?'current':''}">${label}${id===journey.stage?' · current':''}</li>`).join('')}</ol><h3>Products & spending</h3><p><strong>${journey.summary.purchaseCount}</strong> recorded purchases</p>${journey.summary.totals.map(t=>`<p><strong>${esc(formatMoney(t.spent,t.currency))}</strong> paid${t.outstanding?`<br><span class="muted small">${esc(formatMoney(t.outstanding,t.currency))} outstanding</span>`:''}</p>`).join('')||'<p class="muted small">No payments recorded.</p>'}<div class="journey-access">${journey.access.map(s=>`<p><strong>${esc(s.productName||'Subscription')}</strong><br>${esc(s.access)}<br><span class="muted small">${esc(formatDate(s.startDate))} → ${esc(formatDate(s.expiryDate))}</span></p>`).join('')}</div><h3>Follow-up</h3><p class="muted small">${journey.followups.length?esc(formatDateTime(journey.followups[0].dueAt)):'No pending follow-up.'}</p><button class="button small" data-followup ${journey.suppressed?'disabled':''}>Schedule follow-up</button><p class="muted small">Qualification, received payment and delivery remain explicit facts; this view never invents them.</p>`;
    const recordedHistory=activities.filter(a=>!['whatsapp_message_received','whatsapp_message_accepted','whatsapp_message_status'].includes(a.type));
    pane.querySelector('[data-reply]').insertAdjacentHTML('beforebegin',`<details class="journey-history" open><summary>Recorded customer history</summary>${recordedHistory.map(a=>`<article class="timeline-item"><time>${esc(formatDateTime(a.createdAt))}</time><strong>${esc(({lead_added:'Lead added',purchase_added:'Purchase recorded',customer_journey_started:'Customer journey confirmed'})[a.type]||String(a.type||'Activity').replaceAll('_',' '))}</strong><p class="muted small">${esc(a.note||a.description||'')}</p></article>`).join('')||'<p class="muted small">No business events recorded.</p>'}</details>`);
    summary.insertAdjacentHTML('beforeend','<button class="button primary" data-assign-product>Assign product</button>');
    summary.querySelector('[data-assign-product]').onclick=()=>onAssignProduct(c.id);
    context.insertAdjacentHTML('beforeend','<h3>Assigned accounts</h3><div data-assignments><p class="muted small">Loading account assignments…</p></div>');
    const assignmentArea=context.querySelector('[data-assignments]');
    if(!journey.sales.length)assignmentArea.innerHTML='<p class="muted small">Record a purchase before assigning access.</p>';
    else Promise.all(journey.sales.map(async purchase=>{
      try{const data=await getAssignment(purchase);return {purchase,unit:data?.units?.[0]||null,available:Boolean(data)};}catch{return {purchase,available:false};}
    })).then(rows=>{
      if(revision!==selection||!assignmentArea.isConnected)return;
      assignmentArea.innerHTML=rows.map(({purchase,unit,available})=>`<p><strong>${esc(purchase.productName||'Purchased product')}</strong><br>${unit?esc(unit.label||unit.productName)+(unit.sharedAccount?' · shared account':''):available?'No account assigned':'Assignment details unavailable'}<br><button class="button small" data-purchase-account="${esc(purchase.id)}">${unit?'View assigned account':'Manage assignment'}</button></p>`).join('');
      for(const {purchase,unit,available} of rows){const slot=[...summary.querySelectorAll('[data-case-account]')].find(el=>el.dataset.caseAccount===purchase.id);if(slot)slot.textContent=unit?(unit.label||unit.productName)+(unit.sharedAccount?' · reusable account':''):available?'No account assigned':'Assignment could not load — reload this local page.';}
      assignmentArea.querySelectorAll('[data-purchase-account]').forEach(b=>b.onclick=()=>onInventory(journey.sales.find(p=>p.id===b.dataset.purchaseAccount)));
    });
    root.querySelector('[data-open-customer]').onclick=()=>onCustomer(c.id);root.querySelector('[data-followup]').onclick=()=>onFollowup(c.id);
    const draft=pane.querySelector('[data-draft]'),send=pane.querySelector('[data-send]'),status=pane.querySelector('[data-send-status]');draft.value=drafts.get(c.id)||'';
    const update=()=>{send.disabled=!ready||journey.suppressed||!c.normalizedPhone||locked.has(c.id)||!draft.value.trim();};draft.oninput=()=>{drafts.set(c.id,draft.value);update();};update();
    pane.querySelector('[data-reply]').onsubmit=async e=>{
      e.preventDefault();if(send.disabled)return;locked.add(c.id);send.disabled=true;draft.readOnly=true;status.textContent='Sending reply…';
      try{await sendMessage(user,c.id,draft.value.trim(),crypto.randomUUID());status.textContent='Accepted by WhatsApp. Delivery will be confirmed only by a provider status event.';drafts.delete(c.id);draft.value='';send.textContent='Accepted';}
      catch(error){status.textContent=error.message;if(error.retrySafe){locked.delete(c.id);draft.readOnly=false;update();}else send.textContent='Check message history';}
    };
  };
  root.querySelector('[data-search]').oninput=e=>{query=e.target.value;people();};
  root.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{filter=filter===b.dataset.stage?'':b.dataset.stage;root.querySelectorAll('[data-stage]').forEach(x=>x.classList.toggle('active',x.dataset.stage===filter));people();});
  root.querySelector('[data-connection]').onclick=async e=>{e.target.disabled=true;const status=root.querySelector('[data-connection-status]');try{await checkSending(user);ready=true;status.textContent='Sending service connected. Incoming capture still requires the verified public webhook. Replies are sent only when you press Send reply.';}catch(error){ready=false;status.textContent=error.message;}finally{e.target.disabled=false;show();}};
  people();await show();
}
