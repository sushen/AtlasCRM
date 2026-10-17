import { writeFile } from 'node:fs/promises';
const value=process.argv[2];
if(!['https://atlas.meshstocks.workers.dev','local'].includes(value))throw Error('Use the exact Atlas Worker origin or local');
await writeFile(new URL('../js/services/catalog-api-config.js',import.meta.url),`// Public backend address only; no secrets.\nexport const CATALOG_WORKER_ORIGIN = '${value==='local'?'':value}';\n`);
console.log('Local frontend configuration updated. Firebase Hosting was not deployed.');
