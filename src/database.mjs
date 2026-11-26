import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import Original from '../web/data.js';
import Additional from '../web/samples.js';
import Core from '../web/core.js';
import Roles from '../web/roles.js';

const columns=['id','name','start','movement','project','manager','status','updated','signal','action','owner','reason','origin','reviewKind'];
const sourceCols=['id','caseId','title','author','date','body','origin'];
const bad=(message,status=422)=>Object.assign(new Error(message),{status});
export const problem=bad;
export function atomic(db,fn){
  db.exec('BEGIN IMMEDIATE');
  try{const result=fn();db.exec('COMMIT');return result;}
  catch(error){db.exec('ROLLBACK');throw error;}
}
function insert(db,table,cols,record){
  db.prepare('INSERT INTO '+table+' ('+cols.join(',')+') VALUES ('+cols.map(()=>'?').join(',')+')').run(...cols.map(k=>record[k]??null));
}
function insertCase(db,c){insert(db,'onboarding_cases',columns,c);db.prepare('INSERT INTO workflows(case_id) VALUES (?)').run(c.id);}
function putState(db,id,s,events,firstSequence){
  db.prepare('UPDATE workflows SET revision=?,phase=?,closed=?,task_owner=?,task_action=?,due=? WHERE case_id=?')
    .run(s.revision,s.phase,Number(s.closed),s.task?.owner??null,s.task?.action??null,s.task?.due??null,id);
  const save=db.prepare('INSERT INTO events VALUES (?,?,?,?,?,?,?)');
  events.forEach(({at,role,type,text,...details},i)=>save.run(id,firstSequence+i,at,role,type,text,JSON.stringify(details)));
}
function initialize(db){
  const version=db.prepare('PRAGMA user_version').get().user_version;
  if(version===1)return;
  if(version!==0)throw new Error('Database schema is newer than this release.');
  db.exec(readFileSync(new URL('../database/001-schema.sql',import.meta.url),'utf8'));
  for(const c of Original.cases)insertCase(db,{...c,origin:'Starter pack',reviewKind:c.id==='ONB-005'?'technical':'followup'});
  for(const c of Additional.cases)insertCase(db,c);
  for(const e of Original.evidence)insert(db,'evidence',sourceCols,{...e,origin:'Starter pack'});
  for(const e of Additional.evidence)insert(db,'evidence',sourceCols,e);
  for(const [suffix,content] of Object.entries(Original.briefs))db.prepare('INSERT INTO saved_briefs VALUES (?,?)').run('ONB-'+suffix,JSON.stringify(content));
  const core=Core.forCatalog(catalog(db));
  for(const id of ['ONB-011','ONB-012','ONB-014','ONB-020','ONB-025']){
    const task=core.transition(id,core.blank(),{role:'Coordinator',type:'request',revision:0,due:'2026-10-16'},'2026-10-14T09:00:00Z');
    putState(db,id,task,task.events,1);
    if(id==='ONB-014'){
      const next=core.transition(id,task,{role:'Coordinator',type:'record',revision:1,note:'The technical lead confirmed a supported shift for 16 October. Independent execution still needs observation.'},'2026-10-14T11:30:00Z');
      putState(db,id,next,next.events.slice(1),2);
    }
    if(id==='ONB-020'){
      const next=core.transition(id,task,{role:'Technical Lead',type:'review',revision:1,outcome:'retain',due:'2026-10-19',note:'Both escalation exercises still need observation. The mentor and technical lead agreed a follow-up date.'},'2026-10-14T13:15:00Z');
      putState(db,id,next,next.events.slice(1),2);
    }
  }
  const legacy=db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='cases'").get();
  if(legacy)for(const row of db.prepare('SELECT id,state FROM cases').all()){
    const s=JSON.parse(row.state);
    if(!db.prepare('SELECT 1 FROM workflows WHERE case_id=?').get(row.id))throw new Error('Unrecognized case in legacy database: '+row.id);
    putState(db,row.id,s,s.events,1);
  }
  db.exec('PRAGMA user_version=1');
}
export function openDatabase(filename){
  const db=new DatabaseSync(filename);
  try{db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');atomic(db,()=>initialize(db));return db;}
  catch(e){db.close();throw e;}
}
export function catalog(db){
  return {snapshot:Original.snapshot,cases:db.prepare('SELECT * FROM onboarding_cases ORDER BY id').all(),
    evidence:db.prepare('SELECT * FROM evidence ORDER BY date, CAST(substr(id,2) AS INTEGER)').all(),
    briefs:Object.fromEntries(db.prepare('SELECT * FROM saved_briefs').all().map(r=>[r.case_id.slice(4),JSON.parse(r.content)]))};
}
export function states(db,id){
  const rows=id?db.prepare('SELECT * FROM workflows WHERE case_id=?').all(id):db.prepare('SELECT * FROM workflows').all();
  const history=id?db.prepare('SELECT * FROM events WHERE case_id=? ORDER BY sequence').all(id):db.prepare('SELECT * FROM events ORDER BY case_id,sequence').all();
  const out={};
  for(const r of rows)out[r.case_id]={revision:r.revision,phase:r.phase,closed:Boolean(r.closed),events:[],task:r.due?{owner:r.task_owner,action:r.task_action,due:r.due}:null};
  for(const e of history)out[e.case_id].events.push({at:e.at,role:e.role,type:e.kind,text:e.description,...JSON.parse(e.details)});
  return out;
}
function text(v,label,max=120,min=1){
  if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw bad(label+' must be '+min+'–'+max+' characters.');
  return v.trim();
}
function day(v){
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw bad('Enter a valid calendar date.');
  return v;
}
function optional(v,label){return v==null||v===''?null:text(v,label);}
function once(db,cmd,scope,fn){
  const key=text(cmd.requestId,'Request ID',90,16);
  const fp=createHash('sha256').update(JSON.stringify([scope,Object.keys(cmd).sort().map(k=>[k,cmd[k]])])).digest('hex');
  const prev=db.prepare('SELECT * FROM submissions WHERE request_id=?').get(key);
  if(prev){if(prev.fingerprint!==fp)throw bad('This request ID was already used.',409);return prev.resource;}
  const resource=fn();db.prepare('INSERT INTO submissions VALUES (?,?,?)').run(key,fp,resource);return resource;
}
function expected(db,id,revision){
  const s=states(db,id)[id];if(!s)throw bad('Unknown case.',404);
  if(s.revision!==revision)throw bad('Someone updated this case. Refresh and check the latest entry.',409);
  return s;
}
export function createCase(db,cmd,role){
  if(!Roles.can(role,'create'))throw bad('HR or coordinator access is required.',403);
  return atomic(db,()=>once(db,cmd,role+'/create',()=>{
    if(!['New Hire','Reallocation'].includes(cmd.movement)||!['technical','followup'].includes(cmd.reviewKind))throw bad('Choose a valid movement and review type.');
    const n=db.prepare('SELECT max(CAST(substr(id,5) AS INTEGER))+1 AS n FROM onboarding_cases').get().n;
    const id='ONB-'+String(n).padStart(3,'0'), today=new Date().toISOString().slice(0,10);
    const c={id,name:text(cmd.name,'Name'),start:day(cmd.start),movement:cmd.movement,project:optional(cmd.project,'Project'),
      manager:optional(cmd.manager,'Manager'),status:text(cmd.status,'Tracker status'),updated:today,
      signal:cmd.reviewKind==='technical'?'Review needed':'Follow-up needed',action:text(cmd.action,'Next action',160),
      owner:cmd.reviewKind==='technical'?'Technical Lead':text(cmd.owner,'Owner'),reason:text(cmd.reason,'Reason',600,10),
      origin:'Workspace entry',reviewKind:cmd.reviewKind};
    insertCase(db,c);
    const s=Core.blank();s.revision=1;putState(db,id,s,[{at:new Date().toISOString(),role,type:'create',text:'Created this onboarding case.',...(cmd.actorName?{actorName:cmd.actorName}:{})}],1);
    return id;
  }));
}
export function addEvidence(db,id,cmd,role){
  if(!Roles.can(role,'evidence'))throw bad('This role cannot submit external source messages.',403);
  return atomic(db,()=>once(db,cmd,role+'/evidence/'+id,()=>{
    const s=expected(db,id,cmd.revision);
    const n=db.prepare('SELECT max(CAST(substr(id,2) AS INTEGER))+1 AS n FROM evidence').get().n;
    const eid='E'+n;
    const e={id:eid,caseId:id,title:text(cmd.title,'Source title'),author:text(cmd.author,'Source author'),date:day(cmd.date),body:text(cmd.body,'Source message',2400,10),origin:'Workspace entry'};
    insert(db,'evidence',sourceCols,e);
    const reopen=s.phase==='completed';
    if(reopen){s.phase='unopened';s.closed=false;s.task=null;}
    s.revision++;putState(db,id,s,[{at:new Date().toISOString(),role,type:'evidence',text:'Added source '+eid+': '+e.title+(reopen?'. Reopened for review.':''),sourceId:eid,...(cmd.actorName?{actorName:cmd.actorName}:{})}],s.revision);
    db.prepare('DELETE FROM saved_briefs WHERE case_id=?').run(id);return eid;
  }));
}
export function act(db,id,cmd){
  if(!Roles.can(cmd.role,cmd.type))throw bad('This role cannot perform the selected action.',403);
  return atomic(db,()=>{
    const old=expected(db,id,cmd.revision);
    const scope=Core.forCatalog(catalog(db));
    let next;try{next=scope.transition(id,old,cmd);}catch(e){throw bad(e.message);}
    const contributed=Roles.eventSource(id,next.events.at(-1));
    if(contributed){insert(db,'evidence',sourceCols,contributed);db.prepare('DELETE FROM saved_briefs WHERE case_id=?').run(id);}
    putState(db,id,next,next.events.slice(old.events.length),next.revision);return next;
  });
}
export function counts(db){
  return {schema:db.prepare('PRAGMA user_version').get().user_version,
    cases:db.prepare('SELECT count(*) n FROM onboarding_cases').get().n,
    evidence:db.prepare('SELECT count(*) n FROM evidence').get().n,
    caseOrigins:db.prepare('SELECT origin, count(*) n FROM onboarding_cases GROUP BY origin ORDER BY origin').all()};
}
