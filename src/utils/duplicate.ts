import { type Call, type Edition } from '../types';
import { uid } from './defaults';
export function duplicateEdition(previous:Edition,calls:Call[],year:number){
  const edition:Edition={...structuredClone(previous),id:uid('edition'),year,number:'',start:'',end:'',opening:'',closing:'',resultDate:'',checkedAt:'',status:'não confirmado',confidence:'não verificado',sources:previous.sources.map(s=>({...s,confidence:'edição anterior',note:'Fonte da edição anterior; revisar.'})),notes:`Copiada de ${previous.year}. Não verificada para ${year}.\n${previous.notes}`,legacy:{copiedFrom:previous.id,original:structuredClone(previous)}};
  const copies=calls.filter(c=>c.editionId===previous.id).map(c=>({...structuredClone(c),id:uid('call'),editionId:edition.id,opening:'',deadlines:[],checkedAt:'',confidence:'não verificado' as const,genresConfirmed:false,territoriesConfirmed:false,sources:c.sources.map(s=>({...s,confidence:'edição anterior' as const,note:'Fonte anterior; não verificada nesta edição.'})),notes:`Regras copiadas de ${previous.year}; confirme todos os campos.\n${c.notes}`,legacy:{copiedFrom:c.id,original:structuredClone(c)}}));
  return {edition,calls:copies};
}
