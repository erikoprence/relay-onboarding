import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import Roles from '../web/roles.js';
import {fileURLToPath} from 'node:url';
export const defaultDir=fileURLToPath(new URL('../access/',import.meta.url));
export function validateAccount(row){
  if(!row||typeof row.name!=='string'||!/^[a-z0-9][a-z0-9-]{1,63}$/.test(row.name)||Roles.accounts.some(r=>r.username===row.name))throw new Error('Use a unique lowercase account name.');
  if(!Roles.accounts.some(r=>r.role===row.role))throw new Error('Unknown role.');
  if(row.role==='Employee'&&!/^ONB-\d{3,}$/.test(row.caseId||''))throw new Error('An employee requires a case ID.');
  if(row.role==='Line Manager'&&(!row.managerName||typeof row.managerName!=='string'))throw new Error('A line manager requires a tracker manager name.');
  if(row.role==='Technical Lead'&&(!row.project||typeof row.project!=='string'))throw new Error('A named technical lead requires a project.');
  if(!/^[0-9a-f]{64}$/.test(row.verifier||''))throw new Error('Invalid account verifier.');
  return {...row,digest:Buffer.from(row.verifier,'hex')};
}
export function readNamedAccounts(dir){
  let names;try{names=readdirSync(dir);}catch(e){if(e.code==='ENOENT')return [];throw e;}
  return names.filter(n=>n.endsWith('.json')).map(n=>validateAccount(JSON.parse(readFileSync(path.join(dir,n),'utf8'))));
}
