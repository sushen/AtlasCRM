import {saveQuickLead} from '../services/quick-add.js';

export function renderQuickAdd(el,{createCustomer,openCustomer,demo=false}) {
  el.innerHTML=`<div class="quick-add"><a class="button" href="/index.html">← Atlas CRM</a>
    <div class="page-heading"><div><h1>Add lead</h1><p class="muted">Copy a phone number or username from WhatsApp, paste it here, and save.</p></div></div>
    ${demo?'<p class="muted">Demo mode: saved only in this browser.</p>':''}
    <form class="card card-pad" id="quick-lead-form">
      <label class="field" for="lead-phone">Phone number or WhatsApp username <span class="muted small">Required</span>
        <input id="lead-phone" name="phone" type="text" inputmode="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="01… / +country code… / @username" required aria-describedby="phone-help"></label>
      <p id="phone-help" class="muted small">Paste a number or the exact WhatsApp username, not a display name. No phone is needed for a username. Start a numeric-only username with @. Matching saved identities open the existing record.</p>
      <details><summary>Name and notes (optional)</summary>
        <label class="field" for="lead-name">Name<input id="lead-name" name="name" autocomplete="off" maxlength="200"></label>
        <label class="field" for="lead-notes">Notes<textarea id="lead-notes" name="notes" rows="3" maxlength="5000" placeholder="What are they interested in?"></textarea></label>
      </details>
      <p class="error" data-error role="alert"></p>
      <button class="button primary" type="submit" data-save>Save lead</button>
      <p data-result role="status" aria-live="polite"></p>
      <div class="toolbar" data-next hidden><button type="button" class="button" data-open>Open record</button><button type="button" class="button" data-another>Add another lead</button></div>
    </form></div>`;
  const form=el.querySelector('form'),phone=el.querySelector('#lead-phone'),save=el.querySelector('[data-save]');
  const error=el.querySelector('[data-error]'),result=el.querySelector('[data-result]'),next=el.querySelector('[data-next]');
  let customerId,busy=false;
  const open=async()=>{try{await openCustomer(customerId);}catch{error.textContent='The lead is saved, but its record could not open. Tap Open record to retry.';}};
  el.querySelector('[data-open]').onclick=open;
  el.querySelector('[data-another]').onclick=()=>{form.reset();customerId=null;next.hidden=true;save.disabled=false;result.textContent='';error.textContent='';phone.focus();};
  form.onsubmit=async event=>{
    event.preventDefault();if(busy||save.disabled)return;
    busy=true;save.disabled=true;save.textContent='Saving…';error.textContent='';result.textContent='';
    try{
      const saved=await saveQuickLead({phone:phone.value,name:el.querySelector('#lead-name').value,notes:el.querySelector('#lead-notes').value},createCustomer);
      customerId=saved.customer.id;next.hidden=false;
      result.textContent=saved.duplicate?'Already in Atlas. Opening the existing record; its details and history are unchanged.':'Lead saved. Opening the record.';
      await open();
    }catch(e){error.textContent=e.message?.startsWith('Enter a valid ')?e.message:'Could not save the lead. Check your connection and operator sign-in, then retry.';save.disabled=false;}
    finally{busy=false;save.textContent='Save lead';}
  };
}
