// Read-only Firebase Rules simulation. No production documents or deployed rules change.
import {readFile} from 'node:fs/promises';
import {prepareLocalFirebase} from '../server/local-firebase.mjs';
import {applicationDefault} from 'firebase-admin/app';
const project='atlascrm-c5722';
let cleanup;
try{
  cleanup=await prepareLocalFirebase(project);
  const {access_token}=await applicationDefault().getAccessToken();
  const source={files:[{name:'firestore.rules',content:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}]};
  const cases=[];
  for(const auth of [null,{uid:'fictional-owner',token:{}},{uid:'fictional-other',token:{}},{uid:'fictional-admin',token:{atlasOperator:true}}]){
    for(const active of [true,false])for(const method of ['get','create','update','delete'])for(const collection of ['atlasPartnerProfiles','atlasPartnerPrivate']){
      const operator=auth?.token.atlasOperator===true;
      const allowed=method==='get'&&(operator||collection==='atlasPartnerProfiles'&&active&&auth?.uid==='fictional-owner');
      cases.push({expectation:allowed?'ALLOW':'DENY',request:{auth,method,path:`/databases/(default)/documents/${collection}/fictional`,resource:{data:{ownerUid:'fictional-owner',active}}},resource:{data:{ownerUid:'fictional-owner',active}}});
    }
  }
  for(let offset=0;offset<cases.length;offset+=80){
    const response=await fetch(`https://firebaserules.googleapis.com/v1/projects/${project}:test`,{method:'POST',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},
      body:JSON.stringify({source,testSuite:{testCases:cases.slice(offset,offset+80)}}),signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('Rules simulation unavailable');const result=await response.json();
    if(result.issues?.some(x=>x.severity==='ERROR')||result.testResults?.length!==Math.min(80,cases.length-offset)||result.testResults.some(x=>x.state!=='SUCCESS'))throw Error('Rules simulation failed');
  }
  console.log(`Prepared partner rules passed ${cases.length} fictional checks. No rules deployment or customer-data operation performed.`);
}catch{console.error('Partner rules simulation unavailable or failed. Check Firebase development credentials and Rules API access.');process.exitCode=1;}
finally{if(cleanup)cleanup();}
