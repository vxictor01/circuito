import fs from "node:fs";

const catalogPath = new URL("../src/data/catalog.json", import.meta.url);
const db = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const checkedAt = "2026-10-04";
const languages = ["documentário", "ficção", "animação", "experimental", "híbrido"];
const coverageFields = [
  "localização", "atividade", "categorias", "duração", "elegibilidade territorial",
  "produção/conclusão", "estreia", "exibição online", "pessoa autorizada a inscrever",
  "taxas", "abertura", "encerramento", "realização", "relevância",
];

const dl = (kind, date, originalLabel, source = 0, supersedes = "") => ({
  kind, date, time: "", timezone: "America/Sao_Paulo", confirmed: true,
  originalLabel, supersedes, _source: source,
});

const fee = (amount, currency, deadlineKind, appliesTo, source = 0, options = {}) => ({
  amount, currency,
  free: amount === null ? "não confirmado" : amount === 0 ? "sim" : "não",
  deadlineKind, discount: options.discount || "", waiver: options.waiver || "",
  notes: options.notes || "", appliesTo, platformAmount: options.platformAmount ?? null,
  _source: source,
});

const cov = (confirmed = {}, missing = {}, conflict = {}, previous = {}) => ({
  ...Object.fromEntries(Object.entries(confirmed).map(([key, note]) => [key, ["confirmado na edição atual", note]])),
  ...Object.fromEntries(Object.entries(missing).map(([key, note]) => [key, ["não localizado", note]])),
  ...Object.fromEntries(Object.entries(conflict).map(([key, note]) => [key, ["informação conflitante", note]])),
  ...Object.fromEntries(Object.entries(previous).map(([key, note]) => [key, ["confirmado em edição anterior", note]])),
});

const rel = (scores, range, impact, rationale, evidence, confidence = "média") => ({
  scores, range, impact, rationale, evidence, confidence,
});

const createRelevance = (config, sourceIds) => {
  const keys = ["curatorialHistory", "programmingReach", "industryOpportunities", "specializedImportance", "continuityTransparency"];
  const dimensions = Object.fromEntries(keys.map((key, index) => [key, {
    score: config.scores[index], evidence: config.evidence[index], sourceIds,
  }]));
  const score = config.scores.reduce((sum, value) => sum + value, 0);
  return {
    status: "provisória", score, uncertaintyMin: config.range[0], uncertaintyMax: config.range[1],
    band: score >= 80 ? "muito alta" : score >= 60 ? "alta" : score >= 40 ? "intermediária" : "menor alcance documentado",
    impact: config.impact, confidence: config.confidence, assessedAt: checkedAt,
    rationale: `${config.rationale} Avaliação editorial provisória; não é ranking oficial nem previsão de seleção.`,
    dimensions,
  };
};

const makeCall = (oldCall, edition, config, index, sources) => ({
  ...oldCall,
  id: index === 0 ? oldCall.id : `${edition.id}-call-${config.slug || index + 1}`,
  editionId: edition.id, name: config.name,
  formats: config.formats || [], genres: config.genres || [], workTypes: config.workTypes || ["filme"],
  languages: config.languages || [], approaches: config.approaches || [],
  contentGenres: config.contentGenres || [], themes: config.themes || [],
  audiences: config.audiences || ["geral"], participationConditions: config.participationConditions || [],
  submissionMode: config.submissionMode || "aberta", selectionType: config.selectionType || "competitiva",
  genresConfirmed: config.genresConfirmed ?? true,
  minMinutes: config.minMinutes ?? null, maxMinutes: config.maxMinutes ?? null,
  minSeconds: config.minSeconds ?? null, maxSeconds: config.maxSeconds ?? null,
  minInclusive: config.minInclusive ?? true, maxInclusive: config.maxInclusive ?? true,
  creditsIncluded: config.creditsIncluded ?? null,
  minYear: config.minYear ?? null, maxYear: config.maxYear ?? null,
  pf: config.pf || "não confirmado", pj: config.pj || "não confirmado",
  premiere: config.premiere || "não confirmado", premiereRequirement: config.premiereRequirement || "desconhecida",
  premiereTerritory: config.premiereTerritory || "", premiereConditions: config.premiereConditions || "",
  online: config.online || "não confirmado", onlineConditions: config.onlineConditions || "",
  countries: config.countries || [], regions: config.regions || [],
  territoriesConfirmed: config.territoriesConfirmed ?? false,
  restrictions: config.restrictions || "", resubmission: config.resubmission || "não confirmado",
  platform: config.platform || "", opening: config.opening || "",
  deadlines: (config.deadlines || []).map(({ _source = 0, ...item }) => ({ ...item, sourceId: sources[_source].id })),
  fees: (config.fees || []).map(({ _source = 0, ...item }) => ({ ...item, sourceId: sources[_source].id })),
  rulesUrl: config.rulesUrl || sources[0]?.url || "", checkedAt,
  confidence: config.confidence || "confirmado", notes: config.notes || "", sources,
});

const apply = (config) => {
  const festival = db.festivals.find((item) => item.id === config.id);
  const edition = db.editions.find((item) => item.festivalId === config.id);
  const oldCall = db.calls.find((item) => item.editionId === edition?.id);
  if (!festival || !edition || !oldCall) throw new Error(`Registro ausente para ${config.id}`);
  const sources = config.references.map((reference, index) => ({
    id: `${config.id}-source-${index + 1}`, url: reference.url, title: reference.title,
    type: reference.type || "oficial", checkedAt, accessedAt: checkedAt,
    confidence: reference.confidence || "confirmado",
    evidenceState: reference.evidenceState || "confirmado na edição atual",
    editionLabel: reference.editionLabel || config.editionLabel,
    section: reference.section || "Página ou regulamento consultado", note: reference.note || "",
    fields: reference.fields || coverageFields,
  }));
  const sourceIds = sources.map((item) => item.id);
  Object.assign(festival, {
    activity: config.activity, frequency: config.frequency || festival.frequency,
    organizer: config.organizer || festival.organizer, description: config.description || festival.description,
    languages: config.languages || festival.languages, workTypes: config.workTypes || festival.workTypes,
    audiences: config.audiences || festival.audiences, sources,
    locations: config.locations.map((item, index) => ({
      id: `${config.id}-location-${index + 1}`, role: item.role || "sede",
      countryCode: "BR", countryName: "Brasil", subdivisionCode: item.subdivisionCode,
      subdivisionName: item.subdivisionName, city: item.city,
      municipalityCode: item.municipalityCode, district: item.district || "",
      confirmed: true, sourceIds,
    })),
    seasonality: config.seasonality,
    relevance: createRelevance(config.relevance, sourceIds),
    researchCoverage: Object.fromEntries(coverageFields.map((field) => {
      const entry = config.coverage[field] || ["pendente", "Campo não concluído neste lote."];
      return [field, { status: entry[0], note: entry[1], sourceIds }];
    })),
  });
  Object.assign(edition, config.edition, { checkedAt, sources });
  db.calls = db.calls.filter((item) => item.editionId !== edition.id);
  db.calls.push(...config.calls.map((call, index) => makeCall(oldCall, edition, call, index, sources)));
};

const previousReference = (url, title, label, note = "") => ({
  url, title, type: "oficial", confidence: "edição anterior",
  evidenceState: "confirmado em edição anterior", editionLabel: label, note,
});

const commonCurrent = {
  genres: languages, languages, formats: ["curta"],
  premiere: "nenhuma", premiereRequirement: "sem exigência confirmada",
};

apply({
  id: "festival-070", editionLabel: "11ª edição / 2026",
  references: [{ url: "https://www.fccj.com.br/", title: "11º Festival Curta Campos do Jordão — regulamento e programação", note: "Regulamento oficial integralmente lido na página da edição." }],
  locations: [{ city: "Campos do Jordão", subdivisionCode: "SP", subdivisionName: "São Paulo", municipalityCode: "3509700" }],
  activity: "ativo", frequency: "anual", organizer: "Associação Cultural Cineclube Araucária",
  description: "Festival de curtas brasileiros com séries regional e nacional, formação e sessões presenciais e online.",
  languages, workTypes: ["filme"], audiences: ["juvenil", "geral"],
  seasonality: { opening: { months: [7], evidenceYears: [2026], confidence: "desconhecida", note: "Somente o mês do regulamento e o prazo final foram localizados." }, event: { months: [10], evidenceYears: [2026], confidence: "baixa", note: "Realização de 17 a 24 de outubro." } },
  edition: { year: 2026, number: "11", start: "2026-10-17", end: "2026-10-24", opening: "", closing: "2026-07-31", resultDate: "2026-09-16", status: "realizada", rulesUrl: "https://www.fccj.com.br/", confidence: "confirmado", notes: "Abertura exata não publicada; o regulamento é datado de julho e fixa somente o encerramento." },
  calls: [
    { ...commonCurrent, slug: "regional", name: "Série Competitiva Regional", maxMinutes: 20, creditsIncluded: true, minYear: 2025, maxYear: 2026, countries: ["Brasil"], regions: ["SP"], territoriesConfirmed: false, restrictions: "Direção residente na Mantiqueira, Região Metropolitana do Vale do Paraíba ou Litoral Norte paulista; pode optar pela Série Nacional.", deadlines: [dl("final", "2026-07-31", "23h59")], fees: [fee(0, "BRL", "final", ["Série Regional"])], platform: "https://www.fccj.com.br/", online: "permitido", onlineConditions: "Sessões competitivas ficam 24 horas no YouTube durante o festival." },
    { ...commonCurrent, slug: "nacional", name: "Série Competitiva Nacional", maxMinutes: 20, creditsIncluded: true, minYear: 2025, maxYear: 2026, countries: ["Brasil"], territoriesConfirmed: true, restrictions: "Até três filmes do mesmo diretor; exclui publicidade e obras premiadas em edições anteriores.", deadlines: [dl("final", "2026-07-31", "23h59")], fees: [fee(0, "BRL", "final", ["Série Nacional"])], platform: "https://www.fccj.com.br/", online: "permitido", onlineConditions: "Sessões competitivas ficam 24 horas no YouTube durante o festival." },
  ],
  coverage: cov({ localização: "Campos do Jordão/SP, Espaço Cultural Dr. Além.", atividade: "11ª edição realizada em 2026.", categorias: "Séries Regional e Nacional; prêmios por ficção, documentário, animação e experimental.", duração: "Até 20 minutos, créditos incluídos.", "elegibilidade territorial": "Brasil; recorte regional por residência da direção.", "produção/conclusão": "Realizados entre janeiro de 2025 e julho de 2026.", estreia: "Sem exigência; veda apenas filmes já premiados no próprio FCCJ.", "exibição online": "Sessões competitivas por 24 horas no YouTube.", "pessoa autorizada a inscrever": "Responsável detentor dos direitos; PF/PJ não diferenciada.", taxas: "Inscrição gratuita.", encerramento: "31 de julho de 2026, 23h59.", realização: "17 a 24 de outubro de 2026.", relevância: "Onze edições, formação e circulação documentadas." }, { abertura: "Data exata não publicada." }),
  relevance: rel([16, 15, 10, 16, 14], [66, 77], "regional/local", "A continuidade, a formação e o alcance nacional sustentam relevância alta de impacto regional.", ["Onze edições.", "109 curtas e 4.974 espectadores na edição anterior.", "Oficinas e circulação dos premiados; sem mercado formal.", "Difusão audiovisual na Mantiqueira e Vale do Paraíba.", "Regulamento atual integral e programação publicada."], "alta"),
});

apply({
  id: "festival-071", editionLabel: "3ª edição / 2025",
  references: [previousReference("https://festivalrevoada.com.br/wp-content/uploads/2025/07/REGULAMENTO-FESTIVAL-REVOADA-2025.pdf", "Regulamento do Festival Revoada 2025", "3ª edição / 2025", "Última chamada pública localizada; em 2026 o site continua exibindo a programação da 3ª edição sem nova convocatória."), previousReference("https://festivalrevoada.com.br/revoada-2025-inscricoes-abertas/", "Página oficial de inscrições 2025", "3ª edição / 2025")],
  locations: [{ city: "Maceió", subdivisionCode: "AL", subdivisionName: "Alagoas", municipalityCode: "2704302" }],
  activity: "atividade não confirmada", frequency: "não confirmada", organizer: "Festival Revoada",
  description: "Festival de cinema de Maceió com mostras competitivas e formação.", languages, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [7], evidenceYears: [2025], confidence: "média", note: "Última chamada abriu em 30 de julho." }, event: { months: [9, 10], evidenceYears: [2025], confidence: "média", note: "3ª edição de 30 de setembro a 4 de outubro." } },
  edition: { year: 2025, number: "3", start: "2025-09-30", end: "2025-10-04", opening: "2025-07-30", closing: "2025-08-17", resultDate: "", status: "realizada", rulesUrl: "https://festivalrevoada.com.br/wp-content/uploads/2025/07/REGULAMENTO-FESTIVAL-REVOADA-2025.pdf", confidence: "edição anterior", notes: "Nenhuma chamada de 2026 foi localizada até 4/10/2026." },
  calls: [{ ...commonCurrent, name: "Curtas nacionais", maxMinutes: 30, minYear: 2024, countries: ["Brasil"], territoriesConfirmed: true, opening: "2025-07-30", deadlines: [dl("final", "2025-08-17", "prazo final")], fees: [], platform: "https://festivalrevoada.com.br/", confidence: "edição anterior" }],
  coverage: cov({}, { atividade: "Continuidade em 2026 e nova chamada não localizadas." }, {}, { localização: "Maceió/AL, Centro Cultural Arte Pajuçara.", categorias: "Curtas nacionais; programação também reuniu competição internacional.", duração: "Até 30 minutos.", "elegibilidade territorial": "Produções nacionais.", "produção/conclusão": "A partir de 2024.", abertura: "30 de julho de 2025.", encerramento: "17 de agosto de 2025.", realização: "30 de setembro a 4 de outubro de 2025.", relevância: "Três edições e atividades formativas documentadas." }),
  relevance: rel([8, 10, 11, 13, 7], [39, 60], "regional/local", "A formação e a programação nacional/internacional indicam alcance intermediário, com grande incerteza pela ausência de chamada nova.", ["Três edições localizadas.", "Programação de cinco dias em Maceió.", "Oficinas e debates; sem mercado formal.", "Espaço emergente no circuito alagoano.", "Regulamento de 2025; continuidade de 2026 não confirmada."], "baixa"),
});

apply({
  id: "festival-072", editionLabel: "7ª edição / 2026",
  references: [{ url: "https://curtanaserra.com.br/edition/vii-curta-na-serra/", title: "VII Curta na Serra — página oficial", note: "Página integral da edição lida; a convocatória de 2026 não foi localizada." }, { url: "https://curtanaserra.com.br/wp-content/uploads/2024/07/Regulamento-6o-Curta-na-Serra-_compressed.pdf", title: "Regulamento da 6ª edição", confidence: "edição anterior", evidenceState: "confirmado em edição anterior", editionLabel: "6ª edição / 2024", note: "Usado apenas para histórico; regras não foram transportadas para 2026." }],
  locations: [{ city: "Bezerros", district: "Serra Negra", subdivisionCode: "PE", subdivisionName: "Pernambuco", municipalityCode: "2601904" }],
  activity: "ativo", frequency: "anual", organizer: "Eixo Audiovisual e Pernambuco Filmes",
  description: "Festival de cinema ao ar livre no Agreste pernambucano, com panoramas nacional e pernambucano.", languages, workTypes: ["filme", "videoclipe"], audiences: ["geral"],
  seasonality: { opening: { months: [], evidenceYears: [2026], confidence: "desconhecida", note: "Convocatória atual não localizada." }, event: { months: [3], evidenceYears: [2026], confidence: "baixa", note: "Realização de 27 a 29 de março." } },
  edition: { year: 2026, number: "7", start: "2026-03-27", end: "2026-03-29", opening: "", closing: "", resultDate: "", status: "realizada", rulesUrl: "https://curtanaserra.com.br/edition/vii-curta-na-serra/", confidence: "parcial", notes: "Edição e quatro seções confirmadas; nenhum regulamento/chamada de 2026 foi recuperado." },
  calls: [
    { name: "Panorama Nacional", formats: ["curta"], genres: languages, languages, countries: ["Brasil"], territoriesConfirmed: true, submissionMode: "curadoria sem chamada", premiere: "não confirmado", confidence: "parcial", rulesUrl: "https://curtanaserra.com.br/edition/vii-curta-na-serra/" },
    { slug: "pernambuco", name: "Panorama Pernambuco", formats: ["curta"], genres: languages, languages, countries: ["Brasil"], regions: ["PE"], territoriesConfirmed: false, submissionMode: "curadoria sem chamada", premiere: "não confirmado", confidence: "parcial" },
    { slug: "videoclipe", name: "Videoclipe", formats: ["curta", "outro"], workTypes: ["videoclipe"], genres: languages, languages, countries: ["Brasil"], territoriesConfirmed: true, submissionMode: "curadoria sem chamada", premiere: "não confirmado", confidence: "parcial" },
  ],
  coverage: cov({ localização: "Distrito de Serra Negra, Bezerros/PE.", atividade: "7ª edição realizada em 2026.", categorias: "Panorama Nacional, Panorama Pernambuco, Videoclipe e Sessão Especial.", "elegibilidade territorial": "Panoramas nacional e pernambucano existem; critério exato do recorte estadual não publicado.", realização: "27 a 29 de março de 2026.", relevância: "Sete edições, 1.194 inscrições e atuação formativa no interior documentadas." }, { duração: "Regra de 2026 não localizada.", "produção/conclusão": "Regra de 2026 não localizada.", estreia: "Não localizada.", "exibição online": "A edição teve exibição online, mas a regra de histórico anterior não foi localizada.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Não localizadas para 2026.", abertura: "Não localizada.", encerramento: "Não localizado." }),
  relevance: rel([14, 15, 12, 18, 10], [62, 78], "regional/local", "O recorde de inscrições e a interiorização sustentam relevância alta regional, limitada pela falta da convocatória atual.", ["Sete edições.", "1.194 inscrições e mostra híbrida.", "Debates e oficinas; sem mercado formal.", "Referência de cinema ao ar livre no Agreste.", "Página atual detalhada; regulamento não localizado."], "média"),
});

apply({
  id: "festival-073", editionLabel: "edição 2026 / número não publicado",
  references: [{ url: "https://festivaldemuriae.com.br/", title: "Festival de Cinema de Muriaé — inscrições 2026", note: "A página inicial confirma somente a janela atual." }, { url: "https://festivaldemuriae.com.br/regulamento/", title: "Regulamento da 9ª edição / 2025", confidence: "edição anterior", evidenceState: "confirmado em edição anterior", editionLabel: "9ª edição / 2025", note: "A página de regulamento permanece datada de 2025; suas regras não foram promovidas para 2026." }],
  locations: [{ city: "Muriaé", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3143906" }],
  activity: "ativo", frequency: "anual", organizer: "Euler Luz Produções",
  description: "Festival de curtas brasileiros com exibição presencial, online e itinerância escolar.", languages, workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"],
  seasonality: { opening: { months: [8], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 15 de agosto." }, event: { months: [11], evidenceYears: [2025], confidence: "média", note: "Referência histórica; realização 2026 não publicada." } },
  edition: { year: 2026, number: "", start: "", end: "", opening: "2026-08-15", closing: "2026-09-30", resultDate: "", status: "planejada", rulesUrl: "https://festivaldemuriae.com.br/", confidence: "parcial", notes: "A página confirma inscrições em 2026, mas o regulamento vinculado continua sendo o da 9ª edição/2025." },
  calls: [{ name: "Seleção 2026 — regras não publicadas", formats: [], genres: [], languages: [], genresConfirmed: false, opening: "2026-08-15", deadlines: [dl("final", "2026-09-30", "prazo publicado na página inicial")], fees: [], premiere: "não confirmado", confidence: "parcial", platform: "https://filmfreeway.com/" }],
  coverage: cov({ localização: "Muriaé/MG.", atividade: "Inscrições 2026 publicadas.", abertura: "15 de agosto de 2026.", encerramento: "30 de setembro de 2026.", relevância: "Histórico anual desde pelo menos 2017 e formação documentados." }, { categorias: "Regulamento 2026 não publicado; categorias de 2025 não foram reutilizadas.", duração: "Não localizada para 2026.", "elegibilidade territorial": "Não localizada para 2026.", "produção/conclusão": "Não localizada para 2026.", estreia: "Não localizada.", "exibição online": "Não localizada para 2026.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Não localizadas.", realização: "Datas 2026 não localizadas." }),
  relevance: rel([14, 11, 9, 14, 8], [47, 67], "regional/local", "A continuidade e a itinerância sustentam relevância intermediária, com incerteza elevada pela ausência do regulamento atual.", ["Histórico anual visível desde 2017.", "Presencial, online e itinerância escolar na edição anterior.", "Oficina de cinema; sem mercado formal.", "Difusão regional na Zona da Mata.", "Chamada 2026 sem regras atualizadas."], "baixa"),
});

apply({
  id: "festival-074", editionLabel: "9ª edição / 2026",
  references: [{ url: "https://filmfreeway.com/MostraFamadeCinema", title: "9ª Mostra de Cinema de Fama — regras e inscrições", type: "plataforma de inscrição", note: "Página integral lida; contém número da 8ª edição e três pares divergentes de datas no texto, preservados como conflito." }],
  locations: [{ city: "Fama", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3125200" }],
  activity: "ativo", frequency: "anual", organizer: "Gesto Produtora",
  description: "Mostra competitiva de curtas nacionais, mineiros, internacionais e de animação às margens do Lago de Furnas.", languages, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [5], evidenceYears: [2026], confidence: "baixa", note: "A página diverge entre 19 e 22 de maio." }, event: { months: [8], evidenceYears: [2026], confidence: "baixa", note: "Realização de 27 a 30 de agosto." } },
  edition: { year: 2026, number: "9", start: "2026-08-27", end: "2026-08-30", opening: "2026-05-22", closing: "2026-06-21", resultDate: "", status: "realizada", rulesUrl: "https://filmfreeway.com/MostraFamadeCinema", confidence: "parcial", notes: "Metadados atuais: 9ª edição e 22/5–21/6. O texto também cita 19/5–19/6 e chama a edição de 8ª; foram usados os campos operacionais mais recentes." },
  calls: [
    { ...commonCurrent, slug: "fama", name: "Mostra Fama — curtas nacionais", maxMinutes: 25, minYear: 2025, countries: ["Brasil"], territoriesConfirmed: true, opening: "2026-05-22", deadlines: [dl("final", "2026-06-21", "prazo operacional")], fees: [fee(0, "BRL", "final", ["Mostra Fama"])], platform: "https://filmfreeway.com/MostraFamadeCinema", confidence: "parcial" },
    { ...commonCurrent, slug: "mineira", name: "Mostra Mineira", maxMinutes: 25, minYear: 2025, countries: ["Brasil"], regions: ["MG"], territoriesConfirmed: false, opening: "2026-05-22", deadlines: [dl("final", "2026-06-21", "prazo operacional")], fees: [fee(0, "BRL", "final", ["Mostra Mineira"])], platform: "https://filmfreeway.com/MostraFamadeCinema", confidence: "parcial" },
    { ...commonCurrent, slug: "animacao", name: "Mostra Animação", genres: ["animação"], languages: ["animação"], maxMinutes: 25, minYear: 2025, opening: "2026-05-22", deadlines: [dl("final", "2026-06-21", "prazo operacional")], fees: [fee(0, "BRL", "final", ["Mostra Animação"])], platform: "https://filmfreeway.com/MostraFamadeCinema", confidence: "parcial" },
    { ...commonCurrent, slug: "internacional", name: "Mostra Internacional", maxMinutes: 25, minYear: 2025, opening: "2026-05-22", deadlines: [dl("final", "2026-06-21", "prazo operacional")], fees: [fee(0, "BRL", "final", ["Mostra Internacional"])], restrictions: "Curtas internacionais.", platform: "https://filmfreeway.com/MostraFamadeCinema", confidence: "parcial" },
  ],
  coverage: cov({ localização: "Fama/MG, Praça Central/Beira Lago.", atividade: "9ª edição realizada em 2026.", categorias: "Fama, Mineira, Animação e Internacional.", duração: "Até 25 minutos.", "elegibilidade territorial": "Nacional, Minas Gerais e internacional separados por mostra.", "produção/conclusão": "Finalizados a partir de 2025.", estreia: "Sem exigência localizada.", "exibição online": "Parte da seleção foi disponibilizada online; regra de histórico anterior não publicada.", "pessoa autorizada a inscrever": "Responsável detentor dos direitos; PF/PJ não diferenciada.", taxas: "Inscrição gratuita.", realização: "27 a 30 de agosto de 2026.", relevância: "Nove edições, mais de três mil inscrições e programação formativa documentadas." }, {}, { abertura: "Metadados: 22/5; texto: 19/5.", encerramento: "Metadados: 21/6; texto: 19/6. O cabeçalho também cita 22/5–21/6." }),
  relevance: rel([13, 14, 10, 15, 8], [52, 70], "regional/local", "A continuidade e o volume de inscrições sustentam relevância alta regional, limitada pelos conflitos editoriais da chamada.", ["Nove edições.", "Mais de três mil inscrições e mais de 40 filmes em 2026.", "Oficinas, debates e encontros; sem mercado formal.", "Difusão no Sul de Minas.", "Página atual com número e prazos conflitantes."], "média"),
});

apply({
  id: "festival-075", editionLabel: "3ª edição / 2026",
  references: [{ url: "https://cinelapinho.com.br/curtas-metragens/", title: "3º Cine Lapinhô — regulamento de curtas", note: "Regulamento oficial integralmente lido; há divergência 15/3 versus 16/3 e uma linha residual de resultado em 2024." }, { url: "https://cinelapinho.com.br/", title: "Programação oficial do 3º Cine Lapinhô", fields: ["eventDates", "locations", "programmingReach", "relevance"] }],
  locations: [{ city: "Santana do Riacho", district: "Lapinha da Serra", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3159001" }],
  activity: "ativo", frequency: "não confirmada", organizer: "Cine Lapinhô",
  description: "Festival comunitário de cinema e território na Lapinha da Serra, com sessões presenciais e online.", languages, workTypes: ["filme"], audiences: ["infantil", "geral"],
  seasonality: { opening: { months: [2], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 25 de fevereiro." }, event: { months: [6], evidenceYears: [2026], confidence: "baixa", note: "Realização presencial de 3 a 6 de junho." } },
  edition: { year: 2026, number: "3", start: "2026-06-03", end: "2026-06-14", opening: "2026-02-25", closing: "2026-03-16", resultDate: "2026-05-01", status: "realizada", rulesUrl: "https://cinelapinho.com.br/curtas-metragens/", confidence: "parcial", notes: "Presencial 3–6/6 e online 8–14/6. Card cita 15/3, texto do regulamento 16/3; 16/3 foi mantido como prazo mais específico." },
  calls: [{ ...commonCurrent, name: "Curtas nacionais — Um Mundo Imenso", maxMinutes: 30, minYear: 2024, countries: ["Brasil"], territoriesConfirmed: true, audiences: ["infantil", "juvenil", "geral"], restrictions: "Classificação livre e diálogo com o tema curatorial sobre humanos, mais-que-humanos e território.", opening: "2026-02-25", deadlines: [dl("final", "2026-03-16", "prazo no corpo do regulamento")], fees: [fee(0, "BRL", "final", ["curtas nacionais"])], platform: "https://cinelapinho.com.br/curtas-metragens/", online: "permitido", onlineConditions: "Selecionados autorizam mostra no YouTube de 8 a 14 de junho." , confidence: "parcial" }],
  coverage: cov({ localização: "Lapinha da Serra, Santana do Riacho/MG.", atividade: "3ª edição realizada em 2026.", categorias: "Curtas nacionais alinhados ao tema Um Mundo Imenso.", duração: "Até 30 minutos.", "elegibilidade territorial": "Produções nacionais.", "produção/conclusão": "Realizadas a partir de 2024.", estreia: "Sem exigência localizada.", "exibição online": "Mostra no YouTube de 8 a 14 de junho autorizada no regulamento.", "pessoa autorizada a inscrever": "Realizador responsável pelos direitos; PF/PJ não diferenciada.", taxas: "Inscrição gratuita.", abertura: "25 de fevereiro de 2026.", realização: "Presencial 3–6/6; online 8–14/6.", relevância: "730 inscrições de todos os estados e forte atuação comunitária documentadas." }, {}, { encerramento: "Card: 15/3; corpo do regulamento: 16/3." }),
  relevance: rel([8, 13, 9, 16, 10], [49, 65], "regional/local", "O alcance nacional de inscrições e a integração comunitária sustentam relevância intermediária/alta regional.", ["Três edições.", "730 inscrições de todos os estados.", "Oficinas e debates; sem mercado formal.", "Cinema e território em comunidade rural.", "Regulamento atual com dois resíduos editoriais."], "média"),
});

apply({
  id: "festival-076", editionLabel: "3ª edição / 2026",
  references: [{ url: "https://seridocine.com.br/regulamento", title: "3º Seridó Cine — regulamento", note: "Regulamento oficial integralmente lido." }, { url: "https://seridocine.com.br/", title: "Página oficial e notícias da 3ª edição", fields: ["activity", "locations", "eventDates", "relevance"] }],
  locations: [
    { city: "Caicó", subdivisionCode: "RN", subdivisionName: "Rio Grande do Norte", municipalityCode: "2402006" },
    { city: "Acari", subdivisionCode: "RN", subdivisionName: "Rio Grande do Norte", municipalityCode: "2400109", role: "exibição" },
    { city: "São José do Seridó", subdivisionCode: "RN", subdivisionName: "Rio Grande do Norte", municipalityCode: "2412401", role: "exibição" },
    { city: "Timbaúba dos Batistas", subdivisionCode: "RN", subdivisionName: "Rio Grande do Norte", municipalityCode: "2414308", role: "exibição" },
    { city: "Serra Negra do Norte", subdivisionCode: "RN", subdivisionName: "Rio Grande do Norte", municipalityCode: "2413409", role: "exibição" },
  ],
  activity: "ativo", frequency: "não confirmada", organizer: "Agência Referência",
  description: "Festival itinerante do Seridó potiguar que integra cinema, moda e economia criativa.", languages, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [12], evidenceYears: [2025], confidence: "baixa", note: "Chamada abriu em 26 de dezembro de 2025." }, event: { months: [3], evidenceYears: [2026], confidence: "baixa", note: "Mostras itinerantes no fim de março." } },
  edition: { year: 2026, number: "3", start: "", end: "", opening: "2025-12-26", closing: "2026-01-16", resultDate: "", status: "realizada", rulesUrl: "https://seridocine.com.br/regulamento", confidence: "confirmado", notes: "O regulamento lista cinco municípios e informa que as datas seriam divulgadas depois; a janela exata de realização não foi inferida." },
  calls: [
    { ...commonCurrent, slug: "serido", name: "Mostra Seridó", maxMinutes: 15, creditsIncluded: true, minYear: 2024, countries: ["Brasil"], regions: ["RN", "PB"], territoriesConfirmed: false, restrictions: "Produzido na região do Seridó do RN ou da PB por brasileiro residente no Nordeste.", opening: "2025-12-26", deadlines: [dl("final", "2026-01-16", "prazo final")], fees: [fee(0, "BRL", "final", ["Mostra Seridó"])], platform: "https://seridocine.com.br/" },
    { ...commonCurrent, slug: "nordeste", name: "Mostra Nordeste", maxMinutes: 15, creditsIncluded: true, minYear: 2024, countries: ["Brasil"], regions: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"], territoriesConfirmed: true, restrictions: "Realizado por brasileiros residentes no Nordeste.", opening: "2025-12-26", deadlines: [dl("final", "2026-01-16", "prazo final")], fees: [fee(0, "BRL", "final", ["Mostra Nordeste"])], platform: "https://seridocine.com.br/" },
    { ...commonCurrent, slug: "fashion", name: "Mostra Fashion Filmes", maxMinutes: 5, creditsIncluded: true, minYear: 2024, countries: ["Brasil"], regions: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"], territoriesConfirmed: true, restrictions: "Fashion film realizado por brasileiros residentes no Nordeste.", opening: "2025-12-26", deadlines: [dl("final", "2026-01-16", "prazo final")], fees: [fee(0, "BRL", "final", ["Mostra Fashion Filmes"])], platform: "https://seridocine.com.br/" },
  ],
  coverage: cov({ localização: "Caicó, Acari, São José do Seridó, Timbaúba dos Batistas e Serra Negra do Norte/RN.", atividade: "3ª edição realizada em 2026.", categorias: "Mostra Seridó, Mostra Nordeste e Fashion Filmes.", duração: "Até 15 minutos; Fashion Filmes até 5, créditos incluídos.", "elegibilidade territorial": "Realização por brasileiros residentes no Nordeste; recorte Seridó RN/PB.", "produção/conclusão": "A partir de janeiro de 2024.", estreia: "Sem exigência localizada.", "exibição online": "Link é usado na seleção; acervo pode ter exibições culturais futuras com comunicação.", "pessoa autorizada a inscrever": "Responsável pelo filme; PF/PJ não diferenciada.", taxas: "Inscrição gratuita.", abertura: "26 de dezembro de 2025.", encerramento: "16 de janeiro de 2026.", relevância: "Itinerância em cinco municípios, formação e prêmio da crítica documentados." }, { realização: "Regulamento não publicou o intervalo exato; notícias confirmam circuito no fim de março." }),
  relevance: rel([8, 11, 12, 17, 12], [54, 68], "regional/local", "A itinerância e o recorte territorial especializado sustentam relevância alta de impacto regional.", ["Três edições.", "Circuito em cinco municípios.", "Oficinas e integração com economia criativa.", "Foco audiovisual no Seridó e Nordeste.", "Regulamento atual integral e apoio público documentado."], "média"),
});

apply({
  id: "festival-077", editionLabel: "1ª edição / 2025",
  references: [previousReference("https://grad.eba.ufmg.br/caad/wp-content/uploads/2025/03/REGULAMENTO-.pdf", "Regulamento do Festival Internacional de Cinema: Respira", "1ª edição / 2025", "PDF de dez páginas integralmente lido; nenhuma chamada de 2026 foi localizada."), previousReference("https://respiracinema.com.br/", "Site oficial Respira Cinema", "1ª edição / 2025")],
  locations: [
    { city: "Bento Gonçalves", subdivisionCode: "RS", subdivisionName: "Rio Grande do Sul", municipalityCode: "4302105" },
    { city: "Montenegro", subdivisionCode: "RS", subdivisionName: "Rio Grande do Sul", municipalityCode: "4312401", role: "exibição" },
    { city: "Caxias do Sul", subdivisionCode: "RS", subdivisionName: "Rio Grande do Sul", municipalityCode: "4305108", role: "exibição" },
    { city: "Monte Belo do Sul", subdivisionCode: "RS", subdivisionName: "Rio Grande do Sul", municipalityCode: "4312385", role: "exibição" },
    { city: "Cotiporã", subdivisionCode: "RS", subdivisionName: "Rio Grande do Sul", municipalityCode: "4305959", role: "exibição" },
    { city: "Veranópolis", subdivisionCode: "RS", subdivisionName: "Rio Grande do Sul", municipalityCode: "4322806", role: "exibição" },
    { city: "São Valentim do Sul", subdivisionCode: "RS", subdivisionName: "Rio Grande do Sul", municipalityCode: "4319711", role: "exibição" },
  ],
  activity: "atividade não confirmada", frequency: "não confirmada", organizer: "Respira Produções Culturais",
  description: "Festival internacional de curtas voltado à diversidade e a realizadores de grupos historicamente sub-representados.", languages, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [3], evidenceYears: [2025], confidence: "média", note: "Última abertura em 21 de março." }, event: { months: [6, 7, 8, 9], evidenceYears: [2025], confidence: "média", note: "Online em junho, premiação em julho e circulação posterior." } },
  edition: { year: 2025, number: "1", start: "2025-06-08", end: "2025-09-30", opening: "2025-03-21", closing: "2025-04-11", resultDate: "2025-06-01", status: "realizada", rulesUrl: "https://grad.eba.ufmg.br/caad/wp-content/uploads/2025/03/REGULAMENTO-.pdf", confidence: "edição anterior", notes: "O PDF contém 31/09, data impossível; a circulação foi registrada apenas até setembro, sem inventar dia final." },
  calls: ["ficção", "documentário", "animação", "experimental"].map((kind) => ({ ...commonCurrent, slug: kind, name: `Curta ${kind}`, genres: kind === "experimental" ? ["experimental"] : [kind], languages: kind === "experimental" ? ["experimental"] : [kind], maxMinutes: 20, minYear: 2020, opening: "2025-03-21", deadlines: [dl("final", "2025-04-11", "18h")], fees: [], online: "permitido", onlineConditions: "Selecionados autorizam exibição pública no YouTube durante quinze dias.", restrictions: "Aberto a todas as pessoas; prioriza realizadores negros, mulheres, LGBTQIA+, quilombolas, indígenas e PCD.", platform: "https://respiracinema.com.br/", confidence: "edição anterior" })),
  coverage: cov({}, { atividade: "Continuidade e chamada de 2026 não localizadas." }, {}, { localização: "Bento Gonçalves e seis cidades da circulação no RS.", categorias: "Ficção, documentário, animação e experimental/vídeo arte.", duração: "Até 20 minutos.", "elegibilidade territorial": "Internacional; prioridade identitária, sem exclusão geral.", "produção/conclusão": "A partir de 1º de janeiro de 2020.", estreia: "Sem exigência localizada.", "exibição online": "Exibição no YouTube prevista e autorizada.", "pessoa autorizada a inscrever": "Representante da obra com autodeclaração.", abertura: "21 de março de 2025.", encerramento: "11 de abril de 2025 às 18h.", realização: "Online, premiação e circulação entre junho e setembro de 2025.", relevância: "Primeira edição com júri, ajuda de custo e circulação." }),
  relevance: rel([5, 11, 10, 16, 6], [38, 59], "especializado", "O recorte inclusivo e a circulação indicam alcance intermediário, com baixa confiança por haver apenas uma edição confirmada.", ["Uma edição.", "Até cem filmes online e circulação em sete cidades.", "Ajuda de custo a representantes; sem mercado formal.", "Recorte especializado em diversidade.", "Regulamento integral de 2025; continuidade não confirmada."], "baixa"),
});

apply({
  id: "festival-078", editionLabel: "12ª edição / 2026",
  references: [{ url: "https://www.incena.org/noticias/12a-edicao-cine-pojicha---festival-de-cinema-dos-vales-do-mucuri-e-jequitinhonha", title: "12ª edição do Cine Pojichá — programação oficial", note: "Programação integral da edição corrente; nenhuma convocatória pública de filmes foi localizada." }, { url: "https://www.incena.org/noticias", title: "Notícias oficiais do Instituto In-Cena", fields: ["activity", "locations", "eventDates", "relevance"] }],
  locations: [
    { city: "Teófilo Otoni", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3168606" },
    { city: "Ataléia", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3104700", role: "exibição" },
    { city: "Águas Formosas", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3100906", role: "exibição" },
  ],
  activity: "ativo", frequency: "anual", organizer: "Instituto Cultural In-Cena",
  description: "Festival itinerante de cinema, memória e formação nos Vales do Mucuri e Jequitinhonha.", languages, workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"],
  seasonality: { opening: { months: [], evidenceYears: [2026], confidence: "desconhecida", note: "Nenhuma chamada pública localizada." }, event: { months: [4], evidenceYears: [2026], confidence: "baixa", note: "Circuito de 15 a 18 de abril." } },
  edition: { year: 2026, number: "12", start: "2026-04-15", end: "2026-04-18", opening: "", closing: "", resultDate: "", status: "realizada", rulesUrl: "https://www.incena.org/noticias/12a-edicao-cine-pojicha---festival-de-cinema-dos-vales-do-mucuri-e-jequitinhonha", confidence: "parcial", notes: "Atividade e itinerância confirmadas; não foi localizada chamada pública para seleção de filmes." },
  calls: [{ name: "Programação por curadoria — sem chamada pública localizada", formats: [], genres: [], languages: [], genresConfirmed: false, submissionMode: "curadoria sem chamada", selectionType: "não competitiva", premiere: "não confirmado", confidence: "parcial" }],
  coverage: cov({ localização: "Teófilo Otoni, Ataléia e Águas Formosas/MG.", atividade: "12ª edição realizada em 2026.", realização: "15 a 18 de abril de 2026.", relevância: "Doze edições, itinerância territorial e oficinas documentadas." }, { categorias: "Chamada pública não localizada.", duração: "Não localizada.", "elegibilidade territorial": "Não localizada.", "produção/conclusão": "Não localizada.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Não localizadas.", abertura: "Não localizada.", encerramento: "Não localizado." }),
  relevance: rel([15, 12, 12, 18, 10], [59, 75], "regional/local", "A continuidade e o trabalho territorial sustentam relevância alta regional, embora a via de seleção não esteja documentada.", ["Doze edições.", "Circuito em três cidades em 2026.", "Oficinas e ações culturais continuadas.", "Importância para os Vales do Mucuri e Jequitinhonha.", "Programação atual publicada; chamada não localizada."], "média"),
});

const bonitoBase = { genres: languages, languages, minYear: 2025, maxYear: 2026, countries: ["Argentina", "Bolívia", "Brasil", "Chile", "Colômbia", "Equador", "Guiana", "Paraguai", "Peru", "Suriname", "Uruguai", "Venezuela"], territoriesConfirmed: true, premiere: "nacional", premiereRequirement: "obrigatória", premiereTerritory: "Brasil", premiereConditions: "Obra não pode ter lançamento comercial no Brasil.", opening: "2026-02-06", deadlines: [dl("final", "2026-04-06", "prazo final")], fees: [fee(0, "BRL", "final", ["formulário oficial"], 0, { notes: "Envio oficial gratuito; Festhome cobra sua taxa de plataforma." })], platform: "https://bonitocinesur.com.br/2026/sobre-acerca/regulamento-reglamento/" };
apply({
  id: "festival-bonito", editionLabel: "4ª edição / 2026",
  references: [{ url: "https://bonitocinesur.com.br/2026/sobre-acerca/regulamento-reglamento/", title: "Regulamento bilíngue do 4º Bonito CineSur", note: "Regulamento oficial integralmente lido." }, { url: "https://filmmakers.festhome.com/pt/festival/bonito-cinesur-festival-de-cinema-sul-americano-de-bonito", title: "Bonito CineSur 2026 — inscrição alternativa", type: "plataforma de inscrição", fields: ["fees", "submissionPlatform"] }],
  locations: [{ city: "Bonito", subdivisionCode: "MS", subdivisionName: "Mato Grosso do Sul", municipalityCode: "5002209" }],
  activity: "ativo", frequency: "anual", organizer: "Associação Amigos do Cinema e da Cultura",
  description: "Festival sul-americano competitivo que articula cinema, meio ambiente e turismo em Bonito.", languages, workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"],
  seasonality: { opening: { months: [2], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 6 de fevereiro." }, event: { months: [7, 8], evidenceYears: [2026], confidence: "baixa", note: "Realização de 24 de julho a 1º de agosto." } },
  edition: { year: 2026, number: "4", start: "2026-07-24", end: "2026-08-01", opening: "2026-02-06", closing: "2026-04-06", resultDate: "2026-06-05", status: "realizada", rulesUrl: "https://bonitocinesur.com.br/2026/sobre-acerca/regulamento-reglamento/", confidence: "confirmado", notes: "Inscrição pelo formulário oficial é gratuita; o caminho alternativo Festhome exige apenas a taxa da plataforma." },
  calls: [
    { ...bonitoBase, slug: "curta", name: "Curta-metragem Sul-Americano", formats: ["curta"], maxMinutes: 20, creditsIncluded: true },
    { ...bonitoBase, slug: "longa", name: "Longa-metragem Sul-Americano", formats: ["longa"], minMinutes: 70, minInclusive: false },
    { ...bonitoBase, slug: "ms", name: "Filme Sul-Mato-Grossense", formats: ["curta", "média", "longa"], countries: ["Brasil"], regions: ["MS"], territoriesConfirmed: true, restrictions: "Produtor estabelecido em Mato Grosso do Sul." },
    { ...bonitoBase, slug: "ambiental-curta", name: "Curta Ambiental Sul-Americano", formats: ["curta"], maxMinutes: 20, creditsIncluded: true, themes: ["socioambiental"] },
    { ...bonitoBase, slug: "ambiental-longa", name: "Longa Ambiental Sul-Americano", formats: ["longa"], minMinutes: 70, minInclusive: false, themes: ["socioambiental"] },
    { ...bonitoBase, slug: "infantojuvenil", name: "Mostra Infantojuvenil Sul-Americana", formats: ["curta", "longa"], audiences: ["infantil", "juvenil"], selectionType: "não competitiva" },
  ],
  coverage: cov({ localização: "Bonito/MS.", atividade: "4ª edição realizada em 2026.", categorias: "Cinco competitivas e uma paralela infantojuvenil separadas.", duração: "Curta até 20; média >20 e <=70; longa >70 minutos.", "elegibilidade territorial": "América do Sul; mostra estadual exige produtor em MS.", "produção/conclusão": "2025 ou 2026.", estreia: "Inédito no mercado comercial brasileiro.", "exibição online": "Histórico online não é vedado; restrição é lançamento comercial no Brasil.", "pessoa autorizada a inscrever": "Representante legal do filme.", taxas: "Formulário oficial gratuito; Festhome cobra taxa da plataforma.", abertura: "6 de fevereiro de 2026.", encerramento: "6 de abril de 2026.", realização: "24 de julho a 1º de agosto de 2026.", relevância: "Festival sul-americano, premiação e atividades formativas documentadas." }),
  relevance: rel([12, 16, 12, 18, 14], [67, 78], "especializado", "O alcance sul-americano, a premiação e o foco socioambiental sustentam relevância alta.", ["Quatro edições.", "Cinco competições, mais de dez países e nove dias.", "CineSur Educa; sem mercado formal documentado.", "Articulação de cinema, ambiente e turismo.", "Regulamento bilíngue atual integral e transparente."], "alta"),
});

apply({
  id: "festival-cimm", editionLabel: "8ª edição / 2026",
  references: [{ url: "https://filmfreeway.com/FestCiMM", title: "FestCiMM — regras na FilmFreeway", type: "plataforma de inscrição", note: "Página integral lida; regras genéricas não publicam cronograma da 8ª edição nem tabela de taxas." }, { url: "https://www.culturaamazonica.com.br/2026/06/10/festival-internacional-festcimm-abre-convocatoria-de-2026-para-curtas-e-longas-metragens/", title: "Convocatória da 8ª edição", type: "fonte secundária", fields: ["activity", "opening", "closing", "fees", "resultDate", "relevance"], note: "Usada para o calendário atual e gratuidade; não substitui regulamento oficial ausente." }],
  locations: [{ city: "João Pessoa", subdivisionCode: "PB", subdivisionName: "Paraíba", municipalityCode: "2507507" }],
  activity: "ativo", frequency: "anual", organizer: "Instituto CIMM",
  description: "Festival internacional de cinema independente ligado às ações do Cinema no Meio do Mundo.", languages, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [6], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 5 de junho." }, event: { months: [], evidenceYears: [2026], confidence: "desconhecida", note: "Datas de exibição não localizadas." } },
  edition: { year: 2026, number: "8", start: "", end: "", opening: "2026-06-05", closing: "2026-07-05", resultDate: "2026-09-30", status: "planejada", rulesUrl: "https://filmfreeway.com/FestCiMM", confidence: "parcial", notes: "A página da plataforma mantém regras amplas e não expõe edição, datas ou taxas; o calendário veio de divulgação externa da convocatória." },
  calls: [{ name: "Seleção internacional de curtas e longas", formats: ["curta", "média", "longa", "experimental", "outro"], genres: languages, languages, minYear: 2023, premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "As regras dizem que exibição pública anterior não é necessária nem impeditiva.", opening: "2026-06-05", deadlines: [dl("final", "2026-07-05", "prazo divulgado", 1)], fees: [fee(0, "BRL", "final", ["convocatória 2026"], 1)], platform: "https://filmfreeway.com/FestCiMM", confidence: "parcial", restrictions: "Página sugere duração abaixo de 20 minutos, mas admite exceções; nenhum limite foi automatizado." }],
  coverage: cov({ localização: "Sede institucional em João Pessoa/PB; cidades de exibição 2026 não publicadas.", atividade: "8ª edição com convocatória 2026.", categorias: "Curtas e longas; gêneros e formatos diversos.", "produção/conclusão": "Não aceita filmes anteriores a 2023.", estreia: "Sem exigência localizada.", "exibição online": "Exibição pública anterior não é requisito nem impedimento.", taxas: "Divulgação da chamada informa gratuidade.", abertura: "5 de junho de 2026.", encerramento: "5 de julho de 2026.", relevância: "Oito edições e atuação em formação/pesquisa documentadas." }, { duração: "Abaixo de 20 minutos é preferência, não limite; exceções são possíveis.", "elegibilidade territorial": "Internacional, sem lista territorial detalhada.", "pessoa autorizada a inscrever": "Não localizada.", realização: "Datas e cidades de exibição 2026 não localizadas." }),
  relevance: rel([11, 9, 10, 13, 7], [41, 61], "especializado", "A continuidade e a experimentação indicam relevância intermediária, limitada por baixa transparência operacional.", ["Oito edições divulgadas.", "Convocatória internacional.", "Pesquisa, cursos e oficinas do Instituto CIMM.", "Recorte independente e experimental.", "Regras atuais genéricas e calendário em fonte secundária."], "baixa"),
});

apply({
  id: "festival-diamantina", editionLabel: "2ª edição / 2025",
  references: [previousReference("https://cinediamante.com.br/convocatoria", "Convocatória do II Festival de Cinema de Diamantina", "2ª edição / 2025", "Convocatória integralmente lida; o site não publicou chamada de 2026."), previousReference("https://www.diamantina.mg.gov.br/portal/noticias/0/3/5529/ii-festival-de-cinema-teminscricoesabertaspara-curtas-medias-e-longas", "Prefeitura de Diamantina — inscrições da 2ª edição", "2ª edição / 2025")],
  locations: [{ city: "Diamantina", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3121605" }],
  activity: "atividade não confirmada", frequency: "não confirmada", organizer: "Almôndega Filmes",
  description: "Festival de cinema brasileiro em parceria com a UFVJM e o Festival de História.", languages, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [3], evidenceYears: [2025], confidence: "média", note: "Última abertura em 19 de março." }, event: { months: [9], evidenceYears: [2025], confidence: "média", note: "2ª edição de 17 a 20 de setembro." } },
  edition: { year: 2025, number: "2", start: "2025-09-17", end: "2025-09-20", opening: "2025-03-19", closing: "2025-04-16", resultDate: "", status: "realizada", rulesUrl: "https://cinediamante.com.br/convocatoria", confidence: "edição anterior", notes: "Projeto de uma 3ª edição aparece em captação pública, mas não equivale a chamada ou realização confirmada em 2026." },
  calls: [
    { ...commonCurrent, slug: "curtas", name: "Curtas nacionais", maxMinutes: 25, minYear: 2023, countries: ["Brasil"], territoriesConfirmed: true, opening: "2025-03-19", deadlines: [dl("final", "2025-04-16", "23h59")], fees: [fee(0, "BRL", "final", ["todas as categorias"])], platform: "https://cinediamante.com.br/convocatoria", confidence: "edição anterior" },
    { ...commonCurrent, slug: "medias", name: "Médias nacionais", formats: ["média"], minMinutes: 25, minInclusive: false, maxMinutes: 60, minYear: 2023, countries: ["Brasil"], territoriesConfirmed: true, opening: "2025-03-19", deadlines: [dl("final", "2025-04-16", "23h59")], fees: [fee(0, "BRL", "final", ["todas as categorias"])], platform: "https://cinediamante.com.br/convocatoria", confidence: "edição anterior" },
    { ...commonCurrent, slug: "longas", name: "Longas nacionais", formats: ["longa"], minMinutes: 60, minInclusive: false, minYear: 2023, countries: ["Brasil"], territoriesConfirmed: true, opening: "2025-03-19", deadlines: [dl("final", "2025-04-16", "23h59")], fees: [fee(0, "BRL", "final", ["todas as categorias"])], platform: "https://cinediamante.com.br/convocatoria", confidence: "edição anterior" },
  ],
  coverage: cov({}, { atividade: "Chamada ou realização de 2026 não localizada." }, {}, { localização: "Diamantina/MG.", categorias: "Curtas, médias e longas nacionais.", duração: "Curta <=25; média >25 e <=60; longa >60.", "elegibilidade territorial": "Diretoras e diretores de todo o Brasil.", "produção/conclusão": "A partir de março de 2023.", estreia: "Sem exigência localizada.", "pessoa autorizada a inscrever": "Proponente com poderes e direitos sobre a obra.", taxas: "Inscrição gratuita.", abertura: "19 de março de 2025.", encerramento: "16 de abril de 2025, 23h59.", realização: "17 a 20 de setembro de 2025.", relevância: "Duas edições, parceria universitária e formação de público." }),
  relevance: rel([7, 10, 10, 14, 8], [40, 59], "regional/local", "A parceria universitária e o recorte territorial indicam relevância intermediária, sem confirmação de nova edição.", ["Duas edições.", "Sete longas e 46 curtas exibidos.", "Parceria UFVJM/fHist; sem mercado formal.", "Valorização do Jequitinhonha e Norte de Minas.", "Convocatória integral de 2025; 2026 não confirmado."], "baixa"),
});

apply({
  id: "festival-sinedoque", editionLabel: "6ª edição / 2026",
  references: [{ url: "https://www.sinedoque.com.br/regulamento", title: "Regulamento da Sinédoque 2026", note: "Regulamento integralmente lido; não publica datas da chamada." }, { url: "https://www.sinedoque.com.br/", title: "Página oficial Sinédoque 2026", fields: ["activity", "eventDates", "locations", "programmingReach", "relevance"], note: "O topo informa 4–8/11, enquanto blocos de agenda ainda exibem datas da edição anterior em setembro." }],
  locations: [{ city: "Rio de Janeiro", subdivisionCode: "RJ", subdivisionName: "Rio de Janeiro", municipalityCode: "3304557" }],
  activity: "ativo", frequency: "anual", organizer: "Sinédoque",
  description: "Festival nacional competitivo dedicado exclusivamente a documentários brasileiros de curta-metragem.", languages: ["documentário"], workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [], evidenceYears: [2026], confidence: "desconhecida", note: "Período não publicado no regulamento." }, event: { months: [11], evidenceYears: [2026], confidence: "desconhecida", note: "Topo atual informa 4–8/11; agenda residual exibe setembro." } },
  edition: { year: 2026, number: "6", start: "2026-11-04", end: "2026-11-08", opening: "", closing: "", resultDate: "", status: "planejada", rulesUrl: "https://www.sinedoque.com.br/regulamento", confidence: "parcial", notes: "Regulamento atual completo, mas sem janela de inscrições. Datas de realização têm conteúdo residual conflitante na página inicial." },
  calls: [{ name: "Documentários curtos brasileiros", formats: ["curta"], genres: ["documentário"], languages: ["documentário"], maxMinutes: 30, minYear: 2025, maxYear: 2026, countries: ["Brasil"], territoriesConfirmed: true, premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Os cinco vencedores ficam dez dias no site; histórico anterior não é vedado.", fees: [fee(0, "BRL", "final", ["chamada única"])], platform: "https://www.sinedoque.com.br/", restrictions: "Não aceita ficção, making of, videoclipe ou série; limite de 200 inscrições válidas.", confidence: "parcial" }],
  coverage: cov({ localização: "Rio de Janeiro/RJ.", atividade: "6ª edição e regulamento 2026 publicados.", categorias: "Chamada única de documentário brasileiro.", duração: "Até 30 minutos.", "elegibilidade territorial": "Obra brasileira.", "produção/conclusão": "2025 ou 2026.", estreia: "Sem exigência localizada.", "exibição online": "Vencedores ficam dez dias online; histórico anterior não é vedado.", "pessoa autorizada a inscrever": "Responsável pelo filme e pelos direitos; PF/PJ não diferenciada.", taxas: "Inscrição gratuita.", relevância: "Seis edições, 23 filmes das cinco regiões e debates documentados." }, { abertura: "Não publicada.", encerramento: "Não publicado." }, { realização: "Topo atual: 4–8/11; agenda residual: 24–28/9." }),
  relevance: rel([12, 13, 10, 17, 9], [54, 71], "especializado", "A especialização documental e a abrangência nacional sustentam relevância alta, limitada por conflitos de calendário.", ["Seis edições.", "23 filmes das cinco regiões em 2026.", "Masterclasses e debates; sem mercado formal.", "Foco exclusivo em documentário curto brasileiro.", "Regulamento atual completo, sem datas da chamada."], "média"),
});

apply({
  id: "festival-contagem", editionLabel: "1ª edição / 2025",
  references: [previousReference("https://portal.contagem.mg.gov.br/portal/noticias/0/3/81476/mais-cultura-inscricoes-abertas-para-o-1-festival-de-cinema-de-contagem-vao-ate-23-de-maio", "Prefeitura de Contagem — chamada do 1º Festival", "1ª edição / 2025", "Comunicado oficial integralmente lido; nenhuma 2ª edição foi localizada em 2026.")],
  locations: [{ city: "Contagem", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3118601" }],
  activity: "atividade não confirmada", frequency: "não confirmada", organizer: "AAPCINE",
  description: "Festival de curtas brasileiros com ênfase em produções periféricas, independentes e autorais.", languages, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [4], evidenceYears: [2025], confidence: "média", note: "Chamada já aberta em 24 de abril." }, event: { months: [], evidenceYears: [2025], confidence: "desconhecida", note: "Datas exatas não publicadas no comunicado." } },
  edition: { year: 2025, number: "1", start: "", end: "", opening: "2025-04-24", closing: "2025-05-23", resultDate: "", status: "realizada", rulesUrl: "https://portal.contagem.mg.gov.br/portal/noticias/0/3/81476/mais-cultura-inscricoes-abertas-para-o-1-festival-de-cinema-de-contagem-vao-ate-23-de-maio", confidence: "edição anterior", notes: "A data de publicação é o primeiro dia comprovado da janela, não uma abertura declarada." },
  calls: [
    { ...commonCurrent, slug: "contagem", name: "Contagem é Cinema", maxMinutes: 25, countries: ["Brasil"], regions: ["MG"], territoriesConfirmed: false, restrictions: "Produções locais ou com apoio municipal; exclui publicidade, institucional e obra exclusivamente infantil.", opening: "2025-04-24", deadlines: [dl("final", "2025-05-23", "23h59")], fees: [fee(0, "BRL", "final", ["todas as mostras"])], platform: "https://www.festivaldecinemadecontagem.com.br/", confidence: "edição anterior" },
    { ...commonCurrent, slug: "brasil", name: "Brasil em Foco", maxMinutes: 25, countries: ["Brasil"], territoriesConfirmed: true, restrictions: "Exclui publicidade, institucional e obra exclusivamente infantil.", opening: "2025-04-24", deadlines: [dl("final", "2025-05-23", "23h59")], fees: [fee(0, "BRL", "final", ["todas as mostras"])], platform: "https://www.festivaldecinemadecontagem.com.br/", confidence: "edição anterior" },
  ],
  coverage: cov({}, { atividade: "2ª edição ou chamada de 2026 não localizada." }, {}, { localização: "Contagem/MG, CEU das Artes Ressaca.", categorias: "Contagem é Cinema e Brasil em Foco.", duração: "Até 25 minutos.", "elegibilidade territorial": "Local/apoio municipal e Brasil separados.", estreia: "Sem exigência localizada.", "pessoa autorizada a inscrever": "Cada realizador pode inscrever até dois curtas.", taxas: "Participação gratuita.", encerramento: "23 de maio de 2025, 23h59.", relevância: "Primeira edição com foco periférico e comunitário." }),
  relevance: rel([4, 7, 6, 13, 7], [28, 48], "regional/local", "O foco comunitário é relevante localmente, mas uma única edição e ausência de continuidade mantêm o alcance documentado menor.", ["Uma edição.", "Exibições presenciais comunitárias.", "Sem oportunidades profissionais formais localizadas.", "Ênfase em periferias e cinema independente.", "Comunicado oficial de 2025; continuidade não confirmada."], "baixa"),
});

apply({
  id: "festival-finos", editionLabel: "13ª edição / 2026",
  references: [{ url: "https://filmmakers.festhome.com/pt/festival/festival-de-finos-filmes", title: "Festival de Finos Filmes 2026 — regras e inscrições", type: "plataforma de inscrição", note: "Página integralmente lida." }, { url: "https://www.finosfilmes.com.br/", title: "Site oficial Festival de Finos Filmes", fields: ["activity", "relevance"] }],
  locations: [{ city: "São Paulo", subdivisionCode: "SP", subdivisionName: "São Paulo", municipalityCode: "3550308" }],
  activity: "ativo", frequency: "anual", organizer: "Festival de Finos Filmes",
  description: "Mostra não competitiva de curtas de realizadores que ainda não estrearam em longas.", languages, workTypes: ["filme", "videoclipe"], audiences: ["infantil", "geral"],
  seasonality: { opening: { months: [4], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 16 de abril." }, event: { months: [11, 12], evidenceYears: [2026], confidence: "baixa", note: "Realização de 28 de novembro a 1º de dezembro." } },
  edition: { year: 2026, number: "13", start: "2026-11-28", end: "2026-12-01", opening: "2026-04-16", closing: "2026-05-29", resultDate: "2026-08-31", status: "planejada", rulesUrl: "https://filmmakers.festhome.com/pt/festival/festival-de-finos-filmes", confidence: "confirmado", notes: "Evento físico e online; não competitivo." },
  calls: [
    { ...commonCurrent, slug: "oficial", name: "Seleção Oficial", maxMinutes: 20, minYear: 2024, participationConditions: ["direção estreante"], restrictions: "Direção ainda não estreou em longa-metragem.", opening: "2026-04-16", deadlines: [dl("final", "2026-05-29", "prazo final")], fees: [fee(0, "BRL", "final", ["Seleção Oficial"])], platform: "https://filmmakers.festhome.com/pt/festival/festival-de-finos-filmes", selectionType: "não competitiva", online: "permitido", onlineConditions: "A edição acontece também online; histórico anterior não é vedado." },
    { ...commonCurrent, slug: "fininhos", name: "Fininhos", maxMinutes: 12, minYear: 2024, audiences: ["infantil"], participationConditions: ["direção estreante"], restrictions: "Direção ainda não estreou em longa-metragem; recorte infantil.", opening: "2026-04-16", deadlines: [dl("final", "2026-05-29", "prazo final")], fees: [fee(0, "BRL", "final", ["Fininhos"])], platform: "https://filmmakers.festhome.com/pt/festival/festival-de-finos-filmes", selectionType: "não competitiva", online: "permitido", onlineConditions: "A edição acontece também online; histórico anterior não é vedado." },
  ],
  coverage: cov({ localização: "São Paulo/SP, várias salas e online.", atividade: "13ª edição programada para 2026.", categorias: "Seleção Oficial e Fininhos.", duração: "Até 20 minutos; Fininhos até 12.", "elegibilidade territorial": "Festival nacional; país de produção requerido na plataforma.", "produção/conclusão": "A partir de janeiro de 2024.", estreia: "Sem exigência de estreia; direção não pode ter estreado em longa.", "exibição online": "Edição física e online; histórico anterior não vedado.", "pessoa autorizada a inscrever": "Realizador responsável; PF/PJ não diferenciada.", taxas: "Inscrição sem taxa.", abertura: "16 de abril de 2026.", encerramento: "29 de maio de 2026.", realização: "28 de novembro a 1º de dezembro de 2026.", relevância: "Treze edições, mais de 300 filmes e ampla rede institucional documentadas." }),
  relevance: rel([17, 15, 13, 18, 13], [71, 82], "especializado", "A continuidade, a curadoria de novos realizadores e a rede de instituições sustentam relevância alta.", ["Treze edições.", "Mais de 300 filmes e salas/online.", "Debates com profissionais; sem mercado formal.", "Janela especializada para nova geração.", "Página atual clara, com calendário e gratuidade."], "alta"),
});

apply({
  id: "festival-san", editionLabel: "5ª edição / 2026",
  references: [{ url: "https://revistacontinente.com.br/secoes/agenda/5a-semana-do-audiovisual-negro-anuncia-programacao", title: "5ª Semana do Audiovisual Negro — formação", type: "fonte secundária", note: "Reportagem integralmente lida; nenhuma chamada pública de filmes foi localizada." }, { url: "https://revistacontinente.com.br/secoes/agenda/semana-do-audiovisual-negro-exibe-mais-de-40-obras-de-curta-metragem", title: "5ª SAN — programação de filmes", type: "fonte secundária", fields: ["activity", "eventDates", "locations", "programmingReach", "relevance"] }],
  locations: [{ city: "Recife", subdivisionCode: "PE", subdivisionName: "Pernambuco", municipalityCode: "2611606" }],
  activity: "ativo", frequency: "anual", organizer: "Semana do Audiovisual Negro",
  description: "Semana de cinema, formação e mercado dedicada ao audiovisual negro e indígena no Recife.", languages, workTypes: ["filme", "videoclipe", "instalação"], audiences: ["geral"],
  seasonality: { opening: { months: [], evidenceYears: [2026], confidence: "desconhecida", note: "Chamada pública não localizada." }, event: { months: [4, 5], evidenceYears: [2026], confidence: "baixa", note: "Formação 22–24/4 e sessões 2–5/5." } },
  edition: { year: 2026, number: "5", start: "2026-04-22", end: "2026-05-05", opening: "", closing: "", resultDate: "", status: "realizada", rulesUrl: "https://revistacontinente.com.br/secoes/agenda/semana-do-audiovisual-negro-exibe-mais-de-40-obras-de-curta-metragem", confidence: "parcial", notes: "Atividade e programação confirmadas em imprensa cultural; nenhuma fonte de inscrição de filmes foi localizada." },
  calls: [{ name: "Programação de curtas por curadoria", formats: ["curta", "experimental", "outro"], genres: languages, languages, themes: ["cinema negro", "indígena"], submissionMode: "curadoria sem chamada", premiere: "não confirmado", confidence: "parcial", selectionType: "não competitiva" }],
  coverage: cov({ localização: "Recife/PE: Unicap, Cinema São Luiz e UFPE.", atividade: "5ª edição realizada em 2026.", categorias: "Curtas de ficção, documentário, animação, clipes, videoarte e realidade virtual.", realização: "Formação 22–24/4; exibições 2–5/5/2026.", relevância: "Cinco edições, 41 obras e atividades de formação/mercado documentadas." }, { duração: "Limites não localizados.", "elegibilidade territorial": "Não localizada.", "produção/conclusão": "Não localizada.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Chamada de filmes não localizada; gratuidade do público não implica inscrição gratuita.", abertura: "Não localizada.", encerramento: "Não localizado." }),
  relevance: rel([11, 14, 16, 19, 9], [61, 78], "especializado", "A especialização, a programação ampla e o eixo de mercado/formação sustentam relevância alta.", ["Cinco edições.", "41 obras em múltiplos espaços.", "Formação e mercado audiovisual negro/indígena.", "Importância especializada no Recife.", "Programação atual documentada; chamada não localizada."], "média"),
});

apply({
  id: "festival-cinegro", editionLabel: "edição 2025 / chamada não localizada",
  references: [previousReference("https://www.tvcamaracampinas.com.br/videos/conexao-cultural-cinegro-2025-festival-de-cinema-negro-ocupa-o-mis-kChpHPup6lQ", "TV Câmara Campinas — Cinegro 2025", "edição 2025", "Registro institucional da edição mais recente localizada; não foi encontrada convocatória pública." )],
  locations: [{ city: "Campinas", subdivisionCode: "SP", subdivisionName: "São Paulo", municipalityCode: "3509502" }],
  activity: "atividade não confirmada", frequency: "não confirmada", organizer: "Cinegro",
  description: "Festival de cinema negro realizado no MIS Campinas.", languages, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [], evidenceYears: [2025], confidence: "desconhecida", note: "Nenhuma chamada localizada." }, event: { months: [], evidenceYears: [2025], confidence: "desconhecida", note: "Registro audiovisual confirma a edição, sem calendário recuperado." } },
  edition: { year: 2025, number: "", start: "", end: "", opening: "", closing: "", resultDate: "", status: "realizada", rulesUrl: "https://www.tvcamaracampinas.com.br/videos/conexao-cultural-cinegro-2025-festival-de-cinema-negro-ocupa-o-mis-kChpHPup6lQ", confidence: "edição anterior", notes: "Nenhuma atividade de 2026 ou chamada pública foi localizada; não confundir com a 21ª Mostra Internacional do Cinema Negro." },
  calls: [{ name: "Programação por curadoria — chamada não localizada", formats: [], genres: [], languages: [], genresConfirmed: false, themes: ["cinema negro"], submissionMode: "curadoria sem chamada", selectionType: "não competitiva", premiere: "não confirmado", confidence: "edição anterior" }],
  coverage: cov({}, { atividade: "Atividade em 2026 não confirmada." }, {}, { localização: "Campinas/SP, MIS.", atividade: "Edição realizada em 2025.", categorias: "Cinema negro; categorias de chamada não localizadas.", relevância: "Registro institucional confirma ocupação cultural no MIS." }),
  relevance: rel([5, 6, 5, 13, 4], [22, 45], "especializado", "O recorte é especializado, mas a documentação disponível é insuficiente para estimar alcance além do impacto local.", ["Número de edições não confirmado.", "Realização no MIS Campinas.", "Oportunidades profissionais não documentadas.", "Foco em cinema negro.", "Somente registro institucional de 2025."], "baixa"),
});

apply({
  id: "festival-missoes", editionLabel: "edição 2026 / regras residuais de 2025",
  references: [{ url: "https://filmfreeway.com/cinemissoes", title: "Mostra de Cinema das Missões — página 2026", type: "plataforma de inscrição", note: "Metadados, cartões de taxa e descrição são atuais; o corpo do regulamento ainda está datado de 2025." }],
  locations: [{ city: "São Miguel das Missões", subdivisionCode: "RS", subdivisionName: "Rio Grande do Sul", municipalityCode: "4319158" }],
  activity: "ativo", frequency: "anual", organizer: "Mostra de Cinema das Missões",
  description: "Mostra não competitiva ao ar livre no sítio arqueológico de São Miguel das Missões.", languages, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [4], evidenceYears: [2026], confidence: "baixa", note: "Metadado da plataforma: 1º de abril." }, event: { months: [10, 11], evidenceYears: [2026], confidence: "baixa", note: "29 de outubro a 1º de novembro." } },
  edition: { year: 2026, number: "", start: "2026-10-29", end: "2026-11-01", opening: "2026-04-01", closing: "2026-08-30", resultDate: "2026-09-30", status: "planejada", rulesUrl: "https://filmfreeway.com/cinemissoes", confidence: "parcial", notes: "Datas e taxas usam cartões operacionais de 2026. Critérios editoriais permanecem no texto de 2025 e não foram marcados como regras atuais confirmadas." },
  calls: [{ name: "Submissão simbólica", formats: ["curta"], genres: languages, languages, minMinutes: 3, maxMinutes: 30, minYear: 2017, premiere: "não confirmado", online: "não confirmado", opening: "2026-04-01", deadlines: [dl("regular", "2026-07-30", "prazo regular"), dl("late", "2026-08-30", "prazo tardio")], fees: [fee(5, "USD", "regular", ["tarifa padrão"], 0, { discount: "estudante: US$2" }), fee(5, "USD", "late", ["tarifa padrão"], 0, { discount: "estudante: US$2" })], platform: "https://filmfreeway.com/cinemissoes", confidence: "parcial", selectionType: "não competitiva", notes: "Duração, ano e temas provêm do texto residual de 2025; consultar nova versão antes de usar como compatibilidade confirmada." }],
  coverage: cov({ localização: "São Miguel das Missões/RS, sítio arqueológico.", atividade: "Página operacional anuncia edição 2026.", taxas: "US$5; estudante US$2 nos lotes regular e tardio.", abertura: "1º de abril de 2026.", encerramento: "30 de agosto de 2026; regular até 30/7.", realização: "29 de outubro a 1º de novembro de 2026.", relevância: "Exibição no patrimônio histórico, alcance internacional e 1.000 inscrições estimadas documentados." }, {}, { categorias: "Descrição 2026; regras detalhadas ainda dizem 2025.", duração: "Texto residual: 3–30 minutos; não confirmado para 2026.", "elegibilidade territorial": "Internacional na plataforma, sem regra 2026 consolidada.", "produção/conclusão": "Texto residual: menos de dez anos.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Texto residual atribui direitos ao responsável; natureza PF/PJ não especificada." }),
  relevance: rel([7, 12, 8, 17, 6], [41, 61], "especializado", "O local patrimonial e o foco territorial indicam relevância intermediária, limitada por regras residuais.", ["Continuidade ao menos 2025–2026.", "Exibição internacional em sítio arqueológico.", "Sem mercado formal documentado.", "Cinema, memória e natureza nas Missões.", "Metadados atuais e regulamento textual desatualizado."], "baixa"),
});

apply({
  id: "festival-maff", editionLabel: "1ª edição / 2026",
  references: [{ url: "https://www.macae.rj.gov.br/noticias/leitura/noticia/macae-film-festival-alcanca-250-producoes-no-primeiro-dia-de-inscricao", title: "Prefeitura de Macaé — chamada do 1º MAFF", note: "Comunicado oficial integralmente lido; o link externo do regulamento não foi recuperado." }, { url: "https://economianegocios.com.br/2026/09/05/primeiro-macae-film-festival-fortalece-economia-criativa-e-ja-atrai-producoes-de-seis-paises/", title: "MAFF — formatos e ano mínimo", type: "fonte secundária", fields: ["formats", "productionYear", "relevance"], note: "Usada apenas nos campos explicitados; não substitui regulamento." }],
  locations: [{ city: "Macaé", subdivisionCode: "RJ", subdivisionName: "Rio de Janeiro", municipalityCode: "3302403" }],
  activity: "ativo", frequency: "não confirmada", organizer: "No Hype e Imbetiba Filmes",
  description: "Festival internacional de cinema de Macaé com mostras competitivas e Semana da Indústria Audiovisual.", languages, workTypes: ["filme", "videoclipe"], audiences: ["geral"],
  seasonality: { opening: { months: [9], evidenceYears: [2026], confidence: "desconhecida", note: "Fonte comprova chamada aberta em 3/9, não a data de abertura." }, event: { months: [11], evidenceYears: [2026], confidence: "baixa", note: "Realização de 9 a 15 de novembro." } },
  edition: { year: 2026, number: "1", start: "2026-11-09", end: "2026-11-15", opening: "", closing: "2026-09-21", resultDate: "", status: "planejada", rulesUrl: "https://www.macae.rj.gov.br/noticias/leitura/noticia/macae-film-festival-alcanca-250-producoes-no-primeiro-dia-de-inscricao", confidence: "parcial", notes: "O regulamento integral estava em link externo não recuperado; campos ausentes não foram inferidos." },
  calls: [
    { name: "Mostra Brasileira", formats: ["curta", "média", "longa", "outro"], workTypes: ["filme", "videoclipe"], genres: languages, languages, minYear: 2024, countries: ["Brasil"], territoriesConfirmed: true, deadlines: [dl("final", "2026-09-21", "prazo final")], fees: [], premiere: "não confirmado", confidence: "parcial" },
    { slug: "internacional", name: "Mostra Internacional", formats: ["curta", "média", "longa", "outro"], workTypes: ["filme", "videoclipe"], genres: languages, languages, minYear: 2024, deadlines: [dl("final", "2026-09-21", "prazo final")], fees: [], premiere: "não confirmado", confidence: "parcial" },
    { slug: "macaba-doce", name: "Mostra Macaba Doce", formats: ["curta", "média", "longa", "outro"], workTypes: ["filme", "videoclipe"], genres: languages, languages, minYear: 2024, countries: ["Brasil"], regions: ["RJ"], territoriesConfirmed: false, restrictions: "Voltada a realizadores de Macaé e região; critério exato não recuperado.", deadlines: [dl("final", "2026-09-21", "prazo final")], fees: [], premiere: "não confirmado", confidence: "parcial" },
  ],
  coverage: cov({ localização: "Macaé/RJ.", atividade: "1ª edição com chamada 2026.", categorias: "Mostra Brasileira, Internacional, sessões especiais e Macaba Doce.", "elegibilidade territorial": "Brasil, internacional e recorte Macaé/região separados, com detalhe local pendente.", "produção/conclusão": "Finalizados a partir de 2024.", encerramento: "21 de setembro de 2026.", realização: "9 a 15 de novembro de 2026.", relevância: "250 inscrições no primeiro dia, seis países e Semana da Indústria documentados." }, { duração: "Limites por formato não recuperados.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Não localizadas; programação pública gratuita não foi tratada como inscrição gratuita.", abertura: "Data exata não localizada." }),
  relevance: rel([4, 13, 17, 13, 8], [48, 66], "regional/local", "A forte adesão inicial e o eixo de indústria sustentam relevância intermediária/alta, ainda sem histórico de continuidade.", ["Primeira edição.", "250 inscrições em um dia e seis países.", "Semana da Indústria com workshops e networking.", "Impacto emergente na economia criativa de Macaé.", "Comunicado oficial atual; regulamento integral não recuperado."], "média"),
});

apply({
  id: "festival-nicho", editionLabel: "8ª edição / 2026",
  references: [{ url: "https://nicho54.com.br/", title: "Site oficial NICHO54", note: "A página atual direciona ao festival, mas o regulamento completo não ficou indexado." }, { url: "https://telaviva.com.br/10/09/2026/8o-festival-nicho-abre-inscricoes-para-filmes-de-autoria-negra/", title: "8º Festival Nicho — chamada detalhada", type: "fonte secundária", fields: ["activity", "categories", "duration", "territory", "productionYear", "premiere", "online", "eligibleEntrants", "fees", "closing", "eventDates", "relevance"], note: "Reportagem especializada integralmente lida; usada somente nos campos detalhados." }],
  locations: [{ city: "São Paulo", subdivisionCode: "SP", subdivisionName: "São Paulo", municipalityCode: "3550308" }],
  activity: "ativo", frequency: "anual", organizer: "Instituto NICHO 54",
  description: "Festival dedicado ao cinema contemporâneo de autoria negra, com mostras, formação e mercado.", languages, workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"],
  seasonality: { opening: { months: [9], evidenceYears: [2026], confidence: "desconhecida", note: "Chamada comprovadamente aberta em 10/9; abertura exata não publicada." }, event: { months: [11], evidenceYears: [2026], confidence: "baixa", note: "Realização de 20 a 28 de novembro." } },
  edition: { year: 2026, number: "8", start: "2026-11-20", end: "2026-11-28", opening: "", closing: "2026-09-27", resultDate: "2026-10-25", status: "planejada", rulesUrl: "https://nicho54.com.br/", confidence: "parcial", notes: "A chamada atual foi detalhada por imprensa setorial; regulamento oficial integral não recuperado." },
  calls: [
    { name: "Coisa de Preto", formats: ["longa"], genres: languages, languages, themes: ["cinema negro"], minMinutes: 60, minInclusive: false, minYear: 2024, countries: ["Brasil"], territoriesConfirmed: false, premiere: "nacional", premiereRequirement: "obrigatória", premiereTerritory: "mercado comercial brasileiro", premiereConditions: "Deve permanecer inédita no circuito comercial de salas; festivais e online são permitidos, TV aberta/streaming no Brasil não.", online: "restrito", onlineConditions: "Disponibilização online anterior é aceita, exceto plataformas de streaming no Brasil.", pf: "sim", pj: "sim", deadlines: [dl("final", "2026-09-27", "prazo final", 1)], fees: [fee(0, "BRL", "final", ["Coisa de Preto"], 1)], restrictions: "Autoria negra definida prioritariamente pela direção; Brasil ou coprodução majoritariamente brasileira, com exceções curatoriais da diáspora.", platform: "https://nicho54.com.br/", confidence: "parcial" },
    { slug: "os-cria", name: "Os Cria", formats: ["curta"], genres: languages, languages, themes: ["cinema negro"], maxMinutes: 30, minYear: 2024, countries: ["Brasil"], territoriesConfirmed: false, premiere: "nacional", premiereRequirement: "obrigatória", premiereTerritory: "mercado comercial brasileiro", premiereConditions: "Inédito em salas comerciais; festivais e online permitidos, TV aberta/streaming no Brasil não.", online: "restrito", onlineConditions: "Disponibilização online anterior é aceita, exceto plataformas de streaming no Brasil.", pf: "sim", pj: "sim", deadlines: [dl("final", "2026-09-27", "prazo final", 1)], fees: [fee(0, "BRL", "final", ["Os Cria"], 1)], restrictions: "Autoria negra definida prioritariamente pela direção; Brasil/coprodução majoritária, com exceções da diáspora.", platform: "https://nicho54.com.br/", confidence: "parcial" },
    { slug: "eres", name: "Erês do Mundo", formats: ["curta"], genres: languages, languages, themes: ["cinema negro"], audiences: ["infantil", "juvenil"], maxMinutes: 30, minYear: 2024, premiere: "nacional", premiereRequirement: "obrigatória", premiereTerritory: "mercado comercial brasileiro", premiereConditions: "Inédito em salas comerciais; festivais e online permitidos, TV aberta/streaming no Brasil não.", online: "restrito", onlineConditions: "Disponibilização online anterior é aceita, exceto plataformas de streaming no Brasil.", pf: "sim", pj: "sim", deadlines: [dl("final", "2026-09-27", "prazo final", 1)], fees: [fee(0, "BRL", "final", ["Erês do Mundo"], 1)], restrictions: "Curtas infantojuvenis de autoria negra; permite seleção de outros territórios da diáspora.", platform: "https://nicho54.com.br/", confidence: "parcial" },
  ],
  coverage: cov({ localização: "São Paulo/SP: CCSP, Museu das Favelas e Cinemateca Brasileira.", atividade: "8ª edição com chamada 2026.", categorias: "Coisa de Preto, Os Cria e Erês do Mundo.", duração: "Longas >60; curtas até 30 minutos.", "elegibilidade territorial": "Prioridade Brasil/coprodução majoritária; diáspora pode ser convidada/selecionada.", "produção/conclusão": "A partir de 2024.", estreia: "Inédito no circuito comercial de salas no Brasil.", "exibição online": "Festivais e online aceitos; veda TV aberta e streaming no Brasil.", "pessoa autorizada a inscrever": "Realizadores, produtoras e representantes legais; até duas obras em mostras distintas.", taxas: "Inscrição gratuita.", encerramento: "27 de setembro de 2026.", realização: "20 a 28 de novembro de 2026.", relevância: "Oito edições, política curatorial, formação, mercado e internacionalização documentados." }, { abertura: "Data exata não localizada." }),
  relevance: rel([18, 15, 18, 20, 10], [74, 87], "especializado", "A política curatorial, a especialização e os eixos de mercado/internacionalização sustentam relevância muito alta.", ["Oito edições.", "Três mostras em instituições culturais centrais.", "LAB NICHO 54 e intercâmbio com Marché du Film.", "Importância para cinema negro brasileiro e diáspora.", "Chamada atual detalhada; regulamento oficial integral não recuperado."], "alta"),
});

db.settings.catalogVersion = "2026-10-04.6";
fs.writeFileSync(catalogPath, `${JSON.stringify(db, null, 2)}\n`);
console.log(`BR-04 aplicado: 20 festivais; catálogo ${db.settings.catalogVersion}; ${db.calls.length} chamadas.`);
