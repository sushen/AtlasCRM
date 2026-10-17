import {readFile,writeFile} from 'node:fs/promises';
// Read-only Telegram inspection; saves private admin ID/config locally.
const token=process.env.TELEGRAM_BOT_TOKEN;
const call=async(method,data)=>{
  const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),redirect:'manual',signal:AbortSignal.timeout(15000)});
  const body=await response.json();if(!response.ok||!body.ok)throw Error('Channel access inspection failed');return body.result;
};
try {
  const me=await call('getMe',{});const chat=await call('getChat',{chat_id:'@atlascrmshop'});
  const own=await call('getChatMember',{chat_id:chat.id,user_id:me.id});
  if(own.status!=='administrator'||!own.can_post_messages||!own.can_edit_messages)throw Error('Grant bot post/edit permissions');
  const administrators=await call('getChatAdministrators',{chat_id:chat.id});
  const owners=administrators.filter(a=>a.status==='creator'&&!a.user.is_bot);
  if(owners.length!==1)throw Error('Choose the channel owner for order reviews');
  const contact=process.env.TELEGRAM_SHOP_SUPPORT_URL||(owners[0].user.username?'https://t.me/'+owners[0].user.username:'');
  const settings={TELEGRAM_SHOP_ADMIN_IDS:String(owners[0].user.id),TELEGRAM_SHOP_ENABLED:'true',TELEGRAM_SHOP_SUPPORT_URL:contact};
  for(const file of ['.env','.dev.vars']) {
    const path=new URL('../'+file,import.meta.url);let source=await readFile(path,'utf8');
    for(const[name,value]of Object.entries(settings)) {
      const line=name+'='+JSON.stringify(value);const pattern=new RegExp('^'+name+'=.*$','m');source=pattern.test(source)?source.replace(pattern,line):source.trimEnd()+'\n'+line+'\n';
    }
    await writeFile(path,source,{mode:0o600});
  }
  console.log('Verified channel bot permissions and selected its single human owner for reviews. Admin details omitted. Public contact available: '+Boolean(contact)+'. Saved local shop configuration only; no messages, webhook or restart.');
}catch(error){console.error(error.message);process.exitCode=1;}
