import fs from "node:fs";

const catalogPath = new URL("../src/data/catalog.json", import.meta.url);
const db = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const checkedAt = "2026-10-04";
const languageGenres = ["documentário", "ficção", "animação", "experimental", "híbrido"];
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
  amount,
  currency,
  free: amount === null ? "não confirmado" : amount === 0 ? "sim" : "não",
  deadlineKind,
  discount: options.discount || "",
  waiver: options.waiver || "",
  notes: options.notes || "",
  appliesTo,
  platformAmount: options.platformAmount ?? null,
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
    status: "provisória",
    score,
    uncertaintyMin: config.range[0],
    uncertaintyMax: config.range[1],
    band: score >= 80 ? "muito alta" : score >= 60 ? "alta" : score >= 40 ? "intermediária" : "menor alcance documentado",
    impact: config.impact,
    confidence: config.confidence,
    assessedAt: checkedAt,
    rationale: `${config.rationale} Avaliação editorial provisória; não é ranking oficial nem previsão de seleção.`,
    dimensions,
  };
};

const makeCall = (oldCall, edition, config, index, sources) => ({
  ...oldCall,
  id: index === 0 ? oldCall.id : `${edition.id}-call-${config.slug || index + 1}`,
  editionId: edition.id,
  name: config.name,
  formats: config.formats || [],
  genres: config.genres || [],
  workTypes: config.workTypes || ["filme"],
  languages: config.languages || [],
  approaches: config.approaches || [],
  contentGenres: config.contentGenres || [],
  themes: config.themes || [],
  audiences: config.audiences || ["geral"],
  participationConditions: config.participationConditions || [],
  submissionMode: config.submissionMode || "aberta",
  selectionType: config.selectionType || "competitiva",
  genresConfirmed: config.genresConfirmed ?? true,
  minMinutes: config.minMinutes ?? null,
  maxMinutes: config.maxMinutes ?? null,
  minSeconds: config.minSeconds ?? null,
  maxSeconds: config.maxSeconds ?? null,
  minInclusive: config.minInclusive ?? true,
  maxInclusive: config.maxInclusive ?? true,
  creditsIncluded: config.creditsIncluded ?? null,
  minYear: config.minYear ?? null,
  maxYear: config.maxYear ?? null,
  pf: config.pf || "não confirmado",
  pj: config.pj || "não confirmado",
  premiere: config.premiere || "não confirmado",
  premiereRequirement: config.premiereRequirement || "desconhecida",
  premiereTerritory: config.premiereTerritory || "",
  premiereConditions: config.premiereConditions || "",
  online: config.online || "não confirmado",
  onlineConditions: config.onlineConditions || "",
  countries: config.countries || [],
  regions: config.regions || [],
  territoriesConfirmed: config.territoriesConfirmed ?? false,
  restrictions: config.restrictions || "",
  resubmission: config.resubmission || "não confirmado",
  platform: config.platform || "",
  opening: config.opening || "",
  deadlines: (config.deadlines || []).map(({ _source = 0, ...item }) => ({ ...item, sourceId: sources[_source].id })),
  fees: (config.fees || []).map(({ _source = 0, ...item }) => ({ ...item, sourceId: sources[_source].id })),
  rulesUrl: config.rulesUrl || sources[0]?.url || "",
  checkedAt,
  confidence: config.confidence || "confirmado",
  notes: config.notes || "",
  sources,
});

const apply = (config) => {
  const festival = db.festivals.find((item) => item.id === config.id);
  const edition = db.editions.find((item) => item.festivalId === config.id);
  const oldCall = db.calls.find((item) => item.editionId === edition?.id);
  if (!festival || !edition || !oldCall) throw new Error(`Registro ausente para ${config.id}`);

  const sources = config.references.map((reference, index) => ({
    id: `${config.id}-source-${index + 1}`,
    url: reference.url,
    title: reference.title,
    type: reference.type || "oficial",
    checkedAt,
    accessedAt: checkedAt,
    confidence: reference.confidence || "confirmado",
    evidenceState: reference.evidenceState || "confirmado na edição atual",
    editionLabel: reference.editionLabel || config.editionLabel,
    section: reference.section || "Página ou regulamento consultado",
    note: reference.note || "",
    fields: reference.fields || coverageFields,
  }));
  const sourceIds = sources.map((item) => item.id);
  Object.assign(festival, {
    activity: config.activity,
    frequency: config.frequency || festival.frequency,
    organizer: config.organizer || festival.organizer,
    description: config.description || festival.description,
    languages: config.languages || festival.languages,
    workTypes: config.workTypes || festival.workTypes,
    audiences: config.audiences || festival.audiences,
    sources,
    locations: config.locations.map((item, index) => ({
      id: `${config.id}-location-${index + 1}`,
      role: item.role || "sede",
      countryCode: "BR",
      countryName: "Brasil",
      subdivisionCode: item.subdivisionCode,
      subdivisionName: item.subdivisionName,
      city: item.city,
      municipalityCode: item.municipalityCode,
      district: item.district || "",
      confirmed: true,
      sourceIds,
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

const rio = { city: "Rio de Janeiro", subdivisionCode: "RJ", subdivisionName: "Rio de Janeiro", municipalityCode: "3304557" };
const brasilia = { city: "Brasília", subdivisionCode: "DF", subdivisionName: "Distrito Federal", municipalityCode: "5300108" };

apply({
  id: "festival-047",
  editionLabel: "10ª edição / 2025",
  references: [
    { url: "https://ccbb.com.br/rio-de-janeiro/programacao/dobra-festival-internacional-de-cinema-experimental/", title: "Dobra — programação oficial no CCBB Rio", confidence: "edição anterior", evidenceState: "confirmado em edição anterior", note: "Programação integral da edição mais recente localizada; não foi encontrada chamada pública." },
    { url: "https://static.ccbb.com.br/site-2025/2025/12/Dobra2025_Catalogo_Final.pdf", title: "Catálogo do 10º Dobra", type: "oficial", confidence: "edição anterior", evidenceState: "confirmado em edição anterior" },
  ],
  locations: [rio], activity: "atividade não confirmada", frequency: "anual", organizer: "Firula Filmes",
  description: "Festival dedicado ao cinema experimental e expandido; a edição de 2025 foi curatorial e dedicada ao cinema brasileiro.",
  languages: ["experimental"], workTypes: ["filme", "instalação", "outro"], audiences: ["geral"],
  seasonality: { opening: { months: [], evidenceYears: [], confidence: "desconhecida", note: "Nenhuma chamada pública localizada." }, event: { months: [12], evidenceYears: [2025], confidence: "baixa", note: "Edição mais recente realizada de 3 a 7 de dezembro de 2025." } },
  edition: { year: 2025, number: "10", start: "2025-12-03", end: "2025-12-07", opening: "", closing: "", resultDate: "", status: "realizada", rulesUrl: "https://ccbb.com.br/rio-de-janeiro/programacao/dobra-festival-internacional-de-cinema-experimental/", confidence: "edição anterior", notes: "Nenhuma atividade ou chamada 2026 foi localizada. A edição 2025 foi apresentada como panorama curatorial com mais de 70 curtas brasileiros." },
  calls: [{ name: "Programação curatorial — cinema experimental brasileiro", formats: ["curta", "experimental", "outro"], genres: ["experimental", "ensaio"], languages: ["experimental"], approaches: ["ensaio"], submissionMode: "curadoria sem chamada", selectionType: "não competitiva", premiere: "não confirmado", countries: ["Brasil"], territoriesConfirmed: true, confidence: "edição anterior", notes: "Registro de programação, não oportunidade de inscrição aberta." }],
  coverage: cov({ localização: "CCBB Rio de Janeiro confirmado na última edição." }, { atividade: "Nenhuma edição ou chamada 2026 localizada.", duração: "Não há chamada pública para estabelecer limites elegíveis.", estreia: "Não se aplica à programação curatorial pesquisada; condições não publicadas.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não houve chamada pública localizada.", taxas: "Não houve chamada pública localizada.", abertura: "Não localizada.", encerramento: "Não localizado." }, {}, { categorias: "Panorama curatorial de cinema experimental brasileiro.", "elegibilidade territorial": "Edição integralmente dedicada ao cinema nacional.", "produção/conclusão": "Sem corte de conclusão publicado.", realização: "3 a 7 de dezembro de 2025.", relevância: "Décima edição, CCBB e panorama de mais de 70 curtas documentados." }),
  relevance: rel([18, 13, 8, 19, 8], [58, 75], "especializado", "A trajetória de dez edições e a concentração em cinema experimental sustentam relevância especializada alta, com incerteza pela ausência de chamada e atividade atual.", ["Dez edições documentadas.", "Mais de 70 curtas e atividades no CCBB.", "Debates e oficina, sem mercado formal documentado.", "Importância específica para cinema experimental.", "Catálogo recente, mas sem chamada/edição 2026 localizada."], "média"),
});

const ecraLots = (domestic) => {
  const dates = ["early", "early", "regular", "regular", "regular", "late", "extended", "extended"];
  const values = domestic ? [0, 7, 11, 13, 14, 15, 16, 18] : [22, 27, 32, 37, 39, 41, 43, 45];
  const labels = ["04/08–04/09", "05/09–06/10", "07/10–04/11", "05/11–04/12", "05/12–06/01", "07/01–04/02", "05/02–04/03", "05/03–02/04"];
  return values.map((value, index) => fee(value, "USD", dates[index], [domestic ? "categoria brasileira" : "categoria internacional"], 0, { notes: labels[index] }));
};

apply({
  id: "festival-048",
  editionLabel: "11ª edição / 2027",
  references: [
    { url: "https://www.festivalecra.com.br/_files/ugd/af0596_f5b4fade3a374d4aa18d1ee5da6aafb3.pdf", title: "Edital de termos e condições do 11º Festival ECRÃ", note: "Documento de 34 páginas integralmente lido." },
    { url: "https://www.festivalecra.com.br/inscricoes", title: "Página oficial de inscrições 2026–2027" },
  ],
  locations: [rio], activity: "ativo", frequency: "anual", organizer: "5D Magic e Cara Feia",
  description: "Festival híbrido de cinema e arte experimental, com filmes, games, instalações, artes interativas e novas mídias.",
  languages: ["experimental", "híbrido"], workTypes: ["filme", "instalação", "outro"], audiences: ["geral"],
  seasonality: { opening: { months: [8], evidenceYears: [2026], confidence: "baixa", note: "Abertura da chamada da edição 2027." }, event: { months: [7], evidenceYears: [2027], confidence: "baixa", note: "O edital confirma julho de 2027 sem dias exatos." } },
  edition: { year: 2027, number: "11", start: "", end: "", opening: "2026-08-04", closing: "2027-04-02", resultDate: "2027-05-16", status: "planejada", rulesUrl: "https://www.festivalecra.com.br/_files/ugd/af0596_f5b4fade3a374d4aa18d1ee5da6aafb3.pdf", confidence: "confirmado", notes: "Chamada atual da 11ª edição/2027. Não mistura regras com a programação da 10ª edição/2026. Evento em julho de 2027, ainda sem dias exatos." },
  calls: [
    { slug: "curta-brasil", name: "Brasil — filmes de curta-metragem", formats: ["curta", "experimental"], genres: ["experimental", "híbrido", "ensaio"], languages: ["experimental", "híbrido"], approaches: ["ensaio"], maxMinutes: 40, countries: ["Brasil"], territoriesConfirmed: true, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Obras podem ter estreado e ter distribuição; a edição é híbrida.", opening: "2026-08-04", deadlines: [dl("final", "2027-04-02", "prazo final")], fees: ecraLots(true), platform: "https://filmfreeway.com/FESTIVALECRA" },
    { slug: "curta-internacional", name: "Internacional — filmes de curta-metragem", formats: ["curta", "experimental"], genres: ["experimental", "híbrido", "ensaio"], languages: ["experimental", "híbrido"], approaches: ["ensaio"], maxMinutes: 40, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Obras podem ter estreado e ter distribuição; a edição é híbrida.", opening: "2026-08-04", deadlines: [dl("final", "2027-04-02", "prazo final")], fees: ecraLots(false), platform: "https://filmfreeway.com/FESTIVALECRA" },
    { slug: "media-longa-brasil", name: "Brasil — filmes de média e longa-metragem", formats: ["média", "longa", "experimental"], genres: ["experimental", "híbrido", "ensaio"], languages: ["experimental", "híbrido"], approaches: ["ensaio"], minMinutes: 40, minInclusive: true, countries: ["Brasil"], territoriesConfirmed: true, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Obras podem ter estreado e ter distribuição; a edição é híbrida.", opening: "2026-08-04", deadlines: [dl("final", "2027-04-02", "prazo final")], fees: ecraLots(true), platform: "https://filmfreeway.com/FESTIVALECRA", notes: "O edital classifica média entre 40 e 60 minutos e longa com 60 ou mais; 60 aparece na fronteira das duas categorias." },
    { slug: "media-longa-internacional", name: "Internacional — filmes de média e longa-metragem", formats: ["média", "longa", "experimental"], genres: ["experimental", "híbrido", "ensaio"], languages: ["experimental", "híbrido"], approaches: ["ensaio"], minMinutes: 40, minInclusive: true, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Obras podem ter estreado e ter distribuição; a edição é híbrida.", opening: "2026-08-04", deadlines: [dl("final", "2027-04-02", "prazo final")], fees: ecraLots(false), platform: "https://filmfreeway.com/FESTIVALECRA", notes: "O edital classifica média entre 40 e 60 minutos e longa com 60 ou mais; 60 aparece na fronteira das duas categorias." },
  ],
  coverage: cov({ localização: "Rio de Janeiro/RJ; edição híbrida.", atividade: "11ª edição com chamada aberta para 2027.", categorias: "Curtas e médias/longas, cada qual em categorias Brasil e internacional; modalidades não fílmicas permanecem documentadas no edital.", duração: "Curtas de 0 a 40; médias de 40 a 60; longas a partir de 60 minutos.", "elegibilidade territorial": "Categorias brasileiras separadas das internacionais.", estreia: "Aceita obras já estreadas e com distribuição.", "exibição online": "Edição híbrida; opção de exibição presencial e/ou online no formulário.", "pessoa autorizada a inscrever": "Artistas e coletivos de qualquer nacionalidade, PF ou PJ.", taxas: "Oito lotes em USD, separados entre categorias brasileiras e internacionais.", abertura: "4 de agosto de 2026.", encerramento: "2 de abril de 2027 às 23h59.", realização: "Julho de 2027, sem dias exatos.", relevância: "Onze edições, MAM/CCBB e foco experimental documentados." }, { "produção/conclusão": "O edital atual não estabelece ano mínimo de conclusão." }),
  relevance: rel([20, 15, 10, 20, 14], [74, 84], "especializado", "A continuidade, a rede institucional e a abrangência de formatos experimentais sustentam relevância alta.", ["Onze edições e atividade contínua desde 2017.", "Etapas presencial e online em instituições do Rio.", "Mesas, oficinas e masterclasses; sem mercado ou prêmio financeiro.", "Referência nacional em cinema e arte experimental.", "Edital integral, calendário e oito lotes transparentes."], "alta"),
});

apply({
  id: "festival-049",
  editionLabel: "9ª edição / 2026",
  references: [
    { url: "https://cdnsesc.azureedge.net/assets/2026/03/ANEXO-I-REGULAMENTO-9a-MOSTRA-SESC-DE-CINEMA.pdf", title: "Regulamento da 9ª Mostra Sesc de Cinema", note: "Documento oficial de oito páginas integralmente lido." },
    { url: "https://www.sesc.com.br/cultura/mostra-sesc-de-cinema/", title: "Página oficial da Mostra Sesc de Cinema" },
  ],
  locations: [brasilia], activity: "ativo", frequency: "anual", organizer: "Sesc — Departamento Nacional",
  description: "Mostra nacional de circulação do cinema independente brasileiro em unidades do Sesc e instituições parceiras.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"],
  seasonality: { opening: { months: [3], evidenceYears: [2026], confidence: "baixa", note: "Abertura da 9ª edição." }, event: { months: [9, 10, 11, 12], evidenceYears: [2026], confidence: "média", note: "Panoramas Brasil/Infantojuvenil em setembro e estaduais entre outubro e dezembro." } },
  edition: { year: 2026, number: "9", start: "2026-09-30", end: "2026-12-31", opening: "2026-03-04", closing: "2026-03-31", resultDate: "2026-07-01", status: "realizada", rulesUrl: "https://cdnsesc.azureedge.net/assets/2026/03/ANEXO-I-REGULAMENTO-9a-MOSTRA-SESC-DE-CINEMA.pdf", confidence: "confirmado", notes: "Lançamento nacional em Cataguases em 30/9 e 1/10; circulação estadual segue até dezembro. A sede institucional não substitui as 21 localidades estaduais de exibição, ainda não publicadas individualmente." },
  calls: [
    { slug: "curta", name: "Panoramas — curta-metragem", formats: ["curta"], genres: languageGenres, languages: languageGenres, minMinutes: 2, maxMinutes: 29, creditsIncluded: true, minYear: 2024, pf: "sim", pj: "sim", premiere: "não confirmado", premiereRequirement: "desconhecida", online: "restrito", onlineConditions: "Festivais e mostras online temporárias são admitidos; VOD comercial e circuito comercial até o encerramento tornam a obra inelegível.", countries: ["Brasil"], regions: ["AC", "AL", "BA", "DF", "ES", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "TO"], territoriesConfirmed: true, restrictions: "PF deve ser titular dos direitos; CNPJ deve ter o titular como responsável legal. Limite de duas obras por CPF/CNPJ. Não aceita obra inscrita ou participante em edição anterior.", resubmission: "não", opening: "2026-03-04", deadlines: [dl("final", "2026-03-31", "31/03/2026 às 18h")], fees: [], platform: "https://www.sesc.com.br/mostradecinema" },
    { slug: "media", name: "Panoramas — média-metragem", formats: ["média"], genres: languageGenres, languages: languageGenres, minMinutes: 30, maxMinutes: 69, creditsIncluded: true, minYear: 2024, pf: "sim", pj: "sim", premiere: "não confirmado", premiereRequirement: "desconhecida", online: "restrito", onlineConditions: "Festivais e mostras online temporárias são admitidos; VOD comercial e circuito comercial até o encerramento tornam a obra inelegível.", countries: ["Brasil"], regions: ["AC", "AL", "BA", "DF", "ES", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "TO"], territoriesConfirmed: true, restrictions: "Limite de duas obras por CPF/CNPJ; não aceita obra de edição anterior.", resubmission: "não", opening: "2026-03-04", deadlines: [dl("final", "2026-03-31", "31/03/2026 às 18h")], fees: [], platform: "https://www.sesc.com.br/mostradecinema" },
    { slug: "longa", name: "Panoramas — longa-metragem", formats: ["longa"], genres: languageGenres, languages: languageGenres, minMinutes: 70, creditsIncluded: true, minYear: 2024, pf: "sim", pj: "sim", premiere: "não confirmado", premiereRequirement: "desconhecida", online: "restrito", onlineConditions: "Festivais e mostras online temporárias são admitidos; VOD comercial e circuito comercial até o encerramento tornam a obra inelegível.", countries: ["Brasil"], regions: ["AC", "AL", "BA", "DF", "ES", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "TO"], territoriesConfirmed: true, restrictions: "Limite de duas obras por CPF/CNPJ; não aceita obra de edição anterior.", resubmission: "não", opening: "2026-03-04", deadlines: [dl("final", "2026-03-31", "31/03/2026 às 18h")], fees: [], platform: "https://www.sesc.com.br/mostradecinema" },
  ],
  coverage: cov({ localização: "Projeto nacional em 21 estados; lançamento em Cataguases/MG e circulação em unidades Sesc.", atividade: "9ª edição realizada e seleção publicada.", categorias: "Curta, média e longa com Panoramas Estadual, Brasil e Infantojuvenil.", duração: "Curta 2–29, média 30–69, longa a partir de 70 minutos, créditos incluídos.", "elegibilidade territorial": "PF residente ou PJ sediada em um dos 21 estados participantes.", "produção/conclusão": "Finalização a partir de 1º de janeiro de 2024.", estreia: "Não exige estreia, mas restringe circuito comercial/VOD e exibição fora do estado.", "exibição online": "Mostras online temporárias admitidas; VOD comercial vedado.", "pessoa autorizada a inscrever": "PF ou PJ vinculada ao titular dos direitos; até duas obras.", abertura: "4 de março de 2026 às 10h.", encerramento: "31 de março de 2026 às 18h.", realização: "Panoramas nacionais em setembro; estaduais de outubro a dezembro de 2026.", relevância: "52 selecionados de mais de 1.900 e circulação por 12 meses." }, { taxas: "O regulamento não declara taxa nem gratuidade; entrada gratuita nas exibições não foi usada como inferência." }),
  relevance: rel([21, 19, 17, 18, 14], [84, 93], "nacional", "A capilaridade nacional, os licenciamentos e a circulação de doze meses sustentam relevância muito alta.", ["Nove edições e programa nacional do Sesc.", "Mais de 1.900 inscrições, 52 selecionados e 21 estados.", "Até R$ 222 mil em licenciamento e circulação de um ano.", "Importância para cinema independente em todas as regiões.", "Regulamento, seleção e catálogo atuais publicados."], "alta"),
});

apply({
  id: "festival-050",
  editionLabel: "19ª edição / 2026",
  references: [
    { url: "https://entretodos.com.br/inscricoes-2026/regulamento/", title: "Regulamento e FAQ do 19º Entretodos", note: "Página oficial integralmente lida." },
    { url: "https://ifsp.edu.br/index.php/institucional/17-ultimas-noticias/5800-inscricoes-abertas-para-o-19-festival-entretodos", title: "IFSP — inscrições e realização do 19º Entretodos", type: "oficial" },
  ],
  locations: [{ city: "São Paulo", subdivisionCode: "SP", subdivisionName: "São Paulo", municipalityCode: "3550308" }], activity: "ativo", frequency: "anual", organizer: "Sefras e parceiros",
  description: "Festival de curtas dedicado a direitos humanos, com sessões em escolas, centros culturais, comunidades e unidades socioeducativas.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"],
  seasonality: { opening: { months: [2], evidenceYears: [2026], confidence: "baixa", note: "Abertura da 19ª edição." }, event: { months: [9], evidenceYears: [2026], confidence: "baixa", note: "Realização de 13 a 30 de setembro de 2026." } },
  edition: { year: 2026, number: "19", start: "2026-09-13", end: "2026-09-30", opening: "2026-02-12", closing: "2026-04-23", resultDate: "", status: "realizada", rulesUrl: "https://entretodos.com.br/inscricoes-2026/regulamento/", confidence: "confirmado", notes: "A página oficial atual prorrogou o encerramento para 23/4. O cadastro pode optar por não integrar o acervo/streaming mediante manifestação no prazo do regulamento." },
  calls: [
    { slug: "adulto", name: "Mostra competitiva — público adulto", formats: ["curta"], genres: languageGenres, languages: languageGenres, themes: ["direitos humanos"], audiences: ["geral"], maxMinutes: 25, premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Histórico online não é vedado; selecionados podem integrar streaming e arquivo do festival, com opção de recusa no prazo informado.", resubmission: "não", restrictions: "Qualquer ano de produção. Não aceita obra já selecionada ou premiada em edição anterior.", opening: "2026-02-12", deadlines: [dl("final", "2026-04-23", "prazo prorrogado")], fees: [fee(0, "BRL", "final", ["inscrição direta pelo site"])], platform: "https://entretodos.com.br/inscricoes-2026/" },
    { slug: "juvenil", name: "Mostra competitiva — público juvenil", formats: ["curta"], genres: languageGenres, languages: languageGenres, themes: ["direitos humanos"], audiences: ["juvenil"], maxMinutes: 25, premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Mesmas condições de arquivo e streaming da edição.", resubmission: "não", restrictions: "Obra adequada ao público juvenil e a direitos humanos; qualquer ano de produção.", opening: "2026-02-12", deadlines: [dl("final", "2026-04-23", "prazo prorrogado")], fees: [fee(0, "BRL", "final", ["inscrição direta pelo site"])], platform: "https://entretodos.com.br/inscricoes-2026/" },
    { slug: "infantil", name: "Mostra competitiva — público infantil", formats: ["curta"], genres: languageGenres, languages: languageGenres, themes: ["direitos humanos"], audiences: ["infantil"], maxMinutes: 25, premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Mesmas condições de arquivo e streaming da edição.", resubmission: "não", restrictions: "Obra adequada ao público infantil e a direitos humanos; qualquer ano de produção.", opening: "2026-02-12", deadlines: [dl("final", "2026-04-23", "prazo prorrogado")], fees: [fee(0, "BRL", "final", ["inscrição direta pelo site"])], platform: "https://entretodos.com.br/inscricoes-2026/" },
  ],
  coverage: cov({ localização: "São Paulo/SP, com circuito descentralizado.", atividade: "19ª edição realizada em 2026.", categorias: "Mostras para públicos adulto, juvenil e infantil separadas.", duração: "Até 25 minutos.", "elegibilidade territorial": "Obras brasileiras e estrangeiras.", "produção/conclusão": "Qualquer ano de produção.", estreia: "Sem exigência de estreia; repetição de selecionados/premiados é vedada.", "exibição online": "Arquivo e streaming previstos com mecanismo de recusa.", "pessoa autorizada a inscrever": "Pessoa maior de 18 anos; realizador independente pode inscrever sem produtora.", taxas: "Inscrição direta gratuita; eventual cobrança de plataforma externa não foi equiparada à chamada direta.", abertura: "12 de fevereiro de 2026.", encerramento: "23 de abril de 2026 às 23h59.", realização: "13 a 30 de setembro de 2026.", relevância: "Dezenove edições, circuito de direitos humanos e premiações documentados." }),
  relevance: rel([18, 15, 10, 19, 13], [70, 82], "especializado", "A continuidade e o foco em direitos humanos, com exibições descentralizadas, sustentam relevância alta.", ["Dezenove edições.", "Sessões em escolas, comunidades e equipamentos públicos.", "Debates e prêmios, sem mercado formal documentado.", "Importância especializada em direitos humanos.", "Regulamento/FAQ e calendário atuais acessíveis."], "alta"),
});

apply({
  id: "festival-051",
  editionLabel: "19ª edição / 2026",
  references: [
    { url: "https://visoesperifericas.com.br/regulamento", title: "Regulamento da 19ª edição do Visões Periféricas", note: "Página oficial lida; contém resíduos editoriais de anos anteriores, documentados nas pendências." },
    { url: "https://visoesperifericas.com.br/programacao", title: "Programação da 19ª edição", fields: ["eventDates", "locations", "relevance"] },
  ],
  locations: [rio], activity: "ativo", frequency: "anual", organizer: "Supimpa Produções Artísticas e Culturais",
  description: "Festival voltado a produções periféricas e formação audiovisual, com competição, Visões Lab e janela online.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["juvenil", "geral"],
  seasonality: { opening: { months: [10], evidenceYears: [2025], confidence: "baixa", note: "Mês inferido do ciclo da chamada encerrada em 2025; data exata não publicada na página atual." }, event: { months: [7], evidenceYears: [2026], confidence: "baixa", note: "Realização presencial de 23 a 26 de julho de 2026." } },
  edition: { year: 2026, number: "19", start: "2026-07-23", end: "2026-07-26", opening: "", closing: "", resultDate: "", status: "realizada", rulesUrl: "https://visoesperifericas.com.br/regulamento", confidence: "parcial", notes: "Regulamento atual confirma regras e julho de 2026, mas não publica datas da chamada; a página contém referências residuais a 2024/2025. Janela online no Itaú Cultural Play de 23/7 a 3/8 não foi usada como data do evento presencial." },
  calls: [
    { slug: "fronteiras", name: "Fronteiras Imaginárias", formats: ["curta"], genres: languageGenres, languages: languageGenres, maxMinutes: 25, countries: ["Brasil"], territoriesConfirmed: true, premiere: "não confirmado", online: "permitido", onlineConditions: "Selecionados podem integrar circuito cineclubista e janela online; histórico anterior não é vedado.", minYear: 2024, restrictions: "Realizadores independentes de todo o Brasil; produção a partir de setembro de 2024.", fees: [], platform: "https://visoesperifericas.com.br/" },
    { slug: "gema", name: "Cinema da Gema", formats: ["curta"], genres: languageGenres, languages: languageGenres, maxMinutes: 25, countries: ["Brasil"], regions: ["RJ"], territoriesConfirmed: true, premiere: "não confirmado", online: "permitido", onlineConditions: "Selecionados podem integrar circuito cineclubista e janela online; histórico anterior não é vedado.", minYear: 2024, restrictions: "Produzido no estado do Rio de Janeiro a partir de setembro de 2024.", fees: [], platform: "https://visoesperifericas.com.br/" },
    { slug: "panoramica", name: "Panorâmica", formats: ["média", "longa"], genres: languageGenres, languages: languageGenres, minMinutes: 40, countries: ["Brasil"], territoriesConfirmed: true, premiere: "não confirmado", online: "permitido", onlineConditions: "Selecionados podem integrar circuito cineclubista e janela online; histórico anterior não é vedado.", minYear: 2024, restrictions: "Produção a partir de setembro de 2024.", fees: [], platform: "https://visoesperifericas.com.br/" },
    { slug: "visorama", name: "Visorama", formats: ["curta"], genres: languageGenres, languages: languageGenres, audiences: ["juvenil", "geral"], participationConditions: ["escolar"], selectionType: "não competitiva", maxMinutes: 15, countries: ["Brasil"], territoriesConfirmed: true, premiere: "não confirmado", online: "permitido", onlineConditions: "Selecionados podem integrar circuito cineclubista e janela online; histórico anterior não é vedado.", minYear: 2024, restrictions: "Produzido em projetos de formação do ensino básico, médio ou terceiro setor.", fees: [], platform: "https://visoesperifericas.com.br/" },
  ],
  coverage: cov({ localização: "Rio de Janeiro/RJ, com etapa presencial e online.", atividade: "19ª edição realizada em julho de 2026.", categorias: "Fronteiras Imaginárias, Cinema da Gema, Panorâmica e Visorama separadas.", duração: "Até 25, até 15 ou a partir de 40 minutos conforme a chamada.", "elegibilidade territorial": "Brasil, estado do Rio e formação audiovisual em chamadas distintas.", "produção/conclusão": "Produções a partir de setembro de 2024.", "exibição online": "Janela atual e circuito cineclubista autorizados.", realização: "23 a 26 de julho de 2026 no presencial; janela online até 3 de agosto.", relevância: "Dezenove edições, recorte periférico e Visões Lab documentados." }, { estreia: "Nenhuma condição de estreia localizada.", "pessoa autorizada a inscrever": "Regulamento usa realizador/proponente, sem esclarecer natureza PF/PJ.", taxas: "Taxa ou gratuidade de inscrição não declarada.", abertura: "Data exata não publicada no regulamento atual.", encerramento: "Data exata não publicada; título antigo da página não foi usado como regra atual." }),
  relevance: rel([20, 16, 17, 20, 11], [78, 90], "especializado", "O histórico, o recorte periférico e o laboratório de projetos sustentam relevância muito alta, com desconto de confiança por resíduos editoriais no regulamento.", ["Dezenove edições e vinte anos de trajetória divulgada.", "Programação presencial, online e circuito cineclubista.", "Visões Lab, pitching e encontros com players.", "Importância nacional para cinema de periferias e formação.", "Regulamento atual com inconsistências de edição/data."], "média"),
});

apply({
  id: "festival-055",
  editionLabel: "8ª edição / 2026",
  references: [
    { url: "https://filmmakers.festhome.com/festival/mostra-competitiva-de-cinema-negro-adelia-sampaio", title: "8ª Mostra Adélia Sampaio — chamada e categorias", type: "plataforma de inscrição", note: "Cabeçalho, descrição e cartões atuais foram lidos; o corpo textual ainda reproduz trechos da 7ª edição e foi tratado como conflito editorial." },
    { url: "https://mostraadeliasampaio.com", title: "Site oficial da Mostra Adélia Sampaio", note: "Site institucional; na consulta ainda exibia páginas da 7ª edição." },
  ],
  locations: [brasilia], activity: "ativo", frequency: "anual", organizer: "Sebastiana Mídias e Produções",
  description: "Mostra internacional competitiva dedicada a obras dirigidas por mulheres negras cis e trans.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [4], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 10 de abril de 2026." }, event: { months: [11], evidenceYears: [2026], confidence: "baixa", note: "Realização de 9 a 14 de novembro de 2026." } },
  edition: { year: 2026, number: "8", start: "2026-11-09", end: "2026-11-14", opening: "2026-04-10", closing: "2026-05-30", resultDate: "2026-09-10", status: "planejada", rulesUrl: "https://filmmakers.festhome.com/festival/mostra-competitiva-de-cinema-negro-adelia-sampaio", confidence: "parcial", notes: "Metadados e cartões da 8ª edição são atuais; o texto longo da plataforma ainda cita a 7ª edição/2025. Somente regras atuais repetidas no cabeçalho/cartões foram estruturadas como confirmadas." },
  calls: [
    { slug: "curta", name: "Curta-metragem", formats: ["curta"], genres: languageGenres, languages: languageGenres, themes: ["cinema negro"], maxMinutes: 29, creditsIncluded: true, minYear: 2023, premiere: "não confirmado", online: "permitido", onlineConditions: "A edição é híbrida; histórico online anterior não foi regulado nos trechos atuais.", restrictions: "Direção por mulher negra cis ou trans. Produções em língua estrangeira devem ter legendas em português.", opening: "2026-04-10", deadlines: [dl("final", "2026-05-30", "prazo final")], fees: [fee(0, "USD", "final", ["curta-metragem"])], platform: "https://filmmakers.festhome.com/festival/mostra-competitiva-de-cinema-negro-adelia-sampaio" },
    { slug: "media-telefilme", name: "Média-metragem ou telefilme", formats: ["média"], genres: ["documentário", "ficção", "animação", "experimental"], languages: ["documentário", "ficção", "animação", "experimental"], themes: ["cinema negro"], minMinutes: 30, maxMinutes: 69, creditsIncluded: true, minYear: 2023, premiere: "não confirmado", online: "permitido", onlineConditions: "A edição é híbrida; histórico online anterior não foi regulado nos trechos atuais.", restrictions: "Direção por mulher negra cis ou trans. Produções em língua estrangeira devem ter legendas em português.", opening: "2026-04-10", deadlines: [dl("final", "2026-05-30", "prazo final")], fees: [fee(0, "USD", "final", ["média-metragem ou telefilme"])], platform: "https://filmmakers.festhome.com/festival/mostra-competitiva-de-cinema-negro-adelia-sampaio" },
    { slug: "longa", name: "Longa-metragem", formats: ["longa"], genres: ["documentário", "ficção", "animação", "experimental"], languages: ["documentário", "ficção", "animação", "experimental"], themes: ["cinema negro"], minMinutes: 70, minInclusive: false, minYear: 2023, premiere: "não confirmado", online: "permitido", onlineConditions: "A edição é híbrida; histórico online anterior não foi regulado nos trechos atuais.", restrictions: "Direção por mulher negra cis ou trans. Produções em língua estrangeira devem ter legendas em português.", opening: "2026-04-10", deadlines: [dl("final", "2026-05-30", "prazo final")], fees: [fee(0, "USD", "final", ["longa-metragem"])], platform: "https://filmmakers.festhome.com/festival/mostra-competitiva-de-cinema-negro-adelia-sampaio" },
  ],
  coverage: cov({ localização: "Brasília/DF e formato híbrido.", atividade: "8ª edição com chamada e datas de 2026.", categorias: "Curta, média/telefilme e longa em chamadas separadas.", duração: "Até 29, 30–69 e acima de 70 minutos conforme os cartões atuais.", "elegibilidade territorial": "Festival internacional; países de produção e direção sem restrição geográfica.", "produção/conclusão": "Produções a partir de 2023 nos metadados atuais.", "exibição online": "Edição híbrida com janela online.", taxas: "Sem taxa nas três categorias atuais.", abertura: "10 de abril de 2026.", encerramento: "30 de maio de 2026.", realização: "9 a 14 de novembro de 2026.", relevância: "Oito edições e foco em realizadoras negras documentados." }, { estreia: "Condição de estreia não localizada nos campos atuais.", "pessoa autorizada a inscrever": "Direção negra feminina confirmada; natureza PF/PJ da pessoa responsável não esclarecida." }, { categorias: "O corpo do regulamento na plataforma cita a 7ª edição; limites estruturados vêm dos cartões e descrição atuais da 8ª." }),
  relevance: rel([15, 12, 8, 20, 8], [56, 72], "especializado", "O recorte de realizadoras negras e a continuidade de oito edições sustentam relevância especializada alta, com incerteza pela página atual parcialmente desatualizada.", ["Oito edições documentadas.", "Formato híbrido internacional.", "Premiações, sem mercado formal localizado.", "Centralidade para realizadoras negras cis e trans.", "Chamada atual com trechos residuais da edição anterior."], "média"),
});

apply({
  id: "festival-056",
  editionLabel: "9ª edição / 2026",
  references: [
    { url: "https://egbecinemanegro.com.br/egbe-mostra-de-cinema-negro-abre-inscricoes-para-a-9a-edicao/", title: "EGBÉ abre inscrições para a 9ª edição", note: "Chamada oficial integralmente lida." },
    { url: "https://egbecinemanegro.com.br/9a-egbe-mostra-de-cinema-negro-anuncia-selecao-oficial-de-filmes/", title: "Seleção oficial da 9ª EGBÉ" },
    { url: "https://egbecinemanegro.com.br/mercado-egbe/", title: "Mercado EGBÉ 2026", fields: ["eventDates", "relevance"] },
  ],
  locations: [{ city: "Aracaju", subdivisionCode: "SE", subdivisionName: "Sergipe", municipalityCode: "2800308" }], activity: "ativo", frequency: "anual", organizer: "EGBÉ",
  description: "Mostra e mercado de cinema negro realizados em Aracaju, com foco em autoria negra e circulação audiovisual.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [10], evidenceYears: [2025], confidence: "baixa", note: "Chamada da edição 2026 abriu em outubro de 2025." }, event: { months: [4], evidenceYears: [2026], confidence: "baixa", note: "Mercado de 8 a 10 e mostra de 11 a 18 de abril de 2026." } },
  edition: { year: 2026, number: "9", start: "2026-04-11", end: "2026-04-18", opening: "2025-10-06", closing: "2025-11-07", resultDate: "", status: "realizada", rulesUrl: "https://egbecinemanegro.com.br/egbe-mostra-de-cinema-negro-abre-inscricoes-para-a-9a-edicao/", confidence: "confirmado", notes: "O Mercado EGBÉ ocorreu de 8 a 10/4 e é oportunidade profissional distinta da chamada de filmes, cuja mostra ocorreu de 11 a 18/4." },
  calls: [{ name: "Mostras de curtas — autoria negra", formats: ["curta"], genres: languageGenres, languages: languageGenres, themes: ["cinema negro"], maxMinutes: 25, minYear: 2023, premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Nenhuma vedação de histórico online foi localizada; selecionados não podem ter sido exibidos em edição anterior da EGBÉ.", resubmission: "não", restrictions: "Obras realizadas por pessoas negras; filmes em língua estrangeira devem ter legendas em português.", opening: "2025-10-06", deadlines: [dl("final", "2025-11-07", "prazo final")], fees: [fee(0, "BRL", "final", ["todas as inscrições"])], platform: "https://egbecinemanegro.com.br/" }],
  coverage: cov({ localização: "Aracaju/SE.", atividade: "9ª edição realizada em 2026.", categorias: "Cinco sessões da mostra; chamada única de curtas de autoria negra.", duração: "Até 25 minutos.", "elegibilidade territorial": "Chamada aberta sem restrição geográfica localizada, com autoria negra.", "produção/conclusão": "Produzidos desde 2023.", estreia: "Sem exigência; veda repetição de selecionados em edição anterior.", "exibição online": "Histórico anterior não vedado.", taxas: "Inscrição gratuita.", abertura: "6 de outubro de 2025.", encerramento: "7 de novembro de 2025.", realização: "11 a 18 de abril de 2026; Mercado EGBÉ de 8 a 10 de abril.", relevância: "Nove edições e mercado audiovisual negro documentados." }, { "pessoa autorizada a inscrever": "Autoria negra confirmada; natureza PF/PJ não especificada." }),
  relevance: rel([17, 14, 17, 20, 13], [76, 87], "especializado", "A mostra, o mercado e o foco continuado em cinema negro no Nordeste sustentam relevância muito alta.", ["Nove edições.", "Programação de oito dias em Aracaju.", "Mercado EGBÉ com rodadas e formação.", "Importância especializada para cinema negro.", "Chamada, seleção e calendário atuais publicados."], "alta"),
});

apply({
  id: "festival-057",
  editionLabel: "edição 2026",
  references: [
    { url: "https://ficrp.com.br/regulacoes/", title: "Regulamento do Festival Internacional de Cinema de Ribeirão Preto", note: "Página oficial integralmente lida; contém conflito interno entre julho e outubro." },
    { url: "https://ficrp.com.br/", title: "Página oficial do FIC Ribeirão", fields: ["activity", "eventDates", "relevance"] },
  ],
  locations: [{ city: "Ribeirão Preto", subdivisionCode: "SP", subdivisionName: "São Paulo", municipalityCode: "3543402" }], activity: "ativo", frequency: "anual", organizer: "Baderna Produções Culturais",
  description: "Festival internacional de curtas com exibições, debates, formação e mostra itinerante em Ribeirão Preto.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [4], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 15 de abril." }, event: { months: [7], evidenceYears: [2026], confidence: "desconhecida", note: "Topo da página confirma julho, mas o corpo cita outubro." } },
  edition: { year: 2026, number: "", start: "2026-07-20", end: "2026-07-26", opening: "2026-04-15", closing: "2026-05-15", resultDate: "", status: "realizada", rulesUrl: "https://ficrp.com.br/regulacoes/", confidence: "parcial", notes: "O topo bilíngue e a página inicial indicam 20–26/7; a seção 2 do mesmo regulamento diz 20–26/10. Julho foi estruturado como data operacional, mantendo o conflito visível." },
  calls: [
    { slug: "brasil", name: "Curtas brasileiros", formats: ["curta"], genres: languageGenres, languages: languageGenres, minYear: 2024, countries: ["Brasil"], territoriesConfirmed: true, premiere: "não confirmado", online: "não confirmado", restrictions: "Filmes em português, inglês ou espanhol, ou legendados em um desses idiomas.", opening: "2026-04-15", deadlines: [dl("final", "2026-05-15", "prazo final")], fees: [], platform: "https://ficrp.com.br/" },
    { slug: "internacional", name: "Curtas internacionais", formats: ["curta"], genres: languageGenres, languages: languageGenres, minYear: 2024, premiere: "não confirmado", online: "não confirmado", restrictions: "Filmes em português, inglês ou espanhol, ou legendados em um desses idiomas.", opening: "2026-04-15", deadlines: [dl("final", "2026-05-15", "prazo final")], fees: [fee(1, "USD", "final", ["filme internacional"])], platform: "https://ficrp.com.br/" },
  ],
  coverage: cov({ localização: "Ribeirão Preto/SP.", atividade: "Edição 2026 realizada.", categorias: "Curta regional, estudante, animação, experimental e outros prêmios sob a chamada de curtas.", "elegibilidade territorial": "Filmes brasileiros e internacionais; regional como prêmio específico.", "produção/conclusão": "Curtas realizados a partir de 1º de janeiro de 2024.", taxas: "Filme internacional: USD 1; condição doméstica não declarada.", abertura: "15 de abril de 2026.", encerramento: "15 de maio de 2026.", relevância: "Festival internacional, atividades formativas e itinerância documentados." }, { duração: "O regulamento denomina curta, mas não publica limite numérico.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada." }, { realização: "Topo da página: 20–26/7; seção 2: 20–26/10. Julho mantido como data estruturada com conflito explícito." }),
  relevance: rel([12, 12, 10, 14, 7], [46, 69], "regional/local", "A programação internacional e a função formativa local sustentam relevância intermediária; a transparência sofre com o conflito de datas e a ausência de número da edição.", ["Trajetória anterior é mencionada, sem número atual claro.", "Programação internacional e gratuita.", "Debates, formação e itinerância local.", "Importância para Ribeirão Preto e região.", "Regulamento atual com conflito interno de realização."], "baixa"),
});

apply({
  id: "festival-058",
  editionLabel: "edição 2024",
  references: [
    { url: "https://fincar.com.br/home/", title: "FINCAR 2024 — regulamento e programação", confidence: "edição anterior", evidenceState: "confirmado em edição anterior", note: "Último regulamento oficial disponível; o próprio resultado de busca identifica a página como desativada." },
  ],
  locations: [
    { city: "Recife", subdivisionCode: "PE", subdivisionName: "Pernambuco", municipalityCode: "2611606", role: "sede" },
    { city: "Afogados da Ingazeira", subdivisionCode: "PE", subdivisionName: "Pernambuco", municipalityCode: "2600104", role: "exibição" },
  ], activity: "atividade não confirmada", frequency: "não confirmada", organizer: "Vilarejo Filmes",
  description: "Festival internacional dedicado a filmes dirigidos por mulheres, pessoas não binárias, travestis e transmasculinas.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [9], evidenceYears: [2024], confidence: "baixa", note: "Última chamada localizada." }, event: { months: [11, 12], evidenceYears: [2024], confidence: "baixa", note: "Edição 2024 em Recife e Afogados da Ingazeira." } },
  edition: { year: 2024, number: "", start: "2024-11-29", end: "2024-12-03", opening: "2024-09-02", closing: "2024-09-22", resultDate: "", status: "realizada", rulesUrl: "https://fincar.com.br/home/", confidence: "edição anterior", notes: "Nenhuma chamada 2025/2026 foi localizada. Recife recebeu sessões em 29–30/11 e 1/12; Afogados da Ingazeira em 3/12." },
  calls: [{ name: "Mostras de realizadoras", formats: ["curta", "média", "longa"], genres: languageGenres, languages: languageGenres, minYear: 2021, maxYear: 2024, premiere: "não confirmado", online: "não confirmado", resubmission: "não", restrictions: "Direção por mulheres, pessoas não binárias, travestis ou transmasculinas; codireção com homens cis aceita. Regras específicas de legendas por idioma. Filmes de edição anterior não podem ser reinscritos.", opening: "2024-09-02", deadlines: [dl("final", "2024-09-22", "prazo final")], fees: [], platform: "https://fincar.com.br/home/", confidence: "edição anterior" }],
  coverage: cov({ localização: "Recife e Afogados da Ingazeira/PE na última edição." }, { atividade: "Nenhuma chamada 2025/2026 localizada.", duração: "Curta, média e longa sem limites numéricos publicados.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Perfil da direção confirmado; natureza PF/PJ não especificada.", taxas: "Não localizada.", relevância: "Avaliação usa a última edição oficial disponível." }, {}, { categorias: "Curtas, médias e longas de todos os gêneros.", "elegibilidade territorial": "Festival internacional sem restrição geográfica publicada.", "produção/conclusão": "Obras realizadas entre 2021 e 2024.", abertura: "2 de setembro de 2024.", encerramento: "22 de setembro de 2024.", realização: "29 de novembro a 3 de dezembro de 2024 em duas cidades." }),
  relevance: rel([14, 11, 9, 19, 5], [47, 72], "especializado", "O recorte de gênero e a articulação cineclubista sustentam relevância especializada intermediária; atividade atual não foi confirmada.", ["Edições anteriores em 2016, 2018, 2021 e 2024.", "Duas cidades na edição mais recente.", "Circuito cineclubista previsto.", "Importância para realizadoras e identidades de gênero sub-representadas.", "Site desativado e sem chamada atual."], "baixa"),
});

apply({
  id: "festival-059",
  editionLabel: "4ª edição / 2026",
  references: [
    { url: "https://filmfreeway.com/fendafestival", title: "FENDA 2026 — regulamento integral", type: "plataforma de inscrição", note: "Regulamento bilíngue integralmente lido. Valores das taxas internacionais não ficaram expostos na página após o encerramento." },
  ],
  locations: [{ city: "Belo Horizonte", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3106200" }], activity: "ativo", frequency: "anual", organizer: "FENDA",
  description: "Encontro internacional competitivo dedicado a artes fílmicas experimentais e de vanguarda.",
  languages: ["experimental", "híbrido"], workTypes: ["filme", "outro"], audiences: ["geral"],
  seasonality: { opening: { months: [3], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 6 de março." }, event: { months: [8], evidenceYears: [2026], confidence: "baixa", note: "Realização de 4 a 9 de agosto." } },
  edition: { year: 2026, number: "4", start: "2026-08-04", end: "2026-08-09", opening: "2026-03-06", closing: "2026-04-06", resultDate: "", status: "realizada", rulesUrl: "https://filmfreeway.com/fendafestival", confidence: "confirmado", notes: "As duas competições são Internacional e BH; as categorias Brasil/América Latina/Internacional organizam taxa e envio, não criam competições distintas." },
  calls: [
    { slug: "bh", name: "Competitiva BH — categoria Brasil", formats: ["curta", "experimental"], genres: ["experimental", "ensaio"], languages: ["experimental"], approaches: ["ensaio"], maxMinutes: 30, minYear: 2025, countries: ["Brasil"], regions: ["MG"], territoriesConfirmed: true, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Nenhuma vedação de histórico online.", restrictions: "Obra realizada na Região Metropolitana de Belo Horizonte; somente uma obra por pessoa/coletivo.", opening: "2026-03-06", deadlines: [dl("final", "2026-04-06", "prazo final")], fees: [fee(0, "BRL", "final", ["categoria Brasil"])], platform: "https://filmfreeway.com/fendafestival" },
    { slug: "internacional-brasil", name: "Competitiva Internacional — categoria Brasil", formats: ["curta", "experimental"], genres: ["experimental", "ensaio"], languages: ["experimental"], approaches: ["ensaio"], maxMinutes: 30, minYear: 2025, countries: ["Brasil"], territoriesConfirmed: true, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Nenhuma vedação de histórico online.", restrictions: "Somente uma obra por pessoa/coletivo.", opening: "2026-03-06", deadlines: [dl("final", "2026-04-06", "prazo final")], fees: [fee(0, "BRL", "final", ["categoria Brasil"])], platform: "https://filmfreeway.com/fendafestival" },
    { slug: "internacional-latam", name: "Competitiva Internacional — América Latina", formats: ["curta", "experimental"], genres: ["experimental", "ensaio"], languages: ["experimental"], approaches: ["ensaio"], maxMinutes: 30, minYear: 2025, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Nenhuma vedação de histórico online.", restrictions: "País latino-americano; somente uma obra por pessoa/coletivo.", opening: "2026-03-06", deadlines: [dl("final", "2026-04-06", "prazo final")], fees: [fee(null, "USD", "final", ["categoria América Latina"], 0, { discount: "desconto latino-americano", waiver: "código gratuito mediante solicitação por e-mail", notes: "Valor numérico não ficou disponível após o encerramento." })], platform: "https://filmfreeway.com/fendafestival" },
    { slug: "internacional-outros", name: "Competitiva Internacional — demais países", formats: ["curta", "experimental"], genres: ["experimental", "ensaio"], languages: ["experimental"], approaches: ["ensaio"], maxMinutes: 30, minYear: 2025, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Nenhuma vedação de histórico online.", restrictions: "Somente uma obra por pessoa/coletivo.", opening: "2026-03-06", deadlines: [dl("final", "2026-04-06", "prazo final")], fees: [fee(null, "USD", "final", ["categoria Internacional"], 0, { notes: "Inscrição paga; valor numérico não ficou disponível após o encerramento." })], platform: "https://filmfreeway.com/fendafestival" },
  ],
  coverage: cov({ localização: "Belo Horizonte/MG, Cine Santa Tereza.", atividade: "4ª edição realizada em 2026.", categorias: "Competitiva Internacional e Competitiva BH; vias de inscrição Brasil, América Latina e Internacional separadas.", duração: "Até 30 minutos.", "elegibilidade territorial": "Mundo, América Latina, Brasil e Região Metropolitana de BH estruturados sem cruzamento.", "produção/conclusão": "Concluídas após 1º de janeiro de 2025.", estreia: "Sem exigência localizada.", "exibição online": "Sem vedação de histórico online.", "pessoa autorizada a inscrever": "Artistas ou grupos, pessoalmente ou representados por empresa.", abertura: "6 de março de 2026.", encerramento: "6 de abril de 2026.", realização: "4 a 9 de agosto de 2026.", relevância: "Quatro edições e foco experimental internacional documentados." }, {}, { taxas: "Brasil gratuito; América Latina com desconto e isenção sob solicitação; demais países pagos. Valores numéricos das categorias pagas não ficaram visíveis após o encerramento." }),
  relevance: rel([14, 13, 8, 19, 13], [62, 76], "especializado", "A curadoria experimental internacional e a estrutura transparente sustentam relevância alta para um festival jovem.", ["Quatro edições.", "Seis dias, sala e exibições ao ar livre.", "Conferências, performances e oficina; sem mercado formal.", "Importância para artes fílmicas experimentais.", "Regulamento atual bilíngue e completo, com taxas numéricas ocultas pós-encerramento."], "alta"),
});

const caruaruCall = (slug, name, extra = {}) => ({
  slug, name, formats: ["curta"], genres: languageGenres, languages: languageGenres,
  maxMinutes: 20, minYear: 2025, premiere: "municipal", premiereRequirement: "obrigatória",
  premiereTerritory: "Caruaru/PE", premiereConditions: "A obra deve ser inédita em Caruaru.",
  online: "proibido", onlineConditions: "Não pode ter sido disponibilizada na internet nem exibida em TV aberta.",
  opening: "2026-02-18", deadlines: [dl("final", "2026-04-30", "prazo final")], fees: [],
  platform: "https://filmfreeway.com/FESTIVALDECINEMADECARUARU", ...extra,
});

apply({
  id: "festival-060",
  editionLabel: "13ª edição / 2026",
  references: [
    { url: "https://filmfreeway.com/FESTIVALDECINEMADECARUARU", title: "13º Festival de Cinema de Caruaru — regulamento", type: "plataforma de inscrição", note: "Regulamento trilíngue e cartões lidos integralmente." },
    { url: "https://festivaldecaruaru.com.br/2026/", title: "Página oficial da edição 2026", fields: ["activity", "eventDates", "locations", "relevance"] },
  ],
  locations: [{ city: "Caruaru", subdivisionCode: "PE", subdivisionName: "Pernambuco", municipalityCode: "2604106" }], activity: "ativo", frequency: "anual", organizer: "Festival de Cinema de Caruaru",
  description: "Festival de curtas brasileiros, latino-americanos e internacionais com forte recorte do Agreste.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"],
  seasonality: { opening: { months: [2], evidenceYears: [2026], confidence: "baixa", note: "Abertura da 13ª edição." }, event: { months: [8], evidenceYears: [2026], confidence: "baixa", note: "Edição de 5 a 22 de agosto." } },
  edition: { year: 2026, number: "13", start: "2026-08-05", end: "2026-08-22", opening: "2026-02-18", closing: "2026-04-30", resultDate: "", status: "realizada", rulesUrl: "https://filmfreeway.com/FESTIVALDECINEMADECARUARU", confidence: "confirmado", notes: "A página oficial também exibiu datas de inscrição divergentes em conteúdo residual; o regulamento atual da plataforma fixa 18/2–30/4 e foi usado." },
  calls: [
    caruaruCall("agreste", "Mostra Agreste", { countries: ["Brasil"], regions: ["PE", "RN", "PB", "SE", "AL", "BA"], territoriesConfirmed: true, restrictions: "Culturas do Agreste; direção residente em um dos seis estados e filme ambientado no Agreste desses estados." }),
    caruaruCall("brasil", "Mostra Brasil", { countries: ["Brasil"], territoriesConfirmed: true, restrictions: "Filme ambientado no Brasil e dirigido por pessoa brasileira." }),
    caruaruCall("latino-americana", "Mostra Latino-americana", { territoriesConfirmed: true, restrictions: "Produzido em país latino-americano exceto Brasil, dirigido por cineasta do mesmo país e legendado em português." }),
    caruaruCall("infantil", "Mostra Infantil", { maxMinutes: 15, countries: ["Brasil"], territoriesConfirmed: true, genres: [...languageGenres, "infantil"], audiences: ["infantil"], restrictions: "Filme brasileiro para público de até 12 anos." }),
    caruaruCall("adolescine", "Mostra Adolescine", { maxMinutes: 15, countries: ["Brasil"], territoriesConfirmed: true, audiences: ["juvenil"], restrictions: "Filme brasileiro para público de 12 a 17 anos." }),
    caruaruCall("fantasticos", "Mostra Fantásticos", { countries: ["Brasil"], territoriesConfirmed: true, contentGenres: ["fantástico", "horror"], restrictions: "Filme brasileiro de fantasia, horror, ficção científica ou subgêneros." }),
    caruaruCall("pega-leve", "Mostra Pega Leve", { maxMinutes: 15, contentGenres: ["comédia"], restrictions: "Comédia ou subgênero com abordagem leve." }),
    caruaruCall("personagem", "Mostra Personagem", { maxMinutes: 15, restrictions: "Personagem central que represente comunidade, coletivo ou cultura local." }),
    caruaruCall("internacional", "Mostra Internacional", { territoriesConfirmed: true, restrictions: "Filme não brasileiro de qualquer tema ou gênero, com legendas em português." }),
  ],
  coverage: cov({ localização: "Caruaru/PE em múltiplos espaços.", atividade: "13ª edição realizada em 2026.", categorias: "Nove mostras estruturadas separadamente.", duração: "Regra geral até 20; Infantil, Adolescine, Pega Leve e Personagem até 15 minutos.", "elegibilidade territorial": "Agreste, Brasil, América Latina e internacional separados.", "produção/conclusão": "Finalizados a partir de janeiro de 2025.", estreia: "Estreia municipal obrigatória em Caruaru.", "exibição online": "Veda internet pública e TV aberta anteriores.", "pessoa autorizada a inscrever": "Regulamento atribui inscrição e direitos ao produtor; natureza PF/PJ não especificada.", abertura: "18 de fevereiro de 2026.", encerramento: "30 de abril de 2026.", realização: "5 a 22 de agosto de 2026.", relevância: "Treze edições, foco no interior e nove recortes documentados." }, { taxas: "Valor ou gratuidade de inscrição não ficou declarado no regulamento recuperado." }),
  relevance: rel([17, 14, 10, 18, 13], [67, 79], "regional/local", "A continuidade e o papel de difusão no Agreste sustentam relevância alta de impacto regional.", ["Treze edições.", "Programação longa em múltiplos espaços de Caruaru.", "Intercâmbio e formação; sem mercado formal documentado.", "Importância para Agreste e cinema do interior.", "Regulamento atual detalhado; taxa não publicada."], "alta"),
});

const itabaianaBase = {
  formats: ["curta"], genres: languageGenres, languages: languageGenres, minYear: 2025,
  premiere: "não confirmado", online: "permitido", onlineConditions: "Autorização para acervo e exibições não comerciais; histórico online anterior não é vedado.",
  pf: "sim", pj: "não confirmado", opening: "2026-01-19", deadlines: [dl("final", "2026-02-20", "prazo final")],
  platform: "https://filmmakers.festhome.com/pt/festival/festival-internacional-de-cinema-de-itabaiana",
};

apply({
  id: "festival-061",
  editionLabel: "5ª edição / 2026",
  references: [
    { url: "https://filmmakers.festhome.com/pt/festival/festival-internacional-de-cinema-de-itabaiana", title: "5º Festival Internacional de Cinema de Itabaiana — regras e taxas", type: "plataforma de inscrição", note: "Página integral lida; contém datas antigas no corpo e datas atualizadas no cabeçalho." },
    { url: "https://www.festcineitabaiana.com/post/credenciamento-de-imprensa-para-festival-internacional-de-cinema-de-itabaiana-segue-aberto-at%C3%A9-18-de", title: "Site oficial — realização da 5ª edição", fields: ["activity", "eventDates", "locations", "relevance"] },
  ],
  locations: [{ city: "Itabaiana", subdivisionCode: "SE", subdivisionName: "Sergipe", municipalityCode: "2802908" }], activity: "ativo", frequency: "anual", organizer: "Festival Internacional de Cinema de Itabaiana",
  description: "Festival internacional competitivo de curtas, videoclipes e mostra infantil no interior de Sergipe.",
  languages: languageGenres, workTypes: ["filme", "videoclipe"], audiences: ["infantil", "geral"],
  seasonality: { opening: { months: [1], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 19 de janeiro." }, event: { months: [8], evidenceYears: [2026], confidence: "baixa", note: "Datas atualizadas e confirmadas pelo site oficial." } },
  edition: { year: 2026, number: "5", start: "2026-08-19", end: "2026-08-22", opening: "2026-01-19", closing: "2026-02-20", resultDate: "2026-06-30", status: "realizada", rulesUrl: "https://filmmakers.festhome.com/pt/festival/festival-internacional-de-cinema-de-itabaiana", confidence: "confirmado", notes: "Cabeçalho da plataforma e site oficial posterior confirmam 19–22/8. O corpo antigo ainda diz 29/7–1/8; conflito preservado na cobertura." },
  calls: [
    { ...itabaianaBase, slug: "internacional", name: "Mostra Competitiva Internacional", maxMinutes: 60, maxInclusive: false, fees: [fee(0, "USD", "early", ["filme internacional"], 0, { notes: "até 26/01" }), fee(1, "USD", "regular", ["filme internacional"], 0, { notes: "até 02/02" }), fee(2, "USD", "late", ["filme internacional"], 0, { notes: "até 20/02" })] },
    { ...itabaianaBase, slug: "brasil", name: "Mostra Competitiva Nacional", maxMinutes: 60, maxInclusive: false, countries: ["Brasil"], territoriesConfirmed: true, fees: [fee(0, "USD", "final", ["filme brasileiro"])] },
    { ...itabaianaBase, slug: "sergipe", name: "Mostra Competitiva Sergipana", maxMinutes: 60, maxInclusive: false, countries: ["Brasil"], regions: ["SE"], territoriesConfirmed: true, fees: [fee(0, "USD", "final", ["filme sergipano"])] },
    { ...itabaianaBase, slug: "videoclipe", name: "Mostra Competitiva de Videoclipes", formats: ["curta", "outro"], workTypes: ["videoclipe"], maxMinutes: 10, fees: [fee(0, "USD", "final", ["videoclipe"])] },
    { ...itabaianaBase, slug: "mostrinha", name: "Mostrinha", maxMinutes: 40, maxInclusive: false, audiences: ["infantil"], selectionType: "não competitiva", fees: [fee(0, "USD", "final", ["Mostrinha"])] },
  ],
  coverage: cov({ localização: "Itabaiana/SE, campus da UFS.", atividade: "5ª edição realizada em 2026.", categorias: "Internacional, Nacional, Sergipana, Videoclipe e Mostrinha separadas.", duração: "Cartões atuais: principais abaixo de 60, videoclipe abaixo de 10 e Mostrinha abaixo de 40 minutos.", "elegibilidade territorial": "Internacional, Brasil e Sergipe separados.", "produção/conclusão": "Lançados a partir de janeiro de 2025.", "exibição online": "Autoriza acervo/exibições não comerciais; nenhuma vedação anterior localizada.", "pessoa autorizada a inscrever": "Realizador pode inscrever sem limite; PJ não esclarecida.", taxas: "Internacional: USD 0/1/2 por lote; demais categorias gratuitas.", abertura: "19 de janeiro de 2026.", encerramento: "20 de fevereiro de 2026.", relevância: "Cinco edições, 63 obras e premiação documentadas." }, { estreia: "A plataforma sinaliza filmes de estreia, mas o regulamento não define exigência territorial; mantida como não confirmada." }, { realização: "Cabeçalho/site oficial: 19–22/8; corpo antigo da plataforma: 29/7–1/8." }),
  relevance: rel([12, 11, 8, 17, 10], [51, 69], "regional/local", "A inserção internacional e a atuação no interior sergipano sustentam relevância intermediária.", ["Cinco edições.", "63 obras na edição e programação presencial.", "Oficinas, mesas e prêmios, sem mercado formal.", "Importância para o interior de Sergipe.", "Regras e taxas atuais, com conflito de data resolvido por fonte posterior."], "média"),
});

apply({
  id: "festival-062",
  editionLabel: "6ª edição / 2026",
  references: [
    { url: "https://filmfreeway.com/CineAlter", title: "CineAlter 2026 — regulamento integral", type: "plataforma de inscrição", note: "Página integralmente lida; contém um erro residual de ano na validade da senha, mantido como conflito editorial." },
  ],
  locations: [
    { city: "Alter do Chão", subdivisionCode: "PA", subdivisionName: "Pará", municipalityCode: "1506807", district: "Alter do Chão", role: "sede" },
    { city: "Santarém", subdivisionCode: "PA", subdivisionName: "Pará", municipalityCode: "1506807", role: "organização" },
  ], activity: "ativo", frequency: "anual", organizer: "Instituto Território das Artes",
  description: "Festival híbrido amazônico e latino-americano, realizado no distrito de Alter do Chão, município de Santarém.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"],
  seasonality: { opening: { months: [1, 2], evidenceYears: [2026], confidence: "desconhecida", note: "Encerramento em fevereiro; abertura exata não localizada." }, event: { months: [3], evidenceYears: [2026], confidence: "baixa", note: "Realização de 20 a 22 de março." } },
  edition: { year: 2026, number: "6", start: "2026-03-20", end: "2026-03-22", opening: "", closing: "2026-02-13", resultDate: "2026-03-06", status: "realizada", rulesUrl: "https://filmfreeway.com/CineAlter", confidence: "confirmado", notes: "O regulamento atual diz que a senha não poderia mudar até 22/3/2025, aparente erro de ano; a edição e a cláusula de exibição confirmam 20–22/3/2026." },
  calls: [
    { slug: "amazonas", name: "Mostra Amazonas", formats: ["longa"], genres: ["documentário", "ficção"], languages: ["documentário", "ficção"], minMinutes: 50, minInclusive: false, minYear: 2024, premiere: "preferência", premiereRequirement: "preferencial", online: "permitido", onlineConditions: "Edição híbrida e exibições extras em 2026–2027 autorizadas.", territoriesConfirmed: true, restrictions: "Longa latino-americano em português ou espanhol, com juventudes no eixo da narrativa.", pf: "sim", pj: "sim", opening: "", deadlines: [dl("final", "2026-02-13", "23h59")], fees: [fee(0, "BRL", "final", ["filmes nacionais e internacionais"])], platform: "https://filmfreeway.com/CineAlter" },
    { slug: "tapajos", name: "Mostra Tapajós", formats: ["curta"], genres: ["documentário", "ficção"], languages: ["documentário", "ficção"], maxMinutes: 30, minYear: 2024, premiere: "preferência", premiereRequirement: "preferencial", online: "permitido", onlineConditions: "Edição híbrida e exibições extras em 2026–2027 autorizadas.", countries: ["Brasil"], regions: ["PA"], territoriesConfirmed: true, restrictions: "Filme do Pará sobre juventudes em territórios amazônicos.", pf: "sim", pj: "sim", deadlines: [dl("final", "2026-02-13", "23h59")], fees: [fee(0, "BRL", "final", ["filmes nacionais e internacionais"])], platform: "https://filmfreeway.com/CineAlter" },
    { slug: "arapiuns", name: "Mostra Arapiuns", formats: ["curta", "experimental"], genres: ["documentário", "ficção", "experimental"], languages: ["documentário", "ficção", "experimental"], participationConditions: ["primeira obra", "direção estreante"], maxMinutes: 25, minYear: 2024, premiere: "preferência", premiereRequirement: "preferencial", online: "permitido", onlineConditions: "Edição híbrida e exibições extras em 2026–2027 autorizadas.", countries: ["Brasil"], regions: ["PA"], territoriesConfirmed: true, restrictions: "Ênfase em primeiras obras de jovens do Baixo Amazonas e Amazônia Paraense.", pf: "sim", pj: "sim", deadlines: [dl("final", "2026-02-13", "23h59")], fees: [fee(0, "BRL", "final", ["filmes nacionais e internacionais"])], platform: "https://filmfreeway.com/CineAlter" },
    { slug: "cinealterzinho", name: "CineAlterzinho", formats: ["curta"], genres: ["animação", "infantil"], languages: ["animação"], audiences: ["infantil", "juvenil"], maxMinutes: 15, minYear: 2024, premiere: "preferência", premiereRequirement: "preferencial", online: "permitido", onlineConditions: "Edição híbrida e exibições extras em 2026–2027 autorizadas.", territoriesConfirmed: true, restrictions: "Animação/infantil latino-americana em português ou espanhol.", pf: "sim", pj: "sim", deadlines: [dl("final", "2026-02-13", "23h59")], fees: [fee(0, "BRL", "final", ["filmes nacionais e internacionais"])], platform: "https://filmfreeway.com/CineAlter" },
  ],
  coverage: cov({ localização: "Alter do Chão, distrito de Santarém/PA, com município normalizado.", atividade: "6ª edição realizada em 2026.", categorias: "Amazonas, Tapajós, Arapiuns e CineAlterzinho separadas.", duração: "Longas acima de 50; curtas até 30, 25 ou 15 conforme a mostra.", "elegibilidade territorial": "América Latina, Pará e Amazônia em chamadas distintas.", "produção/conclusão": "Finalizados a partir de janeiro de 2024.", estreia: "Preferência, não obrigação, por obras inéditas.", "exibição online": "Edição híbrida e extras 2026–2027 autorizadas.", "pessoa autorizada a inscrever": "PF, coletivo ou PJ; sem limite de obras.", taxas: "Inscrição gratuita para nacionais e internacionais.", encerramento: "13 de fevereiro de 2026 às 23h59.", realização: "20 a 22 de março de 2026.", relevância: "Seis edições, Amazônia/América Latina e 650 inscrições estimadas." }, { abertura: "Data de abertura não localizada." }, { "exibição online": "Regulamento atual contém typo de 2025 na validade da senha; datas da edição e autorização são 2026." }),
  relevance: rel([15, 13, 10, 20, 11], [64, 78], "especializado", "O recorte amazônico/latino-americano e a atuação territorial sustentam relevância alta.", ["Seis edições.", "Festival híbrido e cerca de 45 selecionados.", "Atividades e circulação extra, sem mercado formal.", "Importância para juventudes e territórios amazônicos.", "Regulamento atual detalhado, com um erro residual de ano."], "alta"),
});

apply({
  id: "festival-063",
  editionLabel: "25ª edição / 2026",
  references: [
    { url: "https://filmmakers.festhome.com/en/festival/primeiro-plano-festival-de-cinema-de-juiz-de-fora-e-mercocidades", title: "Primeiro Plano 2026 — regras, prazos e prêmios", type: "plataforma de inscrição", note: "Regulamento integralmente lido; cabeçalho posterior estende o prazo de 31/7 para 14/8." },
    { url: "https://primeiroplano.art.br/", title: "Site oficial do Primeiro Plano" },
  ],
  locations: [{ city: "Juiz de Fora", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3136702" }], activity: "ativo", frequency: "anual", organizer: "Luzes da Cidade — Grupo de Cinéfilos e Produtores Culturais",
  description: "Festival sul-americano para primeiras obras e produção regional da Zona da Mata e Vertentes.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [7], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 23 de julho." }, event: { months: [11], evidenceYears: [2026], confidence: "baixa", note: "Realização de 9 a 14 de novembro." } },
  edition: { year: 2026, number: "25", start: "2026-11-09", end: "2026-11-14", opening: "2026-07-23", closing: "2026-08-14", resultDate: "2026-10-15", status: "planejada", rulesUrl: "https://filmmakers.festhome.com/en/festival/primeiro-plano-festival-de-cinema-de-juiz-de-fora-e-mercocidades", confidence: "confirmado", notes: "Regulamento cita 31/7; cabeçalho operacional da plataforma, atualizado, registra encerramento em 14/8. A extensão é preservada como prazo posterior." },
  calls: [
    { slug: "mercocidades", name: "Mostra Competitiva Mercocidades", formats: ["curta"], genres: languageGenres, languages: languageGenres, participationConditions: ["primeira obra", "direção estreante"], maxMinutes: 25, minYear: 2026, premiere: "não confirmado", online: "restrito", onlineConditions: "Primeira obra é definida como direção sem exibição audiovisual anterior em festivais, mostras, cineclubes, TV ou similares.", territoriesConfirmed: true, restrictions: "Primeiro curta de direção de país sul-americano listado no regulamento; institucional, publicidade e obra exclusiva para TV são vedados.", opening: "2026-07-23", deadlines: [dl("final", "2026-07-31", "prazo original"), dl("extended", "2026-08-14", "prazo da plataforma", 0, "31/07/2026")], fees: [fee(0, "BRL", "final", ["Mostra Mercocidades"])], platform: "https://primeiroplano.art.br/" },
    { slug: "regional", name: "Mostra Competitiva Regional", formats: ["curta"], genres: languageGenres, languages: languageGenres, maxMinutes: 25, minYear: 2025, premiere: "não confirmado", online: "não confirmado", countries: ["Brasil"], regions: ["MG"], territoriesConfirmed: true, restrictions: "Realizadores residentes em Juiz de Fora, Zona da Mata ou Vertentes; institucional, publicidade e obra exclusiva para TV são vedados.", opening: "2026-07-23", deadlines: [dl("final", "2026-07-31", "prazo original"), dl("extended", "2026-08-14", "prazo da plataforma", 0, "31/07/2026")], fees: [fee(0, "BRL", "final", ["Mostra Regional"])], platform: "https://primeiroplano.art.br/" },
    { slug: "incentivo", name: "Prêmio Primeiro Plano de Incentivo — universitário", formats: ["curta"], genres: languageGenres, languages: languageGenres, participationConditions: ["universitário"], maxMinutes: 25, minYear: 2025, premiere: "não confirmado", online: "não confirmado", countries: ["Brasil"], regions: ["MG"], territoriesConfirmed: true, restrictions: "Subconjunto da Mostra Regional: produção por instituição de Juiz de Fora; direção e pelo menos três funções exercidas por universitários comprovados.", opening: "2026-07-23", deadlines: [dl("final", "2026-07-31", "prazo original"), dl("extended", "2026-08-14", "prazo da plataforma", 0, "31/07/2026")], fees: [fee(0, "BRL", "final", ["Prêmio de Incentivo"])], platform: "https://primeiroplano.art.br/" },
  ],
  coverage: cov({ localização: "Juiz de Fora/MG.", atividade: "25ª edição confirmada para novembro de 2026.", categorias: "Mercocidades, Regional e incentivo universitário separados.", duração: "Até 25 minutos.", "elegibilidade territorial": "América do Sul e Zona da Mata/Vertentes em chamadas distintas.", "produção/conclusão": "Mercocidades desde janeiro de 2026; Regional desde janeiro de 2025.", "exibição online": "Definição de primeira obra na Mercocidades considera exibições anteriores; Regional não publica vedação.", "pessoa autorizada a inscrever": "Diretor, produtor ou titular de direitos.", taxas: "Sem taxa de inscrição.", abertura: "23 de julho de 2026.", realização: "9 a 14 de novembro de 2026.", relevância: "Vinte e cinco edições, formação, networking e prêmio de R$ 12 mil." }, { estreia: "Não há requisito territorial de estreia; primeira obra é condição autoral da Mercocidades." }, { encerramento: "Regulamento: 31/7; cabeçalho posterior da plataforma: 14/8, tratado como extensão." }),
  relevance: rel([21, 15, 17, 18, 14], [80, 91], "nacional", "A continuidade de 25 edições, o foco em estreantes e o prêmio de incentivo sustentam relevância muito alta.", ["Vinte e cinco edições.", "Festival sul-americano e regional com seis dias.", "Workshops, networking e prêmio de R$ 12 mil para novo curta.", "Importância para primeiras obras e Zona da Mata.", "Regulamento e extensão de prazo atuais publicados."], "alta"),
});

apply({
  id: "festival-064",
  editionLabel: "edição 2026",
  references: [
    { url: "https://www.marilia.sp.gov.br/portal/noticias/0/3/16987/festival-de-cinema-de-marilia-abre-inscricoes-para-edicao-2026", title: "Prefeitura de Marília — inscrições e realização 2026", type: "oficial", note: "Comunicado municipal integralmente lido; o regulamento atual não foi recuperado." },
    { url: "https://www.festivalcinemamarilia.com.br/", title: "Site oficial do Festival de Cinema de Marília" },
  ],
  locations: [{ city: "Marília", subdivisionCode: "SP", subdivisionName: "São Paulo", municipalityCode: "3529005" }], activity: "ativo", frequency: "anual", organizer: "Clube de Cinema de Marília",
  description: "Festival brasileiro histórico, retomado no interior paulista, com mostras nacionais, regional, formação e mercado.",
  languages: languageGenres, workTypes: ["filme", "videoclipe", "outro"], audiences: ["infantil", "juvenil", "geral"],
  seasonality: { opening: { months: [6], evidenceYears: [2026], confidence: "baixa", note: "Comunicado de inscrições publicado em 23 de junho." }, event: { months: [9], evidenceYears: [2026], confidence: "baixa", note: "Realização de 5 a 13 de setembro." } },
  edition: { year: 2026, number: "", start: "2026-09-05", end: "2026-09-13", opening: "2026-06-23", closing: "2026-07-19", resultDate: "", status: "realizada", rulesUrl: "https://www.festivalcinemamarilia.com.br/", confidence: "parcial", notes: "23/6 é a data do comunicado oficial de inscrições e foi usada como abertura documentada, sem afirmar horário. O regulamento integral atual não foi recuperado." },
  calls: [
    { slug: "nacional", name: "Seleção oficial nacional", formats: ["curta", "longa"], genres: languageGenres, languages: languageGenres, countries: ["Brasil"], territoriesConfirmed: true, premiere: "não confirmado", online: "não confirmado", restrictions: "Longas e curtas nacionais; demais limites dependem do regulamento não recuperado.", opening: "2026-06-23", deadlines: [dl("final", "2026-07-19", "prazo final")], fees: [], platform: "https://www.festivalcinemamarilia.com.br/", confidence: "parcial" },
    { slug: "regional", name: "Trilhas e Travessias — mostra regional", formats: ["curta", "longa", "experimental", "outro"], genres: languageGenres, languages: languageGenres, workTypes: ["filme", "videoclipe", "outro"], countries: ["Brasil"], regions: ["SP"], territoriesConfirmed: true, premiere: "não confirmado", online: "não confirmado", restrictions: "Cineastas de Marília e região; aceita filmes, videoclipes, videoartes e primeiros cortes.", opening: "2026-06-23", deadlines: [dl("final", "2026-07-19", "prazo final")], fees: [], platform: "https://www.festivalcinemamarilia.com.br/", confidence: "parcial" },
  ],
  coverage: cov({ localização: "Marília/SP, Teatro Municipal.", atividade: "Edição 2026 realizada.", categorias: "Seleção nacional e Trilhas e Travessias regional.", "elegibilidade territorial": "Nacional e Marília/região em chamadas separadas.", abertura: "Comunicado publicado em 23 de junho de 2026 com inscrições abertas.", encerramento: "19 de julho de 2026.", realização: "5 a 13 de setembro de 2026.", relevância: "Origem em 1960, 907 inscrições em 2025, Prêmio Curumim e atividades de indústria." }, { duração: "Regulamento atual não recuperado.", "produção/conclusão": "Não localizada.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Não localizada." }),
  relevance: rel([19, 15, 16, 17, 8], [67, 83], "nacional", "A trajetória histórica, o Prêmio Curumim e as atividades de indústria sustentam relevância alta, com incerteza pela falta do regulamento atual.", ["Origem documentada em 1960, sem pressupor continuidade anual.", "907 inscrições em 2025 e programação de nove dias.", "Rodadas de negócios e pitching competitivo.", "Importância histórica e para o interior paulista.", "Calendário atual publicado, regulamento integral não recuperado."], "média"),
});

apply({
  id: "festival-065",
  editionLabel: "18ª edição / 2025",
  references: [
    { url: "https://festivaltaguatinga.com.br/arquivos/18_festival/Regulamento_18_Festival_Taguatinga.pdf", title: "Regulamento do 18º Festival Taguá de Cinema", confidence: "edição anterior", evidenceState: "confirmado em edição anterior", note: "Documento oficial de seis páginas integralmente lido." },
    { url: "https://festivaltaguatinga.com.br/ofestival.html", title: "Página oficial do 18º Festival Taguá", confidence: "edição anterior", evidenceState: "confirmado em edição anterior" },
  ],
  locations: [{ ...brasilia, district: "Taguatinga Norte" }], activity: "atividade não confirmada", frequency: "anual", organizer: "Karibu Cinema e Baru Lab Criações e Inovações",
  description: "Festival de curtas brasileiros orientado por justiça social, diversidade, natureza e transformação política.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["infantil", "geral"],
  seasonality: { opening: { months: [7, 8], evidenceYears: [2025], confidence: "baixa", note: "Última chamada localizada." }, event: { months: [11], evidenceYears: [2025], confidence: "baixa", note: "Última edição realizada na segunda quinzena de novembro." } },
  edition: { year: 2025, number: "18", start: "", end: "", opening: "2025-07-01", closing: "2025-08-25", resultDate: "2025-10-30", status: "realizada", rulesUrl: "https://festivaltaguatinga.com.br/arquivos/18_festival/Regulamento_18_Festival_Taguatinga.pdf", confidence: "edição anterior", notes: "Nenhuma chamada 2026 foi localizada. O regulamento confirma a segunda quinzena de novembro de 2025, sem dias exatos. A abertura usa a data de criação/publicação do regulamento, não um horário formal de início." },
  calls: [
    { slug: "competitiva", name: "Mostra Competitiva", formats: ["curta"], genres: languageGenres, languages: languageGenres, maxMinutes: 30, minYear: 2023, maxYear: 2025, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Participação no Festival Online era opcional; selecionado online permanecia por dois meses após o evento.", countries: ["Brasil"], territoriesConfirmed: true, resubmission: "não", restrictions: "Responsável deve deter direitos ou ter autorização. Não aceita selecionado em edição anterior nem conteúdo preconceituoso, sexo explícito ou culto à violência.", opening: "2025-07-01", deadlines: [dl("final", "2025-08-25", "23h59")], fees: [fee(0, "BRL", "final", ["curtas-metragens"])], platform: "https://festivaltaguatinga.com.br/festivalTagua/usuario/site/login", confidence: "edição anterior" },
    { slug: "infantil", name: "Mostra Infantil", formats: ["curta"], genres: ["animação", "ficção", "documentário", "experimental", "híbrido", "infantil"], languages: languageGenres, audiences: ["infantil"], maxMinutes: 30, minYear: 2016, maxYear: 2025, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Festival Online opcional; obra pode integrar mostra infantil sem competição conforme ano.", countries: ["Brasil"], territoriesConfirmed: true, restrictions: "Obras infantis de 2016 em diante; regras distintas determinam elegibilidade competitiva para obras mais recentes.", opening: "2025-07-01", deadlines: [dl("final", "2025-08-25", "23h59")], fees: [fee(0, "BRL", "final", ["Mostra Infantil"])], platform: "https://festivaltaguatinga.com.br/festivalTagua/usuario/site/login", confidence: "edição anterior" },
  ],
  coverage: cov({ localização: "Taguatinga Norte, Brasília/DF na última edição." }, { atividade: "Nenhuma chamada ou edição 2026 localizada.", relevância: "Avaliação usa a 18ª edição, sem atividade atual confirmada." }, {}, { categorias: "Competitiva, paralelas, infantil e Festival Online.", duração: "Curtas até 30 minutos.", "elegibilidade territorial": "Cinema brasileiro de curta-metragem.", "produção/conclusão": "Competitiva desde janeiro de 2023; Infantil aceita desde 2016 sob condições.", estreia: "Sem exigência; veda selecionado em edição anterior.", "exibição online": "Participação online opcional e permanência por dois meses.", "pessoa autorizada a inscrever": "PF/PJ, realizador, diretor ou produtor com direitos/autorização.", taxas: "Inscrição gratuita.", abertura: "Regulamento criado em 1º de julho de 2025.", encerramento: "25 de agosto de 2025 às 23h59.", realização: "Segunda quinzena de novembro de 2025, sem dias exatos." }),
  relevance: rel([19, 13, 8, 19, 10], [63, 79], "especializado", "A continuidade de dezoito edições e o foco social do cinema brasileiro sustentam relevância alta, com incerteza sobre atividade atual.", ["Dezoito edições em 2025.", "Programação presencial e online.", "Debates e premiação, sem mercado formal.", "Importância territorial e político-social no DF.", "Regulamento anterior completo, sem chamada atual."], "média"),
});

apply({
  id: "festival-066",
  editionLabel: "6ª edição / 2026",
  references: [
    { url: "https://filmfreeway.com/CinemaUrbana", title: "Cinema Urbana 2026 — regras, taxas e calendário", type: "plataforma de inscrição", note: "Página integralmente lida. Texto do regulamento e cartões/metadados operacionais divergem em duração, prazo e realização." },
    { url: "https://www.cinemaurbana.com/sobre", title: "Cinema Urbana — página institucional", fields: ["activity", "location", "relevance"] },
  ],
  locations: [brasilia], activity: "ativo", frequency: "anual", organizer: "Cinema Urbana",
  description: "Mostra internacional de cinema de arquitetura, cidade, paisagem e infraestrutura, realizada em Brasília.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["geral"],
  seasonality: { opening: { months: [1], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 25 de janeiro." }, event: { months: [11], evidenceYears: [2026], confidence: "desconhecida", note: "Metadados atualizados apontam novembro; texto ainda cita agosto." } },
  edition: { year: 2026, number: "6", start: "2026-11-05", end: "2026-11-08", opening: "2026-01-25", closing: "2026-05-15", resultDate: "2026-06-15", status: "planejada", rulesUrl: "https://filmfreeway.com/CinemaUrbana", confidence: "parcial", notes: "Metadados da plataforma apontam prazo 15/5 e evento 5–8/11; o texto do regulamento ainda diz 25/3 e agosto. Datas estruturadas usam os campos operacionais mais recentes, mantendo o conflito explícito." },
  calls: [
    { slug: "curtas", name: "Curtas — documentário, ficção e experimental", formats: ["curta"], genres: ["documentário", "ficção", "experimental"], languages: ["documentário", "ficção", "experimental"], themes: ["arquitetura"], minYear: 2024, pf: "não confirmado", pj: "não confirmado", premiere: "municipal", premiereRequirement: "obrigatória", premiereTerritory: "Brasília/DF", premiereConditions: "Após a confirmação da seleção, não pode ser exibido em Brasília antes da mostra.", online: "não confirmado", restrictions: "Filmes alinhados a arquitetura/cidade. O texto limita curta a 25 minutos; cartões de taxa dizem até 40, por isso o limite numérico não foi automatizado.", opening: "2026-01-25", deadlines: [dl("final", "2026-03-25", "prazo no texto"), dl("extended", "2026-05-15", "prazo operacional da plataforma", 0, "25/03/2026")], fees: [fee(25, "BRL", "regular", ["curta — tarifa padrão"]), fee(0, "BRL", "regular", ["curta — estudante"], 0, { waiver: "gratuidade estudantil" })], platform: "https://filmfreeway.com/CinemaUrbana", confidence: "parcial" },
    { slug: "longas", name: "Longas — documentário, ficção, experimental e híbrido", formats: ["média", "longa"], genres: ["documentário", "ficção", "experimental", "híbrido"], languages: ["documentário", "ficção", "experimental", "híbrido"], themes: ["arquitetura"], minMinutes: 40, maxMinutes: 120, minYear: 2024, pf: "não confirmado", pj: "não confirmado", premiere: "municipal", premiereRequirement: "obrigatória", premiereTerritory: "Brasília/DF", premiereConditions: "Após a confirmação da seleção, não pode ser exibido em Brasília antes da mostra.", online: "não confirmado", restrictions: "Filmes alinhados a arquitetura/cidade; cartões definem faixa de 40 a 120 minutos.", opening: "2026-01-25", deadlines: [dl("final", "2026-03-25", "prazo no texto"), dl("extended", "2026-05-15", "prazo operacional da plataforma", 0, "25/03/2026")], fees: [fee(50, "BRL", "regular", ["longa — tarifa padrão"]), fee(0, "BRL", "regular", ["longa — estudante"], 0, { waiver: "gratuidade estudantil" })], platform: "https://filmfreeway.com/CinemaUrbana", confidence: "parcial" },
  ],
  coverage: cov({ localização: "Brasília/DF.", atividade: "6ª edição com chamada 2026.", categorias: "Curtas e longas por documentário, ficção e experimental; híbrido nos longas.", "elegibilidade territorial": "Mostra internacional sem restrição geográfica publicada.", "produção/conclusão": "Obras a partir de 2024.", estreia: "Depois de selecionada, obra não pode ser exibida em Brasília antes da mostra.", taxas: "Curtas R$25 e longas R$50; estudante gratuito.", abertura: "25 de janeiro de 2026.", relevância: "Seis edições e circuito internacional especializado em arquitetura." }, { "exibição online": "Histórico online e modalidade da edição não esclarecidos.", "pessoa autorizada a inscrever": "Responsável com direitos; natureza PF/PJ não especificada." }, { duração: "Texto: curta até 25; cartões: curtas até 40 e longas 40–120. Curta permanece sem limite automatizado.", encerramento: "Texto: 25/3; metadado operacional: 15/5. Registrado como prazo posterior, sem retificação textual localizada.", realização: "Texto: agosto; metadados: 5–8 de novembro de 2026." }),
  relevance: rel([14, 12, 9, 18, 8], [53, 72], "especializado", "O foco internacional em cinema de arquitetura sustenta relevância alta especializada, limitada por conflitos editoriais na chamada.", ["Seis edições.", "Mostra internacional em Brasília.", "Palestras e debates; sem mercado formal localizado.", "Importância no circuito de arquitetura e urbanismo.", "Página atual com três conflitos operacionais."], "média"),
});

const noiaBase = {
  formats: ["curta"], genres: languageGenres, languages: languageGenres, maxMinutes: 20,
  creditsIncluded: true, minYear: 2024, maxYear: 2026, premiere: "nenhuma",
  premiereRequirement: "sem exigência confirmada", online: "permitido",
  onlineConditions: "Selecionados podem ser exibidos em plataformas digitais, YouTube, redes e itinerâncias.",
  resubmission: "não", opening: "2026-08-18", deadlines: [dl("final", "2026-10-18", "prazo final")],
  fees: [fee(0, "BRL", "final", ["todas as mostras"])],
  platform: "https://filmfreeway.com/NOIAFestival",
};

apply({
  id: "festival-067",
  editionLabel: "24ª edição / 2026",
  references: [
    { url: "https://www.festivalnoia.com.br/post/regulamento-24%C2%BA-noia", title: "Regulamento do 24º NOIA", note: "Regulamento oficial integralmente lido; anexos ainda contêm numeração/ano residual, sem afetar as regras atuais estruturadas." },
    { url: "https://www.festivalnoia.com.br/", title: "Página oficial do 24º NOIA" },
    { url: "https://filmmakers.festhome.com/f/1517", title: "24º NOIA — página de inscrição", type: "plataforma de inscrição" },
  ],
  locations: [{ city: "Fortaleza", subdivisionCode: "CE", subdivisionName: "Ceará", municipalityCode: "2304400" }], activity: "ativo", frequency: "anual", organizer: "Propono",
  description: "Festival internacional universitário de formação, difusão e intercâmbio audiovisual, com mostras presenciais e digitais.",
  languages: languageGenres, workTypes: ["filme", "videoclipe"], audiences: ["infantil", "juvenil", "geral"],
  seasonality: { opening: { months: [8], evidenceYears: [2026], confidence: "baixa", note: "Abertura em 18 de agosto." }, event: { months: [12], evidenceYears: [2026], confidence: "baixa", note: "Realização de 15 a 20 de dezembro." } },
  edition: { year: 2026, number: "24", start: "2026-12-15", end: "2026-12-20", opening: "2026-08-18", closing: "2026-10-18", resultDate: "", status: "planejada", rulesUrl: "https://www.festivalnoia.com.br/post/regulamento-24%C2%BA-noia", confidence: "confirmado", notes: "Tema Cinema Feito por Mulheres. O anexo de autorização ainda cita a 23ª edição/2025; regras, cronograma e categorias no corpo são da 24ª/2026." },
  calls: [
    { ...noiaBase, slug: "internacional", name: "Mostra Internacional Competitiva", participationConditions: ["universitário", "escolar"] },
    { ...noiaBase, slug: "animacao-internacional", name: "Mostra Internacional Competitiva de Animação", genres: ["animação"], languages: ["animação"], participationConditions: ["universitário", "escolar"] },
    { ...noiaBase, slug: "nacional", name: "Mostra Nacional Competitiva", countries: ["Brasil"], territoriesConfirmed: true, participationConditions: ["universitário", "escolar"] },
    { ...noiaBase, slug: "cearense", name: "Mostra Cearense Competitiva", countries: ["Brasil"], regions: ["CE"], territoriesConfirmed: true, participationConditions: ["universitário", "escolar"] },
    { ...noiaBase, slug: "kids", name: "Mostra NOIA Kids Acessível", audiences: ["infantil"], participationConditions: ["escolar"], restrictions: "Categoria específica para estudantes e público infantil; obras acessíveis recebem prioridade de destaque." },
    { ...noiaBase, slug: "autoral-online", name: "Mostra Autoral Online", selectionType: "competitiva", participationConditions: ["universitário", "escolar"], online: "permitido", onlineConditions: "Mostra realizada em plataformas digitais com prêmio por engajamento." },
    { ...noiaBase, slug: "ceara-online", name: "Mostra Ceará Online", countries: ["Brasil"], regions: ["CE"], territoriesConfirmed: true, participationConditions: ["universitário", "escolar"], online: "permitido", onlineConditions: "Mostra cearense realizada em plataformas digitais com prêmio por engajamento." },
    { ...noiaBase, slug: "videoclipe", name: "Mostra de Videoclipes", formats: ["curta", "outro"], workTypes: ["videoclipe"], maxMinutes: 7, participationConditions: ["universitário", "escolar"] },
  ],
  coverage: cov({ localização: "Fortaleza/CE, Centro Dragão do Mar e plataformas digitais.", atividade: "24ª edição com chamada aberta na data da pesquisa.", categorias: "Oito mostras atuais estruturadas separadamente.", duração: "Curtas até 20 e videoclipes até 7 minutos, créditos incluídos.", "elegibilidade territorial": "Internacional, Brasil e Ceará separados; participação estudantil.", "produção/conclusão": "Finalizadas entre janeiro de 2024 e agosto de 2026.", estreia: "Sem exigência; veda selecionados em edições anteriores.", "exibição online": "Mostras digitais, YouTube, redes e itinerâncias autorizadas.", "pessoa autorizada a inscrever": "Estudantes de graduação, pós, escolas técnicas, institutos, cursos livres e níveis básicos nas mostras específicas.", taxas: "Inscrição gratuita.", abertura: "18 de agosto de 2026.", encerramento: "18 de outubro de 2026.", realização: "15 a 20 de dezembro de 2026.", relevância: "Vinte e quatro edições, formação e itinerância documentadas." }),
  relevance: rel([21, 16, 12, 19, 13], [76, 87], "especializado", "A continuidade, o alcance internacional e a formação universitária sustentam relevância muito alta.", ["Vinte e quatro edições.", "Mostras presenciais e digitais, com itinerância por bairros.", "Formação, intercâmbio e atividades acadêmicas.", "Importância para audiovisual universitário.", "Regulamento e cronograma atuais publicados, com anexos residuais."], "alta"),
});

apply({
  id: "festival-068",
  editionLabel: "9ª edição / 2026",
  references: [
    { url: "https://metrouniversitario.com.br/regulamento-2026/", title: "Regulamento 2026 do Metrô", note: "Página oficial integralmente lida." },
    { url: "https://metrouniversitario.com.br/regulamento-metrolab-2026/", title: "Regulamento do MetrôLAB 2026", fields: ["eventDates", "relevance"], note: "Chamada de projetos lida apenas para evidenciar oportunidade profissional; não foi misturada à chamada de filmes." },
  ],
  locations: [{ city: "Curitiba", subdivisionCode: "PR", subdivisionName: "Paraná", municipalityCode: "4106902" }], activity: "ativo", frequency: "anual", organizer: "Metrô — Festival do Cinema Universitário Brasileiro",
  description: "Festival brasileiro de filmes universitários e formação audiovisual sediado em Curitiba.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["juvenil", "geral"],
  seasonality: { opening: { months: [4, 5], evidenceYears: [2026], confidence: "desconhecida", note: "Encerramento em maio; abertura exata não localizada." }, event: { months: [9], evidenceYears: [2026], confidence: "baixa", note: "Realização de 1 a 6 de setembro." } },
  edition: { year: 2026, number: "9", start: "2026-09-01", end: "2026-09-06", opening: "", closing: "2026-05-08", resultDate: "2026-08-01", status: "realizada", rulesUrl: "https://metrouniversitario.com.br/regulamento-2026/", confidence: "confirmado", notes: "A chamada de filmes é independente do MetrôLAB (projetos de roteiro, 20/6–6/7); as duas não foram combinadas." },
  calls: [{ name: "Mostra de filmes universitários brasileiros", formats: ["curta", "média", "longa", "experimental", "outro"], genres: languageGenres, languages: languageGenres, participationConditions: ["universitário"], minYear: 2025, pf: "sim", pj: "não confirmado", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Link online é obrigatório para seleção; não há vedação de exibição pública anterior.", countries: ["Brasil"], territoriesConfirmed: true, restrictions: "Qualquer duração. Direção e ao menos duas outras funções por estudantes de graduação, pós ou cursos livres brasileiros com 100h ou mais; WIP aceito apenas em corte final.", opening: "", deadlines: [dl("final", "2026-05-08", "23h59")], fees: [], platform: "https://metrouniversitario.com.br/regulamento-2026/" }],
  coverage: cov({ localização: "Curitiba/PR.", atividade: "9ª edição realizada em 2026.", categorias: "Chamada única de filmes universitários; MetrôLAB separado como oportunidade de projetos.", duração: "Filmes de qualquer duração.", "elegibilidade territorial": "Filmes brasileiros realizados em contexto universitário ou curso livre qualificado.", "produção/conclusão": "Finalizados a partir de 2025; WIP em corte final aceito.", estreia: "Sem exigência localizada.", "exibição online": "Link online obrigatório; histórico anterior não vedado.", "pessoa autorizada a inscrever": "Direção e equipe estudantis comprovadas; natureza PJ não explicitada.", encerramento: "8 de maio de 2026 às 23h59.", realização: "1 a 6 de setembro de 2026.", relevância: "Nove edições e laboratório de projetos documentados." }, { taxas: "Taxa ou gratuidade não declarada no regulamento.", abertura: "Data de abertura não localizada." }),
  relevance: rel([15, 12, 17, 18, 13], [69, 80], "especializado", "A especialização universitária e o laboratório de projetos sustentam relevância alta.", ["Nove edições.", "Festival presencial nacional em Curitiba.", "MetrôLAB com consultorias e apoio a seis projetos.", "Importância para cinema universitário brasileiro.", "Regulamentos atuais de filmes e laboratório separados e claros."], "alta"),
});

apply({
  id: "festival-069",
  editionLabel: "9ª edição / 2026",
  references: [
    { url: "https://curtacaico.com.br/curta-caico-abre-convocatoria-de-filmes-para-sua-9a-edicao/", title: "Curta Caicó abre convocatória para a 9ª edição", note: "Comunicado oficial integralmente lido." },
    { url: "https://tribunadonorte.com.br/viver/curta-caico-aprensenta-43-filmes-de-todas-as-regioes/", title: "Tribuna do Norte — programação e datas finais do 9º Curta Caicó", type: "fonte secundária", fields: ["eventDates", "programmingReach", "relevance"], note: "Usada para a realização efetiva posterior; não substitui regras da chamada." },
    { url: "https://curtacaico.com.br/", title: "Site oficial do Curta Caicó" },
  ],
  locations: [{ city: "Caicó", subdivisionCode: "RN", subdivisionName: "Rio Grande do Norte", municipalityCode: "2402006" }], activity: "ativo", frequency: "anual", organizer: "Agência Referência",
  description: "Festival de curtas e formação audiovisual realizado no Seridó potiguar desde 2018.",
  languages: languageGenres, workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"],
  seasonality: { opening: { months: [2], evidenceYears: [2026], confidence: "baixa", note: "Abertura oficial em 23 de fevereiro." }, event: { months: [10, 11], evidenceYears: [2026], confidence: "baixa", note: "Realização efetiva de 27 de outubro a 1º de novembro." } },
  edition: { year: 2026, number: "9", start: "2026-10-27", end: "2026-11-01", opening: "2026-02-23", closing: "2026-03-22", resultDate: "", status: "realizada", rulesUrl: "https://curtacaico.com.br/curta-caico-abre-convocatoria-de-filmes-para-sua-9a-edicao/", confidence: "parcial", notes: "O comunicado oficial confirma 23/2–22/3. Uma publicação externa divulgou 10/3–12/4; como não foi localizada retificação oficial, o conflito é preservado. A realização efetiva posterior foi 27/10–1/11." },
  calls: [
    { slug: "nacional", name: "Mostra Nacional", formats: ["curta"], genres: languageGenres, languages: languageGenres, maxMinutes: 20, countries: ["Brasil"], territoriesConfirmed: true, premiere: "não confirmado", online: "não confirmado", opening: "2026-02-23", deadlines: [dl("final", "2026-03-22", "prazo do comunicado oficial")], fees: [fee(0, "BRL", "final", ["todas as mostras"])], platform: "https://curtacaico.com.br/", confidence: "parcial" },
    { slug: "potiguar", name: "Mostra Potiguar", formats: ["curta"], genres: languageGenres, languages: languageGenres, maxMinutes: 20, countries: ["Brasil"], regions: ["RN"], territoriesConfirmed: false, premiere: "não confirmado", online: "não confirmado", restrictions: "Recorte potiguar confirmado pelo nome da mostra; o critério exato de residência, produção ou locação não foi publicado no comunicado.", opening: "2026-02-23", deadlines: [dl("final", "2026-03-22", "prazo do comunicado oficial")], fees: [fee(0, "BRL", "final", ["todas as mostras"])], platform: "https://curtacaico.com.br/", confidence: "parcial" },
    { slug: "serido", name: "Mostra Seridó", formats: ["curta"], genres: languageGenres, languages: languageGenres, maxMinutes: 20, countries: ["Brasil"], regions: ["RN"], territoriesConfirmed: false, premiere: "não confirmado", online: "não confirmado", restrictions: "Recorte Seridó confirmado pelo nome da mostra; o critério territorial exato não foi publicado no comunicado.", opening: "2026-02-23", deadlines: [dl("final", "2026-03-22", "prazo do comunicado oficial")], fees: [fee(0, "BRL", "final", ["todas as mostras"])], platform: "https://curtacaico.com.br/", confidence: "parcial" },
  ],
  coverage: cov({ localização: "Caicó/RN, com circulação no Seridó.", atividade: "9ª edição realizada em 2026.", categorias: "Nacional, Potiguar e Seridó, além de paralelas temáticas.", duração: "Até 20 minutos.", "elegibilidade territorial": "Nacional confirmada; recortes Potiguar/Seridó existem, com critério exato pendente.", taxas: "Inscrição gratuita.", realização: "27 de outubro a 1º de novembro de 2026.", relevância: "Nove edições, recorde de inscrições, 43 filmes e formação no interior documentados." }, { "produção/conclusão": "Ano mínimo não publicado no comunicado.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada." }, { abertura: "Comunicado oficial: 23/2; imprensa externa: 10/3.", encerramento: "Comunicado oficial: 22/3; imprensa externa: 12/4. Sem retificação oficial localizada." }),
  relevance: rel([15, 14, 14, 19, 11], [67, 81], "regional/local", "A atuação formativa continuada no Seridó e o alcance nacional de inscrições sustentam relevância alta de impacto regional.", ["Nove edições desde 2018.", "43 filmes e recorde de inscrições em 2026.", "Escola de Cinema do Seridó, laboratórios e oficinas.", "Importância para o interior do Rio Grande do Norte.", "Chamada oficial resumida; regulamento integral não localizado."], "média"),
});

db.settings.catalogVersion = "2026-10-04.5";
fs.writeFileSync(catalogPath, `${JSON.stringify(db, null, 2)}\n`);
console.log(`BR-03 aplicado: 20 festivais; catálogo ${db.settings.catalogVersion}; ${db.calls.length} chamadas.`);
