import {businessDate,productAccessStatus,customerSalesSummary} from './customer-sales.js';
import {asDate} from './dates.js';

export const journeyStages=[['lead','New lead'],['conversation','Conversation'],['interested','Interested'],['purchase','Purchase'],['subscription','Subscription'],['renewal','Renewal']];
const time=value=>asDate(value)?.getTime()||0;
export function customerJourney(customer,{activities=[],purchases=[],subscriptions=[],followups=[],today=businessDate()}={}){
  const own=rows=>rows.filter(row=>row.customerId===customer.id);
  const sales=own(purchases),access=own(subscriptions).map(s=>({...s,access:productAccessStatus(s,today)}));
  const paid=sales.filter(p=>p.paymentStatus==='paid');
  const due=own(followups).filter(f=>f.status==='pending').sort((a,b)=>String(a.dueAt).localeCompare(String(b.dueAt)));
  const messages=own(activities).filter(a=>['whatsapp_message_received','whatsapp_message_accepted','whatsapp_message_status'].includes(a.type)).sort((a,b)=>time(a.createdAt)-time(b.createdAt));
  const inbound=messages.filter(a=>a.type==='whatsapp_message_received').at(-1),outbound=messages.filter(a=>a.type==='whatsapp_message_accepted').at(-1);
  const replyNeeded=Boolean(inbound&&(!outbound||time(inbound.createdAt)>time(outbound.createdAt)));
  const suppressed=['blocked','do_not_contact'].includes(customer.status);
  const renewals=access.filter(s=>['Expiring soon','Expired'].includes(s.access));
  let stage='lead';
  if(customer.lastReplyAt||messages.length||['contacted','replied'].includes(customer.status))stage='conversation';
  if(['interested','negotiating'].includes(customer.status))stage='interested';
  if(sales.length||customer.status==='customer')stage='purchase';
  if(access.some(s=>['Active','No expiry','Expiring soon'].includes(s.access))&&paid.length)stage='subscription';
  if(renewals.length)stage='renewal';
  const outstanding=customerSalesSummary(sales).totals.some(t=>t.outstanding>0);
  const next=suppressed?'Do not contact':replyNeeded?'Reply to the latest message':renewals.length?'Review subscription renewal':outstanding?'Review outstanding payment':due.length?'Follow up with this customer':paid.length&&!access.length?'Record product access dates':stage==='lead'?'Wait for an enquiry or review the lead':stage==='interested'?'Confirm the product and payment':stage==='conversation'?'Understand the customer’s needs':'Review customer and product history';
  return {stage,next,suppressed,replyNeeded:!suppressed&&replyNeeded,messages,sales,access,renewals,followups:due,summary:customerSalesSummary(sales)};
}
