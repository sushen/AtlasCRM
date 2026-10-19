import {normalizePhone} from '../utils/phone.js';
import {normalizeWhatsAppUsername} from '../utils/customer-identity.js';

// Persistence is supplied by the caller so this workflow remains independent of UI/Firebase.
export async function saveQuickLead(input, createCustomer) {
  const usernameMode=input.identifierType==='username'||/^@|[a-z_]/i.test(String(input.phone||'').trim());
  const phone=usernameMode?null:normalizePhone(input.phone);
  const username=usernameMode?normalizeWhatsAppUsername(input.phone):null;
  if(usernameMode&&!username)throw Error('Enter a valid WhatsApp username: 3–35 letters, numbers, periods or underscores.');
  if(!usernameMode&&(!phone||/[a-z@]/i.test(input.phone)))throw Error('Enter a valid phone number, or choose WhatsApp username to save a handle.');
  return createCustomer({phone,...(username?{whatsappUsername:'@'+username}:{}),name:String(input.name||'').trim(),notes:String(input.notes||'').trim(),
    source:'WhatsApp Quick Add',sourceGroup:'Manual enquiry',status:'new',customerStatus:'lead',tags:['whatsapp-lead','quick-add']},
  {activityType:'lead_added',activityNote:'WhatsApp enquiry added manually with Quick Add'});
}
