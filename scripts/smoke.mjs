// CI uses a fresh Compose volume per job. Run only on a disposable environment.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const origin='http://127.0.0.1:'+(process.env.RELAY_PORT||4173);
const authorization='Basic '+Buffer.from('coordinator:'+process.env.RELAY_COORDINATOR_KEY).toString('base64');
assert.equal((await fetch(origin+'/healthz')).status,200);
assert.equal((await fetch(origin+'/api/state')).status,401);
const view=await fetch(origin+'/api/state',{headers:{authorization}}).then(r=>r.json());
if(process.argv[2]==='create'){
  assert.equal(view.catalog.cases.length,30);assert.equal(view.catalog.evidence.length,48);
  const res=await fetch(origin+'/api/cases',{method:'POST',headers:{authorization,'Content-Type':'application/json'},body:JSON.stringify({
    requestId:randomUUID(),name:'Container smoke sample',start:'2026-10-14',movement:'New Hire',reviewKind:'followup',status:'Shadowing',owner:'Coordinator',action:'Confirm the first observation',reason:'This fictional record verifies persistent deployment storage.'})});
  assert.equal(res.status,201);
}else{
  assert.ok(view.catalog.cases.some(c=>c.name==='Container smoke sample'));console.log('Container recreation preserved the new case.');
}
