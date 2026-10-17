import { IntegrationError } from './config.mjs';
// Public Market registration must never expand local WhatsApp operator access.
export async function workspaceOperator(auth) {
  const selected=[];let pageToken;
  do {
    const page=await auth.listUsers(1000,pageToken);
    for(const user of page.users)if(!user.disabled&&user.customClaims?.atlasOperator===true)selected.push(user.uid);
    if(selected.length>1)throw new IntegrationError('choose_allowed_firebase_user');
    pageToken=page.pageToken;
  }while(pageToken);
  if(selected.length!==1)throw new IntegrationError('choose_allowed_firebase_user');
  return selected;
}
