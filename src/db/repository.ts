import { SCHEMA_VERSION, type Database, type Entity, type Table } from '../types';
import { emptyDatabase } from '../utils/defaults';
import { validateDatabase } from '../utils/validation';
import { readImport } from '../migrations';
export interface Repository { load():Promise<Database>; replace(db:Database):Promise<void>; put(table:Table,record:Entity):Promise<void> }
const TABLES=['festivals','editions','calls','films','submissions','meta'] as const;
export class IndexedDBRepository implements Repository {
  private handle:Promise<IDBDatabase>;
  constructor(name='circuito-personal'){
    this.handle=new Promise((resolve,reject)=>{const request=indexedDB.open(name,2);
      request.onupgradeneeded=()=>{const db=request.result;for(const t of TABLES)if(!db.objectStoreNames.contains(t))db.createObjectStore(t,{keyPath:'id'});
        const tx=request.transaction!;for(const [table,key]of [['editions','festivalId'],['calls','editionId'],['submissions','filmId'],['submissions','festivalId']] as const){const s=tx.objectStore(table);if(!s.indexNames.contains(key))s.createIndex(key,key);}
        // V2 adiciona índices; não limpa nem substitui registros existentes.
      };
      request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Feche outras abas antigas do Circuito e tente novamente.'));
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};});
  }
  async load():Promise<Database>{const db=await this.handle;const tx=db.transaction([...TABLES],'readonly');
    const all=await Promise.all(TABLES.map(t=>new Promise<unknown[]>((resolve,reject)=>{const r=tx.objectStore(t).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);})));const d=emptyDatabase();
    for(const [i,table]of TABLES.entries())if(table!=='meta')d[table]=all[i] as never;
    const meta=all[5] as {id:string;value:unknown}[];for(const item of meta)if(['schemaVersion','settings','archive'].includes(item.id))(d as unknown as Record<string,unknown>)[item.id]=item.value;
    if(!d.festivals.length&&!meta.length)return d;
    if(d.schemaVersion!==SCHEMA_VERSION){const migrated=readImport(d).db;await this.replace(migrated);return migrated;}
    validateDatabase(d);return d;
  }
  async replace(data:Database){validateDatabase(data);const db=await this.handle;await new Promise<void>((resolve,reject)=>{const tx=db.transaction([...TABLES],'readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Gravação cancelada; banco anterior preservado.'));
      try { for(const t of TABLES){const store=tx.objectStore(t);store.clear();if(t==='meta'){for(const k of ['schemaVersion','settings','archive'] as const)store.put({id:k,value:data[k]});}else{for(const record of data[t])store.put(record);}}
      } catch(error) { tx.abort(); reject(error); }
    });}
  async put(table:Table,record:Entity){const db=await this.handle;await new Promise<void>((resolve,reject)=>{const tx=db.transaction(table,'readwrite');tx.objectStore(table).put(record);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
}
