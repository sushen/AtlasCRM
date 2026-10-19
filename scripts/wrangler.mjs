import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
// Wrangler requires Node 22+; the local Atlas backend still supports Node 20.
const bundled = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe');
const runtime = Number(process.versions.node.split('.')[0]) >= 22 ? process.execPath : existsSync(bundled) ? bundled : null;
if (!runtime) throw Error('Wrangler requires Node 22+. Install it and retry.');
const cli=join(import.meta.dirname, '../node_modules/wrangler/bin/wrangler.js');
const args=process.argv.slice(2);
const hidden=[];
try {
  const values=parseEnv(readFileSync(join(import.meta.dirname,'../.env'),'utf8'));
  for(const [name,value] of Object.entries(values))if(/TOKEN|SECRET|BUYER_API_KEY|BINANCE_PAY_UID|BINANCE_PAY_NAME|BINANCE_PAY_QR_FILE_ID/.test(name)&&value.length>=8)hidden.push(value);
}catch{}
const redact=text=>hidden.reduce((safe,value)=>safe.split(value).join('[REDACTED]'),text);
async function run(arguments_) {
  return new Promise(resolve=>{
    const child=spawn(runtime,[cli,...arguments_],{stdio:['inherit','pipe','pipe'],env:process.env,windowsHide:true});
    for(const [stream,output] of [[child.stdout,process.stdout],[child.stderr,process.stderr]]) {
      let pending='';
      stream.setEncoding('utf8');stream.on('data',chunk=>{
        pending+=chunk;let end;
        while((end=pending.indexOf('\n'))>=0){output.write(redact(pending.slice(0,end+1)));pending=pending.slice(end+1);}
      });
      stream.on('end',()=>{if(pending)output.write(redact(pending));});
    }
    child.on('error',()=>{console.error('Could not start Wrangler with Node 22+.');resolve(1);});
    child.on('exit',code=>resolve(code ?? 1));
  });
}
if(args[0]==='deploy'&&!args.includes('--dry-run')) {
  // Never use this deployment wrapper to create a replacement Worker.
  if(args.some(arg=>arg==='--name'||arg.startsWith('--name=')||arg==='--env'||arg==='-e'||arg==='--config'||arg==='-c'))throw Error('Deploy only the configured existing atlas Worker');
  const checked=await run(['versions','list','--name','atlas']);
  if(checked!==0)throw Error('Existing atlas Worker could not be verified; deployment stopped');
}
process.exitCode=await run(args);
