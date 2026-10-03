import { SCHEMA_VERSION, type Database, type Backup } from '../types';
import { validateDatabase } from './validation';
export function backupObject(db:Database,now=new Date()):Backup {validateDatabase(db);return {...structuredClone(db),app:'Circuito',schemaVersion:SCHEMA_VERSION,exportedAt:now.toISOString()};}
export function backupText(db:Database,now=new Date()){return JSON.stringify(backupObject(db,now),null,2);}
export function downloadText(filename:string,text:string,mime='application/json') {const a=document.createElement('a');const url=URL.createObjectURL(new Blob([text],{type:mime}));a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function parseBackup(text:string){if(text.length>50*1024*1024)throw new Error('Arquivo maior que 50 MB; divida ou revise antes de importar.');try{return JSON.parse(text);}catch{throw new Error('JSON inválido. O banco atual permanece intacto.');}}
