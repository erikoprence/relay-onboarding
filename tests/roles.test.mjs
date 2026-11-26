import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {parseEnv} from 'node:util';
import {configure} from '../scripts/configure.mjs';
import {deploymentConfig,identity} from '../src/access.mjs';
import {openDatabase,act,catalog,states} from '../src/database.mjs';
import {makeServer} from '../src/server.mjs';
import P from '../web/roles.js';
const id='ONB-005',note='The practice queue still needs a verified owner before the next shift.';
const outcome={type:'review',role:'Technical Lead',outcome:'close',attested:true,observations:[
  {name:'Urgent transfer',observed:'Eva independently transferred and verified the urgent training case.'},
  {name:'Duplicate report',observed:'Eva identified the duplicate and checked the final recorded outcome.'}]};
test('a two-account installation upgrades in place and repeated configuration preserves all six keys',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'relay-config-'));
  try{
    const old=randomUUID();
    writeFileSync(path.join(dir,'.env'),'RELAY_COORDINATOR_KEY='+old+'\nRELAY_TECH_LEAD_KEY='+randomUUID()+'\nRELAY_PORT=4200\n');
    assert.equal(configure(dir),4);
    const raw=readFileSync(path.join(dir,'.env'),'utf8'),env=parseEnv(raw);assert.equal(env.RELAY_COORDINATOR_KEY,old);assert.equal(env.RELAY_PORT,'4200');
    assert.equal(configure(dir),0);assert.equal(raw,readFileSync(path.join(dir,'.env'),'utf8'));
    const cfg=deploymentConfig({...env,RELAY_ACCOUNTS_DIR:path.join(dir,'access')});
    for(const a of P.accounts){const basic='Basic '+Buffer.from(a.username+':'+env[a.key]).toString('base64');assert.equal(identity(cfg,basic).role,a.role);}
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('named employees and technical leads can be assigned independently',()=>{
  const db=openDatabase(':memory:');try{
    const D=catalog(db);
    assert.deepEqual(P.scope(D,P.actor('Employee',{caseId:'ONB-002'})).cases.map(c=>c.name),['Leo Marin']);
    const manager=P.scope(D,P.actor('Line Manager',{managerName:'Iva Kent'}));assert.ok(manager.cases.length>=2);assert.ok(manager.cases.every(c=>c.manager==='Iva Kent'));
    const tech=P.scope(D,P.actor('Technical Lead',{project:'Meridian'}));assert.ok(tech.cases.length>=2);assert.ok(tech.cases.every(c=>c.project==='Meridian'));
    assert.equal(P.scope(D,P.actor('Employee',{caseId:'ONB-999'})).cases.length,0);
  }finally{db.close();}
});
test('HR, employee, manager, management, PMO and technical lead complete one audited journey',()=>{
  const db=openDatabase(':memory:');
  try{
    let revision=0;const change=(cmd)=>{const next=act(db,id,{...cmd,revision});revision++;return next;};
    change({role:'HR',type:'confirmStart',start:'2026-09-21',movement:'New Hire'});
    assert.throws(()=>change({role:'HR',type:'confirmStart',start:'2026-09-21',movement:'New Hire'}));
    change({role:'Employee',actorName:'eva-stone',type:'checkIn',status:'Need support',note});
    change({role:'Line Manager',type:'blocker',owner:'Coordinator',due:'2026-10-19',note});
    change({role:'Management',type:'intervene',owner:'HR',due:'2026-10-19',note});
    assert.throws(()=>change({role:'Technical Lead',type:'resolveIntervention',note}));
    change({role:'HR',type:'resolveIntervention',note});
    change({role:'Coordinator',type:'request',due:'2026-10-20'});
    change({role:'Technical Lead',type:'plan',due:'2026-10-19',note});
    assert.throws(()=>change(outcome));
    change({role:'Line Manager',type:'resolveBlocker',note});
    const done=change(outcome);assert.equal(done.closed,true);assert.equal(done.events.length,9);
    assert.deepEqual(new Set(done.events.map(e=>e.role)),new Set(P.accounts.map(a=>a.role)));
    const D=catalog(db);assert.equal(D.briefs['005'],undefined);assert.equal(D.evidence.filter(e=>e.caseId===id).length,6);
    assert.equal(states(db,id)[id].events[1].actorName,'eva-stone');
    assert.equal(change({role:'Employee',type:'checkIn',status:'Blocked',note}).closed,false);
  }finally{db.close();}
});
test('authenticated HTTP state, evidence, briefs and actions all enforce the same actor scope',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'relay-roles-')),keys=Object.fromEntries(P.accounts.map(a=>[a.key,randomUUID()]));
  const namedKey=randomUUID();mkdirSync(path.join(dir,'access'));
  writeFileSync(path.join(dir,'access','leo.json'),JSON.stringify({name:'leo-marin',role:'Employee',caseId:'ONB-002',verifier:createHash('sha256').update('leo-marin:'+namedKey).digest('hex')}));
  const cfg=deploymentConfig({...keys,RELAY_ACCOUNTS_DIR:path.join(dir,'access')});
  const srv=makeServer(path.join(dir,'db.sqlite'),'',cfg);
  const socketPath=process.platform==='win32'?'\\\\.\\pipe\\role-test-'+randomUUID():path.join(dir,'http.sock');
  const call=(name,key,url,body)=>new Promise((yes,no)=>{
    const req=http.request({socketPath,path:url,method:body?'POST':'GET',agent:false,headers:{authorization:'Basic '+Buffer.from(name+':'+key).toString('base64'),'content-type':'application/json'}},res=>{
      let text='';res.on('data',s=>text+=s);res.on('end',()=>yes({status:res.statusCode,text}));});req.on('error',no);req.end(body?JSON.stringify(body):undefined);
  });
  try{
    await new Promise((yes,no)=>{srv.once('error',no);srv.listen(socketPath,yes);});
    for(const definition of P.accounts){
      const res=await call(definition.username,keys[definition.key],'/api/state?role=Management');
      assert.equal(res.status,200);const view=JSON.parse(res.text);assert.equal(view.accountRole,definition.role);
      if(['Employee','Line Manager'].includes(definition.role)){
        assert.deepEqual(view.catalog.cases.map(c=>c.id),[id]);assert.deepEqual(Object.keys(view.cases),[id]);assert.deepEqual(Object.keys(view.catalog.briefs),['005']);
        assert.ok(view.catalog.evidence.every(e=>e.caseId===id));
        for(const operation of ['evidence','brief','action'])assert.equal((await call(definition.username,keys[definition.key],'/api/cases/ONB-002/'+operation,{})).status,404);
      }
    }
    const view=JSON.parse((await call('leo-marin',namedKey,'/api/state')).text);assert.deepEqual(view.catalog.cases.map(c=>c.id),['ONB-002']);
    assert.equal((await call('leo-marin',namedKey,'/api/cases/'+id+'/action',{type:'checkIn',status:'On track',note,revision:0})).status,404);
    assert.equal((await call('employee',keys.RELAY_EMPLOYEE_KEY,'/api/cases/'+id+'/action',{type:'request',revision:0,due:'2026-10-16'})).status,403);
    assert.equal((await call('management',keys.RELAY_MANAGEMENT_KEY,'/api/cases/'+id+'/action',{...outcome,revision:0})).status,403);
    const post={type:'checkIn',status:'On track',note,revision:0,actorName:'different-account'};
    const res=await call('employee',keys.RELAY_EMPLOYEE_KEY,'/api/cases/'+id+'/action',post);assert.equal(res.status,200);assert.equal(JSON.parse(res.text).events[0].actorName,'employee');
    const created=await call('hr',keys.RELAY_HR_KEY,'/api/cases',{requestId:randomUUID(),name:'Fictional HR intake',start:'2026-10-20',movement:'New Hire',reviewKind:'followup',status:'Pre-Onboarding',owner:'Coordinator',action:'Confirm the project',reason:note});
    assert.equal(created.status,201);
  }finally{await new Promise(r=>srv.close(r));rmSync(dir,{recursive:true,force:true});}
});
