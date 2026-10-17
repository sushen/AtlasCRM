// Deliberate operator command. Registration never occurs on import or startup.
const command=process.argv[2];
if(!['status','register'].includes(command))throw Error('Use status or register');
const token=process.env.TELEGRAM_BOT_TOKEN;
const origin=process.env.ATLAS_WORKER_URL||'https://atlas.meshstocks.workers.dev';
if(origin.replace(/\/$/,'')!=='https://atlas.meshstocks.workers.dev'||!token)throw Error('Configure the private bot token and fixed Atlas Worker URL');
const secret=process.env.TELEGRAM_WEBHOOK_SECRET;
if(command==='register'&&(!secret||!/^[-_a-zA-Z0-9]{32,256}$/.test(secret)))throw Error('Configure TELEGRAM_WEBHOOK_SECRET first');
try {
  const method=command==='status'?'getWebhookInfo':'setWebhook';
  const payload=command==='register'?{url:origin.replace(/\/$/,'')+'/webhooks/telegram',secret_token:secret,
    allowed_updates:['message','callback_query'],max_connections:1,drop_pending_updates:false}:{};
  const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000),redirect:'error'});
  const body=await response.json();
  if(!response.ok||!body.ok)throw Error('failed');
  if(command==='register')console.log('Atlas webhook registered. No pending updates dropped.');
  else console.log(JSON.stringify({configured:Boolean(body.result.url),pointsToAtlas:body.result.url===origin.replace(/\/$/,'')+'/webhooks/telegram',pendingUpdates:body.result.pending_update_count||0,hasDeliveryError:Boolean(body.result.last_error_date)}));
}catch{console.error('Telegram webhook command failed; credential and provider details omitted.');process.exitCode=1;}
