import type { Call, Film } from '../types';
export interface RuleResult { rule: string; state: 'ok'|'conflict'|'unknown'; detail: string }
export function eligibility(f:Film,c:Call) {
  const rules:RuleResult[]=[];
  const add=(rule:string,state:RuleResult['state'],detail:string)=>rules.push({rule,state,detail});
  add('Edição e fontes',c.confidence==='confirmado'?'ok':'unknown',c.confidence==='confirmado'?'Regras verificadas nesta edição':'Regras parciais, antigas ou ainda não verificadas');
  add('Formato',f.format&&c.formats.length?(c.formats.includes(f.format)?'ok':'conflict'):'unknown',`${f.format||'Filme sem formato'} · aceitos: ${c.formats.join(', ')||'não confirmado'}`);
  if(f.minutes===null||c.maxMinutes===null) add('Duração','unknown','Informe a duração do filme e o limite da chamada');
  else add('Duração',f.minutes<=c.maxMinutes&&(c.minMinutes===null||f.minutes>=c.minMinutes)?'ok':'conflict',`${f.minutes} min · ${c.minMinutes??0}–${c.maxMinutes} min`);
  if(f.year===null||c.minYear===null||c.maxYear===null) add('Ano de produção','unknown','Faixa de anos ou ano do filme incompleto');
  else add('Ano de produção',f.year>=c.minYear&&f.year<=c.maxYear?'ok':'conflict',`${f.year} · ${c.minYear}–${c.maxYear}`);
  add('Linguagem',c.genresConfirmed&&f.genres.length&&c.genres.length?(f.genres.some(g=>c.genres.includes(g))?'ok':'conflict'):'unknown',`Filme: ${f.genres.join(', ')||'não informado'} · chamada: ${c.genres.join(', ')||'não confirmado'}`);
  const eligibleCountries=[f.country,...f.coproduction].filter(Boolean);
  if(!c.territoriesConfirmed||!f.country)add('Território','unknown','Territorialidade não confirmada');
  else {
    const countryOk=!c.countries.length||c.countries.some(x=>eligibleCountries.some(y=>x.toLowerCase()===y.toLowerCase()));
    const regionOk=!c.regions.length||(!!f.region&&c.regions.includes(f.region));
    add('Território',c.regions.length&&!f.region?'unknown':countryOk&&regionOk?'ok':'conflict',`${f.country}${f.region?' / '+f.region:''} · ${[...c.countries,...c.regions].join(', ')||'sem restrição territorial'}`);
  }
  if(c.premiere==='nenhuma')add('Estreia','ok','Sem exigência de estreia');
  else if(c.premiere==='mundial')add('Estreia',f.worldPremiereAvailable==='sim'?'ok':f.worldPremiereAvailable==='não'?'conflict':'unknown','Exige estreia mundial; confira o histórico de exibições');
  else add('Estreia','unknown',`Exigência: ${c.premiere}; revisar histórico com o regulamento`);
  if(c.online==='permitido')add('Disponibilidade online','ok','Exibição online anterior permitida');
  else if(c.online==='proibido'&&f.online==='permitido')add('Disponibilidade online','conflict','Filme disponível publicamente; chamada proíbe disponibilidade online');
  else add('Disponibilidade online','unknown','Conferir publicação prévia e as restrições do regulamento');
  if(c.restrictions)add('Outras restrições','unknown',c.restrictions);
  const status=rules.some(r=>r.state==='conflict')?'possível conflito':rules.some(r=>r.state==='unknown')?'faltam informações':'provavelmente compatível';
  return {status,rules};
}
