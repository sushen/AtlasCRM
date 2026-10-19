import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
const privateRoot=resolve('.payment-private');
export async function loadLocalPaymentQr(path,expectedSha256) {
  const target=resolve(path);
  if(!target.startsWith(privateRoot+sep))throw Error('Receiving QR must be in the private payment directory');
  const bytes=await readFile(target);
  if(bytes.length>5*1024*1024||bytes.length<8)throw Error('Invalid receiving QR file size');
  const jpeg=bytes[0]===255&&bytes[1]===216;const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(!jpeg&&!png)throw Error('Receiving QR must be JPEG or PNG');
  if(expectedSha256&&createHash('sha256').update(bytes).digest('hex')!==expectedSha256)throw Error('Receiving QR changed; contact admin before paying');
  return new Blob([bytes],{type:jpeg?'image/jpeg':'image/png'});
}
