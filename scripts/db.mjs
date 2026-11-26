import {mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase,counts} from '../src/database.mjs';
const [mode='status',fileArg,destination]=process.argv.slice(2);
if(!['init','status','backup','check'].includes(mode))throw new Error('Use init, status, check or backup.');
const filename=path.resolve(fileArg||path.join(process.env.RELAY_DATA_DIR||fileURLToPath(new URL('../var',import.meta.url)),'relay.sqlite'));
if(mode!=='init' && !existsSync(filename))throw new Error('Database does not exist: '+filename);
mkdirSync(path.dirname(filename),{recursive:true});
const db=mode==='init'?openDatabase(filename):new DatabaseSync(filename,{readOnly:true});
try{
  if(mode==='backup'){
    if(!destination||existsSync(destination))throw new Error('Choose a new backup filename.');
    mkdirSync(path.dirname(path.resolve(destination)),{recursive:true});
    db.prepare('VACUUM INTO ?').run(path.resolve(destination));console.log('Backup written.');
  }else if(mode==='check'){
    if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Database integrity check failed.');
    console.log('Database and foreign keys OK.');
  }else console.log(JSON.stringify({filename,...counts(db)},null,2));
}finally{db.close();}
