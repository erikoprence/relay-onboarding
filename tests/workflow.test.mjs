import test from 'node:test';
import assert from 'node:assert/strict';
import Core from '../web/core.js';
import Data from '../web/data.js';
import Topic from '../web/classifier.js';
import {liveBrief} from '../src/brief.mjs';
import {makeServer} from '../src/server.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
const eva='ONB-005';
const req={type:'request',role:'Coordinator',revision:0,due:'2026-10-16'};
const observations=[
  {name:'Simulated scenario A',observed:'The reviewer observed Eva identify the issue and independently escalate it.'},
  {name:'Simulated scenario B',observed:'Eva verified the result and documented the handover without assistance.'}
];
const close={type:'review',role:'Technical Lead',outcome:'close',observations,attested:true,revision:1};
const opened=()=>Core.transition(eva,Core.blank(),req);
test('offline classifier identifies the Eva disagreement and abstains on unknown wording',()=>{
  const rows=Topic.inspect(Core.sources(eva));
  assert.ok(rows.some(x=>x.sourceId==='E3' && x.label==='Training gaps'));
  assert.ok(rows.some(x=>x.sourceId==='E4' && x.label==='Readiness and closure'));
  assert.equal(Topic.classify('zebra tungsten bicycle'),null);
  assert.ok(rows.every(x=>Core.sources(eva).find(e=>e.id===x.sourceId).body.includes(x.quote)));
});
test('ten unique tracker rows, eight correctly scoped messages and unknown fields',()=>{
  assert.equal(new Set(Data.cases.map(c=>c.id)).size,10);assert.equal(Data.evidence.length,8);
  assert.equal(Core.caseFor('ONB-009').project,null);
  assert.deepEqual(Core.sources(eva).map(s=>s.id),['E3','E4']);
});
test('every saved model example passes scope, coverage and verbatim checks',()=>{
  for(const c of Data.cases){const out=Core.exampleBrief(c.id);assert.equal(Boolean(out),Core.sources(c.id).length>0);}
});
test('review request keeps supported status and captures owner and due date',()=>{
  const s=opened();assert.equal(s.closed,false);assert.equal(s.task.owner,'Technical Lead');assert.equal(s.events[0].due,req.due);
});
test('duplicate and unauthorized requests fail; invalid dates fail',()=>{
  assert.throws(()=>Core.transition(eva,opened(),req));assert.throws(()=>Core.transition(eva,Core.blank(),{...req,role:'Technical Lead'}));
  assert.throws(()=>Core.transition(eva,Core.blank(),{...req,due:'2026-02-30'}));
});
test('only technical owner can close after both distinct observations and attestation',()=>{
  [ {role:'Coordinator'},{observations:[]},{observations:[observations[0],observations[0]]},{attested:false} ].forEach(change=>assert.throws(()=>Core.transition(eva,opened(),{...close,...change})));
  const s=Core.transition(eva,opened(),close);assert.equal(s.closed,true);assert.equal(s.events.length,2);
  assert.throws(()=>Core.transition(eva,s,{...close,revision:2}));
});
test('keep supported, follow up, then validate after additional observation',()=>{
  const s=Core.transition(eva,opened(),{type:'review',role:'Technical Lead',revision:1,outcome:'retain',note:'Further observation required for the second scenario.',due:'2026-10-19'});
  assert.equal(s.phase,'open');assert.equal(s.task.due,'2026-10-19');assert.equal(Core.transition(eva,s,{...close,revision:2}).closed,true);
});
test('a generic follow-up records a result without closing onboarding',()=>{
  const id='ONB-002',s=Core.transition(id,Core.blank(),req);
  const done=Core.transition(id,s,{type:'record',role:'Coordinator',revision:1,note:'Owner contacted for an updated provisioning date.'});
  assert.equal(done.phase,'completed');assert.equal(done.closed,false);
});
test('unverified model quotes, duplicated IDs, invented sources and missing evidence are rejected',()=>{
  const ok=Core.exampleBrief(eva), f=ok.findings[0];
  for(const findings of [[f],[f,f],[f,{sourceId:'E6',quote:'Something happened.'}],[f,{sourceId:'E4',quote:'All scenarios passed.'}]]){
    assert.throws(()=>Core.validateBrief(eva,{...ok,findings}));
  }
});
test('local model adapter sends scoped evidence and validates the model return',async()=>{
  const ok=Core.exampleBrief(eva);
  const out=await liveBrief(eva,{model:'fixture',fetcher:async(url,options)=>{
    assert.match(url,/127\.0\.0\.1/);const payload=JSON.parse(options.body);
    assert.deepEqual(JSON.parse(payload.messages[1].content).sources.map(s=>s.id),['E3','E4']);
    return {ok:true,json:async()=>({message:{content:JSON.stringify(ok)}})};
  }});assert.deepEqual(out,ok);
});
test('missing model and malformed model output cannot change workflow state',async()=>{
  await assert.rejects(()=>liveBrief(eva,{model:''}));
  await assert.rejects(()=>liveBrief(eva,{model:'fixture',fetcher:async()=>({ok:true,json:async()=>({message:{content:'bad'}})})}));
});
test('HTTP transaction rejects competing revisions and state survives restart',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'relay-test-'));const file=path.join(dir,'db');
  const socketPath=process.platform==='win32'?'\\\\.\\pipe\\relay-'+process.pid:path.join(dir,'http.sock');
  let server;const boot=async()=>{server=makeServer(file,'');await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(socketPath,resolve)});};
  const call=(method,route,body)=>new Promise((resolve,reject)=>{
    const req=http.request({socketPath,path:route,method,agent:false,headers:{'Content-Type':'application/json'}},res=>{
      let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);
      res.on('end',()=>resolve({status:res.statusCode,text}));
    });req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
  });
  const stop=()=>new Promise(r=>server.close(r));
  try{
    await boot();const html=await call('GET','/');assert.match(html.text,/Onboarding workspace/);
    const post=(operation,cmd)=>call('POST','/api/cases/'+eva+'/'+operation,cmd);
    const results=await Promise.all([post('action',req),post('action',req)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    assert.equal((await post('brief',{})).status,503);await stop();server=null;await boot();
    const data=JSON.parse((await call('GET','/api/state')).text);assert.equal(data.cases[eva].revision,1);
    assert.equal((await post('action',close)).status,200);
  }finally{if(server)await stop();rmSync(dir,{recursive:true,force:true});}
});
