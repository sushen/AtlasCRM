const action=process.argv[2];
if(!['status','on','off'].includes(action))throw Error('Use status, on or off');
const response=await fetch('https://atlas.meshstocks.workers.dev/api/admin/bot-state',{
  method:action==='status'?'GET':'POST',headers:{Authorization:'Bearer '+process.env.ATLAS_ADMIN_TOKEN,...(action==='status'?{}:{'Content-Type':'application/json'})},
  ...(action==='status'?{}:{body:JSON.stringify({enabled:action==='on'})}),redirect:'manual',signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error('Bot state change not confirmed');
const body=await response.json();if(body.service!=='atlas-market'||typeof body.enabled!=='boolean')throw Error('Unexpected admin response');
console.log('Atlas hosted bot enabled: '+body.enabled);
