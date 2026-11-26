import {randomBytes,randomUUID} from 'node:crypto';
import {closeSync,readFileSync,writeFileSync,mkdirSync,openSync,unlinkSync,renameSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Roles from '../web/roles.js';

export function configure(directory){
  mkdirSync(path.join(directory,'access'),{recursive:true,mode:0o755});
  const target=path.join(directory,'.env'),lock=target+'.relay-lock',tmp=target+'.'+randomUUID()+'.tmp';
  const fd=openSync(lock,'wx',0o600);
  try{
    const old=existsSync(target)?readFileSync(target,'utf8'):'# Private workshop settings. Keep outside Git.\nRELAY_PORT=4173\n# RELAY_DOMAIN=onboarding.example.com\n';
    const env=parseEnv(old),missing=Roles.accounts.filter(a=>!env[a.key]);
    if(missing.length===0)return 0;
    const extra=missing.map(a=>a.key+'='+randomBytes(32).toString('base64url'));
    writeFileSync(tmp,old+(old.endsWith('\n')?'':'\n')+extra.join('\n')+'\n',{flag:'wx',mode:0o600});
    renameSync(tmp,target);return missing.length;
  }finally{if(existsSync(tmp))unlinkSync(tmp);closeSync(fd);unlinkSync(lock);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const added=configure(fileURLToPath(new URL('../',import.meta.url)));
  console.log('Six workshop roles configured. New keys added: '+added+'.');
}
