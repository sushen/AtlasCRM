import {NamCatalog} from '../server/suppliers/nam.mjs';
try{
  const health=await fetch('https://api.nam.qzz.io/api/v1/health',{redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(!health.ok||(await health.json()).ok!==true)throw Error();
  const adapter=new NamCatalog({token:process.env.NAM_RESELLER_TOKEN,currency:process.env.NAM_RESELLER_CURRENCY});
  const offers=await adapter.offers();
  if(!offers.length||offers.some(o=>o.unitCost===null))throw Error();
  console.log('New supplier health and read-only product contract verified. Active products: '+offers.length+'. Currency: '+process.env.NAM_RESELLER_CURRENCY+'. No balance, stock purchase or order endpoint called.');
}catch{console.error('New supplier verification failed. Check provider availability, saved token, currency and product response wrapper. No private values printed.');process.exitCode=1;}
