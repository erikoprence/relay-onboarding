import http from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import Core from '../web/core.js';
import Roles from '../web/roles.js';
import {openDatabase,catalog,states,createCase,addEvidence,act,problem} from './database.mjs';
import {deploymentConfig,identity} from './access.mjs';
import {liveBrief} from './brief.mjs';

const base=fileURLToPath(new URL('../',import.meta.url));
const assets=new Map(['index.html','ui.css','role-view.js','roles.js','core.js','classifier.js','app.js','bootstrap.js'].map(name=>['/'+name,name]));
assets.set('/','index.html');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript'};
async function jsonBody(req){
  if(req.headers['content-type']?.split(';')[0].trim()!=='application/json')throw problem('JSON required.',415);
  const chunks=[];let size=0;
  for await(const part of req){size+=part.length;if(size>16384)throw problem('Request exceeds 16 KiB.',413);chunks.push(part);}
  let obj;try{obj=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw problem('Invalid JSON.',400);}
  if(!obj||Array.isArray(obj)||typeof obj!=='object')throw problem('A JSON object is required.',400);
  return obj;
}
export function makeServer(filename=':memory:',model=process.env.OLLAMA_MODEL,config=deploymentConfig(process.env)){
  const db=openDatabase(filename);
  const server=http.createServer(async(req,res)=>{
    const reply=(status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try{
      const url=new URL(req.url,'http://localhost'),route=url.pathname;
      if(req.method==='GET' && route==='/healthz'){db.prepare('SELECT 1 FROM workflows LIMIT 1').get();return reply(200,{status:'ok'});}
      const user=identity(config,req.headers.authorization);
      if(!user){res.setHeader('WWW-Authenticate','Basic realm="Relay workspace", charset="UTF-8"');return reply(401,{error:'Sign in to Relay.'});}
      if(!config.authenticated && !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(req.headers.host||''))return reply(403,{error:'Local demo accepts loopback hosts only.'});
      if(req.method==='GET' && assets.has(route)){
        const file=assets.get(route),asset=readFileSync(path.join(base,'web',file));
        const bytes=file==='index.html'?asset.toString('utf8').replace('<script src="data.js"></script><script src="samples.js"></script>','<script src="bootstrap.js"></script>'):asset;
        res.writeHead(200,{'Content-Type':types[path.extname(file)]+'; charset=utf-8','Cache-Control':'no-cache'});res.end(bytes);return;
      }
      if(req.method==='GET' && route==='/api/state'){
        db.exec('BEGIN');
        try{
          const actor=user.role?user:Roles.actor(url.searchParams.get('role')||'Coordinator',config.bindings);
          const visible=Roles.scope(catalog(db),actor),all=states(db);
          const view={mode:'server',live:Boolean(model),accountRole:user.role,catalog:visible,cases:Object.fromEntries(visible.cases.map(c=>[c.id,all[c.id]]))};
          db.exec('COMMIT');return reply(200,view);
        }
        catch(e){db.exec('ROLLBACK');throw e;}
      }
      if(req.method!=='POST')return reply(404,{error:'Unknown route.'});
      const origin=req.headers.origin,allowed=config.origin||'http://'+req.headers.host;
      if(origin&&origin!==allowed)return reply(403,{error:'Unrecognized request origin.'});
      const cmd=await jsonBody(req);
      if(user.role&&cmd.role&&cmd.role!==user.role)return reply(403,{error:'This action belongs to a different account role.'});
      const role=user.role||cmd.role||'Coordinator';
      const actor=user.role?user:Roles.actor(role,config.bindings);
      cmd.actorName=user.role?user.name:'demo / '+role;
      if(route==='/api/cases')return reply(201,{id:createCase(db,cmd,role)});
      const match=route.match(/^\/api\/cases\/(ONB-\d{3,})\/(action|brief|evidence)$/);
      if(!match||!Roles.sees(actor,db.prepare('SELECT id,manager,project FROM onboarding_cases WHERE id=?').get(match[1])))return reply(404,{error:'Unknown case or route.'});
      const [,id,operation]=match;
      if(operation==='evidence')return reply(201,{id:addEvidence(db,id,cmd,role)});
      if(operation==='brief'){
        const scope=Core.forCatalog(catalog(db));
        try{return reply(200,{brief:await liveBrief(id,{model,core:scope}),mode:'live'});}
        catch{return reply(503,{error:'Live brief unavailable or failed its evidence checks. Inspect the source messages.'});}
      }
      return reply(200,act(db,id,{...cmd,role}));
    }catch(e){
      if(!res.headersSent)reply(e.status||500,{error:e.status?e.message:'The workspace could not complete the request.'});
      else res.end();
    }
  });
  server.requestTimeout=60000;server.headersTimeout=15000;
  server.on('close',()=>db.close());return server;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const config=deploymentConfig(process.env);
  const directory=process.env.RELAY_DATA_DIR||path.join(base,'var');mkdirSync(directory,{recursive:true});
  const port=Number(process.env.PORT||4173),server=makeServer(path.join(directory,'relay.sqlite'),process.env.OLLAMA_MODEL,config);
  server.listen(port,config.host,()=>console.log('Relay listening on '+config.host+':'+port+' ('+(config.authenticated?'authenticated':'local demo')+')'));
  const shutdown=()=>server.close(()=>process.exit(0));
  process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
}
