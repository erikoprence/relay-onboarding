import {createHash,timingSafeEqual} from 'node:crypto';
import Roles from '../web/roles.js';
import {defaultDir,readNamedAccounts} from './account-files.mjs';
const digest=value=>createHash('sha256').update(value).digest();
export function deploymentConfig(env){
  const host=env.HOST||'127.0.0.1', production=env.NODE_ENV==='production'||!['127.0.0.1','localhost','::1'].includes(host);
  const keys=Roles.accounts.map(a=>env[a.key]);
  const authenticated=production||keys.some(Boolean);
  const enabled=keys.filter(Boolean);
  if(authenticated && (!keys[0]||!keys[1]||enabled.some(k=>typeof k!=='string'||k.length<24||/[\r\n]/.test(k))||new Set(enabled).size!==enabled.length))throw new Error('Each enabled account needs a distinct key of at least 24 characters. Run node scripts/configure.mjs.');
  const origin=env.PUBLIC_ORIGIN?new URL(env.PUBLIC_ORIGIN).origin:null;
  const bindings={caseId:env.RELAY_EMPLOYEE_CASE||'ONB-005',managerName:env.RELAY_LINE_MANAGER_NAME||'Luca Gray'};
  const credentials=authenticated?Roles.accounts.filter(a=>env[a.key]).map(a=>({...Roles.actor(a.role,bindings),name:a.username,digest:digest(a.username+':'+env[a.key])})):[];
  if(authenticated)credentials.push(...readNamedAccounts(env.RELAY_ACCOUNTS_DIR||defaultDir));
  if(new Set(credentials.map(a=>a.name)).size!==credentials.length)throw new Error('Each login must be unique.');
  return {host,authenticated,origin,bindings,credentials};
}
export function identity(config,header){
  if(!config.authenticated)return {name:'local-demo',role:null};
  if(typeof header!=='string'||!header.startsWith('Basic '))return null;
  const supplied=digest(Buffer.from(header.slice(6),'base64').toString('utf8'));
  return config.credentials.find(record=>timingSafeEqual(record.digest,supplied))||null;
}
