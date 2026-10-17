import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const sharp=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));
const dir=new URL('../images/shop/',import.meta.url);await mkdir(dir,{recursive:true});
const cards=[['welcome','Atlas Market','Your digital toolkit','A','#183f37'],['chatgpt','ChatGPT','Think. Create. Build.','C','#176751'],
  ['claude','Claude','Room for deeper thinking','C','#aa6950'],['gemini','Gemini','Explore your next idea','G','#4066a0'],
  ['canva','Canva','Give ideas a visual voice','C','#725ba4'],['notion','Notion','Make space for what matters','N','#555f50']];
for(const[key,name,tag,letter,color]of cards) {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#142e29"/></linearGradient></defs><rect width="1200" height="750" rx="42" fill="url(#g)"/><circle cx="1000" cy="170" r="260" fill="none" stroke="#ffffff" opacity=".08" stroke-width="60"/><circle cx="1000" cy="170" r="160" fill="none" stroke="#ffffff" opacity=".12" stroke-width="2"/><text x="78" y="99" fill="#dce9cc" font-family="Arial" font-size="27" letter-spacing="6">ATLAS MARKET</text><rect x="78" y="170" width="145" height="145" rx="32" fill="#f5f2e7"/><text x="150" y="273" text-anchor="middle" fill="${color}" font-family="Georgia" font-size="94">${letter}</text><text x="78" y="430" fill="#fffdf3" font-family="Georgia" font-size="100">${name}</text><text x="82" y="503" fill="#e1e7d9" font-family="Arial" font-size="34">${tag}</text><line x1="80" y1="594" x2="1120" y2="594" stroke="#ffffff" opacity=".2"/><text x="82" y="656" fill="#dce9cc" font-family="Arial" font-size="24">DISCOVER  ·  COMPARE  ·  ORDER WITH ADMIN</text><text x="1120" y="700" text-anchor="end" fill="#c1cdc5" font-family="Arial" font-size="16">Product-family artwork • brand names identify listings</text></svg>`;
  await sharp(Buffer.from(svg)).jpeg({quality:90}).toFile(new URL(key+'.jpg',dir).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
}
console.log('Six original Atlas product-family cards generated; no fabricated supplier product photos.');
