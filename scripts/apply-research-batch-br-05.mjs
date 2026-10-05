import fs from "node:fs";

const catalogPath = new URL("../src/data/catalog.json", import.meta.url);
const db = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const checkedAt = "2026-10-04";
const genres = ["documentário", "ficção", "animação", "experimental", "híbrido"];
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
const normalizedThemes = (values = []) => values
  .map((value) => ({ "LGBTQIAPN+": "LGBTQIA+", "cinema indígena": "indígena" })[value] || value)
  .filter((value) => ["LGBTQIA+", "cinema negro", "indígena", "socioambiental", "direitos humanos", "música", "arquitetura"].includes(value));
const normalizedParticipation = (values = [], callName = "") => values
  .map((value) => value === "estudante" ? (callName.includes("Universit") ? "universitário" : callName.includes("Escolar") ? "escolar" : "") : value)
  .filter(Boolean);
const makeCall = (oldCall, edition, config, index, sources) => ({
  ...oldCall,
  id: index === 0 ? oldCall.id : `${edition.id}-call-${config.slug || index + 1}`,
  editionId: edition.id, name: config.name,
  formats: config.formats || [], genres: config.genres || [],
  workTypes: (config.workTypes || ["filme"]).map((value) => value === "série" ? "série/episódio" : value),
  languages: (config.languages || []).filter((value) => genres.includes(value)), approaches: config.approaches || [],
  contentGenres: config.contentGenres || [], themes: normalizedThemes(config.themes),
  audiences: config.audiences || ["geral"], participationConditions: normalizedParticipation(config.participationConditions, config.name),
  submissionMode: config.submissionMode || "aberta", selectionType: config.selectionType || "competitiva",
  genresConfirmed: config.genresConfirmed ?? true,
  minMinutes: config.minMinutes ?? null, maxMinutes: config.maxMinutes ?? null,
  minSeconds: config.minSeconds ?? null, maxSeconds: config.maxSeconds ?? null,
  minInclusive: config.minInclusive ?? true, maxInclusive: config.maxInclusive ?? true,
  creditsIncluded: config.creditsIncluded ?? null, minYear: config.minYear ?? null, maxYear: config.maxYear ?? null,
  pf: config.pf || "não confirmado", pj: config.pj || "não confirmado",
  premiere: config.premiere === "festival" ? "não confirmado" : config.premiere || "não confirmado", premiereRequirement: config.premiereRequirement || "desconhecida",
  premiereTerritory: config.premiereTerritory || "", premiereConditions: config.premiereConditions || "",
  online: config.online || "não confirmado", onlineConditions: config.onlineConditions || "",
  countries: config.countries || [], regions: config.regions || [], territoriesConfirmed: config.territoriesConfirmed ?? false,
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
    confidence: reference.confidence || "confirmado", evidenceState: reference.evidenceState || "confirmado na edição atual",
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
      subdivisionName: item.subdivisionName, city: item.city, municipalityCode: item.municipalityCode,
      district: item.district || "", confirmed: true, sourceIds,
    })),
    seasonality: config.seasonality, relevance: createRelevance(config.relevance, sourceIds),
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
const season = (openingMonths, eventMonths, years, note = "") => ({
  opening: { months: openingMonths, evidenceYears: years, confidence: openingMonths.length ? "média" : "desconhecida", note },
  event: { months: eventMonths, evidenceYears: years, confidence: eventMonths.length ? "média" : "desconhecida", note },
});
const currentBase = { genres, languages: [], premiere: "nenhuma", premiereRequirement: "sem exigência confirmada" };

apply({
  id: "festival-femucine", editionLabel: "3ª edição / 2025",
  references: [
    previousReference("https://www.sinj.df.gov.br/sinj/TextoArquivoDiario.aspx?id_file=797edd0d-e9f3-32a2-9895-61b46062ae63", "DODF — ocupação do Teatro de Sobradinho pelo FEMUCINE", "3ª edição / 2025", "Fonte oficial comprova a realização, não as regras da chamada."),
    { url: "https://brasiliaetc.com.br/festival-multicultural-de-cinema-femucine-retorna-para-sua-3a-edicao-em-sobradinho/", title: "FEMUCINE retorna para a 3ª edição", type: "fonte secundária", confidence: "edição anterior", evidenceState: "confirmado em edição anterior", editionLabel: "3ª edição / 2025", note: "Usada para programação e perfil; diverge do DODF em um dia da ocupação." },
  ],
  locations: [{ city: "Brasília", district: "Sobradinho", subdivisionCode: "DF", subdivisionName: "Distrito Federal", municipalityCode: "5300108" }],
  activity: "atividade não confirmada", frequency: "não confirmada", organizer: "FEMUCINE",
  description: "Festival multicultural de cinema de Sobradinho com curtas, inclusão, infância e videoclipes.",
  seasonality: season([], [3], [2025], "Última edição localizada em março de 2025."),
  edition: { year: 2025, number: "3", start: "2025-03-19", end: "2025-03-23", opening: "", closing: "", resultDate: "", status: "realizada", rulesUrl: "https://www.sinj.df.gov.br/sinj/TextoArquivoDiario.aspx?id_file=797edd0d-e9f3-32a2-9895-61b46062ae63", confidence: "edição anterior", notes: "O DODF reserva 19–23/3; a programação pública informa 19–22/3. Nenhuma chamada de 2026 foi localizada." },
  calls: [{ name: "Seleção FEMUCINE 2025 — regras não recuperadas", formats: ["curta", "outro"], genres, workTypes: ["filme", "videoclipe"], submissionMode: "curadoria sem chamada", confidence: "edição anterior", notes: "Dezesseis curtas e categorias infantil, inclusiva e videoclipe foram noticiados; regras de inscrição não recuperadas." }],
  coverage: cov({}, { atividade: "Nenhuma edição/chamada de 2026 localizada." }, { realização: "DODF: 19–23/3; programação pública: 19–22/3." }, { localização: "Teatro de Sobradinho, Brasília/DF.", categorias: "Curtas, infantil, inclusiva e videoclipes na programação de 2025.", relevância: "Três edições e atuação multicultural/periférica documentadas." }),
  relevance: rel([7, 11, 7, 15, 7], [37, 58], "regional/local", "A atuação multicultural e territorial sustenta alcance intermediário local, com baixa transparência documental recente.", ["Três edições localizadas.", "Dezesseis curtas em 2025.", "Sem mercado formal documentado.", "Foco multicultural, inclusivo e periférico.", "Realização oficial confirmada; regras atuais ausentes."], "baixa"),
});

apply({
  id: "festival-fronteira", editionLabel: "5ª edição / 2023",
  references: [previousReference("https://www.fronteirafestival.com/doc/regulamento_vfff_pt_en.pdf", "Regulamento do V Fronteira", "5ª edição / 2023", "Regulamento integralmente lido; nenhuma edição posterior localizada."), previousReference("https://www.fronteirafestival.com/pt/sobre/festival", "Fronteira — histórico oficial", "5ª edição / 2023")],
  locations: [{ city: "Brasília", subdivisionCode: "DF", subdivisionName: "Distrito Federal", municipalityCode: "5300108" }],
  activity: "atividade não confirmada", frequency: "não confirmada", organizer: "Fronteira Festival",
  description: "Festival internacional dedicado ao documentário e ao cinema experimental, realizado em Goiás e Brasília.",
  seasonality: season([2, 3], [8, 9], [2023], "Última chamada e realização localizadas em 2023."),
  edition: { year: 2023, number: "5", start: "2023-08-29", end: "2023-09-03", opening: "2023-02-02", closing: "2023-03-22", resultDate: "", status: "realizada", rulesUrl: "https://www.fronteirafestival.com/doc/regulamento_vfff_pt_en.pdf", confidence: "edição anterior", notes: "Não confundir com o Festival Internacional de Cinema da Fronteira, de Bagé/RS. Nenhuma edição posterior foi localizada." },
  calls: [
    { ...currentBase, name: "Curtas documentais e experimentais", formats: ["curta", "média"], maxMinutes: 59, maxInclusive: true, minYear: 2022, deadlines: [dl("final", "2023-03-22", "prazo final")], fees: [fee(0, "BRL", "final", ["Curtas"])], pf: "sim", pj: "sim", confidence: "edição anterior", restrictions: "Obras nacionais e internacionais; responsável deve deter ou representar os direitos." },
    { ...currentBase, slug: "longas", name: "Longas documentais e experimentais", formats: ["longa"], minMinutes: 60, minInclusive: true, minYear: 2022, deadlines: [dl("final", "2023-03-22", "prazo final")], fees: [fee(0, "BRL", "final", ["Longas"])], pf: "sim", pj: "sim", confidence: "edição anterior", restrictions: "Obras nacionais e internacionais; responsável deve deter ou representar os direitos." },
  ],
  coverage: cov({}, { atividade: "Nenhuma edição posterior a 2023 localizada." }, {}, { localização: "Cine Brasília, Brasília/DF.", categorias: "Curtas e longas documentais/experimentais.", duração: "Curtas até 59; longas a partir de 60 minutos.", "elegibilidade territorial": "Nacional e internacional.", "produção/conclusão": "Finalizados a partir de janeiro de 2022.", estreia: "Nenhuma exigência localizada no regulamento.", "exibição online": "Link privado para seleção; sessão pública online anterior não restringida.", "pessoa autorizada a inscrever": "Cineasta, produtor ou responsável pelos direitos.", taxas: "Inscrição gratuita; sem taxa de exibição.", abertura: "2 de fevereiro de 2023.", encerramento: "22 de março de 2023.", realização: "29 de agosto a 3 de setembro de 2023.", relevância: "Cinco edições, mais de 500 filmes e cerca de 50 países no histórico oficial." }),
  relevance: rel([14, 17, 10, 19, 8], [56, 75], "especializado", "O alcance internacional e a especialização documental/experimental sustentam relevância alta, reduzida pela inatividade recente não esclarecida.", ["Cinco edições.", "Mais de 500 filmes e cerca de 50 países.", "Sem mercado formal documentado.", "Especialização documental e experimental.", "Regulamento integral de 2023; continuidade ausente."], "média"),
});

apply({
  id: "festival-cinecipo", editionLabel: "14ª edição / 2026",
  references: [{ url: "https://cinecipo.com.br/", title: "14º Cinecipó — página oficial", note: "Confirma 8–12/9/2026 e sede." }, { url: "https://filmfreeway.com/cinecipo", title: "14º Cinecipó — regras de inscrição", type: "plataforma de inscrição", note: "Regras integralmente lidas; o texto traz mês de realização e cláusula de edição residual divergentes." }],
  locations: [{ city: "Belo Horizonte", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3106200" }],
  activity: "ativo", frequency: "anual", organizer: "Cinecipó",
  description: "Festival do filme insurgente com foco socioambiental e etnográfico.",
  seasonality: season([5, 6], [9], [2026], "Chamada de maio a junho; realização oficial em setembro."),
  edition: { year: 2026, number: "14", start: "2026-09-08", end: "2026-09-12", opening: "2026-05-20", closing: "2026-06-10", resultDate: "2026-07-20", status: "realizada", rulesUrl: "https://filmfreeway.com/cinecipo", confidence: "parcial", notes: "A página oficial fixa setembro; as regras citam agosto e preservam uma referência residual à 9ª edição." },
  calls: [{ ...currentBase, name: "Mostra socioambiental e etnográfica", formats: ["curta", "média", "longa"], minYear: 2025, territoriesConfirmed: true, deadlines: [dl("final", "2026-06-10", "prazo final")], fees: [fee(0, "BRL", "final", ["Inscrição pelo site oficial"], 0, { notes: "Gratuidade confirmada no site; eventual tarifa da plataforma não foi publicada." })], pf: "sim", pj: "sim", online: "permitido", onlineConditions: "Autoriza sessões extras não comerciais do festival; histórico online anterior não é vedado.", restrictions: "Tema socioambiental ou etnográfico; filmes estrangeiros preferencialmente com legendas em português.", confidence: "parcial" }],
  coverage: cov({ localização: "Cine Santa Tereza, Belo Horizonte/MG.", atividade: "14ª edição realizada em 2026.", categorias: "Curtas, médias e longas socioambientais/etnográficos.", duração: "Formatos nomeados, sem limites numéricos localizados.", "elegibilidade territorial": "Qualquer país.", "produção/conclusão": "Finalizados após 1/1/2025.", estreia: "Nenhuma exigência localizada.", "exibição online": "Uso posterior não comercial pelo festival autorizado.", "pessoa autorizada a inscrever": "Responsável, diretor ou produtor detentor dos direitos.", taxas: "Inscrição gratuita pelo site oficial.", abertura: "20 de maio de 2026.", encerramento: "10 de junho de 2026.", relevância: "Quatorze edições e especialização socioambiental documentadas." }, {}, { realização: "Site oficial: 8–12/9; regras da plataforma mencionam agosto e conservam referência à 9ª edição." }),
  relevance: rel([18, 15, 10, 20, 11], [67, 81], "especializado", "A continuidade e a especialização socioambiental/etnográfica sustentam relevância alta.", ["Quatorze edições.", "Seleção nacional e internacional.", "Sem mercado formal documentado.", "Foco socioambiental e etnográfico consolidado.", "Fontes atuais, com resíduos editoriais identificados."], "alta"),
});

apply({
  id: "festival-pinhais", editionLabel: "14ª edição / 2026",
  references: [{ url: "https://atendenet.pinhais.pr.gov.br/cidadao/noticia/14-festival-de-cinema-de-pinhais-divulga-filmes-vencedores-que-serao-exibidos-no-centro-cultural", title: "Prefeitura de Pinhais — vencedores do 14º FESTCINE", note: "Página oficial comprova edição, categorias, alcance e sessões; edital não localizado." }],
  locations: [{ city: "Pinhais", subdivisionCode: "PR", subdivisionName: "Paraná", municipalityCode: "4119152" }],
  activity: "ativo", frequency: "anual", organizer: "Prefeitura de Pinhais",
  description: "Festival municipal de cinema com categorias profissionais, amadoras, nacionais, locais e internacionais.",
  seasonality: season([], [6], [2026], "Exibições de 24 a 26 de junho; chamada não localizada."),
  edition: { year: 2026, number: "14", start: "2026-06-09", end: "2026-06-26", opening: "", closing: "", resultDate: "2026-06-09", status: "realizada", rulesUrl: "https://atendenet.pinhais.pr.gov.br/cidadao/noticia/14-festival-de-cinema-de-pinhais-divulga-filmes-vencedores-que-serao-exibidos-no-centro-cultural", confidence: "parcial", notes: "Premiação em 9/6 e sessões públicas de 24–26/6. Regulamento e datas de inscrição não foram localizados." },
  calls: [{ name: "Categorias do 14º FESTCINE — chamada não recuperada", formats: ["curta", "longa"], genres, submissionMode: "curadoria sem chamada", confidence: "parcial", notes: "Quatorze categorias confirmadas, incluindo animação, documentário, longa, +10, Livre e Melhor Pinhais; regras operacionais pendentes." }],
  coverage: cov({ localização: "Centro Cultural Wanda dos Santos Mallmann, Pinhais/PR.", atividade: "14ª edição realizada em 2026.", categorias: "Quatorze categorias profissionais/amadoras, nacionais, locais e internacionais.", realização: "Premiação em 9/6 e sessões de 24 a 26/6/2026.", relevância: "Quatorze edições e participação de 17 estados e exterior documentadas." }, { duração: "Edital não localizado.", "elegibilidade territorial": "Recortes existem, mas critérios integrais não localizados.", "produção/conclusão": "Não localizada.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Não localizadas.", abertura: "Não localizada.", encerramento: "Não localizado." }),
  relevance: rel([17, 14, 8, 13, 10], [54, 70], "regional/local", "A longa continuidade e o alcance interestadual sustentam relevância alta regional, com regras pouco transparentes.", ["Quatorze edições.", "Inscritos de 17 estados e exterior.", "Sem mercado formal documentado.", "Categorias local e livre.", "Atividade oficial atual; edital ausente."], "média"),
});

apply({
  id: "festival-mostrasp", editionLabel: "50ª edição / 2026",
  references: [{ url: "https://mostra.org/jornal-da-mostra/estao-abertas-as-inscricoes-para-a-50-mostra-internacional-de-cinema-em-sao-paulo", title: "50ª Mostra — inscrições abertas", note: "Página oficial confirma janela e datas." }, { url: "https://static.mostra.org/_uploads/371c67a471638a92.pdf?v=1775088994396", title: "Regulamento da 50ª Mostra", note: "PDF oficial de dez páginas integralmente lido." }],
  locations: [{ city: "São Paulo", subdivisionCode: "SP", subdivisionName: "São Paulo", municipalityCode: "3550308" }],
  activity: "ativo", frequency: "anual", organizer: "ABMIC e Mostra Cultura e Eventos",
  description: "Festival internacional de cinema de São Paulo com competição de novos realizadores e panoramas mundial e brasileiro.",
  seasonality: season([4, 5, 6, 7], [10], [2026], "Inscrições de abril a julho; realização em outubro."),
  edition: { year: 2026, number: "50", start: "2026-10-15", end: "2026-10-29", opening: "2026-04-02", closing: "2026-07-31", resultDate: "", status: "realizada", rulesUrl: "https://static.mostra.org/_uploads/371c67a471638a92.pdf?v=1775088994396", confidence: "confirmado", notes: "A chamada aberta do regulamento é somente para longas; curtas presentes na programação não foram convertidos em chamada aberta." },
  calls: [
    { name: "Competição Novos Diretores", formats: ["longa"], genres: ["documentário", "ficção"], minMinutes: 70, minInclusive: true, minYear: 2025, countries: [], territoriesConfirmed: true, participationConditions: ["direção estreante"], premiere: "nacional", premiereRequirement: "obrigatória", premiereTerritory: "Brasil", premiereConditions: "Nenhuma exibição pública presencial ou online no Brasil, nem agendada antes das sessões do festival.", online: "restrito", onlineConditions: "Exibição pública online anterior no Brasil impede a participação.", pf: "não", pj: "sim", deadlines: [dl("final", "2026-07-31", "prazo final", 1)], fees: [], platform: "https://sistema.mostra.org/", restrictions: "Primeiro ou segundo longa da direção; concluído a partir de novembro de 2025; produtor ou representante legal." },
    { slug: "perspectiva", name: "Perspectiva Internacional e Mostra Brasil", formats: ["longa"], genres: ["documentário", "ficção"], minMinutes: 70, minInclusive: true, minYear: 2024, countries: [], territoriesConfirmed: true, premiere: "nacional", premiereRequirement: "obrigatória", premiereTerritory: "Brasil e cidade de São Paulo", premiereConditions: "Sem exibição online no Brasil; sem sessão presencial anterior em São Paulo; sem salas/online no Brasil até o fim do festival.", online: "restrito", onlineConditions: "Disponibilização pública online anterior no Brasil impede a participação.", pf: "não", pj: "sim", deadlines: [dl("final", "2026-07-31", "prazo final", 1)], fees: [], platform: "https://sistema.mostra.org/", restrictions: "Longas de qualquer nacionalidade; produtor ou representante legal." },
  ],
  coverage: cov({ localização: "São Paulo/SP, circuito exibidor múltiplo.", atividade: "50ª edição realizada em 2026.", categorias: "Novos Diretores; Perspectiva Internacional e Mostra Brasil.", duração: "Longas a partir de 70 minutos.", "elegibilidade territorial": "Qualquer nacionalidade; seção Brasil separada dentro da Perspectiva.", "produção/conclusão": "Novos Diretores: desde novembro/2025; Perspectiva: após janeiro/2024.", estreia: "Novos Diretores exige ineditismo no Brasil; Perspectiva veda sessão em São Paulo e online/salas no Brasil.", "exibição online": "Geobloqueio Brasil nas sessões digitais; histórico público online no Brasil restringe elegibilidade.", "pessoa autorizada a inscrever": "Produtor ou representante legal.", abertura: "2 de abril de 2026.", encerramento: "31 de julho de 2026.", realização: "15 a 29 de outubro de 2026.", relevância: "Cinquenta edições, alcance internacional e indústria audiovisual documentados." }, { taxas: "O regulamento não publica cobrança; ausência não foi tratada como gratuidade." }),
  relevance: rel([25, 20, 19, 18, 15], [93, 99], "internacional amplo", "A história de cinquenta edições, o alcance mundial e o papel industrial sustentam relevância muito alta.", ["Cinquenta edições.", "Panorama internacional e brasileiro em amplo circuito exibidor.", "Encontro de Ideias e articulação da indústria.", "Competição de novos realizadores e panorama mundial.", "Regulamento atual integral e chamada oficial."], "alta"),
});

apply({
  id: "festival-noturno", editionLabel: "2ª edição / 2026",
  references: [{ url: "https://www.noturnofestival.info/", title: "Noturno Festival — site oficial", note: "O domínio foi consultado, mas páginas internas passaram a redirecionar para conteúdo estranho; regras não puderam ser lidas." }, { url: "https://jc.uol.com.br/cultura/2026/04/13/segunda-edicao-do-noturno-festival-internacional-de-cinema-do-recife-abre-inscricoes-para-filmes.html", title: "JC — inscrições para o 2º Noturno", type: "fonte secundária", note: "Usada para datas e critérios publicados enquanto o regulamento oficial estava inacessível." }],
  locations: [{ city: "Recife", subdivisionCode: "PE", subdivisionName: "Pernambuco", municipalityCode: "2611606" }],
  activity: "ativo", frequency: "anual", organizer: "Noturno Festival",
  description: "Festival internacional noturno do Recife com chamada de curtas e longas convidados.",
  seasonality: season([4, 5], [8], [2026], "Chamada em abril/maio; realização em agosto."),
  edition: { year: 2026, number: "2", start: "2026-08-27", end: "2026-08-30", opening: "", closing: "2026-05-29", resultDate: "", status: "realizada", rulesUrl: "https://www.noturnofestival.info/", confidence: "parcial", notes: "O regulamento oficial não pôde ser recuperado porque o domínio redirecionava para conteúdo estranho; fonte jornalística preservada por campo." },
  calls: [{ name: "Curtas brasileiros e coproduções", formats: ["curta", "média"], genres, maxMinutes: 45, minYear: 2025, countries: ["Brasil"], territoriesConfirmed: false, deadlines: [dl("final", "2026-05-29", "23h59", 1)], fees: [], confidence: "parcial", restrictions: "Produzidos no Brasil ou coproduções; longas da programação são convidados, não parte desta chamada." }],
  coverage: cov({ localização: "Cinema São Luiz e Cinema da Fundação, Recife/PE.", atividade: "2ª edição realizada em 2026.", categorias: "Chamada para curtas; longas por convite.", duração: "Até 45 minutos.", "elegibilidade territorial": "Produções brasileiras ou coproduções.", "produção/conclusão": "Finalizados desde janeiro de 2025.", encerramento: "29 de maio de 2026, 23h59.", realização: "27 a 30 de agosto de 2026.", relevância: "Segunda edição em salas públicas de referência." }, { estreia: "Regulamento inacessível.", "exibição online": "Regulamento inacessível.", "pessoa autorizada a inscrever": "Regulamento inacessível.", taxas: "Regulamento inacessível.", abertura: "Data exata não publicada na fonte recuperada." }),
  relevance: rel([5, 13, 8, 14, 8], [38, 59], "regional/local", "As salas parceiras e o perfil internacional indicam alcance intermediário emergente.", ["Duas edições.", "Cinema São Luiz e Cinema da Fundação.", "Sem mercado formal documentado.", "Programação internacional noturna.", "Fonte atual parcial; site oficial comprometido/inacessível."], "baixa"),
});

apply({
  id: "festival-arapiraca", editionLabel: "5ª edição / 2026",
  references: [{ url: "https://festivaldecinemadearapiraca.com/home/regulamentoptbr/", title: "V Festival de Cinema de Arapiraca — regulamento", note: "Regulamento oficial integralmente lido." }],
  locations: [{ city: "Arapiraca", subdivisionCode: "AL", subdivisionName: "Alagoas", municipalityCode: "2700300" }],
  activity: "ativo", frequency: "anual", organizer: "Festival de Cinema de Arapiraca",
  description: "Festival do Agreste alagoano com panoramas nacional, interior, latino-americano e infantil.",
  seasonality: season([8, 9], [12], [2026], "Inscrições em agosto/setembro; evento em dezembro."),
  edition: { year: 2026, number: "5", start: "2026-12-01", end: "2026-12-06", opening: "2026-08-02", closing: "2026-09-02", resultDate: "2026-11-06", status: "planejada", rulesUrl: "https://festivaldecinemadearapiraca.com/home/regulamentoptbr/", confidence: "confirmado", notes: "Quatro chamadas mantidas separadas; o regulamento não informa taxa." },
  calls: [
    { ...currentBase, name: "Panorama Brasil", formats: ["curta", "média"], maxMinutes: 25, creditsIncluded: true, minYear: 2025, countries: ["Brasil"], territoriesConfirmed: true, deadlines: [dl("final", "2026-09-02", "23h59")], fees: [], pf: "sim", pj: "sim", restrictions: "Responsável deve deter os direitos." },
    { ...currentBase, slug: "margens", name: "Margens Interiores", formats: ["curta", "média"], maxMinutes: 25, creditsIncluded: true, minYear: 2025, countries: ["Brasil"], territoriesConfirmed: false, deadlines: [dl("final", "2026-09-02", "23h59")], fees: [], pf: "sim", pj: "sim", restrictions: "Maioria da equipe residente fora de capitais e produtora sediada fora de capital." },
    { ...currentBase, slug: "latino", name: "Panorama Latino-Americano", formats: ["curta", "média"], maxMinutes: 25, creditsIncluded: true, minYear: 2025, territoriesConfirmed: false, deadlines: [dl("final", "2026-09-02", "23h59")], fees: [], pf: "sim", pj: "sim", restrictions: "Produções latino-americanas; responsável deve deter os direitos." },
    { ...currentBase, slug: "infantil", name: "Mostra Infantil", formats: ["curta", "média"], maxMinutes: 25, creditsIncluded: true, minYear: 2025, countries: ["Brasil"], territoriesConfirmed: true, audiences: ["infantil"], selectionType: "não competitiva", deadlines: [dl("final", "2026-09-02", "23h59")], fees: [], pf: "sim", pj: "sim", restrictions: "Produções brasileiras com classificação livre." },
  ],
  coverage: cov({ localização: "Arapiraca/AL.", atividade: "5ª edição com chamada 2026.", categorias: "Panorama Brasil, Margens Interiores, Latino-Americano e Infantil.", duração: "Até 25 minutos, créditos incluídos.", "elegibilidade territorial": "Recortes Brasil, interior brasileiro e América Latina separados.", "produção/conclusão": "Finalizados desde janeiro de 2025.", estreia: "Nenhuma exigência localizada.", "pessoa autorizada a inscrever": "Responsável detentor dos direitos; PF/PJ aceitas.", abertura: "2 de agosto de 2026.", encerramento: "2 de setembro de 2026, 23h59.", realização: "1º a 6 de dezembro de 2026.", relevância: "Cinco edições e recorte de interiorização/América Latina documentados." }, { "exibição online": "Não localizada.", taxas: "Não publicadas no regulamento; ausência não foi tratada como gratuidade." }),
  relevance: rel([11, 15, 11, 19, 13], [62, 76], "regional/local", "A interiorização e os panoramas nacional/latino-americano sustentam relevância alta regional.", ["Cinco edições.", "Quatro panoramas de alcance nacional e latino-americano.", "Sem mercado formal documentado.", "Mostra específica para interiores.", "Regulamento atual integral."], "alta"),
});

apply({
  id: "festival-motriz", editionLabel: "3ª edição / 2024",
  references: [previousReference("https://www.cinemotriz.com.br/wp-content/uploads/2024/06/Regulamento-3o-Motriz-Festival-de-Cinema-de-Planaltina.pdf", "Regulamento do 3º Motriz", "3ª edição / 2024", "Regulamento oficial de cinco páginas integralmente lido; nenhuma edição de 2025/2026 localizada."), previousReference("https://www.cinemotriz.com.br/", "Motriz 2024 — programação e balanço", "3ª edição / 2024")],
  locations: [{ city: "Brasília", district: "Planaltina", subdivisionCode: "DF", subdivisionName: "Distrito Federal", municipalityCode: "5300108" }],
  activity: "atividade não confirmada", frequency: "não confirmada", organizer: "Instituto Afrolatinas e Coletivo Motriz",
  description: "Festival de curtas brasileiros em Planaltina, orientado a narrativas periféricas, anticoloniais e diversas.",
  seasonality: season([6, 7], [10], [2024], "Última chamada e realização localizadas em 2024."),
  edition: { year: 2024, number: "3", start: "2024-10-23", end: "2024-10-26", opening: "2024-06-18", closing: "2024-07-15", resultDate: "2024-08-23", status: "realizada", rulesUrl: "https://www.cinemotriz.com.br/wp-content/uploads/2024/06/Regulamento-3o-Motriz-Festival-de-Cinema-de-Planaltina.pdf", confidence: "edição anterior", notes: "Nenhuma nova edição ou chamada foi localizada até 4/10/2026." },
  calls: [{ ...currentBase, name: "Curtas nacionais", formats: ["curta", "média"], maxMinutes: 30, minYear: 2022, countries: ["Brasil"], territoriesConfirmed: true, deadlines: [dl("final", "2024-07-15", "23h59")], fees: [fee(0, "BRL", "final", ["Curtas nacionais"])], pf: "sim", pj: "sim", resubmission: "sim", restrictions: "Responsável deve deter ou representar os direitos; exclui sexo explícito, culto à violência e abordagem preconceituosa.", confidence: "edição anterior" }],
  coverage: cov({}, { atividade: "Nenhuma edição posterior a 2024 localizada." }, {}, { localização: "Complexo Cultural de Planaltina, Brasília/DF.", categorias: "Mostra Competitiva e mostras paralelas de curtas nacionais.", duração: "Até 30 minutos.", "elegibilidade territorial": "Produções brasileiras.", "produção/conclusão": "Finalizados desde janeiro de 2022.", estreia: "Sem exigência; filmes não selecionados antes podem retornar.", "exibição online": "Link privado apenas para seleção.", "pessoa autorizada a inscrever": "Detentor dos direitos ou pessoa autorizada.", taxas: "Inscrição gratuita; cachê de exibição de R$ 320 por obra selecionada.", abertura: "18 de junho de 2024.", encerramento: "15 de julho de 2024, 23h59.", realização: "23 a 26 de outubro de 2024.", relevância: "Três edições, 913 inscrições e formação periférica documentadas." }),
  relevance: rel([8, 14, 15, 19, 8], [52, 72], "regional/local", "A política periférica, a formação e o apoio a realizadores sustentam relevância alta regional, reduzida pela ausência de continuidade recente.", ["Três edições.", "913 inscrições em 2024.", "Cachê, prêmios, transporte e hospedagem para selecionados.", "Referência de cinema periférico em Planaltina.", "Regulamento integral de 2024; continuidade não confirmada."], "média"),
});

apply({
  id: "festival-cinejardim", editionLabel: "9ª edição / 2026",
  references: [{ url: "https://cinejardim.com/", title: "9º Cine Jardim — site oficial", note: "Confirma edição, programação e período de 17–22/8." }, { url: "https://filmfreeway.com/CineJardim", title: "9º Cine Jardim — regulamento", type: "plataforma de inscrição", note: "Regras integralmente lidas; contém conflitos entre títulos de seções e data final do evento." }],
  locations: [{ city: "Belo Jardim", subdivisionCode: "PE", subdivisionName: "Pernambuco", municipalityCode: "2601706" }],
  activity: "ativo", frequency: "anual", organizer: "Cine Jardim",
  description: "Festival latino-americano no Agreste pernambucano, com longas brasileiros e curtas latino-americanos e infantojuvenis.",
  seasonality: season([4, 5, 6], [8], [2026], "Inscrições de abril a junho; evento em agosto."),
  edition: { year: 2026, number: "9", start: "2026-08-17", end: "2026-08-22", opening: "2026-04-09", closing: "2026-06-27", resultDate: "", status: "realizada", rulesUrl: "https://filmfreeway.com/CineJardim", confidence: "parcial", notes: "Site e apresentação informam 17–22/8; artigo 1º do regulamento termina em 21/8. A organização das mostras no artigo 3º também contém rótulos contraditórios." },
  calls: [
    { ...currentBase, name: "Competitiva de curtas latino-americanos", formats: ["curta"], maxMinutes: 30, creditsIncluded: true, minYear: 2025, territoriesConfirmed: false, deadlines: [dl("final", "2026-06-27", "prazo final", 1)], fees: [fee(0, "BRL", "final", ["Todas as categorias"], 1)], pf: "sim", pj: "sim", restrictions: "Países latino-americanos exceto Brasil, conforme lista do regulamento; máximo de duas obras por realizador.", confidence: "parcial" },
    { ...currentBase, slug: "longas-br", name: "Competitiva de longas brasileiros", formats: ["longa"], minMinutes: 70, minInclusive: true, minYear: 2025, countries: ["Brasil"], territoriesConfirmed: true, deadlines: [dl("final", "2026-06-27", "prazo final", 1)], fees: [fee(0, "BRL", "final", ["Todas as categorias"], 1)], pf: "sim", pj: "sim", restrictions: "Máximo de duas obras por realizador.", confidence: "parcial" },
    { ...currentBase, slug: "infantojuvenil", name: "Infantojuvenil internacional", formats: ["curta"], maxMinutes: 30, creditsIncluded: true, minYear: 2023, audiences: ["infantil", "juvenil"], selectionType: "não competitiva", territoriesConfirmed: false, deadlines: [dl("final", "2026-06-27", "prazo final", 1)], fees: [fee(0, "BRL", "final", ["Todas as categorias"], 1)], pf: "sim", pj: "sim", restrictions: "Produções estrangeiras, exceto Brasil; máximo de duas obras por realizador.", confidence: "parcial" },
    { ...currentBase, slug: "curtas-br", name: "Curtas brasileiros", formats: ["curta"], maxMinutes: 30, creditsIncluded: true, minYear: 2025, countries: ["Brasil"], territoriesConfirmed: true, selectionType: "não competitiva", deadlines: [dl("final", "2026-06-27", "prazo final", 1)], fees: [fee(0, "BRL", "final", ["Todas as categorias"], 1)], pf: "sim", pj: "sim", restrictions: "Máximo de duas obras por realizador.", confidence: "parcial" },
  ],
  coverage: cov({ localização: "Belo Jardim/PE, Cineteatro Cultura e espaços públicos.", atividade: "9ª edição realizada em 2026.", categorias: "Longas brasileiros, curtas latino-americanos, brasileiros e infantojuvenis internacionais.", duração: "Curtas até 30; longas a partir de 70 minutos.", "elegibilidade territorial": "Brasil, América Latina sem Brasil e exterior separados por mostra.", "produção/conclusão": "Em geral 2025+; infantojuvenil 2023+.", estreia: "Nenhuma exigência localizada.", "pessoa autorizada a inscrever": "Responsável pelos direitos; até duas obras.", taxas: "Inscrição gratuita.", abertura: "9 de abril de 2026.", encerramento: "27 de junho de 2026.", relevância: "Nove edições, formação e interiorização documentadas." }, { "exibição online": "Não localizada." }, { realização: "Site/apresentação: 17–22/8; artigo 1º: 17–21/8.", categorias: "O artigo 3º mistura rótulos competitivos e não competitivos; chamadas mantidas com confiança parcial." }),
  relevance: rel([17, 16, 12, 18, 12], [67, 82], "regional/local", "A continuidade, o alcance latino-americano e a interiorização sustentam relevância alta.", ["Nove edições.", "Programação de cerca de 80 filmes e alcance latino-americano.", "Ações formativas e acessibilidade.", "Referência audiovisual no Agreste pernambucano.", "Regulamento atual com conflitos editoriais explícitos."], "alta"),
});

apply({
  id: "festival-fecine", editionLabel: "2ª edição / 2025",
  references: [previousReference("https://fecine.com.br/wp-content/uploads/2025/08/2-FECINE-Regulamento.pdf", "Regulamento do 2º FECINE", "2ª edição / 2025", "Regulamento oficial integralmente lido; nenhuma chamada de 2026 localizada.")],
  locations: [{ city: "Areia", subdivisionCode: "PB", subdivisionName: "Paraíba", municipalityCode: "2501104" }],
  activity: "atividade não confirmada", frequency: "não confirmada", organizer: "FECINE",
  description: "Festival de cinema do Nordeste brasileiro realizado em Areia/PB.",
  seasonality: season([8, 9], [10], [2025], "Última chamada e evento localizados em 2025."),
  edition: { year: 2025, number: "2", start: "2025-10-20", end: "2025-10-25", opening: "2025-08-11", closing: "2025-09-06", resultDate: "2025-09-22", status: "realizada", rulesUrl: "https://fecine.com.br/wp-content/uploads/2025/08/2-FECINE-Regulamento.pdf", confidence: "edição anterior", notes: "O texto literal aceita obras finalizadas 'nos anos de 2023 e 2025', omitindo 2024; a anomalia não foi corrigida por inferência." },
  calls: [
    { ...currentBase, name: "Curtas nordestinos", formats: ["curta", "média"], maxMinutes: 25, maxYear: 2025, countries: ["Brasil"], regions: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"], territoriesConfirmed: false, deadlines: [dl("final", "2025-09-06", "23h59")], fees: [], pf: "sim", pj: "sim", restrictions: "Criadores nordestinos ou residentes no Nordeste há pelo menos cinco anos; ficção ou documentário; anos literais 2023 e 2025.", confidence: "edição anterior" },
    { ...currentBase, slug: "longas", name: "Longas nordestinos", formats: ["longa"], minMinutes: 60, minInclusive: false, maxYear: 2025, countries: ["Brasil"], regions: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"], territoriesConfirmed: false, deadlines: [dl("final", "2025-09-06", "23h59")], fees: [], pf: "sim", pj: "sim", restrictions: "Criadores nordestinos ou residentes no Nordeste há pelo menos cinco anos; ficção ou documentário; anos literais 2023 e 2025.", confidence: "edição anterior" },
  ],
  coverage: cov({}, { atividade: "Nenhuma edição/chamada de 2026 localizada.", taxas: "Regulamento de 2025 não explicita cobrança ou gratuidade.", estreia: "Não localizada.", "exibição online": "Não localizada." }, { "produção/conclusão": "Texto literal menciona 2023 e 2025, omitindo 2024." }, { localização: "Areia/PB.", categorias: "Curtas e longas de ficção/documentário.", duração: "Curtas até 25; longas acima de 60 minutos.", "elegibilidade territorial": "Criação nordestina ou residência no Nordeste por cinco anos.", "pessoa autorizada a inscrever": "PF, PJ, coletivos, diretores ou produtores.", abertura: "11 de agosto de 2025.", encerramento: "6 de setembro de 2025.", realização: "20 a 25 de outubro de 2025.", relevância: "Duas edições e recorte regional documentados." }),
  relevance: rel([5, 12, 8, 17, 7], [38, 59], "regional/local", "O recorte nordestino e a realização no interior sustentam alcance intermediário emergente.", ["Duas edições.", "Seleção regional de curtas e longas.", "Sem mercado formal documentado.", "Foco no cinema nordestino.", "Regulamento de 2025; continuidade não confirmada."], "baixa"),
});

apply({
  id: "festival-lobofest", editionLabel: "17ª edição / chamada 2025, realização 2026",
  references: [{ url: "https://filmfreeway.com/LoboFestFestivalInternacionaldeFilmes", title: "17º LoboFest — regras", type: "plataforma de inscrição", note: "Regras integralmente lidas; versões portuguesa/inglesa divergem nas datas internacionais." }, { url: "https://aguasclarasmidia.com.br/wp-content/uploads/2026/03/FolhadeAG360.pdf", title: "Programação da 17ª edição do LoboFest", type: "fonte secundária", note: "Confirma realização de 18–20/3/2026 no Riacho Fundo." }],
  locations: [{ city: "Brasília", district: "Riacho Fundo", subdivisionCode: "DF", subdivisionName: "Distrito Federal", municipalityCode: "5300108" }],
  activity: "ativo", frequency: "anual", organizer: "LoboFest",
  description: "Festival internacional de curtas sediado no Distrito Federal, com mostras nacional e internacional.",
  seasonality: season([8, 9], [3], [2025, 2026], "Chamada em 2025 para realização em março de 2026."),
  edition: { year: 2026, number: "17", start: "2026-03-18", end: "2026-03-20", opening: "2025-08-20", closing: "2025-09-25", resultDate: "", status: "realizada", rulesUrl: "https://filmfreeway.com/LoboFestFestivalInternacionaldeFilmes", confidence: "parcial", notes: "O perfil ainda cita outro local; a programação de 2026 confirma Escola Classe 01 do Riacho Fundo. Prazos internacionais divergem entre idiomas." },
  calls: [
    { ...currentBase, name: "Curtas nacionais", formats: ["curta", "média"], minMinutes: 5, maxMinutes: 30, creditsIncluded: false, minYear: 2024, countries: ["Brasil"], territoriesConfirmed: true, opening: "2025-08-20", deadlines: [dl("final", "2025-09-25", "prazo final")], fees: [], pf: "sim", pj: "sim", online: "permitido", onlineConditions: "Exibição anterior não é vedada; selecionados autorizam festival e itinerância.", restrictions: "Até dois filmes por diretor; exclui obras inacabadas, publicitárias e institucionais; pacote de acessibilidade exigido ou ao menos um recurso." },
    { ...currentBase, slug: "internacionais", name: "Curtas internacionais", formats: ["curta", "média"], minMinutes: 5, maxMinutes: 30, creditsIncluded: false, minYear: 2024, territoriesConfirmed: false, opening: "2025-08-20", deadlines: [dl("final", "2025-09-20", "prazo final em uma versão"), dl("final", "2025-09-25", "prazo final em outra versão")], fees: [], pf: "sim", pj: "sim", online: "permitido", onlineConditions: "Exibição anterior não é vedada; selecionados autorizam festival e itinerância.", restrictions: "Até dois filmes por diretor; exclui obras inacabadas, publicitárias e institucionais.", confidence: "parcial" },
  ],
  coverage: cov({ localização: "Escola Classe 01 do Riacho Fundo, Brasília/DF.", atividade: "17ª edição realizada em março de 2026.", categorias: "Curtas nacionais e internacionais.", duração: "5 a 30 minutos, sem títulos/créditos iniciais e finais.", "elegibilidade territorial": "Brasil e exterior separados.", "produção/conclusão": "Finalizados desde 2024.", estreia: "Não exige estreia; impede apenas filmes de edições anteriores.", "exibição online": "Autoriza festival e itinerância; histórico anterior não vedado.", "pessoa autorizada a inscrever": "Diretor/responsável pelos direitos; até duas obras.", abertura: "20 de agosto de 2025.", realização: "18 a 20 de março de 2026.", relevância: "Dezessete edições e alcance internacional documentados." }, { taxas: "Tarifas de inscrição não aparecem no texto recuperado." }, { encerramento: "Chamada nacional: 25/9/2025; internacional: versões PT/EN divergem entre 20 e 25/9." }),
  relevance: rel([20, 15, 10, 16, 12], [66, 80], "regional/local", "A continuidade de dezessete edições e o alcance internacional sustentam relevância alta.", ["Dezessete edições.", "Mostras nacional e internacional.", "Itinerância; sem mercado formal documentado.", "Difusão comunitária no Distrito Federal.", "Regras atuais com conflito de tradução registrado."], "alta"),
});

apply({
  id: "festival-estranhos", editionLabel: "2ª edição / 2026",
  references: [{ url: "https://www.estranhosencontros.com/", title: "2º Estranhos Encontros — site oficial", note: "Confirma programa, datas e espaços." }, { url: "https://filmfreeway.com/estranhosencontros", title: "2º Estranhos Encontros — regras e taxas", type: "plataforma de inscrição", note: "Regras, lotes e taxas integralmente lidos." }],
  locations: [{ city: "São Paulo", subdivisionCode: "SP", subdivisionName: "São Paulo", municipalityCode: "3550308" }],
  activity: "ativo", frequency: "anual", organizer: "Estranhos Encontros",
  description: "Festival internacional de cinema independente em São Paulo, com longas e curtas brasileiros e estrangeiros.",
  seasonality: season([2, 3, 4, 5, 6], [9], [2026], "Inscrições de fevereiro a junho; realização em setembro."),
  edition: { year: 2026, number: "2", start: "2026-09-16", end: "2026-09-27", opening: "2026-02-28", closing: "2026-06-15", resultDate: "2026-07-31", status: "realizada", rulesUrl: "https://filmfreeway.com/estranhosencontros", confidence: "confirmado", notes: "O limite de 45 minutos aparece simultaneamente como máximo de curta e mínimo de longa; a sobreposição foi preservada." },
  calls: [
    { ...currentBase, name: "Curtas brasileiros", formats: ["curta", "média"], maxMinutes: 45, minYear: 2024, maxYear: 2026, countries: ["Brasil"], territoriesConfirmed: true, opening: "2026-02-28", deadlines: [dl("early", "2026-03-31", "early"), dl("regular", "2026-05-25", "regular"), dl("final", "2026-06-15", "final")], fees: [fee(8, "USD", "early", ["Curtas brasileiros"]), fee(10, "USD", "regular", ["Curtas brasileiros"]), fee(12, "USD", "final", ["Curtas brasileiros"])], pf: "sim", pj: "sim", restrictions: "Qualquer gênero/formato; WIP aceito se concluído até 20/7; sem exigência de estreia." },
    { ...currentBase, slug: "curtas-int", name: "Curtas internacionais", formats: ["curta", "média"], maxMinutes: 45, minYear: 2024, maxYear: 2026, territoriesConfirmed: false, opening: "2026-02-28", deadlines: [dl("early", "2026-03-31", "early"), dl("regular", "2026-05-25", "regular"), dl("final", "2026-06-15", "final")], fees: [fee(12, "USD", "early", ["Curtas internacionais"]), fee(15, "USD", "regular", ["Curtas internacionais"]), fee(20, "USD", "final", ["Curtas internacionais"])], pf: "sim", pj: "sim", restrictions: "Qualquer país/gênero/formato; legendas em inglês ou português; WIP até 20/7." },
    { ...currentBase, slug: "longas-br", name: "Longas brasileiros", formats: ["longa"], minMinutes: 45, minInclusive: true, minYear: 2024, maxYear: 2026, countries: ["Brasil"], territoriesConfirmed: true, opening: "2026-02-28", deadlines: [dl("early", "2026-03-31", "early"), dl("regular", "2026-05-25", "regular"), dl("final", "2026-06-15", "final")], fees: [fee(20, "USD", "early", ["Longas brasileiros"]), fee(25, "USD", "regular", ["Longas brasileiros"]), fee(30, "USD", "final", ["Longas brasileiros"])], pf: "sim", pj: "sim", restrictions: "Qualquer gênero/formato; WIP aceito se concluído até 20/7; sem exigência de estreia." },
    { ...currentBase, slug: "longas-int", name: "Longas internacionais", formats: ["longa"], minMinutes: 45, minInclusive: true, minYear: 2024, maxYear: 2026, territoriesConfirmed: false, opening: "2026-02-28", deadlines: [dl("early", "2026-03-31", "early"), dl("regular", "2026-05-25", "regular"), dl("final", "2026-06-15", "final")], fees: [fee(25, "USD", "early", ["Longas internacionais"]), fee(35, "USD", "regular", ["Longas internacionais"]), fee(50, "USD", "final", ["Longas internacionais"])], pf: "sim", pj: "sim", restrictions: "Qualquer país/gênero/formato; legendas em inglês ou português; WIP até 20/7." },
  ],
  coverage: cov({ localização: "CCSP, Galeria Olido e Instituto Cervantes, São Paulo/SP.", atividade: "2ª edição realizada em 2026.", categorias: "Curtas brasileiros/internacionais e longas brasileiros/internacionais.", duração: "Curtas até 45; longas a partir de 45 minutos.", "elegibilidade territorial": "Brasil e exterior separados.", "produção/conclusão": "Obras de 2024 a 2026; WIP até 20/7.", estreia: "Nenhuma exigência.", "exibição online": "Histórico online anterior não restringido.", "pessoa autorizada a inscrever": "Qualquer pessoa ou coletivo responsável pelos direitos.", taxas: "USD 8–12 curtas BR; 12–20 curtas INT; 20–30 longas BR; 25–50 longas INT.", abertura: "28 de fevereiro de 2026.", encerramento: "15 de junho de 2026.", realização: "16 a 27 de setembro de 2026.", relevância: "Segunda edição com parceiros públicos e programação internacional." }, {}, { duração: "Exatamente 45 minutos se enquadra nas definições de curta e longa do texto." }),
  relevance: rel([5, 15, 10, 17, 15], [55, 70], "especializado", "O programa internacional e as instituições parceiras sustentam relevância alta emergente.", ["Duas edições.", "Programação internacional em três espaços culturais.", "Sem mercado formal documentado.", "Cinema independente e experimental.", "Regras atuais integrais e transparentes."], "alta"),
});

apply({
  id: "festival-cinedoscampos", editionLabel: "2ª edição / 2025",
  references: [previousReference("https://www.cinedoscampos.com.br/inscri%C3%A7%C3%B5es", "2º Cine dos Campos — inscrições", "2ª edição / 2025", "Página oficial integralmente lida; nenhuma edição de 2026 localizada.")],
  locations: [{ city: "Ponta Grossa", subdivisionCode: "PR", subdivisionName: "Paraná", municipalityCode: "4119905" }],
  activity: "atividade não confirmada", frequency: "não confirmada", organizer: "Cine dos Campos",
  description: "Festival de Ponta Grossa com mostra nacional, mostra local e eixo de inclusão/acessibilidade.",
  seasonality: season([7, 8], [11], [2025], "Última chamada e evento localizados em 2025."),
  edition: { year: 2025, number: "2", start: "2025-11-28", end: "2025-11-30", opening: "2025-07-28", closing: "2025-08-23", resultDate: "2025-10-01", status: "realizada", rulesUrl: "https://www.cinedoscampos.com.br/inscri%C3%A7%C3%B5es", confidence: "edição anterior", notes: "Nenhuma edição/chamada de 2026 foi localizada." },
  calls: [
    { ...currentBase, name: "Mostra Competitiva Brasileira", formats: ["curta", "média"], maxMinutes: 25, minYear: 2024, maxYear: 2025, countries: ["Brasil"], territoriesConfirmed: true, deadlines: [dl("final", "2025-08-23", "prazo final")], fees: [], pf: "sim", pj: "sim", restrictions: "Finalizados de julho/2024 a agosto/2025; exclui videoclipes, publicidade e institucional; WIP apenas em mixagem, cor ou master.", confidence: "edição anterior" },
    { ...currentBase, slug: "pg", name: "PG em Cena", formats: ["curta", "média"], maxMinutes: 25, minYear: 2024, maxYear: 2025, countries: ["Brasil"], regions: ["PR"], territoriesConfirmed: false, deadlines: [dl("final", "2025-08-23", "prazo final")], fees: [], pf: "sim", pj: "sim", restrictions: "Obras realizadas em Ponta Grossa; demais critérios da mostra local não foram integralmente recuperados.", confidence: "edição anterior" },
  ],
  coverage: cov({}, { atividade: "Nenhuma edição de 2026 localizada.", taxas: "A página não explicita cobrança ou gratuidade.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não detalhada além do responsável." }, {}, { localização: "Ponta Grossa/PR.", categorias: "Competitiva Brasileira, PG em Cena e Inclusiva.", duração: "Curtas até 25 minutos na mostra nacional.", "elegibilidade territorial": "Brasil e recorte local de Ponta Grossa.", "produção/conclusão": "Julho/2024 a agosto/2025; WIP limitado.", estreia: "Sem exigência.", abertura: "28 de julho de 2025.", encerramento: "23 de agosto de 2025.", realização: "28 a 30 de novembro de 2025.", relevância: "Duas edições e eixo local/inclusivo documentados." }),
  relevance: rel([5, 10, 7, 14, 7], [33, 54], "regional/local", "O eixo local e inclusivo sustenta alcance intermediário emergente, com continuidade ainda não confirmada.", ["Duas edições.", "Mostra nacional e local.", "Sem mercado formal documentado.", "Eixo inclusivo/acessível.", "Página de 2025; continuidade ausente."], "baixa"),
});

apply({
  id: "festival-blackqueer", editionLabel: "2ª edição / 2026",
  references: [{ url: "https://www.blackqueerfestival.com/", title: "Black Queer Festival 2026 — site oficial", note: "Confirma cidades, espaços e período geral." }, { url: "https://filmfreeway.com/BlackQueerFestival", title: "Black Queer Festival — regras, lotes e taxas", type: "plataforma de inscrição", note: "Regras integralmente lidas; o corpo e os campos da plataforma contêm conflitos de edição, ano e prazo." }],
  locations: [
    { city: "Rio de Janeiro", subdivisionCode: "RJ", subdivisionName: "Rio de Janeiro", municipalityCode: "3304557", role: "exibição" },
    { city: "São Paulo", subdivisionCode: "SP", subdivisionName: "São Paulo", municipalityCode: "3550308", role: "exibição" },
  ],
  activity: "ativo", frequency: "anual", organizer: "Black Queer Festival",
  description: "Festival especializado em cinema negro, indígena e LGBTQIAPN+, com etapas no Rio de Janeiro e em São Paulo.",
  seasonality: season([2, 3, 4, 5, 6, 7], [11], [2026], "Lotes de fevereiro a julho; datas específicas em novembro."),
  edition: { year: 2026, number: "2", start: "2026-11-14", end: "2026-11-15", opening: "2026-02-10", closing: "2026-07-10", resultDate: "2026-10-10", status: "planejada", rulesUrl: "https://filmfreeway.com/BlackQueerFestival", confidence: "parcial", notes: "Perfil indica dois anos, mas o corpo ainda chama a edição de primeira. O site prevê atividades em outubro/novembro; a plataforma fixa 14–15/11." },
  calls: [
    { name: "Curtas brasileiros", formats: ["curta", "média"], genres, maxMinutes: 25, creditsIncluded: true, minYear: 2015, maxYear: 2026, countries: ["Brasil"], territoriesConfirmed: true, themes: ["LGBTQIAPN+", "cinema negro", "cinema indígena"], opening: "2026-02-10", deadlines: [dl("final", "2026-07-10", "extended deadline", 1, "Texto interno encerrava em 20/6")], fees: [fee(0, "BRL", "final", ["Curtas brasileiros"], 1)], pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", restrictions: "Tema LGBTQIAPN+ central; autoria negra no Brasil ou protagonista negro/indígena LGBTQIAPN+; legendas em português incorporadas." },
    { name: "Curtas internacionais", slug: "curtas-int", formats: ["curta", "média"], genres, maxMinutes: 25, creditsIncluded: true, minYear: 2015, maxYear: 2026, themes: ["LGBTQIAPN+", "cinema negro", "cinema indígena"], opening: "2026-02-10", deadlines: [dl("early", "2026-02-22", "early", 1), dl("regular", "2026-04-10", "regular", 1), dl("late", "2026-06-20", "late", 1), dl("final", "2026-07-10", "extended", 1)], fees: [fee(5, "USD", "early", ["Curtas internacionais"], 1, { discount: "Gold: USD 3,75" }), fee(10, "USD", "regular", ["Curtas internacionais"], 1, { discount: "Gold: USD 7,50" }), fee(20, "USD", "late", ["Curtas internacionais"], 1, { discount: "Gold: USD 15" }), fee(30, "USD", "final", ["Curtas internacionais"], 1, { discount: "Gold: USD 22,50" })], pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", restrictions: "Tema LGBTQ+ central; realizadores LGBTQ+ residentes fora do Brasil ou protagonista negro/indígena LGBTQ+; legendas em português incorporadas." },
    { name: "Paralela internacional", slug: "paralela-int", formats: ["curta", "média"], workTypes: ["filme", "videoclipe", "série"], genres, maxMinutes: 60, maxYear: 2014, themes: ["LGBTQIAPN+", "cinema negro", "cinema indígena"], opening: "2026-02-10", deadlines: [dl("early", "2026-02-22", "early", 1), dl("regular", "2026-04-10", "regular", 1), dl("late", "2026-06-20", "late", 1), dl("final", "2026-07-10", "extended", 1)], fees: [fee(5, "USD", "early", ["Paralela internacional"], 1), fee(10, "USD", "regular", ["Paralela internacional"], 1), fee(20, "USD", "late", ["Paralela internacional"], 1), fee(30, "USD", "final", ["Paralela internacional"], 1, { discount: "Gold: USD 25" })], pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", restrictions: "Filmes de 2000–2014; videoclipes e séries podem ser de qualquer ano." },
    { name: "Paralela brasileira", slug: "paralela-br", formats: ["curta", "média"], workTypes: ["filme", "videoclipe", "série"], genres, maxMinutes: 60, countries: ["Brasil"], territoriesConfirmed: true, themes: ["LGBTQIAPN+", "cinema negro", "cinema indígena"], opening: "2026-02-10", deadlines: [dl("final", "2026-07-10", "extended", 1)], fees: [fee(0, "BRL", "final", ["Paralela brasileira"], 1)], pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", restrictions: "O corpo limita filmes a 2000–2014; o título da categoria na plataforma indica 2000–2017. Videoclipes/séries podem ser de qualquer ano.", confidence: "parcial" },
    { name: "Longas brasileiros e internacionais", slug: "longas", formats: ["longa"], genres, minMinutes: 60, minInclusive: false, minYear: 2000, maxYear: 2026, themes: ["LGBTQIAPN+", "cinema negro", "cinema indígena"], opening: "2026-02-10", deadlines: [dl("early", "2026-02-22", "early", 1), dl("regular", "2026-04-10", "regular", 1), dl("late", "2026-06-20", "late", 1), dl("final", "2026-07-10", "extended", 1)], fees: [fee(20, "USD", "early", ["Longas"], 1, { discount: "Gold: USD 15" }), fee(25, "USD", "regular", ["Longas"], 1, { discount: "Gold: USD 20" }), fee(30, "USD", "late", ["Longas"], 1, { discount: "Gold: USD 25" }), fee(50, "USD", "final", ["Longas"], 1, { discount: "Gold: USD 40" })], pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", restrictions: "Tema e autoria/protagonismo conforme regulamento; legendas em português incorporadas." },
  ],
  coverage: cov({ localização: "Rio de Janeiro/RJ e São Paulo/SP, em cinco espaços culturais publicados.", atividade: "2ª edição programada em 2026.", categorias: "Curtas, paralelas e longas brasileiros/internacionais.", duração: "Curtas até 25; paralelas até 60; longas acima de 60 minutos.", "elegibilidade territorial": "Chamadas brasileiras e internacionais separadas, com recortes de autoria/protagonismo.", estreia: "Nenhuma exigência.", "exibição online": "Histórico online anterior não restringido; festival pode promover sessões físicas/online conforme autorização.", "pessoa autorizada a inscrever": "Responsável pelos direitos; até três obras por direção/coletivo.", taxas: "Chamadas brasileiras gratuitas; internacionais e longas com lotes em USD registrados por chamada.", abertura: "10 de fevereiro de 2026.", relevância: "Especialização negra/indígena/LGBTQIAPN+ e circulação em duas capitais." }, {}, { atividade: "Perfil indica dois anos, mas corpo residual diz primeira edição.", "produção/conclusão": "Paralela brasileira diverge entre 2000–2014 e 2000–2017.", encerramento: "Texto interno encerra 20/6; plataforma acrescenta lote estendido até 10/7.", realização: "Site informa outubro/novembro; plataforma fixa 14–15/11." }),
  relevance: rel([5, 14, 9, 20, 12], [52, 68], "especializado", "A especialização e a presença em duas capitais sustentam relevância alta emergente.", ["Segunda edição indicada pela plataforma.", "Etapas em Rio e São Paulo.", "Sem mercado formal documentado.", "Foco negro, indígena e LGBTQIAPN+.", "Regras atuais extensas, com conflitos residuais registrados."], "média"),
});

apply({
  id: "festival-macacucine", editionLabel: "18ª edição / 2026",
  references: [
    { url: "https://www.macacucine.com.br/inscricao", title: "18º MacacuCine — inscrições", note: "Página oficial com os seis regulamentos atuais." },
    { url: "https://drive.google.com/file/d/18tTUm3WhQlPOVOYYdt-Cck-jwK2OdrgL/view", title: "Regulamento Mostra Livre 2026", note: "PDF oficial integralmente lido." },
    { url: "https://drive.google.com/file/d/1exE8qNeoe5RThkSleqWP80WLs7gg90Om/view", title: "Regulamento Curtas Escolares Brasil 2026", note: "PDF oficial integralmente lido." },
    { url: "https://drive.google.com/file/d/1GrQ8MYIwevBi84lpF2QMBQOELT__OWB2/view", title: "Regulamento Curtas Universitários Brasil 2026", note: "PDF oficial integralmente lido." },
    { url: "https://drive.google.com/file/d/1ACoCKiYQb0zn9xNys52b8DRgh_af_Cb2/view", title: "Regulamento Micrometragens 2026", note: "PDF oficial integralmente lido." },
    { url: "https://drive.google.com/file/d/1oOYzV0dKalFatxRBsFIYTI4hN5tCRnMd/view", title: "Regulamento Curtas Escolares Internacional 2026", note: "PDF oficial integralmente lido." },
    { url: "https://drive.google.com/file/d/1W4jnplVNhYJPI3XrIN-b-jgbGQdZueb-/view", title: "Regulamento Curtas Universitários Internacional 2026", note: "PDF oficial integralmente lido." },
  ],
  locations: [{ city: "Cachoeiras de Macacu", subdivisionCode: "RJ", subdivisionName: "Rio de Janeiro", municipalityCode: "3300803" }],
  activity: "ativo", frequency: "anual", organizer: "Rapsódia Empreendimentos Culturais e Associação Cultural Vale do Macacu",
  description: "Festival internacional com mostras livre, escolares, universitárias e de micrometragens, presencial e online.",
  seasonality: season([2, 3, 4, 5, 6], [8], [2026], "Chamadas entre fevereiro e junho; evento em agosto."),
  edition: { year: 2026, number: "18", start: "2026-08-14", end: "2026-08-23", opening: "2026-02-23", closing: "2026-06-21", resultDate: "2026-07-22", status: "realizada", rulesUrl: "https://www.macacucine.com.br/inscricao", confidence: "confirmado", notes: "Seis regulamentos atuais lidos integralmente; cada chamada preserva seu próprio prazo, limite e recorte territorial." },
  calls: [
    { ...currentBase, name: "Mostra Livre — Cartografias do Afeto", formats: ["curta", "média"], maxMinutes: 20, creditsIncluded: true, countries: ["Brasil"], territoriesConfirmed: false, themes: ["Cartografias do Afeto"], opening: "2026-05-20", deadlines: [dl("final", "2026-06-21", "prazo final", 1)], fees: [fee(0, "BRL", "final", ["Mostra Livre"], 1)], pf: "sim", pj: "sim", premiere: "festival", premiereRequirement: "obrigatória", premiereTerritory: "MacacuCine", premiereConditions: "Não ter sido exibido em edição anterior do festival.", online: "permitido", onlineConditions: "Edição presencial e virtual; acervo cultural sem fins lucrativos com aviso prévio.", restrictions: "Realizadores residentes no Brasil; qualquer gênero/formato." },
    { ...currentBase, slug: "escolar-br", name: "Curtas Escolares Brasil", formats: ["curta"], maxMinutes: 15, creditsIncluded: true, countries: ["Brasil"], territoriesConfirmed: false, audiences: ["infantil", "juvenil"], participationConditions: ["estudante"], opening: "2026-02-23", deadlines: [dl("final", "2026-04-30", "prazo final", 2)], fees: [fee(0, "BRL", "final", ["Escolares Brasil"], 2)], pf: "sim", pj: "não", premiere: "festival", premiereRequirement: "obrigatória", premiereTerritory: "MacacuCine", premiereConditions: "Inédito no festival.", online: "permitido", onlineConditions: "Edição presencial/virtual e acervo cultural com aviso prévio.", restrictions: "Direção por aluno do ensino fundamental/médio, matriculado à época da obra e residente no Brasil; comprovante obrigatório." },
    { ...currentBase, slug: "universitario-br", name: "Curtas Universitários Brasil", formats: ["curta", "média"], maxMinutes: 25, creditsIncluded: true, countries: ["Brasil"], territoriesConfirmed: false, participationConditions: ["estudante"], opening: "2026-02-23", deadlines: [dl("final", "2026-04-30", "prazo final", 3)], fees: [fee(0, "BRL", "final", ["Universitários Brasil"], 3)], pf: "sim", pj: "não", premiere: "festival", premiereRequirement: "obrigatória", premiereTerritory: "MacacuCine", premiereConditions: "Inédito no festival.", online: "permitido", onlineConditions: "Edição presencial/virtual e acervo cultural com aviso prévio.", restrictions: "Direção por universitário matriculado à época da obra e residente no Brasil; comprovante obrigatório." },
    { ...currentBase, slug: "micro", name: "Micrometragens", formats: ["curta"], maxSeconds: 30, creditsIncluded: true, opening: "2026-02-23", deadlines: [dl("final", "2026-04-30", "prazo final", 4)], fees: [fee(0, "BRL", "final", ["Micrometragens"], 4)], pf: "sim", pj: "sim", premiere: "festival", premiereRequirement: "obrigatória", premiereTerritory: "MacacuCine", premiereConditions: "Inédito no festival.", online: "permitido", onlineConditions: "Edição presencial/virtual e acervo cultural com aviso prévio.", restrictions: "Qualquer formato/gênero; o regulamento não publica restrição territorial." },
    { ...currentBase, slug: "escolar-int", name: "Curtas Escolares Internacional", formats: ["curta"], maxMinutes: 15, creditsIncluded: true, audiences: ["infantil", "juvenil"], participationConditions: ["estudante"], opening: "2026-02-23", deadlines: [dl("final", "2026-04-30", "prazo final", 5)], fees: [fee(0, "BRL", "final", ["Escolares Internacional"], 5)], pf: "sim", pj: "não", premiere: "festival", premiereRequirement: "obrigatória", premiereTerritory: "MacacuCine", premiereConditions: "Inédito no festival.", online: "permitido", onlineConditions: "Edição presencial/virtual; opção de Portal CINEduca.", restrictions: "Direção por aluno de ensino fundamental/médio matriculado à época da obra; comprovante obrigatório; sem restrição territorial publicada." },
    { ...currentBase, slug: "universitario-int", name: "Curtas Universitários Internacional", formats: ["curta", "média"], maxMinutes: 25, creditsIncluded: true, participationConditions: ["estudante"], opening: "2026-02-23", deadlines: [dl("final", "2026-04-30", "prazo final", 6)], fees: [fee(0, "BRL", "final", ["Universitários Internacional"], 6)], pf: "sim", pj: "não", premiere: "festival", premiereRequirement: "obrigatória", premiereTerritory: "MacacuCine", premiereConditions: "Inédito no festival.", online: "permitido", onlineConditions: "Edição presencial/virtual e acervo cultural com aviso prévio.", restrictions: "Direção por universitário matriculado à época da obra; comprovante obrigatório; sem restrição territorial publicada." },
  ],
  coverage: cov({ localização: "Cachoeiras de Macacu/RJ e plataformas oficiais online.", atividade: "18ª edição realizada em 2026.", categorias: "Livre, escolares/universitárias Brasil e internacionais, e micrometragens.", duração: "Livre 20 min; escolar 15; universitário 25; micro 30 segundos.", "elegibilidade territorial": "Livre e categorias nacionais exigem residência no Brasil; internacionais e micro sem restrição territorial publicada.", estreia: "Inédito no próprio MacacuCine.", "exibição online": "Edição virtual e acervo cultural sem fins lucrativos com aviso prévio.", "pessoa autorizada a inscrever": "Direção, produção ou representante de produtora/coletivo; estudantes com comprovante nas categorias próprias.", taxas: "Todas as seis chamadas gratuitas.", abertura: "23 de fevereiro (cinco chamadas) e 20 de maio (Livre).", encerramento: "30 de abril (cinco chamadas) e 21 de junho (Livre).", realização: "14 a 23 de agosto de 2026.", relevância: "Dezoito edições e especialização escolar/universitária internacional." }, { "produção/conclusão": "Nenhum ano mínimo de conclusão é publicado nos seis regulamentos." }),
  relevance: rel([21, 15, 12, 20, 14], [76, 88], "especializado", "A continuidade e a especialização educativa/internacional sustentam relevância muito alta.", ["Dezoito edições.", "Seis mostras nacionais/internacionais e edição híbrida.", "Prêmios e acervo educativo; sem mercado formal.", "Referência em cinema escolar e universitário.", "Seis regulamentos atuais integrais."], "alta"),
});

apply({
  id: "festival-fiacafi", editionLabel: "FIACAFI 2026 / realização remarcada para 2027",
  references: [{ url: "https://www.fiacafi.com.br/", title: "FIACAFI — programação remarcada", note: "Página oficial remarca a programação para 21–28/3/2027." }, { url: "https://www.fiacafi.com.br/regulamento-oficial", title: "Regulamento Mostra Imagem", note: "Regulamento atual integralmente lido; mantém uma data de premiação residual de 2026." }, { url: "https://www.fiacafi.com.br/regulamento", title: "Regulamento Mostra Francofonia", note: "Regulamento integralmente lido; calendário de agosto/2026 ficou desatualizado após a remarcação geral." }],
  locations: [
    { city: "São Paulo", subdivisionCode: "SP", subdivisionName: "São Paulo", municipalityCode: "3550308", role: "sede" },
    { city: "Salvador", subdivisionCode: "BA", subdivisionName: "Bahia", municipalityCode: "2927408", role: "exibição" },
    { city: "Brasília", subdivisionCode: "DF", subdivisionName: "Distrito Federal", municipalityCode: "5300108", role: "exibição" },
    { city: "Porto Alegre", subdivisionCode: "RS", subdivisionName: "Rio Grande do Sul", municipalityCode: "4314902", role: "exibição" },
    { city: "Rio de Janeiro", subdivisionCode: "RJ", subdivisionName: "Rio de Janeiro", municipalityCode: "3304557", role: "exibição" },
    { city: "Belo Horizonte", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3106200", role: "exibição" },
  ],
  activity: "ativo", frequency: "não confirmada", organizer: "FIACAFI",
  description: "Festival ibero-americano e africano com mostras Imagem e Francofonia, foco em diversidade e circulação simultânea em seis capitais.",
  seasonality: season([3, 4, 5, 6], [3], [2026, 2027], "Chamadas em 2026; programação remarcada para março de 2027."),
  edition: { year: 2027, number: "", start: "2027-03-21", end: "2027-03-28", opening: "2026-03-16", closing: "2026-06-25", resultDate: "", status: "planejada", rulesUrl: "https://www.fiacafi.com.br/", confidence: "parcial", notes: "As chamadas foram publicadas como FIACAFI 2026, mas a página geral remarcou a programação para março de 2027; datas residuais nos regulamentos foram preservadas como conflito." },
  calls: [
    { ...currentBase, name: "Mostra Imagem — curtas", formats: ["curta", "média"], minMinutes: 10, maxMinutes: 30, creditsIncluded: true, minYear: 2019, maxYear: 2026, opening: "2026-03-23", deadlines: [dl("final", "2026-06-25", "23h00", 1)], fees: [], pf: "sim", pj: "sim", restrictions: "Origem em América Latina, África, Europa, Canadá, EUA, Reino Unido, diásporas ou relação temática/artística; prioridade a equipes sub-representadas." },
    { ...currentBase, slug: "imagem-longas", name: "Mostra Imagem — longas", formats: ["longa"], minMinutes: 70, maxMinutes: 120, creditsIncluded: true, minYear: 2019, maxYear: 2026, opening: "2026-03-23", deadlines: [dl("final", "2026-06-25", "23h00", 1)], fees: [], pf: "sim", pj: "sim", restrictions: "Origem/região ou vínculo temático conforme regulamento; prioridade a equipes sub-representadas." },
    { ...currentBase, slug: "francofonia-curtas", name: "Mostra Francofonia — curtas", formats: ["curta", "média"], minMinutes: 10, maxMinutes: 30, creditsIncluded: true, minYear: 2019, maxYear: 2026, languages: ["francês"], opening: "2026-03-16", deadlines: [dl("final", "2026-05-30", "23h00", 2)], fees: [], pf: "sim", pj: "sim", restrictions: "País francófono ou diáspora; francês como língua oficial da obra; legendas PT/ES/EN recomendadas.", confidence: "parcial" },
    { ...currentBase, slug: "francofonia-longas", name: "Mostra Francofonia — longas", formats: ["longa"], minMinutes: 70, maxMinutes: 120, creditsIncluded: true, minYear: 2019, maxYear: 2026, languages: ["francês"], opening: "2026-03-16", deadlines: [dl("final", "2026-05-30", "23h00", 2)], fees: [], pf: "sim", pj: "sim", restrictions: "País francófono ou diáspora; francês como língua oficial da obra; legendas PT/ES/EN recomendadas.", confidence: "parcial" },
  ],
  coverage: cov({ localização: "São Paulo, Salvador, Brasília, Porto Alegre, Rio de Janeiro e Belo Horizonte.", atividade: "Chamadas 2026 e programação remarcada para março de 2027.", categorias: "Imagem e Francofonia, curtas e longas.", duração: "Curtas 10–30; longas 70–120 minutos, créditos incluídos.", "elegibilidade territorial": "Imagem: regiões/diasporas listadas ou vínculo temático; Francofonia: país/diaspora francófona.", "produção/conclusão": "Finalizados entre 2019 e 2026.", estreia: "Nenhuma exigência.", "pessoa autorizada a inscrever": "Responsável, detentor de direitos, diretor, produtor ou distribuidor.", abertura: "16/3 Francofonia; 23/3 Imagem.", encerramento: "30/5 Francofonia; 25/6 Imagem.", relevância: "Escopo internacional, seis capitais e foco em diásporas/diversidade." }, { "exibição online": "Não localizada.", taxas: "Regulamentos não publicam cobrança; ausência não foi tratada como gratuidade." }, { realização: "Página geral remarca para 21–28/3/2027; regulamentos mantêm agosto/2026 e data residual de premiação." }),
  relevance: rel([4, 17, 15, 20, 10], [56, 75], "internacional amplo", "O escopo internacional, as seis capitais e a especialização em diásporas sustentam relevância alta emergente.", ["Festival emergente; histórico não consolidado.", "Circulação simultânea em seis capitais.", "Atividades de indústria e articulação indicadas.", "Foco ibero-americano, africano e francófono.", "Regras atuais integrais, com remarcação conflitante."], "média"),
});

apply({
  id: "festival-recanto", editionLabel: "5ª edição / 2026 — chamada interna",
  references: [{ url: "https://www.ifb.edu.br/recantodasemas/48432-5-edicao-do-festival-recanto-do-cinema-audiovisual-na-periferia-edital-2", title: "IFB — 5º Recanto do Cinema", note: "Página oficial da chamada interna." }, { url: "https://www.ifb.edu.br/attachments/article/48432/Edital_interno_RecantodoCinema.pdf", title: "Edital interno do 5º Recanto do Cinema", note: "PDF oficial integralmente lido." }],
  locations: [{ city: "Brasília", district: "Recanto das Emas", subdivisionCode: "DF", subdivisionName: "Distrito Federal", municipalityCode: "5300108" }],
  activity: "ativo", frequency: "anual", organizer: "IFB Campus Recanto das Emas",
  description: "Festival educativo e periférico do IFB, com mostra interna e programação presencial no Recanto das Emas.",
  seasonality: season([9], [11], [2026], "Chamada interna em setembro; evento em novembro."),
  edition: { year: 2026, number: "5", start: "2026-11-24", end: "2026-11-27", opening: "2026-09-09", closing: "2026-09-21", resultDate: "", status: "planejada", rulesUrl: "https://www.ifb.edu.br/attachments/article/48432/Edital_interno_RecantodoCinema.pdf", confidence: "parcial", notes: "O edital integral recuperado é da mostra interna para comunidade IFB-CREM. A chamada geral mencionada anteriormente não foi localizada e não foi combinada." },
  calls: [{ ...currentBase, name: "Mostra interna IFB-CREM", formats: ["curta", "média", "outro"], workTypes: ["filme", "videoclipe"], maxMinutes: 30, minYear: 2022, countries: ["Brasil"], regions: ["DF"], territoriesConfirmed: false, themes: ["audiovisual na periferia"], participationConditions: ["estudante"], opening: "2026-09-09", deadlines: [dl("final", "2026-09-21", "prazo final", 1)], fees: [fee(0, "BRL", "final", ["Mostra interna"], 1)], pf: "sim", pj: "não", premiere: "festival", premiereRequirement: "obrigatória", premiereTerritory: "Recanto do Cinema", premiereConditions: "Não ter sido exibido em edição anterior.", online: "permitido", onlineConditions: "Arquivo institucional e uso cultural/educativo com aviso prévio.", restrictions: "Estudantes ou egressos de curso regular do IFB Recanto das Emas; obra em contexto educativo/acadêmico; exclui publicidade, institucional, propaganda e campanha eleitoral.", confidence: "parcial" }],
  coverage: cov({ localização: "IFB Campus Recanto das Emas, Brasília/DF.", atividade: "5ª edição programada em 2026.", categorias: "Mostra interna IFB-CREM recuperada separadamente.", duração: "Até 30 minutos.", "elegibilidade territorial": "Estudantes/egressos de cursos regulares do IFB Recanto das Emas.", "produção/conclusão": "Produzidos desde janeiro de 2022 em contexto educativo/acadêmico.", estreia: "Não exibido antes no próprio festival.", "exibição online": "Uso institucional cultural/educativo com aviso prévio.", "pessoa autorizada a inscrever": "Estudante ou egresso responsável pelos direitos.", taxas: "Inscrição gratuita.", abertura: "9 de setembro de 2026.", encerramento: "21 de setembro de 2026.", realização: "24 a 27 de novembro de 2026.", relevância: "Cinco edições e atuação educativa/periférica documentadas." }, { categorias: "Chamada pública geral de 2026 não localizada; somente a chamada interna foi estruturada." }),
  relevance: rel([11, 12, 12, 19, 12], [57, 73], "regional/local", "A continuidade e o papel educativo/periférico sustentam relevância alta regional.", ["Cinco edições.", "Mostra e festival em campus periférico.", "Formação acadêmica e acessibilidade valorizadas.", "Foco audiovisual na periferia.", "Edital interno atual integral; chamada geral pendente."], "média"),
});

apply({
  id: "festival-sururu", editionLabel: "17ª edição / 2026",
  references: [{ url: "https://mostrasururu.com.br/", title: "17ª Mostra Sururu — site oficial", note: "Confirma edição e chamadas." }, { url: "https://mostrasururu.com.br/wp-content/uploads/2026/09/REGULAMENTO-DA-MOSTRA-DE-CURTA-METRAGENS-2026-final.pdf", title: "Regulamento de curtas 2026", note: "PDF oficial integralmente lido." }, { url: "https://mostrasururu.com.br/wp-content/uploads/2026/09/REGULAMENTO-DA-MOSTRA-DE-VIDEOCLIPES-2026-final.pdf", title: "Regulamento de videoclipes 2026", note: "PDF oficial integralmente lido." }, { url: "https://revistaalagoana.com/17a-mostra-sururu-de-cinema-alagoano-abre-inscricoes-para-curtas-metragens-e-videoclipes/", title: "Mostra Sururu — datas e local", type: "fonte secundária", note: "Usada para período e espaço da realização." }],
  locations: [{ city: "Maceió", subdivisionCode: "AL", subdivisionName: "Alagoas", municipalityCode: "2704302" }],
  activity: "ativo", frequency: "anual", organizer: "Mostra Sururu de Cinema Alagoano",
  description: "Principal janela dedicada à produção audiovisual alagoana, com curtas e videoclipes.",
  seasonality: season([9, 10], [12], [2026], "Chamada em setembro/outubro; evento em dezembro."),
  edition: { year: 2026, number: "17", start: "2026-12-09", end: "2026-12-13", opening: "2026-09-09", closing: "2026-10-01", resultDate: "", status: "planejada", rulesUrl: "https://mostrasururu.com.br/", confidence: "confirmado", notes: "Chamadas de curtas e videoclipes estruturadas separadamente; exibição online é autorização opcional e não afeta seleção." },
  calls: [
    { ...currentBase, name: "Curtas alagoanos", formats: ["curta", "média"], maxMinutes: 30, creditsIncluded: true, minYear: 2025, countries: ["Brasil"], regions: ["AL"], territoriesConfirmed: false, opening: "2026-09-09", deadlines: [dl("final", "2026-10-01", "23h59", 1)], fees: [fee(0, "BRL", "final", ["Curtas"], 1)], pf: "sim", pj: "sim", online: "permitido", onlineConditions: "Exibição online de 14–20/12 somente com autorização separada; decisão não interfere na seleção.", resubmission: "sim", restrictions: "Maioria da equipe alagoana/residente em AL ou produtora sediada no estado com participação local efetiva; WIP aceito; exclui publicidade/institucional/comercial." },
    { ...currentBase, slug: "videoclipes", name: "Videoclipes alagoanos", formats: ["outro"], workTypes: ["videoclipe"], countries: ["Brasil"], regions: ["AL"], territoriesConfirmed: false, minYear: 2025, opening: "2026-09-09", deadlines: [dl("final", "2026-10-01", "23h59", 2)], fees: [fee(0, "BRL", "final", ["Videoclipes"], 2)], pf: "sim", pj: "sim", online: "permitido", onlineConditions: "Exibição online opcional de 14–20/12, mediante autorização específica.", resubmission: "sim", restrictions: "Maioria da equipe alagoana/residente em AL ou produtora sediada no estado com participação local efetiva; WIP aceito; sem limite de duração publicado." },
  ],
  coverage: cov({ localização: "Centro Cultural Arte Pajuçara, Maceió/AL.", atividade: "17ª edição com chamadas 2026.", categorias: "Curtas e videoclipes alagoanos.", duração: "Curtas até 30 minutos; videoclipes sem limite publicado.", "elegibilidade territorial": "Equipe majoritariamente alagoana/residente ou produtora de AL com participação local efetiva.", "produção/conclusão": "Finalizados desde 1/1/2025; WIP aceito.", estreia: "Nenhuma exigência; não selecionados em 2025 podem retornar.", "exibição online": "Opcional e autorizada separadamente; 14–20/12.", "pessoa autorizada a inscrever": "Responsável pelos direitos; inscrições ilimitadas.", taxas: "Inscrição gratuita.", abertura: "9 de setembro de 2026.", encerramento: "1º de outubro de 2026, 23h59.", realização: "9 a 13 de dezembro de 2026.", relevância: "Dezessete edições e centralidade no audiovisual alagoano." }),
  relevance: rel([20, 15, 10, 20, 14], [73, 85], "regional/local", "A continuidade e a centralidade para o audiovisual alagoano sustentam relevância alta.", ["Dezessete edições.", "Mostras de curtas e videoclipes.", "Sem mercado formal documentado.", "Principal janela dedicada à produção alagoana.", "Dois regulamentos atuais integrais."], "alta"),
});

apply({
  id: "festival-cineop", editionLabel: "21ª edição / 2026",
  references: [{ url: "https://cineop.com.br/", title: "21ª CineOP — site oficial", note: "Página oficial confirma edição, programação, datas e escopo." }, { url: "https://cineop.com.br/n/21a-cineop-recebe-inscricoes-para-encontro-de-arquivos-e-acervos-audiovisuais-e-encontro-da-educacao/", title: "21ª CineOP — inscrições para encontros", note: "A inscrição é de participantes dos encontros, não uma chamada de filmes." }],
  locations: [{ city: "Ouro Preto", subdivisionCode: "MG", subdivisionName: "Minas Gerais", municipalityCode: "3146107" }],
  activity: "ativo", frequency: "anual", organizer: "Universo Produção",
  description: "Mostra dedicada à preservação, história, educação e patrimônio audiovisual brasileiro.",
  seasonality: season([], [6], [2026], "Edição realizada em junho; chamada pública de filmes não localizada."),
  edition: { year: 2026, number: "21", start: "2026-06-25", end: "2026-06-30", opening: "", closing: "", resultDate: "", status: "realizada", rulesUrl: "https://cineop.com.br/", confidence: "parcial", notes: "Programação atual confirmada. A inscrição de encontros não foi convertida em chamada de obras; seleção de filmes é tratada como curatorial sem edital público localizado." },
  calls: [{ name: "Programação curatorial de filmes", formats: ["curta", "média", "longa"], genres, submissionMode: "curadoria sem chamada", selectionType: "não competitiva", confidence: "parcial", notes: "135 filmes programados; nenhuma chamada pública de obras de 2026 localizada." }],
  coverage: cov({ localização: "Ouro Preto/MG e programação online.", atividade: "21ª edição realizada em 2026.", categorias: "Programação de preservação, história e educação audiovisual.", realização: "25 a 30 de junho de 2026.", relevância: "Vinte e uma edições, 135 filmes e papel setorial em preservação/educação." }, { duração: "Sem chamada pública de filmes localizada.", "elegibilidade territorial": "Sem chamada pública localizada.", "produção/conclusão": "Sem chamada pública localizada.", estreia: "Sem chamada pública localizada.", "exibição online": "Programação online existe; regra de histórico para inscrição não aplicável/localizada.", "pessoa autorizada a inscrever": "Sem chamada pública de obras localizada.", taxas: "Sem chamada pública de obras localizada.", abertura: "Sem chamada pública de obras localizada.", encerramento: "Sem chamada pública de obras localizada." }),
  relevance: rel([22, 18, 17, 20, 14], [85, 95], "nacional", "A continuidade e o papel estruturante em preservação, história e educação sustentam relevância muito alta.", ["Vinte e uma edições.", "135 filmes em 2026.", "Encontros de arquivos, acervos e educação.", "Referência nacional em preservação audiovisual.", "Programação atual transparente; chamada de filmes não pública."], "alta"),
});

apply({
  id: "festival-cineverao", editionLabel: "6ª edição / 2025",
  references: [
    { url: "https://magalzine.substack.com/p/cine-verao-encerra-inscricoes-nesta", title: "Cine Verão encerra inscrições da 6ª edição", type: "fonte secundária", confidence: "edição anterior", evidenceState: "confirmado em edição anterior", editionLabel: "6ª edição / 2025", note: "Fonte detalha a chamada; site oficial cineverao.art não estava acessível/indexado." },
    { url: "https://magalzine.substack.com/p/cine-verao-incentiva-a-profissionalizacao", title: "6º Cine Verão — programação e balanço", type: "fonte secundária", confidence: "edição anterior", evidenceState: "confirmado em edição anterior", editionLabel: "6ª edição / 2025", note: "Confirma realização, local e mais de 600 inscrições." },
  ],
  locations: [{ city: "Natal", subdivisionCode: "RN", subdivisionName: "Rio Grande do Norte", municipalityCode: "2408102" }],
  activity: "atividade não confirmada", frequency: "não confirmada", organizer: "Pinote Produções",
  description: "Festival de cinema independente em Natal com mostras potiguar e brasileira, formação e debates.",
  seasonality: season([12], [1], [2024, 2025], "Última chamada em dezembro de 2024 para evento em janeiro de 2025."),
  edition: { year: 2025, number: "6", start: "2025-01-16", end: "2025-01-18", opening: "", closing: "2024-12-17", resultDate: "2025-01-10", status: "realizada", rulesUrl: "https://magalzine.substack.com/p/cine-verao-encerra-inscricoes-nesta", confidence: "edição anterior", notes: "Nenhuma edição/chamada de 2026 foi localizada. O domínio oficial antigo não foi usado para promover regras sem regulamento." },
  calls: [
    { ...currentBase, name: "Cine Verão Brasil", formats: ["curta"], maxMinutes: 20, minYear: 2023, countries: ["Brasil"], territoriesConfirmed: true, deadlines: [dl("final", "2024-12-17", "prazo final")], fees: [fee(0, "BRL", "final", ["Curtas brasileiros"])], pf: "sim", pj: "sim", restrictions: "Qualquer gênero, exceto videoclipes e comerciais.", confidence: "edição anterior" },
    { ...currentBase, slug: "poti", name: "Cine Verão Poti", formats: ["curta"], maxMinutes: 20, minYear: 2023, countries: ["Brasil"], regions: ["RN"], territoriesConfirmed: false, deadlines: [dl("final", "2024-12-17", "prazo final")], fees: [fee(0, "BRL", "final", ["Curtas potiguares"])], pf: "sim", pj: "sim", restrictions: "Produção potiguar; qualquer gênero, exceto videoclipes e comerciais. Critério territorial integral não recuperado.", confidence: "edição anterior" },
  ],
  coverage: cov({}, { atividade: "Nenhuma edição/chamada de 2026 localizada.", abertura: "Data exata de abertura da chamada de 2024 não localizada.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não detalhada além do responsável." }, {}, { localização: "Complexo Cultural Rampa, Natal/RN.", categorias: "Cine Verão Brasil e Cine Verão Poti.", duração: "Até 20 minutos.", "elegibilidade territorial": "Brasil e recorte potiguar separados.", "produção/conclusão": "Finalizados desde janeiro de 2023.", taxas: "Inscrição gratuita.", encerramento: "17 de dezembro de 2024.", realização: "16 a 18 de janeiro de 2025.", relevância: "Seis edições, mais de 600 inscrições, formação e debate documentados." }),
  relevance: rel([13, 15, 13, 16, 8], [55, 73], "regional/local", "A adesão nacional e o papel no circuito potiguar sustentam relevância alta regional, reduzida pela ausência de atividade atual confirmada.", ["Seis edições.", "Mais de 600 inscrições na 6ª edição.", "Oficinas, fóruns e debates.", "Janela de cinema independente potiguar e brasileiro.", "Fontes de 2025; continuidade de 2026 ausente."], "média"),
});

db.settings.catalogVersion = "2026-10-04.7";
fs.writeFileSync(catalogPath, `${JSON.stringify(db, null, 2)}\n`);
console.log(`BR-05 aplicado: 20 festivais; catálogo ${db.settings.catalogVersion}; ${db.calls.length} chamadas.`);
