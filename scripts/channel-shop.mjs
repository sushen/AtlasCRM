import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {SupplierCatalog} from '../server/catalog.mjs';
import {channelShopPosts} from '../server/channel-shop.mjs';
import {SHOP_COMMANDS,ADMIN_SHOP_COMMANDS,MANUAL_CHECKOUT_COMMANDS,MANUAL_CHECKOUT_ADMIN_COMMANDS,shopContactUrl} from '../server/telegram-shop.mjs';
const command=process.argv[2]||'preview';
if(!['preview','publish'].includes(command))throw Error('Use preview or publish');
const channel='@atlascrmshop';
const support=shopContactUrl(process.env.TELEGRAM_SHOP_SUPPORT_URL||'');
if(!support)throw Error('Configure a public shop admin contact');
const {products}=await new SupplierCatalog().list();
const posts=channelShopPosts(products,{supportUrl:support});
const dir=resolve('.catalog-state');await mkdir(dir,{recursive:true});
await writeFile(resolve(dir,'channel-shop-preview.md'),'# Atlas channel shop preview\n\n'+posts.map(p=>'## '+p.key+'\n\n'+p.text+'\n\n'+p.reply_markup.inline_keyboard.flat().map(b=>'- ['+b.text+']('+b.url+')').join('\n')).join('\n\n'));
await writeFile(resolve(dir,'channel-shop-payload.json'),JSON.stringify(posts,null,2));
console.log('Channel shop preview saved locally: '+posts.length+' posts. No credentials in preview.');
if(command==='publish') {
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const call=async(method,data)=>{
    const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),redirect:'manual',signal:AbortSignal.timeout(15000)});
    const result=await response.json();
    if(['editMessageText','editMessageMedia'].includes(method)&&result.error_code===400&&String(result.description).includes('message is not modified'))return true;
    if(!response.ok||!result.ok)throw Error('Channel API operation failed; do not blindly resend unknown outcomes');return result.result;
  };
  // Publishing deep links is safe only after the hosted shop is confirmed active.
  const info=await call('getWebhookInfo',{});
  if(info.url!=='https://atlas.meshstocks.workers.dev/webhooks/telegram')throw Error('Activate and verify the hosted shop before publishing channel posts');
  const readiness=await fetch('https://atlas.meshstocks.workers.dev/api/admin/shop-readiness',{headers:{Authorization:'Bearer '+process.env.ATLAS_ADMIN_TOKEN},signal:AbortSignal.timeout(15000)});
  if(!readiness.ok)throw Error('Shop readiness check failed');
  const ready=await readiness.json();if(!ready.enabled||!ready.shopConfigured)throw Error('Hosted shop is not enabled/configured');
  const me=await call('getMe',{});const chat=await call('getChat',{chat_id:channel});
  const membership=await call('getChatMember',{chat_id:chat.id,user_id:me.id});
  if(chat.type!=='channel'||membership.status!=='administrator'||!membership.can_post_messages||!membership.can_edit_messages)throw Error('Bot needs approved channel post/edit rights');
  const path=resolve(dir,'channel-shop-receipts.json');let receipts={};
  try{receipts=JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw Error('Cannot read channel publication receipts');}
  const save=async()=>{await writeFile(path+'.tmp',JSON.stringify(receipts),{mode:0o600});await rename(path+'.tmp',path);};
  for(const post of posts) {
    const prior=receipts[post.key];
    if(prior?.state==='attempted')throw Error('Previous post outcome is unknown. Inspect channel before recovering this receipt.');
    const {key,photo,text,reply_markup}=post;
    if(prior?.messageId) {
      if(photo)await call('editMessageMedia',{chat_id:channel,message_id:prior.messageId,media:{type:'photo',media:photo,caption:text.slice(0,1024)},reply_markup});
      else await call('editMessageText',{chat_id:channel,message_id:prior.messageId,text,reply_markup,link_preview_options:{is_disabled:true}});
    }
    else {
      receipts[key]={state:'attempted',at:Date.now()};await save();
      const sent=await call(photo?'sendPhoto':'sendMessage',{chat_id:channel,...(photo?{photo,caption:text.slice(0,1024)}:{text,link_preview_options:{is_disabled:true}}),reply_markup,disable_notification:true});
      receipts[key]={state:'published',messageId:sent.message_id,at:Date.now()};await save();
    }
  }
  if(receipts.welcome?.messageId)await call('pinChatMessage',{chat_id:channel,message_id:receipts.welcome.messageId,disable_notification:true});
  const manual=process.env.MANUAL_CHECKOUT_ENABLED==='true';
  await call('setMyCommands',{commands:manual?[...SHOP_COMMANDS,...MANUAL_CHECKOUT_COMMANDS]:SHOP_COMMANDS,scope:{type:'all_private_chats'}});
  for(const admin of String(process.env.TELEGRAM_SHOP_ADMIN_IDS||'').split(',').filter(s=>/^\d+$/.test(s)))await call('setMyCommands',{commands:manual?[...ADMIN_SHOP_COMMANDS,...MANUAL_CHECKOUT_COMMANDS,...MANUAL_CHECKOUT_ADMIN_COMMANDS]:ADMIN_SHOP_COMMANDS,scope:{type:'chat',chat_id:Number(admin)}});
  console.log('Approved channel shop posts published/updated and welcome pinned. Bot command menu configured. No payment or supplier purchase occurred.');
}
