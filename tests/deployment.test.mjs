import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openDatabase,catalog,states,counts,createCase,addEvidence,act} from '../src/database.mjs';
import {deploymentConfig} from '../src/access.mjs';
import {makeServer} from '../src/server.mjs';
import Core from '../web/core.js';

const newCase=()=>({requestId:randomUUID(),name:'Test fictional joiner',project:'Juniper',start:'2026-10-15',movement:'New Hire',reviewKind:'technical',status:'Ready with Support',action:'Observe the two scenarios',reason:'Two simulated handovers still require owner validation.'});
const source=(revision)=>({requestId:randomUUID(),revision,title:'Reviewer check-in',author:'Assigned observer',date:'2026-10-16',body:'Two training scenarios still require independent execution.'});
const close=(revision)=>({revision,type:'review',role:'Technical Lead',outcome:'close',attested:true,observations:[{name:'Priority change',observed:'The employee recognized the priority and independently escalated.'},{name:'Shift handover',observed:'The employee independently documented and confirmed the handover.'}]});
test('shipped SQLite database matches fresh seed including all sample activities',()=>{
  const db=openDatabase(':memory:');
  const shipped=new DatabaseSync(fileURLToPath(new URL('../database/relay-sample.sqlite',import.meta.url)),{readOnly:true});
  try{
    assert.deepEqual(counts(db),counts(shipped));assert.deepEqual(catalog(db),catalog(shipped));assert.deepEqual(states(db),states(shipped));
    assert.equal(counts(db).cases,30);assert.equal(counts(db).evidence,48);
    assert.equal(Object.values(states(db)).filter(s=>s.phase==='open').length,4);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  }finally{db.close();shipped.close();}
});
test('existing v0 database keeps the previous Eva decision and avoids duplicate seeds on restart',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'relay-migrate-')),file=path.join(dir,'old.sqlite');
  try{
    const old=new DatabaseSync(file);old.exec('CREATE TABLE cases (id TEXT PRIMARY KEY, state TEXT NOT NULL)');
    const s=Core.transition('ONB-005',Core.blank(),{type:'request',role:'Coordinator',revision:0,due:'2026-10-18'});
    old.prepare('INSERT INTO cases VALUES (?,?)').run('ONB-005',JSON.stringify(s));old.close();
    for(let i=0;i<2;i++){const db=openDatabase(file);try{assert.deepEqual(states(db,'ONB-005')['ONB-005'],s);assert.equal(counts(db).evidence,48);}finally{db.close();}}
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('case intake is idempotent; invalid fields and reused IDs cannot partially write',()=>{
  const db=openDatabase(':memory:');
  try{
    const c=newCase();assert.throws(()=>createCase(db,c,'Technical Lead'));assert.throws(()=>createCase(db,{...c,start:'2026-02-30'},'Coordinator'));
    assert.equal(counts(db).cases,30);const id=createCase(db,c,'Coordinator');assert.equal(createCase(db,c,'Coordinator'),id);
    assert.throws(()=>createCase(db,{...c,name:'Second fictional person'},'Coordinator'));
    const e=source(1);const eid=addEvidence(db,id,e,'Coordinator');assert.equal(addEvidence(db,id,e,'Coordinator'),eid);
    assert.throws(()=>addEvidence(db,id,{...source(1)},'Technical Lead'));assert.equal(counts(db).cases,31);assert.equal(counts(db).evidence,49);
    const s=states(db,id)[id];assert.equal(s.revision,2);assert.equal(s.events.length,2);assert.equal(s.events[1].sourceId,eid);
  }finally{db.close();}
});
test('new evidence invalidates an old saved brief and reopens a previously validated case',()=>{
  const db=openDatabase(':memory:');
  try{
    const id='ONB-005';act(db,id,{type:'request',role:'Coordinator',revision:0,due:'2026-10-17'});act(db,id,close(1));
    addEvidence(db,id,source(2),'Technical Lead');const s=states(db,id)[id];
    assert.equal(s.closed,false);assert.equal(s.phase,'unopened');assert.equal(s.events[1].attested,true);assert.equal(catalog(db).briefs['005'],undefined);
    assert.equal(Core.forCatalog(catalog(db)).sources(id).length,3);
  }finally{db.close();}
});
test('deployment refuses missing or identical role keys',()=>{
  assert.throws(()=>deploymentConfig({HOST:'0.0.0.0'}));assert.throws(()=>deploymentConfig({NODE_ENV:'production'}));
  assert.throws(()=>deploymentConfig({NODE_ENV:'production',RELAY_COORDINATOR_KEY:'x'.repeat(24),RELAY_TECH_LEAD_KEY:'x'.repeat(24)}));
});
test('authenticated server serves DB-backed records, accepts intake and enforces account roles across restarts',async()=>{
  const folder=mkdtempSync(path.join(tmpdir(),'relay-auth-')),file=path.join(folder,'db.sqlite');
  const endpoint=process.platform==='win32'?'\\\\.\\pipe\\relay-auth-'+randomUUID():path.join(folder,'http.sock');
  const ck=randomUUID(),tk=randomUUID();const config=deploymentConfig({NODE_ENV:'production',RELAY_COORDINATOR_KEY:ck,RELAY_TECH_LEAD_KEY:tk,PUBLIC_ORIGIN:'https://relay.example'});
  const auth=(user,key)=>'Basic '+Buffer.from(user+':'+key).toString('base64');
  let server;
  async function start(){server=makeServer(file,'',config);await new Promise((ok,no)=>{server.once('error',no);server.listen(endpoint,ok)});}
  const stop=()=>new Promise(ok=>server.close(ok));
  function call(route,{method='GET',body,identity,origin}={}){
    return new Promise((ok,no)=>{
      const headers={'Content-Type':'application/json'};if(identity)headers.Authorization=identity;if(origin)headers.Origin=origin;
      const r=http.request({socketPath:endpoint,path:route,method,headers,agent:false},res=>{let text='';res.setEncoding('utf8');res.on('data',s=>text+=s);res.on('end',()=>ok({status:res.statusCode,text}));});r.on('error',no);r.end(body?JSON.stringify(body):undefined);
    });
  }
  try{
    await start();const coord=auth('coordinator',ck),lead=auth('technical-lead',tk);
    assert.equal((await call('/healthz')).status,200);assert.equal((await call('/api/state')).status,401);
    const index=await call('/',{identity:coord});assert.match(index.text,/bootstrap\.js/);assert.doesNotMatch(index.text,/src="data\.js"/);
    const view=JSON.parse((await call('/api/state',{identity:coord})).text);assert.equal(view.catalog.cases.length,30);assert.equal(view.accountRole,'Coordinator');
    const body=newCase(),route='/api/cases';assert.equal((await call(route,{method:'POST',body,identity:lead})).status,403);
    const added=await call(route,{method:'POST',body,identity:coord,origin:'https://relay.example'});assert.equal(added.status,201);
    const id=JSON.parse(added.text).id, prefix=route+'/'+id;
    assert.equal((await call(prefix+'/evidence',{method:'POST',identity:lead,body:source(1)})).status,201);
    assert.equal((await call(prefix+'/action',{method:'POST',identity:coord,body:{type:'request',revision:2,due:'2026-10-20'}})).status,200);
    assert.equal((await call(prefix+'/action',{method:'POST',identity:coord,body:close(3)})).status,403);
    assert.equal((await call(prefix+'/action',{method:'POST',identity:lead,body:close(3)})).status,200);
    await stop();server=null;await start();
    const persisted=JSON.parse((await call('/api/state',{identity:lead})).text);assert.equal(persisted.cases[id].closed,true);assert.equal(persisted.catalog.cases.length,31);assert.equal(persisted.catalog.evidence.length,49);
  }finally{if(server)await stop();rmSync(folder,{recursive:true,force:true});}
});
