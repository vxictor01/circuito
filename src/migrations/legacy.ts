import { SCHEMA_VERSION, GENRES, PREMIERES, type Answer, type Database, type Festival, type ImportReport, type Legacy, type Online } from '../types';
import { blankFestival, blankEdition, blankCall, blankFilm, blankSubmission, emptyDatabase } from '../utils/defaults';
import { isISODate } from '../utils/deadlines';

export const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function websiteKey(v:string) {try {const u=new URL(v);if(!/^https?:$/.test(u.protocol))return '';return u.hostname.replace(/^www\./,'').replace(/^\d{4}\./,'')+u.pathname.replace(/\/$/,'');}catch{return '';}}
const animationNames=['ANIMAGE — Festival Internacional de Animação de Pernambuco','Animatiba — Festival Internacional de Animação de Curitiba','Baixada Animada — Mostra Ibero-Americana de Cinema de Animação','Anim!Arte — Festival Internacional de Animação'];
export function animationOnly(f: { name:string; website?:string; site?:string; genres?:string[] }) {
  const n=norm(f.name);return animationNames.some(x=>norm(x)===n)||/^(animage|animatiba|baixada animada|anim arte)\b/.test(n)||(/^(animagefestival\.com|(?:www\.)?animatiba\.com\.br|baixadaanimada\.com\.br|vouanimarte\.com\.br)/.test(websiteKey(f.website||f.site||'')));
}
const answer=(v:unknown):Answer=>norm(String(v||''))==='sim'?'sim':norm(String(v||''))==='nao'?'não':norm(String(v||''))==='nao se aplica'?'não se aplica':'não confirmado';
const str=(v:unknown)=>typeof v==='string'?v:v===null||v===undefined?'':String(v);
const num=(v:unknown)=>v!==''&&v!==null&&v!==undefined&&/^\d+(\.\d+)?$/.test(String(v))?Number(v):null;
const date=(v:unknown)=>isISODate(v)?v:'';
export function migrateLegacy(raw:Legacy) {
  if(!Array.isArray(raw.festivals))throw new Error('Backup legado sem lista de festivais.');
  const db=emptyDatabase();const report:ImportReport={total:raw.festivals.length,imported:0,merged:0,convertedFields:['Festival → Festival + Edition + Call','uf → region','limite → duração máxima','PF/PJ → estados explícitos','datas ISO → datas estruturadas','URLs → fontes e regulamentos'],ambiguous:[],preserved:[],errors:[],removed:[]};
  const idMap=new Map<string,string>();
  for(const [i,item]of raw.festivals.entries()) {
    if(!item||typeof item!=='object'||typeof item.name!=='string'||!item.name.trim()) {report.errors.push(`Festival ${i+1}: sem nome. Original preservado no arquivo legado.`);continue;}
    const f=item as Legacy;const name=str(f.name);const id=str(f.id)||`legacy-festival-${i+1}`;
    if(animationOnly({name,site:str(f.site)})){report.removed.push({id,name,reason:'Exclusivamente animação; original preservado no arquivo da importação.'});db.archive.excludedFestivals.push(f);continue;}
    const match=db.festivals.find(x=>norm(x.name)===norm(name)||(websiteKey(str(f.site))&&websiteKey(x.website)===websiteKey(str(f.site))));
    const festival:Festival=match||blankFestival(id);
    if(match){report.merged++;festival.aliases=[...new Set([...festival.aliases,name])];festival.legacy={...festival.legacy,duplicates:[...(festival.legacy?.duplicates as unknown[]||[]),f]};}
    else {
      Object.assign(festival,{name,country:str(f.country)||'Brasil',region:str(f.uf),city:str(f.city),website:str(f.site),instagram:str(f.instagram),contact:str(f.contact),description:str(f.profile),scale:str(f.porte)||'não confirmado',favorite:f.favorite===true,personalNotes:str(f.personalNotes),legacy:structuredClone(f)});
      const profile=norm(str(f.profile));festival.genres=GENRES.filter(g=>profile.includes(norm(g)));festival.tags=[str(f.profile)].filter(Boolean);
      // Toda a estrutura original permanece acessível, mesmo campos sem equivalente.
      delete festival.legacy?.editions;
      db.festivals.push(festival);
    }
    idMap.set(id,festival.id);
    const editions=Array.isArray(f.editions)?f.editions:[];
    for(const [j,ei]of editions.entries()) {
      if(!ei||typeof ei!=='object'){report.errors.push(`${name}: edição inválida ${j+1}, preservada no legado.`);continue;}
      const e=ei as Legacy;const year=num(e.year);
      if(!year||!Number.isInteger(year)){report.errors.push(`${name}: ano de edição inválido, preservado no legado.`);festival.legacy={...festival.legacy,invalidEditions:[...(festival.legacy?.invalidEditions as unknown[]||[]),ei]};continue;}
      let eid=`${festival.id}-edition-${year}-${j+1}`;
      if(db.editions.some(x=>x.id===eid))eid+=`-duplicate-${i}`;
      const edition=blankEdition(festival.id,eid);
      Object.assign(edition,{year,start:date(e.eventStart),end:date(e.eventEnd),opening:date(e.exactStart),closing:date(e.deadline),rulesUrl:str(e.reg),checkedAt:date(e.checkedAt),confidence:'edição anterior',notes:str(e.notes),legacy:structuredClone(e)});
      const source={url:str(e.source)||str(e.reg)||str(f.site),type:'não verificado' as const,checkedAt:date(e.checkedAt),confidence:'edição anterior' as const,note:'Informação herdada do backup; não revalidada nesta importação.',fields:['regras','datas','PF/PJ','taxas']};
      if(source.url)edition.sources=[source];
      const call=blankCall(eid,`${eid}-call-general`);
      const formats: ('curta'|'longa')[]=[];if(answer(e.shorts)==='sim')formats.push('curta');if(answer(e.longs)==='sim')formats.push('longa');
      const premiereNorm=norm(str(e.premiere));const premiere=PREMIERES.find(x=>norm(x)===premiereNorm)||(premiereNorm.includes('sem exigencia')?'nenhuma':'não confirmado');
      const online=({permitido:'permitido',proibido:'proibido',restrito:'restrito'} as Record<string,Online>)[norm(str(e.online))]||'não confirmado';
      Object.assign(call,{name:'Chamada do backup — revisar categorias',formats,genres:festival.genres.filter(g=>['documentário','ficção','animação','experimental'].includes(g)),genresConfirmed:false,maxMinutes:num(e.limit),minYear:num(e.minYear),maxYear:num(e.maxYear),pf:answer(e.pf),pj:answer(e.pj),premiere,online,opening:date(e.exactStart),rulesUrl:str(e.reg),checkedAt:date(e.checkedAt),confidence:'edição anterior',restrictions:[str(e.rules),str(e.territory),str(e.requirements)].filter(Boolean).join('\n'),notes:[str(e.basis),str(e.fee),str(e.scope)].filter(Boolean).join('\n'),sources:edition.sources,legacy:structuredClone(e)});
      if(date(e.deadline))call.deadlines=[{kind:'final',date:date(e.deadline),time:'',timezone:'America/Sao_Paulo',confirmed:false}];
      if(str(e.fee)||str(e.feeValue))call.fees=[{amount:num(e.feeValue),currency:'BRL',free:norm(str(e.fee)).includes('gratuit')?'sim':'não confirmado',deadlineKind:'final',discount:'',waiver:'',notes:str(e.fee)}];
      if(str(e.limit)&&num(e.limit)===null)report.ambiguous.push(`${name} / ${year}: duração “${str(e.limit)}” preservada; máximo não inferido.`);
      if((str(e.window)||str(e.open))&&!date(e.exactStart))report.ambiguous.push(`${name} / ${year}: janela textual preservada; data de abertura não inferida.`);
      if(str(e.pf)&&call.pf==='não confirmado')report.ambiguous.push(`${name} / ${year}: PF “${str(e.pf)}” exige revisão.`);
      db.editions.push(edition);db.calls.push(call);
    }
  }
  for(const [i,fi]of (Array.isArray(raw.films)?raw.films:[]).entries()) {
    const f=fi as Legacy;const film=blankFilm(str(f.id)||`legacy-film-${i}`);
    Object.assign(film,{title:str(f.title)||str(f.name)||'Filme importado',internationalTitle:str(f.internationalTitle),year:num(f.year),minutes:num(f.minutes??f.duration),synopsis:str(f.synopsis),notes:str(f.notes),legacy:structuredClone(f)});db.films.push(film);
  }
  for(const [i,si]of (Array.isArray(raw.submissions)?raw.submissions:[]).entries()) {
    const s=si as Legacy;const submission=blankSubmission(str(s.id)||`legacy-submission-${i}`);
    const fid=idMap.get(str(s.festivalId));const film=db.films.find(f=>f.id===str(s.filmId));const e=db.editions.find(e=>e.festivalId===fid&&(e.year===num(s.year)||!s.year));const c=db.calls.find(c=>c.editionId===e?.id);
    if(!fid||!film||!e||!c){report.errors.push(`Inscrição ${i+1}: relacionamentos não resolvidos. Original preservado no legado da raiz.`);continue;}
    Object.assign(submission,{filmId:film.id,festivalId:fid,editionId:e.id,callId:c.id,date:date(s.date),notes:str(s.notes),legacy:structuredClone(s)});db.submissions.push(submission);
  }
  // A raiz original é arquivada de forma privada. Isso preserva inclusive registros inválidos.
  db.archive.legacyRoot=structuredClone(raw);
  report.imported=db.festivals.length;report.preserved=['Original integral em archive.legacyRoot','Campos originais em legacy de cada entidade','Festivais excluídos em archive.excludedFestivals','Status e meses textuais antigos preservados; não usados como regras atuais'];
  db.archive.importReports.push(report);db.schemaVersion=SCHEMA_VERSION;
  return {db,report};
}
