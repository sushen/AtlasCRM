import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const folder=new URL('../.worker-private/',import.meta.url),file=new URL('inventory-keyring.json',folder);
await mkdir(folder,{recursive:true});
const value={activeKeyId:'v1',keys:{v1:randomBytes(32).toString('base64')},fingerprintKey:randomBytes(32).toString('base64')};
// Never overwrite a live keyring: old keys are required to recover existing stock.
await writeFile(file,JSON.stringify(value),{flag:'wx',mode:0o600});
if(process.platform==='win32'){
  const owner=process.env.USERDOMAIN&&process.env.USERNAME?process.env.USERDOMAIN+'\\'+process.env.USERNAME:null;
  if(!owner)throw Error('Keyring created but Windows owner could not be determined. Restrict its ACL before use.');
  execFileSync('icacls.exe',[fileURLToPath(file),'/inheritance:r','/grant:r',owner+':(F)','SYSTEM:(F)'],{stdio:'ignore',windowsHide:true});
}
console.log('Inventory keyring created privately with restricted permissions. Back it up securely before uploading it as INVENTORY_KEYRING. No values printed or uploaded.');
