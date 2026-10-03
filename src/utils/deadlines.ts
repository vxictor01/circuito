import type { Call } from '../types';
export const isISODate = (s: unknown): s is string => {
  if(typeof s!=='string'|| !/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const dt=new Date(s+'T00:00:00Z');return !Number.isNaN(dt.getTime())&&dt.toISOString().slice(0,10)===s;
};
export function todayISO(timezone='America/Sao_Paulo',now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return `${parts.find(p=>p.type==='year')?.value}-${parts.find(p=>p.type==='month')?.value}-${parts.find(p=>p.type==='day')?.value}`;
}
export const daysBetween = (a:string,b:string) => Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
export const displayDate = (s:string) => isISODate(s)?s.split('-').reverse().join('/'):'Não confirmado';
export function effectiveDeadline(c: Call,confirmedOnly=false) {
  const ds=c.deadlines.filter(d=>isISODate(d.date)&&(!confirmedOnly||d.confirmed));
  // Uma prorrogação posterior substitui o prazo final anterior.
  return ds.sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
}
export function deadlineStatus(c: Call,now=new Date(),fallbackZone='America/Sao_Paulo') {
  const end=effectiveDeadline(c,true);
  const zone=end?.timezone||fallbackZone;
  const today=todayISO(zone,now);
  if(c.confidence==='edição anterior'||!end)return {label:'Prazo não confirmado',tone:'unknown',days:null,open:false};
  const days=daysBetween(today,end.date);
  if(c.opening&&c.opening>today)return {label:'Ainda não abriu',tone:'muted',days,open:false};
  if(days<0)return {label:'Encerrado',tone:'muted',days,open:false};
  if(days===0&&end.time) {
    const time=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
    if(time>end.time)return {label:'Encerrado',tone:'muted',days,open:false};
  }
  const label=days===0?'Termina hoje':days===1?'Termina amanhã':days<=7?`Termina em ${days} dias`:'Aberto';
  return {label,tone:days<=7?'warning':'positive',days,open:!c.opening||c.opening<=today};
}
