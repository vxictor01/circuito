import fs from "node:fs";

const catalogPath = new URL("../src/data/catalog.json", import.meta.url);
const db = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const checkedAt = "2026-10-04";
const allLanguages = [
  "documentário",
  "ficção",
  "animação",
  "experimental",
  "híbrido",
];
const coverageFields = [
  "localização",
  "atividade",
  "categorias",
  "duração",
  "elegibilidade territorial",
  "produção/conclusão",
  "estreia",
  "exibição online",
  "pessoa autorizada a inscrever",
  "taxas",
  "abertura",
  "encerramento",
  "realização",
  "relevância",
];

const source = (id, url, title, editionLabel, fields, options = {}) => ({
  id,
  url,
  title,
  type: options.type || "oficial",
  checkedAt,
  accessedAt: checkedAt,
  confidence: options.confidence || "confirmado",
  evidenceState: options.evidenceState || "confirmado na edição atual",
  editionLabel,
  section: options.section || "Página ou regulamento consultado",
  note: options.note || "",
  fields,
});

const location = (
  festivalId,
  index,
  city,
  subdivisionCode,
  subdivisionName,
  municipalityCode,
  sourceIds,
  role = "sede",
) => ({
  id: `${festivalId}-location-${index}`,
  role,
  countryCode: "BR",
  countryName: "Brasil",
  subdivisionCode,
  subdivisionName,
  city,
  municipalityCode,
  district: "",
  confirmed: true,
  sourceIds,
});

const deadline = (kind, date, time, sourceId, originalLabel, supersedes = "") => ({
  kind,
  date,
  time,
  timezone: "America/Sao_Paulo",
  confirmed: true,
  originalLabel,
  sourceId,
  supersedes,
});

const freeFee = (sourceId, appliesTo = ["todas as inscrições"], notes = "") => ({
  amount: 0,
  currency: "BRL",
  free: "sim",
  deadlineKind: "final",
  discount: "",
  waiver: "",
  notes,
  appliesTo,
  platformAmount: null,
  sourceId,
});

const paidFee = (amount, currency, deadlineKind, sourceId, appliesTo, options = {}) => ({
  amount,
  currency,
  free: amount === 0 ? "sim" : "não",
  deadlineKind,
  discount: options.discount || "",
  waiver: options.waiver || "",
  notes: options.notes || "",
  appliesTo,
  platformAmount: options.platformAmount ?? null,
  sourceId,
});

const blankCall = (oldCall, config, sources) => ({
  ...oldCall,
  id: config.id || oldCall.id,
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
  deadlines: config.deadlines || [],
  fees: config.fees || [],
  rulesUrl: config.rulesUrl || sources[0]?.url || "",
  checkedAt,
  confidence: config.confidence || "confirmado",
  notes: config.notes || "",
  sources,
});

const coverage = (confirmed = {}, missing = {}, conflict = {}, previous = {}) => ({
  ...Object.fromEntries(
    Object.entries(confirmed).map(([field, note]) => [
      field,
      ["confirmado na edição atual", note],
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(missing).map(([field, note]) => [
      field,
      ["não localizado", note],
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(conflict).map(([field, note]) => [
      field,
      ["informação conflitante", note],
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(previous).map(([field, note]) => [
      field,
      ["confirmado em edição anterior", note],
    ]),
  ),
});

const makeRelevance = (config, sourceIds) => {
  const keys = [
    "curatorialHistory",
    "programmingReach",
    "industryOpportunities",
    "specializedImportance",
    "continuityTransparency",
  ];
  const dimensions = Object.fromEntries(
    keys.map((key, index) => [
      key,
      {
        score: config.scores[index],
        evidence: config.evidence[index],
        sourceIds,
      },
    ]),
  );
  const score = config.scores.reduce((sum, value) => sum + value, 0);
  return {
    status: "provisória",
    score,
    uncertaintyMin: config.range[0],
    uncertaintyMax: config.range[1],
    band:
      score >= 80
        ? "muito alta"
        : score >= 60
          ? "alta"
          : score >= 40
            ? "intermediária"
            : "menor alcance documentado",
    impact: config.impact,
    confidence: config.confidence || "média",
    assessedAt: checkedAt,
    rationale: `${config.rationale} Avaliação editorial provisória; não é ranking oficial nem previsão de seleção.`,
    dimensions,
  };
};

const applyFestival = (config) => {
  const festival = db.festivals.find((item) => item.id === config.id);
  const edition = db.editions.find((item) => item.festivalId === config.id);
  const oldCall = db.calls.find((item) => item.editionId === edition?.id);
  if (!festival || !edition || !oldCall)
    throw new Error(`Registro ausente para ${config.id}`);

  Object.assign(festival, config.festival || {});
  festival.sources = config.sources;
  festival.locations = config.locations;
  festival.seasonality = config.seasonality;
  festival.relevance = makeRelevance(
    config.relevance,
    config.relevance.sourceIds || config.sources.map((item) => item.id),
  );
  festival.researchCoverage = Object.fromEntries(
    coverageFields.map((field) => {
      const entry = config.coverage[field] || [
        "pendente",
        "Campo ainda não estruturado neste lote.",
      ];
      return [
        field,
        {
          status: entry[0],
          note: entry[1],
          sourceIds: entry[2] || config.sources.map((item) => item.id),
        },
      ];
    }),
  );

  Object.assign(edition, config.edition, {
    checkedAt,
    sources: config.sources,
  });
  db.calls = db.calls.filter((item) => item.editionId !== edition.id);
  db.calls.push(
    ...config.calls.map((call, index) => {
      const callSources = (call.sourceIds || config.sources.map((item) => item.id))
        .map((id) => config.sources.find((item) => item.id === id))
        .filter(Boolean);
      return blankCall(
        {
          ...oldCall,
          id:
            index === 0
              ? oldCall.id
              : `${edition.id}-call-${call.slug || index + 1}`,
        },
        call,
        callSources,
      );
    }),
  );
};

const relevance = (scores, range, impact, rationale, evidence, confidence = "média") => ({
  scores,
  range,
  impact,
  rationale,
  evidence,
  confidence,
});

// 027 — Mostra de Cinema de Gostoso, 13ª edição / 2026.
{
  const id = "festival-027";
  const rules = source(
    `${id}-source-regulation-2026`,
    "https://www.mostradecinemadegostoso.com.br/regulamento",
    "Regulamento da 13ª Mostra de Cinema de Gostoso",
    "13ª edição / 2026",
    coverageFields,
    { note: "Regulamento oficial integralmente lido." },
  );
  const signup = source(
    `${id}-source-signup-2026`,
    "https://www.mostradecinemadegostoso.com.br/inscricao",
    "Inscrição da 13ª Mostra de Cinema de Gostoso",
    "13ª edição / 2026",
    ["opening", "deadlines", "fees"],
  );
  const extension = source(
    `${id}-source-home-2026`,
    "https://www.mostradecinemadegostoso.com.br/",
    "Página oficial — prazo prorrogado e realização",
    "13ª edição / 2026",
    ["deadlines", "eventDates", "relevance"],
  );
  applyFestival({
    id,
    sources: [rules, signup, extension],
    locations: [
      location(id, 1, "São Miguel do Gostoso", "RN", "Rio Grande do Norte", "2412559", [rules.id]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      organizer: "Heco Produções",
      description: "Mostra brasileira realizada em salas abertas junto à praia de São Miguel do Gostoso.",
      languages: allLanguages,
      workTypes: ["filme"],
      audiences: ["geral"],
    },
    seasonality: {
      opening: { months: [6], evidenceYears: [2026], confidence: "baixa", note: "Abertura de 2026; confirmar recorrência." },
      event: { months: [11], evidenceYears: [2026], confidence: "baixa", note: "Realização de 20 a 24 de novembro de 2026." },
    },
    edition: {
      year: 2026,
      number: "13",
      start: "2026-11-20",
      end: "2026-11-24",
      opening: "2026-06-09",
      closing: "2026-08-24",
      resultDate: "",
      status: "planejada",
      rulesUrl: rules.url,
      confidence: "confirmado",
      notes: "Prazo original de 9/8 prorrogado oficialmente para 24/8. O regulamento não estabelece limite de duração nem exigência de estreia.",
    },
    calls: [{
      name: "Mostras Competitiva e Panorama — filmes brasileiros",
      formats: ["curta", "média", "longa", "experimental", "outro"],
      genres: allLanguages,
      languages: allLanguages,
      selectionType: "mista",
      minYear: 2025,
      pf: "não confirmado",
      pj: "não confirmado",
      premiere: "nenhuma",
      premiereRequirement: "sem exigência confirmada",
      online: "permitido",
      onlineConditions: "O regulamento não veda histórico online anterior.",
      countries: ["Brasil"],
      territoriesConfirmed: true,
      restrictions: "Produção brasileira finalizada depois de julho de 2025. Aceita ficção, não ficção, animação e outros gêneros; exclui videoclipes, pilotos e publicidade. Responsável declara possuir os direitos.",
      opening: "2026-06-09",
      deadlines: [
        deadline("final", "2026-08-09", "", rules.id, "prazo original"),
        deadline("extended", "2026-08-24", "", extension.id, "prazo prorrogado", "prazo original de 09/08/2026"),
      ],
      fees: [freeFee(signup.id)],
      platform: signup.url,
      rulesUrl: rules.url,
      sourceIds: [rules.id, signup.id, extension.id],
    }],
    coverage: coverage({
      localização: "São Miguel do Gostoso/RN confirmada.", atividade: "13ª edição anunciada para novembro de 2026.", categorias: "Mostras Competitiva e Panorama para filmes brasileiros.", duração: "Regulamento não impõe limite de duração.", "elegibilidade territorial": "Produções brasileiras.", "produção/conclusão": "Obras concluídas depois de julho de 2025.", estreia: "Sem exigência de estreia no regulamento.", "exibição online": "Sem vedação de histórico online anterior.", "pessoa autorizada a inscrever": "Responsável deve possuir direitos; natureza PF/PJ não especificada.", taxas: "Inscrição gratuita.", abertura: "9 de junho de 2026.", encerramento: "Prazo prorrogado de 9 para 24 de agosto de 2026.", realização: "20 a 24 de novembro de 2026.", relevância: "Treze edições, sessões abertas e premiações documentadas.",
    }),
    relevance: relevance([18, 12, 8, 15, 13], [62, 74], "nacional", "A continuidade, a seleção nacional e o modelo de exibição pública sustentam alta relevância.", ["Treze edições.", "Seleção nacional e sessões públicas.", "Debates e presença de representantes.", "Modelo territorial singular de exibição.", "Regulamento e calendário atuais transparentes."]),
  });
}

// 028 — CachoeiraDoc, última chamada localizada: 10ª edição / 2025.
{
  const id = "festival-028";
  const call = source(`${id}-source-call-2025`, "https://xcachoeiradoc.com/blog/inscricoesabertas/", "Inscrições abertas — X CachoeiraDoc", "10ª edição / 2025", ["location", "activity", "categories", "duration", "productionYear", "countries", "opening", "deadlines", "eventDates", "relevance"], { confidence: "edição anterior", evidenceState: "confirmado em edição anterior", note: "Última chamada oficial localizada. Nenhuma edição 2026 foi encontrada até a data de acesso." });
  applyFestival({
    id,
    sources: [call],
    locations: [
      location(id, 1, "Cachoeira", "BA", "Bahia", "2904902", [call.id]),
      location(id, 2, "São Félix", "BA", "Bahia", "2929008", [call.id], "exibição"),
    ],
    festival: { activity: "atividade não confirmada", frequency: "não confirmada", organizer: "CachoeiraDoc", description: "Festival de documentários realizado no Recôncavo Baiano.", genres: ["documentário"], languages: ["documentário"], workTypes: ["filme"], audiences: ["geral"] },
    seasonality: {
      opening: { months: [2], evidenceYears: [2025], confidence: "baixa", note: "Estimativa baseada somente na chamada 2025." },
      event: { months: [6], evidenceYears: [2025], confidence: "baixa", note: "Última edição localizada ocorreu em junho de 2025." },
    },
    edition: { year: 2025, number: "10", start: "2025-06-10", end: "2025-06-15", opening: "2025-02-19", closing: "2025-03-17", resultDate: "", status: "realizada", rulesUrl: call.url, confidence: "edição anterior", notes: "Chamada 2025 localizada; o prazo original de 14/3 foi prorrogado para 17/3. Atividade e regras de 2026 não confirmadas." },
    calls: [
      { name: "Competitiva brasileira — curtas e médias documentais", slug: "curtas-medias", formats: ["curta", "média"], genres: ["documentário"], languages: ["documentário"], maxMinutes: 59, maxSeconds: 3540, maxInclusive: true, minYear: 2024, countries: ["Brasil"], territoriesConfirmed: true, opening: "2025-02-19", deadlines: [deadline("extended", "2025-03-17", "", call.id, "prazo prorrogado")], rulesUrl: call.url, confidence: "edição anterior", sourceIds: [call.id] },
      { name: "Competitiva brasileira — longas documentais", slug: "longas", formats: ["longa"], genres: ["documentário"], languages: ["documentário"], minMinutes: 60, minSeconds: 3600, minInclusive: true, minYear: 2024, countries: ["Brasil"], territoriesConfirmed: true, opening: "2025-02-19", deadlines: [deadline("extended", "2025-03-17", "", call.id, "prazo prorrogado")], rulesUrl: call.url, confidence: "edição anterior", sourceIds: [call.id] },
    ],
    coverage: coverage({ localização: "Cachoeira e São Félix/BA na edição 2025." }, { atividade: "Nenhuma edição ou chamada 2026 localizada.", estreia: "Não localizada na página consultada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Taxa de inscrição não informada; gratuidade das sessões não foi usada como inferência.", relevância: "Avaliação usa histórico da 10ª edição, sem confirmação de atividade em 2026." }, {}, { categorias: "Duas competições documentais na edição 2025.", duração: "Até 59 min e a partir de 60 min em chamadas distintas.", "elegibilidade territorial": "Produções/coproduções brasileiras na edição 2025.", "produção/conclusão": "Finalização a partir de 2024.", abertura: "19 de fevereiro de 2025.", encerramento: "Prorrogado para 17 de março de 2025.", realização: "10 a 15 de junho de 2025." }),
    relevance: relevance([15, 10, 8, 18, 8], [52, 67], "especializado", "A especialização documental e a inserção universitária sustentam relevância, com desconto de confiança pela falta de edição 2026.", ["Dez edições documentadas.", "Programação no Recôncavo.", "Atividades formativas e prêmios em 2025.", "Festival dedicado ao documentário.", "Fonte oficial 2025; continuidade atual não confirmada."], "baixa"),
  });
}

// 029 — Cine Esquema Novo, 16ª edição / 2026.
{
  const id = "festival-029";
  const call = source(`${id}-source-call-2026`, "https://15cen.cineesquemanovo.org/cine-esquema-novo-arte-audiovisual-brasileira-confirma-sua-16a-edicao-e-abre-convocatoria-para-mostra-competitiva-brasil/", "Convocatória da Mostra Competitiva Brasil — 16º Cine Esquema Novo", "16ª edição / 2026", ["location", "activity", "categories", "countries", "opening", "deadlines", "eventDates", "relevance"], { confidence: "parcial", note: "Página oficial detalhada localizada; regulamento integral vinculado não foi recuperado." });
  const program = source(`${id}-source-program-2026`, "https://cineesquemanovo.org/patrocinadores_2026/", "Cine Esquema Novo — edição 2026", "16ª edição / 2026", ["activity", "eventDates", "relevance"], { confidence: "parcial" });
  applyFestival({
    id,
    sources: [call, program],
    locations: [location(id, 1, "Porto Alegre", "RS", "Rio Grande do Sul", "4314902", [call.id])],
    festival: { activity: "ativo", frequency: "não confirmada", description: "Festival de arte audiovisual brasileira e práticas expandidas.", languages: allLanguages, workTypes: ["filme", "instalação", "outro"], audiences: ["geral"] },
    seasonality: { opening: { months: [2], evidenceYears: [2026], confidence: "baixa", note: "Baseada na chamada 2026." }, event: { months: [6, 7], evidenceYears: [2026], confidence: "baixa", note: "25 de junho a 5 de julho de 2026." } },
    edition: { year: 2026, number: "16", start: "2026-06-25", end: "2026-07-05", opening: "2026-02-04", closing: "2026-03-09", resultDate: "", status: "realizada", rulesUrl: call.url, confidence: "parcial", notes: "Convocatória oficial atual consultada, mas o regulamento integral não foi recuperado; duração, pessoa autorizada, taxa e estreia permanecem desconhecidas." },
    calls: [{ name: "Mostra Competitiva Brasil", formats: [], genres: allLanguages, workTypes: ["filme", "instalação", "outro"], languages: allLanguages, countries: ["Brasil"], territoriesConfirmed: true, opening: "2026-02-04", deadlines: [deadline("final", "2026-03-09", "23:59", call.id, "prazo final")], rulesUrl: call.url, confidence: "parcial", restrictions: "Obras audiovisuais brasileiras; demais critérios dependem do regulamento integral não recuperado.", sourceIds: [call.id] }],
    coverage: coverage({ localização: "Porto Alegre/RS.", atividade: "16ª edição realizada em 2026.", categorias: "Mostra Competitiva Brasil.", "elegibilidade territorial": "Arte audiovisual brasileira.", abertura: "4 de fevereiro de 2026.", encerramento: "9 de março de 2026 às 23h59.", realização: "25 de junho a 5 de julho de 2026.", relevância: "Dezesseis edições e escopo de arte audiovisual documentados." }, { duração: "Regulamento integral não recuperado.", "produção/conclusão": "Não localizada na página consultada.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Não localizada." }),
    relevance: relevance([18, 12, 12, 18, 10], [62, 78], "nacional", "A longevidade e o recorte de arte audiovisual expandida sustentam alta relevância nacional.", ["Dezesseis edições.", "Mostra competitiva brasileira.", "Debates, exposições e atividades formativas.", "Recorte singular de arte audiovisual.", "Calendário atual confirmado; regulamento integral ausente."], "média"),
  });
}

// 030 — In-Edit Brasil, 18ª edição / 2026.
{
  const id = "festival-030";
  const call = source(`${id}-source-call-2026`, "https://br.in-edit.org/in-edit-brasil-abre-as-inscricoes-para-a-sua-18a-edicao/", "Inscrições da 18ª edição do In-Edit Brasil", "18ª edição / 2026", ["activity", "categories", "duration", "productionYear", "countries", "premiere", "online", "opening", "deadlines", "eventDates", "relevance"], { note: "Página oficial de chamada integralmente lida; o PDF vinculado não foi recuperado." });
  const program = source(`${id}-source-program-2026`, "https://br.in-edit.org/programa-2026/", "Programa do 18º In-Edit Brasil", "18ª edição / 2026", ["location", "activity", "categories", "eventDates", "relevance"]);
  applyFestival({
    id,
    sources: [call, program],
    locations: [
      location(id, 1, "São Paulo", "SP", "São Paulo", "3550308", [program.id]),
      location(id, 2, "Salvador", "BA", "Bahia", "2927408", [program.id], "exibição"),
      location(id, 3, "São Luiz do Paraitinga", "SP", "São Paulo", "3550001", [program.id], "exibição"),
      location(id, 4, "Piracicaba", "SP", "São Paulo", "3538709", [program.id], "exibição"),
    ],
    festival: { activity: "ativo", traveling: true, frequency: "anual", description: "Festival internacional especializado em documentário musical, com edição principal em São Paulo e circulação posterior.", genres: ["documentário"], languages: ["documentário"], themes: ["música"], workTypes: ["filme"], platforms: ["FilmFreeway"], audiences: ["geral"] },
    seasonality: { opening: { months: [12], evidenceYears: [2025], confidence: "baixa", note: "A chamada 2026 abriu em dezembro de 2025." }, event: { months: [6], evidenceYears: [2026], confidence: "baixa", note: "Edição principal entre 17 e 28 de junho de 2026." } },
    edition: { year: 2026, number: "18", start: "2026-06-17", end: "2026-06-28", opening: "2025-12-02", closing: "2026-02-23", resultDate: "", status: "realizada", rulesUrl: call.url, confidence: "confirmado", notes: "A página oficial detalha três painéis brasileiros; taxa e natureza do responsável não são informadas. Circulações posteriores foram registradas como locais de exibição, não como nova chamada." },
    calls: [
      { name: "Competição Nacional — longas documentais musicais", slug: "competicao-nacional", formats: ["longa"], genres: ["documentário"], languages: ["documentário"], themes: ["música"], minYear: 2025, countries: ["Brasil"], territoriesConfirmed: true, premiere: "nacional", premiereRequirement: "obrigatória", premiereTerritory: "circuito comercial brasileiro", premiereConditions: "Não pode ter sido exibido em cinemas, TV aberta/paga, DVD/Blu-Ray ou streaming.", online: "proibido", onlineConditions: "Disponibilização em serviços de streaming impede as chamadas de longas e médias.", opening: "2025-12-02", deadlines: [deadline("final", "2026-02-23", "", call.id, "prazo final")], platform: "FilmFreeway", rulesUrl: call.url, restrictions: "Documentário musical brasileiro finalizado a partir de janeiro de 2025.", sourceIds: [call.id] },
      { name: "Mostra Brasil — longas e médias documentais musicais", slug: "mostra-brasil", formats: ["média", "longa"], genres: ["documentário"], languages: ["documentário"], themes: ["música"], minYear: 2025, countries: ["Brasil"], territoriesConfirmed: true, premiere: "nacional", premiereRequirement: "obrigatória", premiereTerritory: "circuito comercial brasileiro", premiereConditions: "Não pode ter sido exibido em cinemas, TV aberta/paga, DVD/Blu-Ray ou streaming.", online: "proibido", onlineConditions: "Disponibilização em serviços de streaming impede as chamadas de longas e médias.", opening: "2025-12-02", deadlines: [deadline("final", "2026-02-23", "", call.id, "prazo final")], platform: "FilmFreeway", rulesUrl: call.url, restrictions: "Documentário musical brasileiro; a página não informa limiar numérico entre média e longa.", sourceIds: [call.id] },
      { name: "Curta Um Som", slug: "curta-um-som", formats: ["curta"], genres: ["documentário"], languages: ["documentário"], themes: ["música"], maxMinutes: 30, maxSeconds: 1800, maxInclusive: true, countries: ["Brasil"], territoriesConfirmed: true, premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "A restrição comercial é expressamente excepcionada para curtas.", opening: "2025-12-02", deadlines: [deadline("final", "2026-02-23", "", call.id, "prazo final")], platform: "FilmFreeway", rulesUrl: call.url, restrictions: "Documentário musical brasileiro de até 30 minutos; a página não declara corte de ano para esta chamada.", sourceIds: [call.id] },
    ],
    coverage: coverage({ localização: "São Paulo e circulação 2026 em Salvador, São Luiz do Paraitinga e Piracicaba.", atividade: "18ª edição realizada.", categorias: "Competição Nacional, Mostra Brasil e Curta Um Som separados.", duração: "Curta Um Som até 30 min; longas/médias sem limiar numérico na página.", "elegibilidade territorial": "Painéis brasileiros.", "produção/conclusão": "Competição de longas finalizada a partir de janeiro de 2025; corte não estendido ao curta sem fonte.", estreia: "Ineditismo comercial para longas e médias; curtas excepcionados.", "exibição online": "Streaming veda longas/médias, não curtas.", abertura: "2 de dezembro de 2025.", encerramento: "23 de fevereiro de 2026.", realização: "17 a 28 de junho de 2026.", relevância: "Dezoito edições e rede In-Edit documentadas." }, { "pessoa autorizada a inscrever": "Não localizada na página consultada.", taxas: "Taxa ou gratuidade de inscrição não declarada." }),
    relevance: relevance([21, 16, 14, 20, 13], [78, 90], "especializado", "A continuidade, a rede internacional In-Edit e a especialização em documentário musical sustentam relevância muito alta.", ["Dezoito edições.", "Programa nacional e internacional com circulação.", "Prêmio inclui exibição no In-Edit Barcelona.", "Referência especializada em documentário musical.", "Chamada e programa atuais oficiais."], "alta"),
  });
}

// 031 — Curta Brasília, última chamada localizada: 13ª edição / 2025.
{
  const id = "festival-031";
  const call = source(`${id}-source-call-2025`, "https://turismoemfoco.com.br/v1/2025/07/15/13o-curta-brasilia-festival-internacional-de-curta-metragem-abre-inscricoes-ate-o-dia-17-de-agosto/", "13º Curta Brasília abre inscrições", "13ª edição / 2025", ["activity", "categories", "duration", "productionYear", "countries", "fees", "opening", "deadlines"], { type: "fonte secundária", confidence: "edição anterior", evidenceState: "confirmado em edição anterior", note: "Página oficial/regulamento não foram localizados. Há financiamento público para a 14ª edição, mas chamada e datas de 2026 não foram publicadas/localizadas." });
  const program = source(`${id}-source-program-2025`, "https://www.deubombrasilia.com.br/post/13%C2%AA-edi%C3%A7%C3%A3o-do-curta-bras%C3%ADlia-festival-internacional-de-curta-metragem-mais-de-120-filmes-11-most", "Programação do 13º Curta Brasília", "13ª edição / 2025", ["location", "activity", "eventDates", "relevance"], { type: "fonte secundária", confidence: "edição anterior", evidenceState: "confirmado em edição anterior" });
  applyFestival({
    id,
    sources: [call, program],
    locations: [location(id, 1, "Brasília", "DF", "Distrito Federal", "5300108", [program.id])],
    festival: { activity: "atividade não confirmada", frequency: "não confirmada", description: "Festival internacional de curtas sediado em Brasília.", workTypes: ["filme", "videoclipe"], languages: allLanguages, audiences: ["geral"] },
    seasonality: { opening: { months: [7], evidenceYears: [2025], confidence: "baixa", note: "Estimativa baseada na última chamada localizada." }, event: { months: [12], evidenceYears: [2025], confidence: "baixa", note: "Última edição localizada ocorreu em dezembro de 2025." } },
    edition: { year: 2025, number: "13", start: "2025-12-11", end: "2025-12-14", opening: "2025-07-15", closing: "2025-08-17", resultDate: "", status: "realizada", rulesUrl: call.url, confidence: "edição anterior", notes: "Última chamada com regras localizada é de 2025. A 14ª edição aparece em documentos de fomento de 2026, mas sem regulamento, datas ou inscrição publicados até o acesso." },
    calls: [{ name: "Curtas e videoclipes — 13ª edição", formats: ["curta"], genres: allLanguages, languages: allLanguages, workTypes: ["filme", "videoclipe"], maxMinutes: 30, maxSeconds: 1800, maxInclusive: true, minYear: 2024, pf: "sim", pj: "não confirmado", countries: ["Brasil"], territoriesConfirmed: true, restrictions: "Obras de realizadores brasileiros, brasileiros residentes no exterior ou estrangeiros residentes no Brasil.", opening: "2025-07-15", deadlines: [deadline("final", "2025-08-17", "", call.id, "prazo final")], fees: [freeFee(call.id)], rulesUrl: call.url, confidence: "edição anterior", sourceIds: [call.id] }],
    coverage: coverage({ localização: "Brasília/DF na última edição realizada." }, { atividade: "14ª edição financiada, porém chamada e datas de 2026 não localizadas.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Fonte menciona realizadores, sem esclarecer PJ.", relevância: "Avaliação provisória usa fontes secundárias de 2025." }, {}, { categorias: "Curtas e videoclipes na 13ª edição.", duração: "Até 30 min.", "elegibilidade territorial": "Brasileiros e residentes conforme chamada 2025.", "produção/conclusão": "Produzidos a partir de janeiro de 2024.", taxas: "Inscrição gratuita em 2025.", abertura: "15 de julho de 2025.", encerramento: "17 de agosto de 2025.", realização: "11 a 14 de dezembro de 2025." }),
    relevance: relevance([16, 12, 8, 12, 7], [48, 65], "nacional", "Treze edições e uma programação ampla sustentam relevância intermediária, com baixa confiança documental atual.", ["Treze edições realizadas.", "Mais de 120 filmes e 11 mostras em 2025.", "Atividades paralelas descritas.", "Importância para curtas no Distrito Federal.", "Sem regulamento oficial atual localizado."], "baixa"),
  });
}

// 032 — Curta Taquary, 19ª edição / 2026.
{
  const id = "festival-032";
  const rules = source(`${id}-source-regulation-2026`, "https://curtataquary.org/incricoes-19-curta-taquary/", "Regulamento e inscrições do 19º Curta Taquary", "19ª edição / 2026", coverageFields, { note: "Página oficial integralmente lida." });
  const common = { formats: ["curta"], genres: ["ficção", "documentário", "animação", "experimental"], languages: ["ficção", "documentário", "animação", "experimental"], maxMinutes: 30, maxSeconds: 1800, maxInclusive: true, creditsIncluded: true, minYear: 2025, pf: "sim", pj: "não confirmado", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "O regulamento não veda histórico online anterior e autoriza exibições vinculadas ao festival.", countries: ["Brasil"], territoriesConfirmed: true, opening: "2025-12-15", deadlines: [deadline("final", "2025-12-31", "", rules.id, "prazo final")], rulesUrl: rules.url, sourceIds: [rules.id], restrictions: "Até 30 minutos incluindo créditos; produção concluída a partir de janeiro de 2025; responsável deve deter os direitos." };
  applyFestival({
    id,
    sources: [rules],
    locations: [location(id, 1, "Taquaritinga do Norte", "PE", "Pernambuco", "2615003", [rules.id])],
    festival: { activity: "ativo", frequency: "anual", description: "Festival de curtas com dez competições temáticas e territoriais no Agreste pernambucano.", languages: ["ficção", "documentário", "animação", "experimental"], workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"] },
    seasonality: { opening: { months: [12], evidenceYears: [2025], confidence: "baixa", note: "Chamada 2026 abriu em dezembro de 2025." }, event: { months: [3], evidenceYears: [2026], confidence: "baixa", note: "16 a 22 de março de 2026." } },
    edition: { year: 2026, number: "19", start: "2026-03-16", end: "2026-03-22", opening: "2025-12-15", closing: "2025-12-31", resultDate: "", status: "realizada", rulesUrl: rules.url, confidence: "confirmado", notes: "Dez mostras separadas por território, tema ou condição de participação. Taxa não declarada e não inferida." },
    calls: [
      { ...common, name: "Mostra Brasil", slug: "brasil" },
      { ...common, name: "Primeiros Passos", slug: "primeiros-passos", participationConditions: ["primeira obra"], restrictions: `${common.restrictions} Destinada a primeira obra.` },
      { ...common, name: "Dália da Serra", slug: "dalia-serra", participationConditions: ["escolar"], restrictions: `${common.restrictions} Produção vinculada a processos formativos conforme o regulamento.` },
      { ...common, name: "Mostra Universitária", slug: "universitaria", participationConditions: ["universitário"] },
      { ...common, name: "Diversidade", slug: "diversidade", themes: ["LGBTQIA+"] },
      { ...common, name: "Fantástica", slug: "fantastica", contentGenres: ["fantástico", "horror"], genres: ["fantástico", "horror"] },
      { ...common, name: "Criancine", slug: "criancine", audiences: ["infantil"] },
      { ...common, name: "Pernambuco", slug: "pernambuco", regions: ["PE"] },
      { ...common, name: "Agreste", slug: "agreste", regions: ["Agreste de Pernambuco"] },
      { ...common, name: "Planeta Melhor", slug: "planeta-melhor", themes: ["socioambiental"] },
    ],
    coverage: coverage({ localização: "Taquaritinga do Norte/PE.", atividade: "19ª edição realizada.", categorias: "Dez competições estruturadas separadamente.", duração: "Até 30 min incluindo créditos em todas as chamadas.", "elegibilidade territorial": "Mostras nacional, Pernambuco e Agreste separadas.", "produção/conclusão": "Finalização a partir de janeiro de 2025.", estreia: "Sem exigência de estreia localizada.", "exibição online": "Sem vedação anterior; autorização posterior vinculada ao festival.", "pessoa autorizada a inscrever": "Cineastas/produtores brasileiros ou residentes há mais de dois anos; natureza jurídica não explicitada.", abertura: "15 de dezembro de 2025.", encerramento: "31 de dezembro de 2025.", realização: "16 a 22 de março de 2026.", relevância: "Dezenove edições e recortes temáticos/territoriais documentados." }, { taxas: "Regulamento não declara taxa nem gratuidade." }),
    relevance: relevance([20, 12, 10, 17, 14], [68, 80], "regional/local", "A continuidade e as dez mostras com recortes formativos, territoriais e sociais sustentam alta relevância regional.", ["Dezenove edições.", "Dez competições nacionais, regionais e temáticas.", "Mostras escolar e universitária.", "Forte função territorial no Agreste.", "Regulamento atual detalhado."], "alta"),
  });
}

// 033 — Festival Internacional de Cinema da Fronteira, 17ª edição / 2026.
{
  const id = "festival-033";
  const site = source(`${id}-source-site-2026`, "https://www.festivaldafronteira.com.br/", "17º Festival Internacional de Cinema da Fronteira", "17ª edição / 2026", ["location", "activity", "categories", "eventDates", "relevance"], { confidence: "parcial", note: "Site oficial consultado. Nenhum regulamento ou chamada pública de filmes foi localizado; oficinas e laboratório possuem fluxos próprios." });
  applyFestival({
    id,
    sources: [site],
    locations: [
      location(id, 1, "Bagé", "RS", "Rio Grande do Sul", "4301602", [site.id]),
      location(id, 2, "Sant'Ana do Livramento", "RS", "Rio Grande do Sul", "4317103", [site.id], "exibição"),
    ],
    festival: { activity: "ativo", traveling: true, frequency: "anual", description: "Festival de fronteira com exibições de curtas e longas e ações de formação no sul do Brasil.", languages: allLanguages, workTypes: ["filme"], audiences: ["geral"] },
    seasonality: { opening: { months: [], evidenceYears: [], confidence: "desconhecida", note: "Chamada pública de filmes não localizada." }, event: { months: [4, 5], evidenceYears: [2026], confidence: "baixa", note: "27 de abril a 2 de maio de 2026." } },
    edition: { year: 2026, number: "17", start: "2026-04-27", end: "2026-05-02", opening: "", closing: "", resultDate: "", status: "realizada", rulesUrl: site.url, confidence: "parcial", notes: "Atividade, locais e edição confirmados. Nenhuma chamada pública ou regulamento de filmes foi localizado; o registro não presume inscrição aberta." },
    calls: [{ name: "Programação de filmes — chamada pública não localizada", formats: ["curta", "longa"], genres: [], languages: [], submissionMode: "curadoria sem chamada", selectionType: "mista", genresConfirmed: false, rulesUrl: site.url, confidence: "parcial", notes: "O site atual não publicou ou não expôs chamada pública de filmes.", sourceIds: [site.id] }],
    coverage: coverage({ localização: "Bagé e Sant'Ana do Livramento/RS.", atividade: "17ª edição realizada em 2026.", categorias: "Site confirma exibições de curtas e longas, além do Sur Frontera WIP Lab.", realização: "27 de abril a 2 de maio de 2026.", relevância: "Dezessete edições e atuação fronteiriça documentadas." }, { duração: "Sem chamada pública localizada.", "elegibilidade territorial": "Sem chamada pública localizada.", "produção/conclusão": "Não localizada.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Não localizada; gratuidade da programação não equivale a inscrição gratuita.", abertura: "Não localizada.", encerramento: "Não localizado." }),
    relevance: relevance([19, 11, 13, 17, 10], [62, 77], "regional/local", "A continuidade, o território de fronteira e o laboratório profissional sustentam alta relevância regional.", ["Dezessete edições.", "Atuação em duas cidades fronteiriças.", "Sur Frontera WIP Lab e oficinas.", "Importância para a circulação audiovisual da fronteira sul.", "Site atual confirma edição, mas não a chamada de filmes."], "média"),
  });
}

// 034 — Curta Santos, 24ª edição / 2026.
{
  const id = "festival-034";
  const platform = source(`${id}-source-festhome-2026`, "https://filmmakers.festhome.com/pt/festival/curta-santos-festival-de-cinema-de-santos", "Curta Santos — Mostra Internacional no Festhome", "24ª edição / 2026", ["location", "activity", "categories", "duration", "countries", "premiere", "fees", "deadlines", "eventDates", "pf", "materials"], { type: "plataforma de inscrição", note: "Página integral da chamada internacional lida." });
  const domestic = source(`${id}-source-domestic-call-2026`, "https://www.cbnsantos.com.br/amp/noticias/cultura/festival-curta-santos-abre-inscricoes-gratuitas-para-edicao-de-2026-com-quatro-mostras-competitivas.html", "Curta Santos abre inscrições para quatro mostras competitivas", "24ª edição / 2026", ["categories", "duration", "productionYear", "countries", "fees", "deadlines", "eventDates"], { type: "fonte secundária", confidence: "parcial", note: "Fonte jornalística local; regulamento doméstico oficial não foi localizado." });
  const commonDomestic = { formats: ["curta"], genres: allLanguages, languages: allLanguages, countries: ["Brasil"], territoriesConfirmed: true, fees: [freeFee(domestic.id)], deadlines: [deadline("final", "2026-09-20", "", domestic.id, "prazo final das mostras nacionais")], rulesUrl: domestic.url, confidence: "parcial", sourceIds: [domestic.id] };
  applyFestival({
    id,
    sources: [platform, domestic],
    locations: [location(id, 1, "Santos", "SP", "São Paulo", "3548500", [platform.id])],
    festival: { activity: "ativo", frequency: "anual", description: "Festival de curtas de Santos com mostras regionais, nacionais, verticais e internacional.", languages: allLanguages, workTypes: ["filme", "videoclipe"], audiences: ["geral"], platforms: ["Festhome"] },
    seasonality: { opening: { months: [9], evidenceYears: [2026], confidence: "baixa", note: "Festhome registra convocatória em 3 de setembro de 2026." }, event: { months: [11], evidenceYears: [2026], confidence: "baixa", note: "4 a 8 de novembro de 2026." } },
    edition: { year: 2026, number: "24", start: "2026-11-04", end: "2026-11-08", opening: "2026-09-03", closing: "2026-10-04", resultDate: "2026-10-10", status: "planejada", rulesUrl: platform.url, confidence: "parcial", notes: "Mostra internacional integralmente lida no Festhome. Quatro mostras domésticas vêm de fonte jornalística local; prazo doméstico 20/9 e internacional 4/10 permanecem separados." },
    calls: [
      { ...commonDomestic, name: "Olhar Caiçara", slug: "olhar-caicara", regions: ["Baixada Santista"], restrictions: "Curta regional; detalhes completos dependem do regulamento doméstico não localizado." },
      { ...commonDomestic, name: "Videoclipe Caiçara", slug: "videoclipe-caicara", workTypes: ["videoclipe"], regions: ["Baixada Santista"] },
      { ...commonDomestic, name: "Olhar Brasilis", slug: "olhar-brasilis", maxMinutes: 20, maxSeconds: 1200, minYear: 2024 },
      { ...commonDomestic, name: "Tudo em Pé — filme vertical", slug: "vertical", formats: ["outro"], maxSeconds: 90, maxMinutes: 1.5, restrictions: "Obra vertical com até 90 segundos." },
      { name: "Olhar Mundis — Mostra Internacional", slug: "internacional", formats: ["curta"], genres: allLanguages, languages: allLanguages, maxMinutes: 25, maxSeconds: 1500, maxInclusive: true, pf: "sim", pj: "não confirmado", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", premiereConditions: "Obras inéditas ou recentes podem receber atenção, mas estreia não é obrigatória.", online: "não confirmado", countries: [], territoriesConfirmed: true, selectionType: "não competitiva", restrictions: "Qualquer nacionalidade, gênero ou tema; WIP aceito; responsável declara deter direitos; estrangeiros devem fornecer legendas/lista de diálogos.", opening: "2026-09-03", deadlines: [deadline("final", "2026-10-04", "", platform.id, "prazo final internacional")], fees: [freeFee(platform.id, ["Mostra Internacional"], "Festhome exibe custo de envio 0€.")], platform: "Festhome", rulesUrl: platform.url, sourceIds: [platform.id] },
    ],
    coverage: coverage({ localização: "Santos/SP.", atividade: "24ª edição anunciada para novembro de 2026.", categorias: "Quatro mostras competitivas nacionais e uma internacional não competitiva.", duração: "Olhar Brasilis até 20 min; vertical até 90 s; internacional até 25 min.", "elegibilidade territorial": "Chamadas regional, nacional e internacional separadas.", "produção/conclusão": "Olhar Brasilis aceita obras desde 2024; outras sem corte confirmado.", estreia: "Internacional não exige estreia; domésticas não confirmadas.", "pessoa autorizada a inscrever": "Internacional exige responsável com direitos; natureza jurídica não especificada.", taxas: "Inscrições gratuitas nas fontes consultadas.", abertura: "Festhome registra 3 de setembro.", encerramento: "20 de setembro nas domésticas; 4 de outubro na internacional.", realização: "4 a 8 de novembro de 2026.", relevância: "Vinte e quatro edições e centralidade regional documentadas." }, { "exibição online": "Histórico online anterior não é tratado nas regras lidas." }),
    relevance: relevance([21, 13, 9, 16, 11], [65, 79], "regional/local", "A longa continuidade e a articulação entre Baixada Santista, Brasil e exterior sustentam alta relevância regional.", ["Vinte e quatro edições.", "Cinco mostras com alcances distintos.", "Oficinas e debates descritos.", "Principal evento audiovisual da região segundo a apresentação da plataforma.", "Chamada internacional atual; regras domésticas sem documento oficial integral."], "média"),
  });
}

// 035 — Festival Kinoarte, 28ª edição / 2026.
{
  const id = "festival-035";
  const site = source(`${id}-source-site-2026`, "https://kinoarte.org/festival/schedule/", "28º Festival Kinoarte de Cinema", "28ª edição / 2026", ["activity", "categories", "duration", "productionYear", "countries", "deadlines", "eventDates", "relevance"], { confidence: "parcial", note: "Página oficial atual indexada, mas dependente de JavaScript. Regras atuais foram conferidas no conteúdo indexado; o arquivo PDF retornado pelo servidor mantém nome/cópia de 2025 e não foi usado como confirmação isolada." });
  const city = source(`${id}-source-city-2026`, "https://blog.londrina.pr.gov.br/?p=212985", "Festival Kinoarte segue com inscrições abertas", "28ª edição / 2026", ["location", "activity", "duration", "productionYear", "fees", "deadlines", "eventDates", "relevance"], { type: "fonte secundária", note: "Portal da Prefeitura de Londrina confirma prazo, gratuidade e realização." });
  const common = { formats: ["curta"], genres: allLanguages, languages: allLanguages, maxMinutes: 24, maxSeconds: 1499, maxInclusive: true, creditsIncluded: true, minYear: 2025, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Não há vedação de histórico online nas regras recuperadas.", opening: "2026-04-17", deadlines: [deadline("final", "2026-06-20", "", city.id, "prazo final")], platform: "Festhome / Movibeta / correios", rulesUrl: site.url, confidence: "parcial", sourceIds: [site.id, city.id], restrictions: "Até 24min59s incluindo créditos; finalizado a partir de janeiro de 2025; não pode ter sido exibido em edição anterior do Kinoarte." };
  applyFestival({
    id,
    sources: [site, city],
    locations: [location(id, 1, "Londrina", "PR", "Paraná", "4113700", [city.id])],
    festival: { activity: "ativo", frequency: "anual", organizer: "Kinoarte — Instituto de Cinema de Londrina", description: "Festival de curtas com competições ibero-americana, nacional, paranaense e londrinense.", languages: allLanguages, workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"], platforms: ["Festhome", "Movibeta"] },
    seasonality: { opening: { months: [4], evidenceYears: [2026], confidence: "baixa", note: "17 de abril de 2026." }, event: { months: [10, 11], evidenceYears: [2026], confidence: "baixa", note: "30 de outubro a 8 de novembro de 2026." } },
    edition: { year: 2026, number: "28", start: "2026-10-30", end: "2026-11-08", opening: "2026-04-17", closing: "2026-06-20", resultDate: "", status: "planejada", rulesUrl: site.url, confidence: "parcial", notes: "Regras atuais recuperadas na indexação do site oficial e confirmadas em portal municipal; arquivo PDF servido sob caminho de 2025 impede marcar o documento integral como confirmado sem ressalva." },
    calls: [
      { ...common, name: "Competitiva Ibero-americana", slug: "ibero", regions: ["América Latina", "Espanha", "Portugal"], territoriesConfirmed: true, fees: [], notes: "Filmes não brasileiros podem estar sujeitos à taxa da plataforma; valor não localizado." },
      { ...common, name: "Competitiva Nacional", slug: "nacional", countries: ["Brasil"], territoriesConfirmed: true, fees: [freeFee(city.id, ["filmes brasileiros"])] },
      { ...common, name: "Competitiva Paranaense", slug: "paranaense", countries: ["Brasil"], regions: ["PR"], territoriesConfirmed: true, fees: [freeFee(city.id, ["filmes brasileiros"])] },
      { ...common, name: "Competitiva Londrinense", slug: "londrinense", countries: ["Brasil"], regions: ["Londrina/PR"], territoriesConfirmed: true, fees: [freeFee(city.id, ["filmes brasileiros"])] },
    ],
    coverage: coverage({ localização: "Londrina/PR.", atividade: "28ª edição confirmada em 2026.", categorias: "Ibero-americana, Nacional, Paranaense e Londrinense separadas.", duração: "Até 24min59s incluindo créditos.", "elegibilidade territorial": "Chamadas ibero-americana, nacional, estadual e municipal.", "produção/conclusão": "Finalização a partir de janeiro de 2025.", estreia: "Sem exigência de estreia; veda apenas repetição em edição anterior.", "exibição online": "Nenhuma vedação localizada.", "pessoa autorizada a inscrever": "Sem limite por pessoa ou produtora.", abertura: "17 de abril de 2026.", encerramento: "20 de junho de 2026.", realização: "30 de outubro a 8 de novembro de 2026.", relevância: "Vinte e oito edições e quatro níveis territoriais documentados." }, { taxas: "Gratuidade para brasileiros confirmada; estrangeiros podem pagar taxa de plataforma, mas o valor não foi localizado." }),
    relevance: relevance([23, 14, 11, 18, 11], [72, 84], "nacional", "A continuidade, a hierarquia territorial e a formação de público sustentam alta relevância nacional.", ["Vinte e oito edições.", "Quatro competições do município ao espaço ibero-americano.", "Prêmios e projetos Kinocidadão.", "Evento audiovisual longevo no Paraná.", "Dados atuais confirmados, com ressalva técnica no PDF oficial."], "média"),
  });
}

// 036 — Curta-SE, 25ª edição / 2026.
{
  const id = "festival-036";
  const rules = source(`${id}-source-regulation-2026`, "https://curtase.com.br/wp-content/uploads/2026/04/Regulamento_Curta-SE-25_PT.pdf", "Regulamento do Curta-SE 25", "25ª edição / 2026", coverageFields, { note: "Regulamento oficial de seis páginas integralmente lido. Datas de realização nele impressas foram posteriormente alteradas pelo site oficial." });
  const update = source(`${id}-source-date-update-2026`, "https://curtase.com.br/", "Curta-SE 25 — atualização da realização", "25ª edição / 2026", ["activity", "eventDates"], { note: "Página oficial atual informa realização de 16 a 21 de novembro, substituindo setembro no PDF." });
  const common = { genres: allLanguages, languages: allLanguages, minYear: 2024, maxYear: 2026, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Histórico online anterior não é vedado.", opening: "2026-04-08", deadlines: [deadline("final", "2026-05-08", "", rules.id, "prazo final")], platform: "Festhome / Click for Festivals / Google Forms", rulesUrl: rules.url, sourceIds: [rules.id], restrictions: "Concluído entre 2024 e 2026; idiomas diferentes do português brasileiro devem fornecer legendas em português brasileiro. Diretor ou produtor responde pela inscrição e pelos direitos." };
  applyFestival({
    id,
    sources: [rules, update],
    locations: [location(id, 1, "Aracaju", "SE", "Sergipe", "2800308", [rules.id])],
    festival: { activity: "ativo", traveling: true, frequency: "anual", description: "Festival ibero-americano sediado em Aracaju, com mostras de curtas, longas, trailers e videoclipes.", languages: allLanguages, workTypes: ["filme", "videoclipe", "outro"], audiences: ["geral"], platforms: ["Festhome", "Click for Festivals", "Google Forms"] },
    seasonality: { opening: { months: [4], evidenceYears: [2026], confidence: "baixa", note: "8 de abril de 2026." }, event: { months: [11], evidenceYears: [2026], confidence: "baixa", note: "Site oficial atualizou a realização para 16 a 21 de novembro." } },
    edition: { year: 2026, number: "25", start: "2026-11-16", end: "2026-11-21", opening: "2026-04-08", closing: "2026-05-08", resultDate: "2026-07-15", status: "planejada", rulesUrl: rules.url, confidence: "confirmado", notes: "Regulamento previa 21–27/9; atualização oficial posterior informa 16–21/11. A data atual prevalece e o conflito permanece documentado." },
    calls: [
      { ...common, name: "Curta Ibero-americano", slug: "curta-ibero", formats: ["curta"], maxMinutes: 20, maxSeconds: 1200, regions: ["Ibero-América"], territoriesConfirmed: true },
      { ...common, name: "Curta Sergipano", slug: "curta-se", formats: ["curta"], maxMinutes: 20, maxSeconds: 1200, countries: ["Brasil"], regions: ["SE"], territoriesConfirmed: true, restrictions: `${common.restrictions} Diretor e produtor sergipanos ou residentes no estado há mais de dois anos.` },
      { ...common, name: "Longa-metragem", slug: "longa", formats: ["longa"], minMinutes: 70, minSeconds: 4200, regions: ["Ibero-América"], territoriesConfirmed: true },
      { ...common, name: "Trailer", slug: "trailer", formats: ["outro"], workTypes: ["outro"], maxMinutes: 4, maxSeconds: 240 },
      { ...common, name: "Videoclipe", slug: "videoclipe", formats: ["outro"], workTypes: ["videoclipe"], themes: ["música"], maxMinutes: 6, maxSeconds: 360 },
    ],
    coverage: coverage({ localização: "Aracaju/SE.", atividade: "25ª edição confirmada.", categorias: "Curtas ibero e sergipano, longa, trailer e videoclipe separados.", duração: "Curtas até 20, longa a partir de 70, trailer até 4 e videoclipe até 6 minutos.", "elegibilidade territorial": "Ibero-americana e sergipana estruturadas separadamente.", "produção/conclusão": "Obras 2024–2026.", estreia: "Sem exigência localizada.", "exibição online": "Histórico anterior não vedado; arquivo integra itinerâncias autorizadas.", "pessoa autorizada a inscrever": "Diretor ou produtor; PF/PJ admitidas pelas plataformas e pelo texto.", abertura: "8 de abril de 2026.", encerramento: "8 de maio de 2026.", relevância: "25 anos e alcance ibero-americano documentados." }, { taxas: "Regulamento não declara taxa nem gratuidade de inscrição." }, { realização: "Regulamento impresso prevê 21–27/9; site oficial posterior altera para 16–21/11/2026. A edição usa a atualização, mantendo o conflito auditável." }),
    relevance: relevance([22, 14, 11, 19, 12], [73, 86], "nacional", "A longevidade, o escopo ibero-americano e a itinerância sustentam alta relevância.", ["Vinte e cinco anos de atividade.", "Cinco categorias e alcance ibero-americano.", "Ações formativas e itinerância.", "Importância para o audiovisual sergipano.", "Regulamento atual completo; alteração de datas documentada."], "alta"),
  });
}

// 037 — Curta Canoa, última chamada localizada: 15ª edição / 2025.
{
  const id = "festival-037";
  const rules = source(
    `${id}-source-regulation-2025`,
    "https://curtacanoa.com/wp-content/uploads/2025/04/Regulamento-Espanhol-Curta-Canoa.pdf",
    "Regulamento do 15º Curta Canoa",
    "15ª edição / 2025",
    coverageFields,
    {
      confidence: "edição anterior",
      evidenceState: "confirmado em edição anterior",
      note: "Regulamento oficial integralmente lido. Nenhuma chamada 2026 foi localizada.",
    },
  );
  const site = source(
    `${id}-source-site-2025`,
    "https://curtacanoa.com/",
    "Curta Canoa — página oficial",
    "15ª edição / 2025",
    ["location", "activity", "eventDates", "relevance"],
    { confidence: "edição anterior", evidenceState: "confirmado em edição anterior" },
  );
  applyFestival({
    id,
    sources: [rules, site],
    locations: [
      location(id, 1, "Canoa Quebrada", "CE", "Ceará", "2301109", [rules.id]),
    ],
    festival: {
      activity: "atividade não confirmada",
      frequency: "não confirmada",
      description: "Festival latino-americano de cinema realizado em Canoa Quebrada, no município de Aracati.",
      languages: ["ficção", "documentário", "animação", "experimental"],
      workTypes: ["filme"],
      audiences: ["geral"],
    },
    seasonality: {
      opening: { months: [4], evidenceYears: [2025], confidence: "baixa", note: "Baseada somente na chamada 2025." },
      event: { months: [9], evidenceYears: [2025], confidence: "baixa", note: "Última edição localizada ocorreu em setembro de 2025." },
    },
    edition: {
      year: 2025,
      number: "15",
      start: "2025-09-06",
      end: "2025-09-13",
      opening: "2025-04-02",
      closing: "2025-05-31",
      resultDate: "",
      status: "realizada",
      rulesUrl: rules.url,
      confidence: "edição anterior",
      notes: "Última chamada localizada é de 2025; atividade e regras para 2026 não foram confirmadas.",
    },
    calls: [{
      name: "Competitiva brasileira e latino-americana de curtas",
      formats: ["curta"],
      genres: ["ficção", "documentário", "animação", "experimental"],
      languages: ["ficção", "documentário", "animação", "experimental"],
      maxMinutes: 20,
      maxSeconds: 1200,
      maxInclusive: true,
      minYear: 2023,
      pf: "sim",
      pj: "não confirmado",
      premiere: "nenhuma",
      premiereRequirement: "sem exigência confirmada",
      online: "permitido",
      onlineConditions: "Não há vedação de histórico online no regulamento.",
      regions: ["Brasil", "América Latina"],
      territoriesConfirmed: true,
      restrictions: "Curta brasileiro ou latino-americano de até 20 minutos, concluído a partir de 2023. Responsável declara possuir os direitos.",
      opening: "2025-04-02",
      deadlines: [deadline("final", "2025-05-31", "23:59", rules.id, "prazo final")],
      fees: [freeFee(rules.id)],
      rulesUrl: rules.url,
      confidence: "edição anterior",
      sourceIds: [rules.id],
    }],
    coverage: coverage(
      { localização: "Canoa Quebrada, Aracati/CE, na edição 2025." },
      { atividade: "Nenhuma edição/chamada 2026 localizada.", relevância: "Avaliação usa a última edição oficial localizada." },
      {},
      {
        categorias: "Competitiva de curtas brasileiros e latino-americanos.", duração: "Até 20 minutos.", "elegibilidade territorial": "Brasil e América Latina.", "produção/conclusão": "Concluído a partir de 2023.", estreia: "Sem exigência localizada.", "exibição online": "Sem vedação localizada.", "pessoa autorizada a inscrever": "Responsável com direitos; natureza jurídica não explicitada.", taxas: "Inscrição gratuita.", abertura: "2 de abril de 2025.", encerramento: "31 de maio de 2025 às 23h59.", realização: "6 a 13 de setembro de 2025.",
      },
    ),
    relevance: relevance([18, 10, 8, 16, 9], [55, 69], "regional/local", "A continuidade e a integração latino-americana sustentam relevância regional, com desconto por falta de chamada 2026.", ["Quinze edições.", "Competitiva brasileira e latino-americana.", "Atividades culturais locais.", "Importância territorial em Canoa Quebrada.", "Regulamento oficial 2025; atividade atual não confirmada."], "baixa"),
  });
}

// 038 — Festival de Cinema de Triunfo, 17ª edição / 2026.
{
  const id = "festival-038";
  const platform = source(
    `${id}-source-mapacultural-2026`,
    "https://www.mapacultural.pe.gov.br/oportunidade/3402/#info",
    "Edital do 17º Festival de Cinema de Triunfo",
    "17ª edição / 2026",
    ["location", "activity", "categories", "formats", "productionYear", "countries", "pf", "pj", "fees", "opening", "deadlines", "eventDates"],
    { type: "plataforma de inscrição", confidence: "parcial", note: "Oportunidade oficial localizada, mas a plataforma dinâmica não permitiu leitura integral do edital neste acesso." },
  );
  const report = source(
    `${id}-source-current-report-2026`,
    "https://jc.uol.com.br/cultura/2026/09/23/festival-de-cinema-de-triunfo-abre-inscricoes-para-filmes-nacionais-e-pernambucanos.html",
    "Festival de Cinema de Triunfo abre inscrições para filmes nacionais e pernambucanos",
    "17ª edição / 2026",
    ["activity", "categories", "formats", "productionYear", "pf", "pj", "fees", "opening", "deadlines", "eventDates", "relevance"],
    { type: "fonte secundária", confidence: "parcial", note: "Fonte jornalística atual remete ao edital oficial e registra os principais critérios." },
  );
  const common = {
    genres: allLanguages,
    languages: allLanguages,
    minYear: 2024,
    maxYear: 2026,
    pf: "sim",
    pj: "sim",
    premiere: "não confirmado",
    online: "não confirmado",
    opening: "2026-10-01",
    deadlines: [deadline("final", "2026-10-15", "16:59", platform.id, "prazo final")],
    fees: [freeFee(platform.id)],
    platform: platform.url,
    rulesUrl: platform.url,
    confidence: "parcial",
    sourceIds: [platform.id, report.id],
    restrictions: "Obra brasileira finalizada entre 2024 e 2026. O mesmo proponente pode inscrever mais de uma obra em formulários próprios.",
  };
  applyFestival({
    id,
    sources: [platform, report],
    locations: [location(id, 1, "Triunfo", "PE", "Pernambuco", "2615706", [platform.id])],
    festival: { activity: "ativo", frequency: "anual", organizer: "Secult-PE / Fundarpe", description: "Festival competitivo brasileiro realizado no Sertão do Pajeú, com categorias nacionais, pernambucanas e dos Sertões.", languages: allLanguages, workTypes: ["filme", "videoclipe"], audiences: ["infantil", "juvenil", "geral"], platforms: ["Mapa Cultural de Pernambuco"] },
    seasonality: { opening: { months: [10], evidenceYears: [2026], confidence: "baixa", note: "1º de outubro de 2026; chamada estava aberta na data da pesquisa." }, event: { months: [12], evidenceYears: [2026], confidence: "baixa", note: "6 a 12 de dezembro de 2026." } },
    edition: { year: 2026, number: "17", start: "2026-12-06", end: "2026-12-12", opening: "2026-10-01", closing: "2026-10-15", resultDate: "", status: "planejada", rulesUrl: platform.url, confidence: "parcial", notes: "Chamada atual aberta e fonte oficial localizada. Como o edital integral da plataforma não foi recuperado, limites de duração, estreia e online permanecem desconhecidos em vez de serem copiados de 2025." },
    calls: [
      { ...common, name: "Longa-metragem Nacional", slug: "longa-nacional", formats: ["longa"], countries: ["Brasil"], territoriesConfirmed: true },
      { ...common, name: "Curta ou Média-metragem Nacional", slug: "curta-media-nacional", formats: ["curta", "média"], countries: ["Brasil"], territoriesConfirmed: true },
      { ...common, name: "Curta ou Média-metragem Pernambucano", slug: "curta-media-pe", formats: ["curta", "média"], countries: ["Brasil"], regions: ["PE"], territoriesConfirmed: true },
      { ...common, name: "Curta ou Média-metragem Infantojuvenil Nacional", slug: "infantojuvenil", formats: ["curta", "média"], audiences: ["infantil", "juvenil"], countries: ["Brasil"], territoriesConfirmed: true },
      { ...common, name: "Curta ou Média-metragem dos Sertões", slug: "sertoes", formats: ["curta", "média"], regions: ["Sertão Semiárido do Nordeste"], territoriesConfirmed: true, restrictions: `${common.restrictions} Obra realizada no Sertão Semiárido nordestino ou dirigida por pessoa residente nesse território há pelo menos 24 meses.` },
      { ...common, name: "Filme Experimental", slug: "experimental", formats: ["experimental"], genres: ["experimental"], languages: ["experimental"], restrictions: `${common.restrictions} Produção autoral de baixo ou baixíssimo orçamento, inclusive coletivos, escolas, celular ou internet.` },
    ],
    coverage: coverage({ localização: "Triunfo/PE.", atividade: "17ª edição com chamada aberta na data da pesquisa.", categorias: "Seis categorias competitivas separadas.", "elegibilidade territorial": "Nacional, Pernambuco e Sertões estruturados separadamente.", "produção/conclusão": "Finalização entre 2024 e 2026.", "pessoa autorizada a inscrever": "PF, MEI, PJ e coletivo sem CNPJ.", taxas: "Inscrições gratuitas.", abertura: "1º de outubro de 2026.", encerramento: "15 de outubro de 2026 às 16h59.", realização: "6 a 12 de dezembro de 2026.", relevância: "Dezessete edições e função de descentralização documentadas." }, { duração: "Edital integral atual não recuperado; limites não foram copiados da edição anterior.", estreia: "Não localizada nas fontes recuperadas.", "exibição online": "Não localizada." }),
    relevance: relevance([19, 14, 12, 18, 12], [70, 82], "nacional", "A continuidade, as seis categorias e a função de descentralização no Sertão sustentam alta relevância.", ["Dezessete edições.", "Categorias nacionais, pernambucanas e dos Sertões.", "Doze prêmios em dinheiro e júris oficial/popular.", "Papel estruturante no audiovisual do interior pernambucano.", "Chamada atual localizada; edital integral dinâmico não recuperado."], "média"),
  });
}

// 039 — Maranhão na Tela, 19ª edição / 2026.
{
  const id = "festival-039";
  const report = source(`${id}-source-program-2026`, "https://difusoranews.com/evento/19a-festival-maranhao-na-tela-inicia/", "19º Festival Maranhão na Tela", "19ª edição / 2026", ["location", "activity", "categories", "eventDates", "relevance"], { type: "fonte secundária", confidence: "parcial", note: "Nenhuma página oficial de chamada ou regulamento foi localizada; a programação é confirmada por fonte jornalística local." });
  const index = source(`${id}-source-index-2026`, "https://festivalindex.com/pt-br/events/48097-festival-maranhao-na-tela-2026", "Festival Maranhão na Tela 2026", "19ª edição / 2026", ["activity", "eventDates"], { type: "fonte secundária", confidence: "parcial" });
  applyFestival({
    id,
    sources: [report, index],
    locations: [location(id, 1, "São Luís", "MA", "Maranhão", "2111300", [report.id])],
    festival: { activity: "ativo", frequency: "anual", description: "Festival voltado à produção audiovisual maranhense, realizado em São Luís.", languages: allLanguages, workTypes: ["filme"], audiences: ["geral"] },
    seasonality: { opening: { months: [], evidenceYears: [], confidence: "desconhecida", note: "Chamada pública de filmes não localizada." }, event: { months: [9], evidenceYears: [2026], confidence: "baixa", note: "22 a 26 de setembro de 2026." } },
    edition: { year: 2026, number: "19", start: "2026-09-22", end: "2026-09-26", opening: "", closing: "", resultDate: "", status: "realizada", rulesUrl: report.url, confidence: "parcial", notes: "Edição e programa confirmados por fontes secundárias atuais. Nenhum regulamento ou chamada pública foi localizado; programação gratuita não foi interpretada como inscrição gratuita." },
    calls: [{ name: "Programação maranhense — curadoria sem chamada localizada", formats: [], genres: allLanguages, languages: allLanguages, submissionMode: "curadoria sem chamada", selectionType: "não confirmado", genresConfirmed: false, countries: ["Brasil"], regions: ["MA"], territoriesConfirmed: true, restrictions: "Programação dedicada a obras maranhenses; critérios de seleção e inscrição não localizados.", rulesUrl: report.url, confidence: "parcial", sourceIds: [report.id] }],
    coverage: coverage({ localização: "São Luís/MA, Cine Sesc Deodoro.", atividade: "19ª edição realizada em 2026.", categorias: "Programação de produção maranhense confirmada; sem chamada pública localizada.", "elegibilidade territorial": "Recorte maranhense na programação divulgada.", realização: "22 a 26 de setembro de 2026.", relevância: "Dezenove edições e mais de cem obras maranhenses no programa documentadas." }, { duração: "Não localizada.", "produção/conclusão": "Não localizada.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Não localizada; gratuidade do público não implica inscrição gratuita.", abertura: "Não localizada.", encerramento: "Não localizado." }),
    relevance: relevance([20, 12, 8, 18, 8], [60, 74], "regional/local", "A continuidade e a concentração em produção maranhense sustentam alta relevância territorial.", ["Dezenove edições.", "Mais de cem obras maranhenses anunciadas.", "Programação e encontros locais.", "Janela relevante para a produção do Maranhão.", "Atividade atual confirmada, sem regulamento público localizado."], "média"),
  });
}

// 040 — Circuito Penedo de Cinema, 16ª edição / 2026.
{
  const id = "festival-040";
  const platform = source(`${id}-source-filmfreeway-2026`, "https://filmfreeway.com/CircuitoPenedodeCinema", "16º Circuito Penedo de Cinema — regras", "16ª edição / 2026", coverageFields, { type: "plataforma de inscrição", note: "Página integral da chamada lida." });
  const site = source(`${id}-source-site-2026`, "https://circuitopenedodecinema.com.br", "Circuito Penedo de Cinema", "16ª edição / 2026", ["location", "activity", "eventDates", "relevance"]);
  const common = { formats: ["curta"], genres: allLanguages, languages: allLanguages, maxMinutes: 25, maxSeconds: 1500, maxInclusive: true, creditsIncluded: true, minYear: 2025, pf: "sim", pj: "sim", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Selecionados autorizam exibição online entre 9 e 15/11; histórico online anterior não é vedado.", countries: ["Brasil"], territoriesConfirmed: true, opening: "2026-06-22", deadlines: [deadline("final", "2026-07-31", "", platform.id, "prazo final")], fees: [freeFee(platform.id)], platform: "FilmFreeway", rulesUrl: platform.url, sourceIds: [platform.id], restrictions: "Curta brasileiro produzido a partir de 2025, até 25 minutos incluindo créditos. Proponente diretor ou produtor; empresas/distribuidoras limitadas a dois filmes por diretor. Filmes produzidos/coproduzidos por TV não são aceitos." };
  applyFestival({
    id,
    sources: [platform, site],
    locations: [location(id, 1, "Penedo", "AL", "Alagoas", "2706703", [site.id])],
    festival: { activity: "ativo", onlineOnly: false, frequency: "anual", description: "Circuito híbrido que reúne festivais brasileiro, universitário e socioambiental em Penedo.", languages: allLanguages, workTypes: ["filme"], audiences: ["infantil", "geral"], platforms: ["FilmFreeway"] },
    seasonality: { opening: { months: [6], evidenceYears: [2026], confidence: "baixa", note: "22 de junho de 2026." }, event: { months: [11], evidenceYears: [2026], confidence: "baixa", note: "9 a 15 de novembro de 2026." } },
    edition: { year: 2026, number: "16", start: "2026-11-09", end: "2026-11-15", opening: "2026-06-22", closing: "2026-07-31", resultDate: "", status: "planejada", rulesUrl: platform.url, confidence: "confirmado", notes: "Três chamadas competitivas foram separadas. A mostra infantil integra a programação, mas não teve chamada aberta confirmada nas regras lidas." },
    calls: [
      { ...common, name: "19º Festival de Cinema Brasileiro de Penedo", slug: "brasileiro" },
      { ...common, name: "16º Festival de Cinema Universitário de Alagoas", slug: "universitario", participationConditions: ["universitário"], restrictions: `${common.restrictions} Exige comprovação de vínculo com curso técnico, escola ou instituição de ensino superior conforme a plataforma.` },
      { ...common, name: "13º Festival Velho Chico de Cinema Ambiental", slug: "velho-chico", themes: ["socioambiental"], restrictions: `${common.restrictions} Obra de temática socioambiental.` },
    ],
    coverage: coverage({ localização: "Penedo/AL.", atividade: "16º circuito confirmado para 2026.", categorias: "Três festivais competitivos separados.", duração: "Até 25 minutos incluindo créditos.", "elegibilidade territorial": "Produções brasileiras; universitária e socioambiental têm condições próprias.", "produção/conclusão": "Produzido a partir de 2025.", estreia: "Sem exigência localizada.", "exibição online": "Selecionados autorizam janela online do circuito; histórico anterior não vedado.", "pessoa autorizada a inscrever": "Diretor, produtor e, sob limites, empresa/distribuidora; PF e PJ.", taxas: "Inscrição gratuita.", abertura: "22 de junho de 2026.", encerramento: "31 de julho de 2026.", realização: "9 a 15 de novembro de 2026.", relevância: "Dezesseis edições do circuito e três recortes competitivos documentados." }),
    relevance: relevance([20, 14, 12, 18, 14], [74, 86], "nacional", "A continuidade, a arquitetura de três festivais e a função territorial sustentam alta relevância.", ["Dezesseis edições do circuito.", "Festivais brasileiro, universitário e ambiental.", "Formação e premiação associadas.", "Relevância para Alagoas e o Baixo São Francisco.", "Regras e calendário atuais completos."], "alta"),
  });
}

// 041 — Santos Film Fest, 12ª edição / 2026.
{
  const id = "festival-041";
  const rules = source(`${id}-source-regulation-2026`, "https://santosfilmfest.wordpress.com/mostra-de-filmes-regulamento/", "Regulamento do 12º Santos Film Fest", "12ª edição / 2026", coverageFields, { note: "Página oficial integralmente lida." });
  const selection = source(`${id}-source-selection-2026`, "https://santosfilmfest.wordpress.com/2026/07/14/lista-de-filmes-selecionados-para-o-12o-santos-film-fest-festival-de-cinema-de-santos/", "Seleção oficial do 12º Santos Film Fest", "12ª edição / 2026", ["activity", "categories", "eventDates", "relevance"]);
  const common = { genres: ["ficção", "documentário", "animação"], languages: ["ficção", "documentário", "animação"], pf: "sim", pj: "não confirmado", premiere: "municipal", premiereRequirement: "obrigatória", premiereTerritory: "Baixada Santista", premiereConditions: "Chamadas nacionais e regionais devem ser inéditas em festivais da Baixada Santista.", online: "permitido", onlineConditions: "Regulamento não veda histórico online anterior.", countries: ["Brasil"], territoriesConfirmed: true, opening: "2026-01-10", deadlines: [deadline("final", "2026-04-20", "", rules.id, "prazo final")], fees: [freeFee(rules.id)], rulesUrl: rules.url, sourceIds: [rules.id], restrictions: "Obra finalizada a partir de 1º de janeiro de 2025; responsável declara possuir os direitos; selecionados integram arquivo para exibições gratuitas futuras." };
  applyFestival({
    id,
    sources: [rules, selection],
    locations: [location(id, 1, "Santos", "SP", "São Paulo", "3548500", [rules.id])],
    festival: { activity: "ativo", frequency: "anual", description: "Festival de cinema de Santos com competições nacionais, regionais, universitárias e internacionais.", languages: ["ficção", "documentário", "animação"], workTypes: ["filme"], audiences: ["geral"] },
    seasonality: { opening: { months: [1], evidenceYears: [2026], confidence: "baixa", note: "10 de janeiro de 2026." }, event: { months: [8], evidenceYears: [2026], confidence: "baixa", note: "18 a 26 de agosto de 2026." } },
    edition: { year: 2026, number: "12", start: "2026-08-18", end: "2026-08-26", opening: "2026-01-10", closing: "2026-04-20", resultDate: "2026-07-14", status: "realizada", rulesUrl: rules.url, confidence: "confirmado", notes: "Chamadas separadas por duração, território e vínculo universitário. A regra de ineditismo na Baixada foi aplicada somente às chamadas nacionais/regionais às quais se refere." },
    calls: [
      { ...common, name: "Curta Nacional", slug: "curta-nacional", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, maxInclusive: true },
      { ...common, name: "Longa Nacional", slug: "longa-nacional", formats: ["longa"], minMinutes: 61, minSeconds: 3660, minInclusive: false },
      { ...common, name: "Curta Humanidades — Baixada Santista", slug: "curta-regional", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, regions: ["Baixada Santista"] },
      { ...common, name: "Longa Humanidades — Baixada Santista", slug: "longa-regional", formats: ["longa"], minMinutes: 61, minSeconds: 3660, minInclusive: false, regions: ["Baixada Santista"] },
      { ...common, name: "Curta Universitário", slug: "universitario", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, participationConditions: ["universitário"], restrictions: `${common.restrictions} Realizado por estudante ou egresso há no máximo um ano.` },
      { name: "Curta Internacional", slug: "curta-internacional", formats: ["curta"], genres: ["ficção", "documentário", "animação"], languages: ["ficção", "documentário", "animação"], maxMinutes: 25, maxSeconds: 1500, maxInclusive: true, minYear: 2024, pf: "sim", pj: "não confirmado", premiere: "não confirmado", online: "não confirmado", countries: [], territoriesConfirmed: true, restrictions: "Obra internacional finalizada a partir de janeiro de 2024; materiais/legendas em português quando aplicável.", opening: "2026-01-10", deadlines: [deadline("final", "2026-04-20", "", rules.id, "prazo final")], fees: [freeFee(rules.id)], rulesUrl: rules.url, sourceIds: [rules.id] },
      { name: "Longa Internacional", slug: "longa-internacional", formats: ["longa"], genres: ["ficção", "documentário", "animação"], languages: ["ficção", "documentário", "animação"], minMinutes: 61, minSeconds: 3660, minInclusive: false, minYear: 2024, pf: "sim", pj: "não confirmado", premiere: "não confirmado", online: "não confirmado", countries: [], territoriesConfirmed: true, restrictions: "Obra internacional finalizada a partir de janeiro de 2024; materiais/legendas em português quando aplicável.", opening: "2026-01-10", deadlines: [deadline("final", "2026-04-20", "", rules.id, "prazo final")], fees: [freeFee(rules.id)], rulesUrl: rules.url, sourceIds: [rules.id] },
    ],
    coverage: coverage({ localização: "Santos/SP.", atividade: "12ª edição realizada.", categorias: "Nacional, Humanidades, Universitária e Internacional separadas por duração.", duração: "Curtas até 25 min; longas acima de 61 min conforme o regulamento.", "elegibilidade territorial": "Chamadas nacional, Baixada Santista e internacional separadas.", "produção/conclusão": "Nacional desde 2025; internacional desde 2024.", estreia: "Ineditismo em festivais da Baixada nas chamadas nacionais/regionais; internacional não confirmado.", "exibição online": "Sem vedação anterior localizada; arquivo autoriza futuras sessões gratuitas.", "pessoa autorizada a inscrever": "Responsável com direitos; PJ não explicitada.", taxas: "Inscrição gratuita.", abertura: "10 de janeiro de 2026.", encerramento: "20 de abril de 2026.", realização: "18 a 26 de agosto de 2026.", relevância: "Seleção de 103 obras entre 2.051 inscrições, 27 estados e 16 países." }),
    relevance: relevance([16, 17, 11, 17, 14], [70, 82], "nacional", "A seleção ampla, a diversidade territorial e a estrutura de categorias sustentam alta relevância.", ["Doze edições.", "Mais de duas mil inscrições e 103 obras selecionadas.", "Atividades e múltiplas categorias.", "Articulação de cinema nacional, internacional e Baixada Santista.", "Regulamento e seleção atuais oficiais."], "alta"),
  });
}

// 042 — CINEMATO, 23ª edição / 2026.
{
  const id = "festival-042";
  const rules = source(`${id}-source-regulation-2026`, "https://festivalcinemato.com.br/wp-content/uploads/2026/02/REGULAMENTO_2026_01.pdf", "Regulamento do 23º CINEMATO", "23ª edição / 2026", coverageFields, { note: "Regulamento oficial integralmente lido." });
  const revised = source(`${id}-source-revised-2026`, "https://festivalcinemato.com.br/wp-content/uploads/2026/02/REGULAMENTO_2026_02_revisto.pdf", "Regulamento revisto do 23º CINEMATO", "23ª edição / 2026", coverageFields, { note: "Retificação oficial integralmente lida; permanece divergência interna entre 4 e 5 de fevereiro para a abertura." });
  const common = { genres: allLanguages, languages: allLanguages, minYear: 2025, maxYear: 2026, pf: "sim", pj: "não confirmado", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Histórico online anterior não é vedado.", countries: ["Brasil"], territoriesConfirmed: true, opening: "2026-02-05", deadlines: [deadline("final", "2026-02-27", "23:59", revised.id, "prazo final")], fees: [freeFee(revised.id)], rulesUrl: revised.url, sourceIds: [rules.id, revised.id], restrictions: "Produzido em 2025 ou 2026; máximo de duas obras por cineasta; exclui publicidade, institucional e reportagens de TV." };
  applyFestival({
    id,
    sources: [rules, revised],
    locations: [location(id, 1, "Cuiabá", "MT", "Mato Grosso", "5103403", [rules.id])],
    festival: { activity: "ativo", frequency: "anual", description: "Festival de cinema de Cuiabá com mostras de longas brasileiros e curtas nacionais e mato-grossenses.", languages: allLanguages, workTypes: ["filme"], audiences: ["geral"] },
    seasonality: { opening: { months: [2], evidenceYears: [2026], confidence: "baixa", note: "Regulamento revisto diverge entre 4 e 5 de fevereiro." }, event: { months: [5], evidenceYears: [2026], confidence: "baixa", note: "23 a 31 de maio de 2026." } },
    edition: { year: 2026, number: "23", start: "2026-05-23", end: "2026-05-31", opening: "2026-02-05", closing: "2026-02-27", resultDate: "2026-03-22", status: "realizada", rulesUrl: revised.url, confidence: "confirmado", notes: "A data do cronograma (5/2 às 12h) foi usada na edição; o corpo do documento menciona 4/2. Divergência mantida na cobertura." },
    calls: [
      { ...common, name: "Longa-metragem brasileiro", slug: "longa", formats: ["longa"], restrictions: `${common.restrictions} O regulamento usa a categoria longa sem limiar numérico.` },
      { ...common, name: "Curta-metragem brasileiro", slug: "curta-br", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, maxInclusive: true },
      { ...common, name: "Curta-metragem mato-grossense", slug: "curta-mt", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, maxInclusive: true, regions: ["MT"] },
    ],
    coverage: coverage({ localização: "Cuiabá/MT, Teatro UFMT.", atividade: "23ª edição realizada.", categorias: "Longa brasileiro, curta brasileiro e curta mato-grossense.", duração: "Curtas até 25 min; longa sem limiar numérico no documento.", "elegibilidade territorial": "Brasil e Mato Grosso em chamadas separadas.", "produção/conclusão": "Produzido em 2025 ou 2026.", estreia: "Sem exigência localizada.", "exibição online": "Sem vedação localizada.", "pessoa autorizada a inscrever": "Cineasta/agente individual; PJ não explicitada.", taxas: "Inscrição gratuita; remuneração de exibição não foi confundida com taxa.", encerramento: "27 de fevereiro de 2026 às 23h59.", realização: "23 a 31 de maio de 2026.", relevância: "23 edições, UFMT e remuneração de exibição documentadas." }, {}, { abertura: "Corpo do regulamento menciona 4/2 às 12h; cronograma revisto registra 5/2 às 12h. A edição usa o cronograma e mantém o conflito." }),
    relevance: relevance([21, 13, 12, 18, 13], [72, 84], "regional/local", "A continuidade, a parceria universitária e o pagamento de exibição sustentam alta relevância regional.", ["Vinte e três edições.", "Mostras nacionais e mato-grossense.", "Formação e remuneração de exibição.", "Importância para o audiovisual de Mato Grosso.", "Regulamento e retificação atuais completos."], "alta"),
  });
}

// 043 — Olhar do Norte, 8ª edição / 2026.
{
  const id = "festival-043";
  const rules = source(`${id}-source-regulation-2026`, "https://festivalolhardonorte.com/regulamento-festival-olhar-do-norte-2026/", "Regulamento do 8º Olhar do Norte", "8ª edição / 2026", coverageFields, { note: "Regulamento oficial integralmente lido." });
  const common = { genres: allLanguages, languages: allLanguages, pf: "sim", pj: "não confirmado", premiere: "nenhuma", premiereRequirement: "sem exigência confirmada", online: "permitido", onlineConditions: "Histórico online anterior não é vedado; chamadas amazônicas selecionadas podem ter janela posterior no Itaú Cultural Play mediante termo próprio.", opening: "2026-05-05", deadlines: [deadline("final", "2026-06-19", "", rules.id, "prazo final")], fees: [freeFee(rules.id)], rulesUrl: rules.url, sourceIds: [rules.id], restrictions: "Qualquer gênero; WIP aceito; inscrições ilimitadas; responsável deve possuir direitos." };
  applyFestival({
    id,
    sources: [rules],
    locations: [location(id, 1, "Manaus", "AM", "Amazonas", "1302603", [rules.id])],
    festival: { activity: "ativo", frequency: "anual", description: "Festival dedicado ao cinema da Amazônia e do Norte brasileiro, realizado em Manaus.", languages: allLanguages, workTypes: ["filme"], audiences: ["infantil", "juvenil", "geral"] },
    seasonality: { opening: { months: [5], evidenceYears: [2026], confidence: "baixa", note: "5 de maio de 2026." }, event: { months: [9], evidenceYears: [2026], confidence: "baixa", note: "Regulamento informa setembro sem dias exatos." } },
    edition: { year: 2026, number: "8", start: "", end: "", opening: "2026-05-05", closing: "2026-06-19", resultDate: "", status: "planejada", rulesUrl: rules.url, confidence: "confirmado", notes: "Realização confirmada para setembro de 2026, sem dias publicados. A edição preserva datas vazias em vez de inventar intervalo." },
    calls: [
      { ...common, name: "Amazônia — longas", slug: "amazonia-longas", formats: ["longa"], minMinutes: 60, minSeconds: 3600, regions: ["Amazônia Legal"], territoriesConfirmed: true },
      { ...common, name: "Amazônia — curtas", slug: "amazonia-curtas", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, regions: ["Amazônia Legal"], territoriesConfirmed: true },
      { ...common, name: "Outros Nortes", slug: "outros-nortes", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, countries: ["Brasil"], regions: ["Brasil exceto Amazônia Legal"], territoriesConfirmed: true },
      { ...common, name: "Olhar Panorâmico", slug: "panoramico", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, regions: ["Amazônia Legal"], territoriesConfirmed: true, selectionType: "não competitiva" },
      { ...common, name: "Olhinho", slug: "olhinho", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, countries: ["Brasil"], territoriesConfirmed: true, audiences: ["infantil", "juvenil"], selectionType: "não competitiva" },
    ],
    coverage: coverage({ localização: "Manaus/AM.", atividade: "8ª edição confirmada para 2026.", categorias: "Cinco mostras estruturadas separadamente.", duração: "Longa Amazônia a partir de 60 min; demais até 25 min.", "elegibilidade territorial": "Amazônia Legal, restante do Brasil e nacional infantil separados.", "produção/conclusão": "Sem corte de ano; WIP aceito.", estreia: "Sem exigência localizada.", "exibição online": "Janela posterior possível no Itaú Cultural Play; histórico anterior não vedado.", "pessoa autorizada a inscrever": "Responsável com direitos; natureza jurídica não explicitada.", taxas: "Inscrição gratuita.", abertura: "5 de maio de 2026.", encerramento: "19 de junho de 2026.", realização: "Setembro de 2026, sem dias exatos publicados.", relevância: "Oito edições e recorte Amazônia Legal documentados." }),
    relevance: relevance([14, 12, 9, 19, 13], [62, 74], "especializado", "A especialização territorial e a arquitetura de cinco mostras sustentam alta relevância.", ["Oito edições.", "Mostras amazônicas, nacionais e infantis.", "Júri jovem e janela digital posterior.", "Relevância especializada para o cinema amazônico.", "Regulamento atual completo; dias do evento não publicados."], "alta"),
  });
}

// 044 — Cinefantasy, 17ª edição / 2026.
{
  const id = "festival-044";
  const platform = source(`${id}-source-festhome-2026`, "https://filmmakers.festhome.com/pt/festival/cinefantasy-international-fantastic-film-festival", "17º Cinefantasy — regras e taxas", "17ª edição / 2026", coverageFields, { type: "plataforma de inscrição", note: "Página integral de regras, categorias e taxas lida. O texto contém divergências internas de prazo e realização." });
  const site = source(`${id}-source-site-2026`, "https://www.cinefantasy.com.br/", "Cinefantasy 2026", "17ª edição / 2026", ["location", "activity", "eventDates", "relevance"], { note: "Página oficial confirma 1 a 6 de setembro em São Paulo; a plataforma também contém 8 a 13 de setembro em trechos das regras." });
  const deadlines = [
    deadline("early", "2026-01-10", "", platform.id, "prazo antecipado"),
    deadline("regular", "2026-04-30", "", platform.id, "prazo regular"),
    deadline("late", "2026-05-24", "", platform.id, "prazo tardio"),
    deadline("final", "2026-05-31", "", platform.id, "prazo final na plataforma"),
  ];
  const common = { genres: ["fantástico", "horror"], languages: allLanguages, contentGenres: ["fantástico", "horror"], minYear: 2024, pf: "sim", pj: "sim", premiere: "municipal", premiereRequirement: "obrigatória", premiereTerritory: "São Paulo", premiereConditions: "Não pode ter sido exibido em festivais na cidade de São Paulo nem em edição anterior do Cinefantasy.", online: "permitido", onlineConditions: "Histórico online anterior não é vedado expressamente.", territoriesConfirmed: true, opening: "2025-12-10", deadlines, platform: "Festhome", rulesUrl: platform.url, sourceIds: [platform.id], restrictions: "Fantasia, horror ou ficção científica produzido nos 24 meses anteriores; diretor, produtor ou distribuidor PF/PJ pode inscrever. Idiomas fora de português/inglês/espanhol exigem legendas." };
  const foreignShortFees = [paidFee(15, "USD", "early", platform.id, ["curta internacional"]), paidFee(20, "USD", "regular", platform.id, ["curta internacional"]), paidFee(22, "USD", "late", platform.id, ["curta internacional"]), paidFee(25, "USD", "final", platform.id, ["curta internacional"])];
  const foreignLongFees = [paidFee(20, "USD", "early", platform.id, ["longa internacional"]), paidFee(30, "USD", "regular", platform.id, ["longa internacional"]), paidFee(32, "USD", "late", platform.id, ["longa internacional"]), paidFee(35, "USD", "final", platform.id, ["longa internacional"])];
  const brazilFees = [paidFee(0, "USD", "early", platform.id, ["obras brasileiras"]), paidFee(0, "USD", "regular", platform.id, ["obras brasileiras"]), paidFee(1, "USD", "late", platform.id, ["obras brasileiras"]), paidFee(2, "USD", "final", platform.id, ["obras brasileiras"])];
  applyFestival({
    id,
    sources: [platform, site],
    locations: [location(id, 1, "São Paulo", "SP", "São Paulo", "3550308", [site.id])],
    festival: { activity: "ativo", traveling: true, frequency: "anual", description: "Festival internacional de cinema fantástico, horror e ficção científica realizado em São Paulo.", genres: ["fantástico", "horror"], languages: allLanguages, contentGenres: ["fantástico", "horror"], workTypes: ["filme"], audiences: ["geral"], platforms: ["Festhome"] },
    seasonality: { opening: { months: [12], evidenceYears: [2025], confidence: "baixa", note: "Chamada 2026 abriu em dezembro de 2025." }, event: { months: [9], evidenceYears: [2026], confidence: "baixa", note: "Site oficial informa 1 a 6/9; regras também contêm 8 a 13/9." } },
    edition: { year: 2026, number: "17", start: "2026-09-01", end: "2026-09-06", opening: "2025-12-10", closing: "2026-05-31", resultDate: "", status: "realizada", rulesUrl: platform.url, confidence: "parcial", notes: "Site oficial atual usa 1–6/9 e plataforma usa 31/5 como prazo final. Trechos das regras mencionam 8–13/9 e 14/6; conflitos permanecem documentados." },
    calls: [
      { ...common, name: "Curtas internacionais fantásticos", slug: "curtas-int", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, maxInclusive: true, countries: [], fees: foreignShortFees },
      { ...common, name: "Longas internacionais fantásticos", slug: "longas-int", formats: ["longa"], minMinutes: 60, minSeconds: 3600, minInclusive: false, maxMinutes: 240, maxSeconds: 14400, maxInclusive: false, countries: [], fees: foreignLongFees },
      { ...common, name: "Curtas brasileiros fantásticos", slug: "curtas-br", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, countries: ["Brasil"], fees: brazilFees },
      { ...common, name: "Longas brasileiros fantásticos", slug: "longas-br", formats: ["longa"], minMinutes: 60, minSeconds: 3600, minInclusive: false, maxMinutes: 240, maxSeconds: 14400, maxInclusive: false, countries: ["Brasil"], fees: brazilFees },
      { ...common, name: "Curtas estudantis", slug: "estudantil", formats: ["curta"], maxMinutes: 25, maxSeconds: 1500, participationConditions: ["universitário", "escolar"], fees: [paidFee(0, "USD", "early", platform.id, ["curta estudantil"]), paidFee(0, "USD", "regular", platform.id, ["curta estudantil"]), paidFee(0, "USD", "late", platform.id, ["curta estudantil"]), paidFee(1, "USD", "final", platform.id, ["curta estudantil"])] },
    ],
    coverage: coverage({ localização: "São Paulo/SP.", atividade: "17ª edição realizada em 2026.", categorias: "Curtas, longas, brasileiros, internacionais e estudantis separados.", duração: "Curtas até 25 min; longas acima de 60 e abaixo de 240 min.", "elegibilidade territorial": "Brasil e exterior em chamadas distintas.", "produção/conclusão": "Produção nos 24 meses anteriores.", estreia: "Sem exibição anterior em festivais na cidade de São Paulo ou no Cinefantasy.", "exibição online": "Nenhuma vedação de histórico online localizada.", "pessoa autorizada a inscrever": "Diretor, produtor ou distribuidor; PF/PJ.", taxas: "Valores por categoria e lote estruturados em USD, incluindo gratuidades e lotes de baixo custo brasileiros.", abertura: "10 de dezembro de 2025.", relevância: "Dezessete edições e mais de 1.500 inscrições na edição anterior documentadas." }, {}, { encerramento: "Plataforma usa 31/5; texto também menciona 14/6. O prazo operacional estruturado é 31/5.", realização: "Site oficial informa 1–6/9; texto da plataforma também contém 8–13/9. A edição usa a data do site." }),
    relevance: relevance([21, 17, 12, 20, 11], [76, 89], "especializado", "A escala internacional e a especialização em fantástico sustentam relevância muito alta.", ["Dezessete edições.", "Mais de 1.500 inscrições e ampla seleção internacional.", "Premiação e categorias profissionais/estudantis.", "Festival especializado de referência no fantástico brasileiro.", "Regras atuais detalhadas, com conflitos de datas documentados."], "alta"),
  });
}

// 045 — RioLGBTQIA+, 15ª edição / 2026.
{
  const id = "festival-045";
  const rules = source(`${id}-source-regulation-2026`, "https://www.riolgbtqia.com.br/assets/files/Regulamento_2026-RioLGBTQIA.pdf", "Regulamento do 15º RioLGBTQIA+", "15ª edição / 2026", coverageFields, { note: "Regulamento oficial integralmente lido." });
  const press = source(`${id}-source-press-2026`, "https://riolgbtqia.com.br/IMPRENSA_2026.html", "RioLGBTQIA+ 2026 — imprensa e programação", "15ª edição / 2026", ["location", "activity", "eventDates", "relevance"]);
  const online = source(`${id}-source-online-regulation-2026`, "https://riolgbtqia.com.br/assets/files/Regulation_2026-RioLGBTQIA-ON.pdf", "Regulamento RioLGBTQIA+ Online 2026", "15ª edição / 2026", ["categories", "online", "fees", "deadlines", "eventDates"], { confidence: "parcial", note: "Documento oficial localizado e campos operacionais indexados; leitura integral não foi recuperada neste lote." });
  const common = { genres: allLanguages, languages: allLanguages, themes: ["LGBTQIA+"], pf: "não confirmado", pj: "não confirmado", online: "permitido", onlineConditions: "Regulamento presencial não veda histórico online anterior.", territoriesConfirmed: true, deadlines: [deadline("final", "2026-04-01", "", rules.id, "prazo final")], fees: [freeFee(rules.id, ["mostras presenciais"], "Sem taxa de inscrição e sem taxa de exibição.")], rulesUrl: rules.url, sourceIds: [rules.id], restrictions: "Obra de temática LGBTQIA+ em ficção, documentário, animação, experimental ou IA. Categorias e durações são declaradas sem limiares numéricos." };
  applyFestival({
    id,
    sources: [rules, press, online],
    locations: [location(id, 1, "Rio de Janeiro", "RJ", "Rio de Janeiro", "3304557", [press.id])],
    festival: { activity: "ativo", onlineOnly: false, frequency: "anual", description: "Festival internacional de cinema LGBTQIA+ com programação presencial em múltiplos espaços do Rio e plataforma online própria.", languages: allLanguages, themes: ["LGBTQIA+"], workTypes: ["filme"], audiences: ["geral"] },
    seasonality: { opening: { months: [], evidenceYears: [], confidence: "desconhecida", note: "Data de abertura não publicada/localizada; somente encerramentos." }, event: { months: [7], evidenceYears: [2026], confidence: "baixa", note: "Programação presencial de 2 a 8 de julho de 2026." } },
    edition: { year: 2026, number: "15", start: "2026-07-02", end: "2026-07-08", opening: "", closing: "2026-04-03", resultDate: "", status: "realizada", rulesUrl: rules.url, confidence: "confirmado", notes: "Chamada presencial encerrou em 1/4; plataforma online em 3/4. A data agregada de fechamento usa o último prazo, enquanto cada chamada conserva o seu." },
    calls: [
      { ...common, name: "Longa internacional LGBTQIA+", slug: "longa", formats: ["longa"], countries: [], premiere: "municipal", premiereRequirement: "obrigatória", premiereTerritory: "Rio de Janeiro", premiereConditions: "Obras de 2024 somente são aceitas se a sessão for a primeira no Rio de Janeiro.", minYear: 2024, maxYear: 2026 },
      { ...common, name: "Curta internacional LGBTQIA+", slug: "curta", formats: ["curta", "média"], countries: [], premiere: "municipal", premiereRequirement: "obrigatória", premiereTerritory: "Rio de Janeiro", premiereConditions: "Obras de 2024 somente são aceitas se a sessão for a primeira no Rio de Janeiro.", minYear: 2024, maxYear: 2026 },
      { ...common, name: "Div.A — animação LGBTQIA+", slug: "diva", formats: ["curta"], genres: ["animação"], languages: ["animação"], countries: [], premiere: "municipal", premiereRequirement: "obrigatória", premiereTerritory: "Rio de Janeiro", premiereConditions: "Obras de 2024 somente são aceitas se a sessão for a primeira no Rio de Janeiro.", minYear: 2024, maxYear: 2026 },
      { ...common, name: "Mostra Especial LGBTQIA+", slug: "especial", formats: ["curta", "média", "longa", "experimental", "outro"], countries: [], premiere: "não confirmado", minYear: 2024, maxYear: 2026 },
      { name: "RioLGBTQIA+ Online", slug: "online", formats: ["curta", "média", "longa", "experimental", "outro"], genres: allLanguages, languages: allLanguages, themes: ["LGBTQIA+"], submissionMode: "aberta", selectionType: "mista", pf: "não confirmado", pj: "não confirmado", premiere: "não confirmado", online: "permitido", onlineConditions: "Selecionados autorizam exibição na plataforma online entre 1º de junho e 31 de dezembro de 2026.", territoriesConfirmed: true, deadlines: [deadline("final", "2026-04-03", "23:59", online.id, "prazo final da plataforma online")], fees: [freeFee(online.id, ["plataforma online"])], rulesUrl: online.url, confidence: "parcial", sourceIds: [online.id], restrictions: "Temática LGBTQIA+; demais limites dependem de leitura integral do regulamento online." },
    ],
    coverage: coverage({ localização: "Rio de Janeiro/RJ em múltiplos equipamentos culturais.", atividade: "15ª edição realizada.", categorias: "Longa, curta/média, Div.A, especial e online separados.", duração: "Categorias são nominadas, mas o regulamento não fornece limiares numéricos; campos permanecem sem números.", "elegibilidade territorial": "Festival internacional sem restrição de país localizada.", "produção/conclusão": "Competição aceita 2024–2026; condição adicional para 2024.", estreia: "Obras de 2024 exigem primeira exibição no Rio; regra não generalizada para 2025–2026.", "exibição online": "Chamada online separada com janela de junho a dezembro.", taxas: "Inscrições gratuitas e sem taxa de exibição.", encerramento: "1º de abril no presencial; 3 de abril às 23h59 no online.", realização: "2 a 8 de julho de 2026 no presencial; janela online até 31 de dezembro.", relevância: "Quinze edições, mais de 200 filmes e parcerias internacionais documentadas." }, { "pessoa autorizada a inscrever": "Natureza PF/PJ não especificada.", abertura: "Data de abertura não localizada." }),
    relevance: relevance([19, 17, 12, 20, 14], [77, 89], "especializado", "A especialização, o alcance internacional e a programação extensa sustentam relevância muito alta.", ["Quinze edições.", "Mais de 200 filmes e múltiplos espaços.", "Parcerias e plataforma online.", "Importância especializada para cinema LGBTQIA+.", "Regulamento presencial atual completo e chamada online oficial."], "alta"),
  });
}

// 046 — Encontro de Cinema Negro Zózimo Bulbul, 19ª edição / 2026.
{
  const id = "festival-046";
  const ccjf = source(`${id}-source-ccjf-2026`, "https://ccjf.trf2.jus.br/programacao/19deg-encontro-de-cinema-negro-zozimo-bulbul", "19º Encontro de Cinema Negro Zózimo Bulbul", "19ª edição / 2026", ["location", "activity", "categories", "eventDates", "relevance"], { type: "fonte secundária", note: "Página institucional do Centro Cultural Justiça Federal confirma edição, locais, datas e perfil curatorial." });
  const artWeek = source(`${id}-source-artweek-2026`, "https://2026.semanadeartedorio.com.br/programacao/festivais/76", "Encontro de Cinema Negro Zózimo Bulbul — Semana de Arte do Rio", "19ª edição / 2026", ["location", "activity", "eventDates", "relevance"], { type: "fonte secundária" });
  const org = source(`${id}-source-organization`, "https://afrocariocadecinema.org.br", "Centro Afro Carioca de Cinema", "19ª edição / 2026", ["activity", "relevance"], { confidence: "parcial", note: "Site institucional da organização; página específica de chamada 2026 não localizada." });
  applyFestival({
    id,
    sources: [ccjf, artWeek, org],
    locations: [location(id, 1, "Rio de Janeiro", "RJ", "Rio de Janeiro", "3304557", [ccjf.id, artWeek.id])],
    festival: { activity: "ativo", frequency: "anual", organizer: "Centro Afro Carioca de Cinema", description: "Encontro internacional dedicado ao cinema negro brasileiro, africano, caribenho e das diásporas.", languages: allLanguages, themes: ["cinema negro"], workTypes: ["filme"], audiences: ["geral"] },
    seasonality: { opening: { months: [], evidenceYears: [], confidence: "desconhecida", note: "Nenhuma chamada pública de filmes localizada." }, event: { months: [9], evidenceYears: [2026], confidence: "baixa", note: "19ª edição de 21 a 25 de setembro de 2026." } },
    edition: { year: 2026, number: "19", start: "2026-09-21", end: "2026-09-25", opening: "", closing: "", resultDate: "", status: "realizada", rulesUrl: ccjf.url, confidence: "parcial", notes: "A 18ª edição também ocorreu em abril de 2026; o catálogo usa a edição mais recente, a 19ª de setembro. Nenhuma chamada pública ou regulamento de filmes foi localizado." },
    calls: [{ name: "Programação de cinema negro — curadoria sem chamada localizada", formats: [], genres: ["cinema negro"], languages: allLanguages, themes: ["cinema negro"], submissionMode: "curadoria sem chamada", selectionType: "não competitiva", genresConfirmed: true, territoriesConfirmed: false, restrictions: "Programação dedicada a cinema negro do Brasil, África, Caribe e diásporas; critérios de submissão pública não localizados.", rulesUrl: ccjf.url, confidence: "parcial", sourceIds: [ccjf.id, org.id] }],
    coverage: coverage({ localização: "Rio de Janeiro/RJ, com múltiplos espaços confirmados.", atividade: "19ª edição realizada em setembro de 2026.", categorias: "Programação não competitiva de cinema negro brasileiro e internacional.", realização: "21 a 25 de setembro de 2026.", relevância: "Dezenove edições e articulação Brasil–África–Caribe–diásporas documentadas." }, { duração: "Não localizada.", "elegibilidade territorial": "Perfil curatorial confirmado, critérios de inscrição não localizados.", "produção/conclusão": "Não localizada.", estreia: "Não localizada.", "exibição online": "Não localizada.", "pessoa autorizada a inscrever": "Não localizada.", taxas: "Não localizada; gratuidade do programa não implica chamada gratuita.", abertura: "Não localizada.", encerramento: "Não localizado." }),
    relevance: relevance([23, 17, 15, 20, 11], [80, 92], "especializado", "A continuidade e a articulação internacional do cinema negro sustentam relevância muito alta.", ["Dezenove edições.", "Programação em diversos espaços e territórios culturais.", "Encontros e intercâmbio internacional.", "Importância central para cinema negro e diásporas.", "Atividade atual confirmada; chamada pública não localizada."], "alta"),
  });
}

db.settings.catalogVersion = "2026-10-04.4";
fs.writeFileSync(catalogPath, `${JSON.stringify(db, null, 2)}\n`);
console.log(
  `BR-02 aplicado: 20 festivais; catálogo ${db.settings.catalogVersion}; ${db.calls.length} chamadas.`,
);
