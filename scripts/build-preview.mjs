import {cp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
await import('./build-hosting.mjs');
const root=fileURLToPath(new URL('../',import.meta.url)),target=join(root,'.firebase','preview-public');
if(resolve(target)!==join(resolve(root),'.firebase','preview-public'))throw Error('Invalid preview directory');
await rm(target,{recursive:true,force:true});await cp(join(root,'.firebase','hosting-public'),target,{recursive:true});
const revision=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(revision))throw Error('Invalid preview revision');
const base=process.env.PREVIEW_BASE_PATH||'/';if(!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))throw Error('Invalid preview base path');
await mkdir(join(target,'js','preview'),{recursive:true});
for(const [source,destination]of [['runtime.js','preview/runtime.js'],['firebase.js','firebase.js'],['inventory-api.js','services/inventory-api.js'],['catalog-api.js','services/catalog-api.js']]){
  let content=await readFile(join(root,'preview',source),'utf8');
  if(source!=='runtime.js')content=content.replaceAll("'./preview/runtime.js'","'../preview/runtime.js'");
  await writeFile(join(target,'js',destination),content);
}
await writeFile(join(target,'js','services','catalog-api-config.js'),"export const CATALOG_WORKER_ORIGIN='';\n");
await writeFile(join(target,'js','services','partner-api.js'),"export async function partnerFetch(){throw Error('Partner reporting is unavailable in the isolated preview.');}\n");
await writeFile(join(target,'js','services','whatsapp-api.js'),"export async function checkWhatsAppSending(){throw Error('Sending is disabled in the isolated preview.');}export async function sendWhatsAppMessage(){throw Error('Sending is disabled in the isolated preview.');}\n");
const csp="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'self'; form-action 'none'; object-src 'none'; frame-src 'none'";
async function rewrite(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory()){await rewrite(path);continue;}if(!/\.(html|js)$/.test(entry.name))continue;
  let text=await readFile(path,'utf8');text=text.replaceAll('href="/','href="./').replaceAll('src="/','src="./').replaceAll("'/images/","'./images/").replaceAll("'/?","'./?").replaceAll("'/index.html'","'./index.html'");
  if(path.endsWith('store.js'))text=text.replace("const key='atlas_demo_store'","const key='atlas_branch_preview_store'");
  if(entry.name==='index.html')text=text.replace('<head>',`<head><base href="${base}"><meta name="atlas-preview-revision" content="Commit ${revision}"><meta http-equiv="Content-Security-Policy" content="${csp}">`).replace('<body>','<body><script type="module" src="./js/preview/runtime.js"></script>');
  if(entry.name==='login.html')text=`<!doctype html><meta charset="utf-8"><base href="${base}"><meta http-equiv="Content-Security-Policy" content="${csp}"><h1>Isolated branch preview</h1><p>Sign-in is disabled. Use fictional data only.</p><a href="./index.html">Open CRM preview</a>`;
  if(entry.name==='inventory.js')text=text.replace('Account credentials, license key, code, or seat instructions','Preview: type DEMO-ONLY; never enter real credentials');
  await writeFile(path,text);
}}
await rewrite(target);await writeFile(join(target,'.nojekyll'),'');
console.log('Isolated preview prepared. Fictional data only; live Firebase, backend and messaging access disabled.');
