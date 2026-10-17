import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { prepareLocalFirebase } from '../server/local-firebase.mjs';
import { applicationDefault } from 'firebase-admin/app';

// Rules-service simulation only: fictional documents and auth, no customer reads/writes.
const project='atlascrm-c5722';
const cleanup=await prepareLocalFirebase(project);
try {
  const {access_token}=await applicationDefault().getAccessToken();
  const headers={Authorization:'Bearer '+access_token,'Content-Type':'application/json'};
  const release=await fetch(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`,{headers,signal:AbortSignal.timeout(20000)});
  assert.equal(release.status,200);
  const metadata=await release.json();
  const prior=await fetch('https://firebaserules.googleapis.com/v1/'+metadata.rulesetName,{headers,signal:AbortSignal.timeout(20000)});
  assert.equal(prior.status,200);
  const deployed=await prior.json();
  await writeFile(new URL('../.firebase/google-login/prior-firestore-rules.json',import.meta.url),JSON.stringify(deployed),{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
  const source=process.argv.includes('--live')?deployed.source:{files:[{name:'firestore.rules',content:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}]};
  const testCases=[];
  const identities=[null,{uid:'fictional-buyer',token:{}},{uid:'fictional-buyer',token:{atlasOperator:false}},{uid:'fictional-buyer',token:{atlasOperator:'true'}},{uid:'fictional-operator',token:{atlasOperator:true}}];
  for(const collection of ['customers','activities','followups','products','purchases','subscriptions','payments','renewals','messages','whatsappEvents','whatsappSendAttempts']) {
    for(const auth of identities)for(const method of ['get','list','create','update','delete']) {
      const operator=auth?.token.atlasOperator===true;
      const permitted=operator&&!['whatsappEvents','whatsappSendAttempts'].includes(collection)
        &&!(collection==='messages'&&['create','update','delete'].includes(method))
        &&!(['activities','followups'].includes(collection)&&method==='delete');
      testCases.push({expectation:permitted?'ALLOW':'DENY',request:{auth,method,path:`/databases/(default)/documents/${collection}/fictional`,resource:{data:{name:'Fictional'}}},resource:{data:{name:'Fictional'}}});
    }
  }
  const result={issues:[],testResults:[]};
  for(let offset=0;offset<testCases.length;offset+=100) {
    const response=await fetch(`https://firebaserules.googleapis.com/v1/projects/${project}:test`,{method:'POST',headers,body:JSON.stringify({source,testSuite:{testCases:testCases.slice(offset,offset+100)}}),signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,'Rules API test failed');
    const batch=await response.json();result.issues.push(...batch.issues||[]);result.testResults.push(...batch.testResults||[]);
  }
  await writeFile(new URL('../.firebase/google-login/rules-test-results.json',import.meta.url),JSON.stringify(result));
  assert.ok(!result.issues?.some(i=>i.severity==='ERROR'),'Rules compile failure');
  assert.equal(result.testResults?.length,testCases.length);
  const failed=result.testResults.map((r,i)=>({state:r.state,index:i,debug:r.debugMessages})).filter(r=>r.state!=='SUCCESS');
  if(failed.length)console.log('Fictional rule test failures:',JSON.stringify(failed.slice(0,3)));
  assert.equal(failed.length,0);
  console.log((process.argv.includes('--live')?'Deployed':'Prepared')+' CRM rules passed '+testCases.length+' simulated checks: operators retain permissions; anonymous and Market buyers are denied. No production documents read or changed.');
}finally {cleanup();}
