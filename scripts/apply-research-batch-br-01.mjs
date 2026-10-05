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

const makeSource = (
  id,
  url,
  title,
  editionLabel,
  section,
  fields,
  options = {},
) => ({
  id,
  url,
  title,
  type: options.type || "oficial",
  checkedAt,
  accessedAt: checkedAt,
  confidence: options.confidence || "confirmado",
  evidenceState: options.evidenceState || "confirmado na edição atual",
  editionLabel,
  section,
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

const deadline = (
  kind,
  date,
  time,
  sourceId,
  originalLabel,
  supersedes = "",
) => ({
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

const paidFee = (
  amount,
  currency,
  deadlineKind,
  sourceId,
  appliesTo,
  options = {},
) => ({
  amount,
  currency,
  free: "não",
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

const dimensionKeys = [
  "curatorialHistory",
  "programmingReach",
  "industryOpportunities",
  "specializedImportance",
  "continuityTransparency",
];

const makeRelevance = (config, sourceIds) => {
  const dimensions = Object.fromEntries(
    dimensionKeys.map((key, index) => [
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
  const oldCall = db.calls.find((item) => item.editionId === edition.id);
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

const statuses = (confirmed, missing = {}, conflict = {}) => ({
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
});

// Festival de Cinema de Gramado — 54ª edição, 2026.
{
  const id = "festival-002";
  const rulesUrl =
    "https://inscricoescinema.com.br/wp-content/themes/inscricoes-festival/images/docs/Regulamento-LMB-LMDB-CMB-54o-Festival-de-Cinema-de-Gramado.pdf";
  const rules = makeSource(
    `${id}-source-regulation-2026`,
    rulesUrl,
    "Regulamento das mostras brasileiras do 54º Festival de Cinema de Gramado",
    "54ª edição / 2026",
    "Regulamento integral — longas de ficção, longas documentais e curtas brasileiros",
    [
      "location",
      "activity",
      "formats",
      "languages",
      "duration",
      "productionYear",
      "countries",
      "premiere",
      "online",
      "pf",
      "pj",
      "opening",
      "deadlines",
      "eventDates",
      "materials",
    ],
    {
      note: "Lido integralmente (18 páginas). O próprio documento remete as mostras gaúchas a regulamentos separados, não localizados na pesquisa deste lote.",
    },
  );
  const program = makeSource(
    `${id}-source-program-2026`,
    "https://festivaldecinemadegramado.com/noticias/guia-da-programacao-54-festival",
    "Guia da programação do 54º Festival de Cinema de Gramado",
    "54ª edição / 2026",
    "Programação e dimensões da edição",
    ["activity", "categories", "eventDates", "relevance"],
  );
  applyFestival({
    id,
    sources: [rules, program],
    locations: [
      location(id, 1, "Gramado", "RS", "Rio Grande do Sul", "4309100", [
        rules.id,
      ]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      organizer: "GramadoTur",
      description:
        "Festival brasileiro com competições de longas, documentários e curtas nacionais e gaúchos.",
      languages: allLanguages,
      workTypes: ["filme"],
      audiences: ["geral"],
      platforms: ["Vimeo", "YouTube"],
    },
    seasonality: {
      opening: {
        months: [3],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Baseada somente na chamada 2026; confirmar a próxima edição.",
      },
      event: {
        months: [8],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Realização confirmada entre 12 e 22 de agosto de 2026.",
      },
    },
    edition: {
      number: "54",
      start: "2026-08-12",
      end: "2026-08-22",
      opening: "2026-03-09",
      closing: "2026-03-31",
      resultDate: "",
      status: "realizada",
      rulesUrl,
      confidence: "parcial",
      notes:
        "Regulamento principal integralmente lido. Regulamentos próprios de longas e curtas gaúchos não foram localizados; a edição teve cinco mostras competitivas e 74 filmes.",
    },
    calls: [
      {
        name: "Longas-metragens brasileiros de ficção",
        slug: "longa-ficcao-br",
        formats: ["longa"],
        genres: ["ficção"],
        languages: ["ficção"],
        minMinutes: 70,
        minSeconds: 4200,
        minInclusive: true,
        minYear: 2025,
        pf: "não",
        pj: "sim",
        premiere: "nacional",
        premiereRequirement: "obrigatória",
        premiereTerritory: "Brasil",
        premiereConditions:
          "Exige estreia brasileira; não admite exibição comercial, pública ou para imprensa no Brasil. Exibições físicas ou digitais no exterior são aceitas.",
        online: "restrito",
        onlineConditions:
          "Histórico digital no exterior é aceito; disponibilização/exibição no Brasil conflita com a estreia nacional.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Produção brasileira independente, responsável por empresa produtora brasileira com CNPJ e CNAE audiovisual; finalização após 1º de maio de 2025. Partes em idioma estrangeiro devem ter legendas em português.",
        opening: "2026-03-09",
        deadlines: [
          deadline("final", "2026-03-31", "23:59", rules.id, "prazo final"),
        ],
        platform: "https://inscricoescinema.com.br",
        rulesUrl,
        sourceIds: [rules.id],
        notes: "Taxa de inscrição não declarada no regulamento; não foi inferida gratuidade.",
      },
      {
        name: "Longas-metragens documentais brasileiros",
        slug: "longa-documentario-br",
        formats: ["longa"],
        genres: ["documentário"],
        languages: ["documentário"],
        minMinutes: 50,
        minSeconds: 3000,
        minInclusive: true,
        minYear: 2025,
        pf: "não",
        pj: "sim",
        premiere: "nacional",
        premiereRequirement: "obrigatória",
        premiereTerritory: "Brasil",
        premiereConditions:
          "Exige estreia brasileira; não admite exibição comercial, pública ou para imprensa no Brasil. Exibições físicas ou digitais no exterior são aceitas.",
        online: "restrito",
        onlineConditions:
          "Histórico digital no exterior é aceito; disponibilização/exibição no Brasil conflita com a estreia nacional.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Produção brasileira independente, responsável por empresa produtora brasileira com CNPJ e CNAE audiovisual; finalização após 1º de maio de 2025.",
        opening: "2026-03-09",
        deadlines: [
          deadline("final", "2026-03-31", "23:59", rules.id, "prazo final"),
        ],
        platform: "https://inscricoescinema.com.br",
        rulesUrl,
        sourceIds: [rules.id],
      },
      {
        name: "Curtas-metragens brasileiros",
        slug: "curta-br",
        formats: ["curta"],
        genres: allLanguages,
        languages: allLanguages,
        maxMinutes: 20,
        maxSeconds: 1259,
        maxInclusive: true,
        creditsIncluded: true,
        minYear: 2025,
        pf: "não",
        pj: "sim",
        premiere: "preferência",
        premiereRequirement: "preferencial",
        premiereTerritory: "Brasil",
        premiereConditions:
          "Preferência por estreia brasileira; é obrigatório ineditismo no Rio Grande do Sul.",
        online: "restrito",
        onlineConditions:
          "Não pode estar integralmente disponível online/streaming; participações digitais ou em TV fora do Rio Grande do Sul são aceitas, mas exploração televisiva no estado é vedada.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Produção brasileira independente por empresa brasileira com CNPJ/CNAE; finalização após 1º de maio de 2025; duração máxima de 20min59s incluindo créditos.",
        opening: "2026-03-09",
        deadlines: [
          deadline("final", "2026-03-31", "23:59", rules.id, "prazo final"),
        ],
        platform: "https://inscricoescinema.com.br",
        rulesUrl,
        sourceIds: [rules.id],
      },
    ],
    coverage: statuses(
      {
        localização: "Gramado/RS confirmado no regulamento.",
        atividade: "54ª edição realizada em agosto de 2026.",
        duração:
          "Ficção a partir de 70 min, documentários a partir de 50 min e curtas até 20min59s com créditos.",
        "elegibilidade territorial":
          "As três chamadas lidas exigem produção brasileira independente.",
        "produção/conclusão": "Finalização posterior a 1º de maio de 2025.",
        estreia: "Regras de estreia e de ineditismo conferidas nas três chamadas lidas.",
        "exibição online": "Restrições digitais conferidas por chamada.",
        "pessoa autorizada a inscrever":
          "Empresa produtora brasileira com CNPJ e CNAE audiovisual nas chamadas lidas.",
        abertura: "Abertura em 9 de março de 2026 às 8h.",
        encerramento: "Encerramento em 31 de março de 2026 às 23h59.",
        realização: "12 a 22 de agosto de 2026.",
        relevância: "Programação oficial documenta 74 filmes e cinco competições.",
      },
      {
        categorias:
          "Três chamadas nacionais foram lidas; os regulamentos separados das duas competições gaúchas e das ações educativas não foram localizados integralmente.",
        taxas: "O regulamento lido não informa taxa nem declara gratuidade.",
      },
    ),
    relevance: {
      scores: [25, 18, 15, 18, 14],
      range: [84, 94],
      impact: "nacional",
      rationale:
        "A 54ª edição, cinco competições e a programação nacional documentada sustentam alcance histórico elevado.",
      evidence: [
        "Cinquenta e quatro edições e competições nacionais e estaduais documentadas.",
        "A programação oficial reúne 74 filmes em cinco competições.",
        "Premiação, debates e encontro profissional aparecem na programação oficial.",
        "Importância territorial e nacional observável na arquitetura das competições.",
        "Regulamento detalhado e calendário oficial atual; faltaram editais gaúchos separados.",
      ],
    },
  });
}

// Mostra de Cinema de Tiradentes — 30ª edição, 2027.
{
  const id = "festival-006";
  const pageUrl =
    "https://mostratiradentes.com.br/2026/n/30a-mostra-de-cinema-de-tiradentes-abre-inscricoes-para-filmes-brasileiros-e-o-seu-filme-pode-fazer-parte-desta-edicao-historica/";
  const page = makeSource(
    `${id}-source-call-2027`,
    pageUrl,
    "Chamada oficial para filmes da 30ª Mostra de Cinema de Tiradentes",
    "30ª edição / 2027",
    "Página oficial da chamada",
    [
      "location",
      "activity",
      "formats",
      "duration",
      "productionYear",
      "premiere",
      "fees",
      "opening",
      "deadlines",
      "eventDates",
      "categories",
    ],
    {
      confidence: "parcial",
      note: "A página oficial foi lida integralmente e resume as categorias; o PDF integral referido no portal de inscrições não foi extraído diretamente.",
    },
  );
  applyFestival({
    id,
    sources: [page],
    locations: [
      location(id, 1, "Tiradentes", "MG", "Minas Gerais", "3168804", [
        page.id,
      ]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      organizer: "Universo Produção",
      description:
        "Mostra dedicada à produção audiovisual brasileira contemporânea, com sessões, formação e encontros.",
      languages: allLanguages,
      workTypes: ["filme"],
      platforms: ["Universo Produção"],
    },
    seasonality: {
      opening: {
        months: [9, 10],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Chamada da edição 2027 publicada em setembro e encerrada em outubro de 2026.",
      },
      event: {
        months: [1],
        evidenceYears: [2027],
        confidence: "baixa",
        note: "Realização confirmada para 22 a 30 de janeiro de 2027.",
      },
    },
    edition: {
      number: "30",
      start: "2027-01-22",
      end: "2027-01-30",
      opening: "2026-09-28",
      closing: "2026-10-28",
      resultDate: "",
      status: "planejada",
      rulesUrl: pageUrl,
      confidence: "parcial",
      notes:
        "Página oficial detalhada lida; regulamento integral hospedado no portal de inscrições não foi recuperado neste lote.",
    },
    calls: [
      {
        name: "Mostra Aurora — longas de primeira direção",
        slug: "aurora",
        formats: ["longa"],
        minMinutes: 60,
        minSeconds: 3600,
        minInclusive: false,
        minYear: 2026,
        participationConditions: ["primeira obra", "direção estreante"],
        premiere: "nacional",
        premiereRequirement: "obrigatória",
        premiereTerritory: "Brasil",
        premiereConditions: "Até sete primeiros longas; exige estreia brasileira.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Filme brasileiro digital, concluído e finalizado em 2026; não aceita work in progress, publicidade ou institucional. Em codireção, ao menos uma pessoa deve estrear em longa e a outra pode ter no máximo um longa anterior.",
        resubmission: "não",
        opening: "2026-09-28",
        deadlines: [
          deadline("final", "2026-10-28", "23:59", page.id, "prazo final"),
        ],
        fees: [freeFee(page.id, undefined, "A página oficial declara inscrição gratuita.")],
        platform: "https://universoproducao.com.br/inscricoes/",
        rulesUrl: pageUrl,
        confidence: "parcial",
      },
      {
        name: "Mostra Olhos Livres — longas",
        slug: "olhos-livres",
        formats: ["longa"],
        minMinutes: 60,
        minSeconds: 3600,
        minInclusive: false,
        minYear: 2026,
        premiere: "preferência",
        premiereRequirement: "preferencial",
        premiereTerritory: "Brasil",
        premiereConditions:
          "A página informa preferência por estreias brasileiras, sem torná-las requisito geral.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Até sete longas de realizadores com mais de um longa ou trajetória estabelecida; finalização em 2026; não aceita work in progress, publicidade ou institucional.",
        resubmission: "não",
        opening: "2026-09-28",
        deadlines: [
          deadline("final", "2026-10-28", "23:59", page.id, "prazo final"),
        ],
        fees: [freeFee(page.id)],
        platform: "https://universoproducao.com.br/inscricoes/",
        rulesUrl: pageUrl,
        confidence: "parcial",
      },
      {
        name: "Mostra Foco — curtas",
        slug: "foco",
        formats: ["curta"],
        maxMinutes: 30,
        maxSeconds: 1800,
        minYear: 2026,
        premiere: "nacional",
        premiereRequirement: "obrigatória",
        premiereTerritory: "Brasil",
        premiereConditions: "Exige estreia brasileira.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Curta brasileiro digital de até 30 minutos, finalizado em 2026; não aceita work in progress, publicidade ou institucional.",
        resubmission: "não",
        opening: "2026-09-28",
        deadlines: [
          deadline("final", "2026-10-28", "23:59", page.id, "prazo final"),
        ],
        fees: [freeFee(page.id)],
        platform: "https://universoproducao.com.br/inscricoes/",
        rulesUrl: pageUrl,
        confidence: "parcial",
      },
      {
        name: "Mostra Formação — curtas de contexto formativo",
        slug: "formacao",
        formats: ["curta"],
        maxMinutes: 30,
        maxSeconds: 1800,
        minYear: 2026,
        participationConditions: ["universitário", "escolar"],
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Até quinze curtas realizados em universidades ou contextos de formação; finalização em 2026; não aceita work in progress, publicidade ou institucional.",
        resubmission: "não",
        opening: "2026-09-28",
        deadlines: [
          deadline("final", "2026-10-28", "23:59", page.id, "prazo final"),
        ],
        fees: [freeFee(page.id)],
        platform: "https://universoproducao.com.br/inscricoes/",
        rulesUrl: pageUrl,
        confidence: "parcial",
      },
    ],
    coverage: statuses(
      {
        localização: "Tiradentes/MG confirmada na chamada oficial.",
        atividade: "30ª edição anunciada para janeiro de 2027.",
        categorias: "Aurora, Olhos Livres, Foco e Formação descritas na página oficial.",
        duração: "Longas acima de 60 minutos; curtas até 30 minutos.",
        "elegibilidade territorial": "Chamada exclusiva para filmes brasileiros.",
        "produção/conclusão": "Filmes finalizados em 2026; work in progress vedado.",
        estreia: "Aurora e Foco exigem estreia brasileira; Olhos Livres dá preferência.",
        taxas: "Inscrições gratuitas.",
        abertura: "Abertura/publicação em 28 de setembro de 2026.",
        encerramento: "28 de outubro de 2026 às 23h59.",
        realização: "22 a 30 de janeiro de 2027.",
        relevância: "30ª edição e estrutura de formação/circulação documentadas.",
      },
      {
        "exibição online": "A página-resumo não esclarece histórico prévio de exibição online.",
        "pessoa autorizada a inscrever":
          "A página menciona realizadores e produtores, mas não esclarece natureza física/jurídica no regulamento integral.",
      },
    ),
    relevance: {
      scores: [22, 16, 16, 18, 14],
      range: [77, 91],
      impact: "nacional",
      rationale:
        "A 30ª edição e a combinação de mostras, formação e programação brasileira sustentam alta relevância nacional.",
      evidence: [
        "Trinta edições e recorte curatorial brasileiro documentado.",
        "Quatro mostras e programação gratuita presencial e online anunciadas.",
        "Atividades de formação e intercâmbio integram a edição.",
        "Importância especializada para produção brasileira contemporânea.",
        "Calendário e chamada atuais transparentes; PDF integral não recuperado.",
      ],
    },
  });
}

// Festival do Rio — Première Brasil, 2026.
{
  const id = "festival-007";
  const rulesUrl =
    "https://festivaldorio.s3.us-east-1.amazonaws.com/2026/regulamento-premiere-brasil-2026/regulamento-premiere-brasil-2026.pdf";
  const rules = makeSource(
    `${id}-source-regulation-2026`,
    rulesUrl,
    "Regulamento Première Brasil 2026",
    "28ª edição / 2026",
    "Regulamento integral",
    [
      "location",
      "formats",
      "languages",
      "duration",
      "productionYear",
      "countries",
      "premiere",
      "online",
      "pf",
      "pj",
      "opening",
      "deadlines",
      "eventDates",
      "materials",
    ],
  );
  const extension = makeSource(
    `${id}-source-extension-2026`,
    "https://www.festivaldorio.com.br/br/noticias/festival-do-rio-2026-inscricoes-prorrogadas-para-a-premiere-brasil",
    "Prorrogação das inscrições da Première Brasil 2026",
    "28ª edição / 2026",
    "Retificação de prazo e perguntas frequentes",
    ["fees", "deadlines", "pf", "pj", "relevance"],
  );
  const selected = makeSource(
    `${id}-source-selection-2026`,
    "https://www.festivaldorio.com.br/br/noticias/festival-do-rio-2026-anuncia-os-filmes-selecionados-para-a-premiere-brasil-a-principal-vitrine-do-cinema-brasileiro",
    "Seleção da Première Brasil 2026",
    "28ª edição / 2026",
    "Seleção e alcance",
    ["activity", "categories", "relevance"],
  );
  applyFestival({
    id,
    sources: [rules, extension, selected],
    locations: [
      location(id, 1, "Rio de Janeiro", "RJ", "Rio de Janeiro", "3304557", [
        rules.id,
      ]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival internacional sediado no Rio de Janeiro; Première Brasil reúne a seleção competitiva nacional.",
      languages: ["documentário", "ficção", "animação"],
      workTypes: ["filme"],
      platforms: ["Formulário Festival do Rio"],
    },
    seasonality: {
      opening: {
        months: [4, 5, 6],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Chamada 2026 abriu em abril e encerrou, após prorrogação, em junho.",
      },
      event: {
        months: [10],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição 2026 realizada de 1º a 11 de outubro.",
      },
    },
    edition: {
      number: "28",
      start: "2026-10-01",
      end: "2026-10-11",
      opening: "2026-04-16",
      closing: "2026-06-08",
      resultDate: "",
      status: "realizada",
      rulesUrl,
      confidence: "confirmado",
      notes:
        "Prazo original de 1º de junho prorrogado oficialmente para 8 de junho. A notícia de seleção apresenta discrepância entre 104 e 110 filmes; preservada como observação, sem usar o número para elegibilidade.",
    },
    calls: [
      {
        name: "Première Brasil — longas-metragens",
        slug: "premiere-brasil-longas",
        formats: ["longa"],
        genres: ["ficção", "documentário", "animação"],
        languages: ["ficção", "documentário", "animação"],
        minMinutes: 60,
        minSeconds: 3600,
        minInclusive: false,
        minYear: 2025,
        maxYear: 2026,
        pf: "sim",
        pj: "sim",
        premiere: "municipal",
        premiereRequirement: "obrigatória",
        premiereTerritory: "Rio de Janeiro",
        premiereConditions:
          "Exige estreia na cidade do Rio de Janeiro e ausência de exploração comercial por qualquer mídia no Brasil.",
        online: "restrito",
        onlineConditions:
          "Exploração comercial por mídia no Brasil é vedada. Eventual projeção online pelo festival depende de negociação e autorização específica.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Produção majoritariamente brasileira, finalizada em 2025 ou 2026. Trechos em língua estrangeira devem ter legendas em português. Filme anteriormente rejeitado não pode ser reinscrito.",
        resubmission: "não",
        opening: "2026-04-16",
        deadlines: [
          deadline("regular", "2026-06-01", "", rules.id, "prazo original"),
          deadline(
            "extended",
            "2026-06-08",
            "",
            extension.id,
            "prazo prorrogado",
            "2026-06-01",
          ),
        ],
        fees: [freeFee(extension.id)],
        platform: "https://www.festivaldorio.com.br",
        rulesUrl,
        sourceIds: [rules.id, extension.id],
      },
      {
        name: "Première Brasil — curtas-metragens",
        slug: "premiere-brasil-curtas",
        formats: ["curta"],
        genres: ["ficção", "documentário", "animação"],
        languages: ["ficção", "documentário", "animação"],
        maxMinutes: 30,
        maxSeconds: 1800,
        minYear: 2025,
        maxYear: 2026,
        pf: "sim",
        pj: "sim",
        online: "restrito",
        onlineConditions:
          "Não pode haver exploração comercial por qualquer mídia no Brasil. Projeção online pelo festival depende de negociação e autorização específica.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Produção majoritariamente brasileira, finalizada em 2025 ou 2026. Curtas acima de 15 minutos são preferencialmente avaliados para Novos Rumos. Filme anteriormente rejeitado não pode ser reinscrito.",
        resubmission: "não",
        opening: "2026-04-16",
        deadlines: [
          deadline("regular", "2026-06-01", "", rules.id, "prazo original"),
          deadline(
            "extended",
            "2026-06-08",
            "",
            extension.id,
            "prazo prorrogado",
            "2026-06-01",
          ),
        ],
        fees: [freeFee(extension.id)],
        platform: "https://www.festivaldorio.com.br",
        rulesUrl,
        sourceIds: [rules.id, extension.id],
        notes:
          "O parágrafo dos curtas não formula estreia municipal obrigatória; esse requisito não foi inferido da regra dos longas.",
      },
    ],
    coverage: statuses({
      localização: "Rio de Janeiro/RJ confirmado no regulamento.",
      atividade: "28ª edição realizada em outubro de 2026.",
      categorias: "Longas e curtas da Première Brasil estruturados separadamente.",
      duração: "Longas acima de 60 minutos; curtas até 30 minutos.",
      "elegibilidade territorial": "Produção majoritariamente brasileira.",
      "produção/conclusão": "Finalização em 2025 ou 2026.",
      estreia: "Regra municipal obrigatória só para longas; não foi transferida a curtas.",
      "exibição online": "Exploração comercial no Brasil vedada; sessão online do festival sob autorização.",
      "pessoa autorizada a inscrever": "Pessoa física ou jurídica; CNPJ não obrigatório.",
      taxas: "Inscrição gratuita confirmada na FAQ da prorrogação.",
      abertura: "16 de abril de 2026.",
      encerramento: "Prazo final prorrogado para 8 de junho de 2026.",
      realização: "1º a 11 de outubro de 2026.",
      relevância: "Cerca de 1.500 inscrições e mais de cem selecionados informados oficialmente.",
    }),
    relevance: {
      scores: [25, 20, 20, 17, 14],
      range: [91, 98],
      impact: "internacional amplo",
      rationale:
        "A continuidade, o volume de inscrições, a dimensão da Première Brasil e a articulação internacional documentam amplo alcance.",
      evidence: [
        "Vigésima oitava edição e seleção nacional competitiva consolidada.",
        "Cerca de 1.500 inscrições e mais de cem títulos selecionados segundo fonte oficial.",
        "Festival articula estreias, mercado, imprensa e encontros profissionais.",
        "A Première Brasil tem importância central para circulação nacional.",
        "Regulamento, prorrogação e seleção atuais publicados oficialmente.",
      ],
    },
  });
}

// Olhar de Cinema — 15ª edição, 2026. O regulamento oficial atual ficou inacessível.
{
  const id = "festival-008";
  const officialUrl = "https://olhardecinema.com.br/regulamento/filme?lang=pt";
  const attempt = makeSource(
    `${id}-source-regulation-attempt-2026`,
    officialUrl,
    "Regulamento de filmes do 15º Olhar de Cinema",
    "15ª edição / 2026",
    "Tentativa de acesso ao regulamento oficial",
    ["categories", "duration", "countries", "premiere", "fees", "deadlines"],
    {
      confidence: "não verificado",
      evidenceState: "não localizado",
      note: "A URL oficial foi localizada, mas o conteúdo atual não pôde ser recuperado integralmente pela ferramenta de leitura.",
    },
  );
  const secondary = makeSource(
    `${id}-source-call-secondary-2026`,
    "https://asianfilmfestivals.com/2026/01/20/olhar-de-cinema-curitiba-international-film-festival-call-for-entry-2026/",
    "Call for Entry 2026 — Olhar de Cinema",
    "15ª edição / 2026",
    "Resumo secundário da chamada",
    ["location", "activity", "formats", "duration", "productionYear", "deadlines", "eventDates", "fees"],
    {
      type: "fonte secundária",
      confidence: "parcial",
      note: "Usada somente para campos explicitamente publicados; não substitui a leitura do regulamento oficial.",
    },
  );
  const localNews = makeSource(
    `${id}-source-call-local-2026`,
    "https://criptocultural.com.br/festival-internacional-de-curitiba-esta-com-inscricoes-abertas/",
    "Festival Internacional de Curitiba está com inscrições abertas",
    "15ª edição / 2026",
    "Cobertura local da chamada",
    ["fees", "deadlines", "eventDates"],
    {
      type: "fonte secundária",
      confidence: "parcial",
      note: "Confirma gratuidade para filmes brasileiros e cobrança em euros para estrangeiros, sem substituir o edital.",
    },
  );
  applyFestival({
    id,
    sources: [attempt, secondary, localNews],
    locations: [
      location(id, 1, "Curitiba", "PR", "Paraná", "4106902", [secondary.id]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival internacional de cinema independente sediado em Curitiba.",
      languages: allLanguages,
      workTypes: ["filme"],
    },
    seasonality: {
      opening: {
        months: [1, 2],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Chamada pública observada em janeiro e encerrada em fevereiro de 2026.",
      },
      event: {
        months: [6],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição realizada de 4 a 13 de junho de 2026.",
      },
    },
    edition: {
      number: "15",
      start: "2026-06-04",
      end: "2026-06-13",
      opening: "",
      closing: "2026-02-26",
      resultDate: "",
      status: "realizada",
      rulesUrl: officialUrl,
      confidence: "parcial",
      notes:
        "Regulamento oficial localizado, mas não recuperado integralmente. Regras estruturadas somente quando coincidentes em fontes secundárias atuais; lacunas permanecem não localizadas.",
    },
    calls: [
      {
        name: "Filmes brasileiros — chamada 2026",
        slug: "brasil",
        formats: ["curta", "longa"],
        genres: allLanguages,
        languages: allLanguages,
        minYear: 2025,
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Fontes secundárias indicam filmes produzidos ou exibidos publicamente após 1º de maio de 2025 e cópia com legendas em inglês ou português quando não falada em português.",
        deadlines: [
          deadline("final", "2026-02-26", "", secondary.id, "prazo final publicado"),
        ],
        fees: [
          freeFee(localNews.id, ["filmes brasileiros"], "Gratuidade informada por cobertura local; regulamento oficial não recuperado."),
        ],
        platform: "https://olhardecinema.com.br/inscricao",
        rulesUrl: officialUrl,
        confidence: "parcial",
        sourceIds: [attempt.id, secondary.id, localNews.id],
        notes:
          "Duração por categoria não foi aplicada ao registro agregado para evitar misturar curta e longa. Exigência de estreia para obras brasileiras não foi confirmada.",
      },
      {
        name: "Filmes internacionais — chamada 2026",
        slug: "internacional",
        formats: ["curta", "longa"],
        genres: allLanguages,
        languages: allLanguages,
        minYear: 2025,
        premiere: "nacional",
        premiereRequirement: "obrigatória",
        premiereTerritory: "Brasil",
        premiereConditions:
          "Fonte secundária da chamada informa estreia brasileira para filmes internacionais; requer validação futura no edital oficial.",
        restrictions:
          "Fontes secundárias indicam filmes produzidos ou exibidos publicamente após 1º de maio de 2025 e legendas em inglês ou português.",
        deadlines: [
          deadline("final", "2026-02-26", "", secondary.id, "prazo final publicado"),
        ],
        fees: [
          paidFee(10, "EUR", "final", secondary.id, ["curtas internacionais"], {
            notes: "Valor informado por fonte secundária; confirmar no regulamento oficial.",
          }),
          paidFee(30, "EUR", "final", secondary.id, ["longas internacionais"], {
            notes: "Valor informado por fonte secundária; confirmar no regulamento oficial.",
          }),
        ],
        platform: "https://olhardecinema.com.br/inscricao",
        rulesUrl: officialUrl,
        confidence: "parcial",
        sourceIds: [attempt.id, secondary.id, localNews.id],
        notes:
          "Curta é descrito como até 49 minutos e longa a partir de 50 nas fontes secundárias, mas a chamada foi mantida agregada até recuperação do edital.",
      },
    ],
    coverage: statuses(
      {
        localização: "Curitiba/PR e realização presencial confirmadas em fontes atuais.",
        atividade: "15ª edição realizada em junho de 2026.",
        "produção/conclusão": "Fonte secundária atual aponta corte em 1º de maio de 2025.",
        encerramento: "26 de fevereiro de 2026.",
        realização: "4 a 13 de junho de 2026.",
        relevância: "Décima quinta edição e programação internacional atual documentadas.",
      },
      {
        categorias: "O regulamento oficial atual não pôde ser lido integralmente.",
        duração: "Faixas de curta/longa aparecem em fonte secundária e aguardam validação oficial.",
        "elegibilidade territorial": "Separação Brasil/exterior é parcial; países elegíveis não foram listados no edital lido.",
        estreia: "Regra internacional veio de fonte secundária; regra brasileira não localizada.",
        "exibição online": "Histórico online anterior não localizado.",
        "pessoa autorizada a inscrever": "Não localizado no regulamento atual acessível.",
        taxas: "Gratuidade brasileira e valores estrangeiros dependem de confirmação no edital oficial.",
        abertura: "Data exata de abertura não localizada em fonte oficial acessível.",
      },
    ),
    relevance: {
      scores: [21, 16, 13, 17, 12],
      range: [67, 84],
      impact: "internacional amplo",
      confidence: "baixa",
      rationale:
        "A continuidade e a programação internacional sustentam relevância alta, com incerteza ampliada pela falta do regulamento atual integral.",
      evidence: [
        "Quinze edições e curadoria de cinema independente documentadas.",
        "Programação atual com dezenas de filmes brasileiros e internacionais.",
        "Seminário e atividades profissionais aparecem no histórico institucional.",
        "Presença importante no circuito independente de Curitiba e nacional.",
        "Edição atual documentada, mas edital oficial ficou inacessível.",
      ],
    },
  });
}

// Janela Internacional de Cinema do Recife — última edição pública localizada: 16ª, 2025.
{
  const id = "festival-010";
  const official = makeSource(
    `${id}-source-site-attempt-2026`,
    "https://janeladecinema.com.br/",
    "Site oficial do Janela Internacional de Cinema do Recife",
    "site consultado em 2026",
    "Página inicial desatualizada",
    ["location", "activity", "eventDates", "categories"],
    {
      confidence: "não verificado",
      evidenceState: "não localizado",
      note: "O site exibe conteúdo da 15ª edição sem ano e não publica regulamento ou chamada atual identificável.",
    },
  );
  const event = makeSource(
    `${id}-source-event-2025`,
    "https://www.sympla.com.br/evento/xvi-janela-internacional-de-cinema-do-recife/3195400",
    "XVI Janela Internacional de Cinema do Recife",
    "16ª edição / 2025",
    "Página pública do evento",
    ["location", "activity", "eventDates"],
    {
      type: "fonte secundária",
      confidence: "parcial",
      evidenceState: "confirmado em edição anterior",
      note: "Fonte secundária usada para documentar a última edição localizada; não confirma atividade ou chamada em 2026.",
    },
  );
  applyFestival({
    id,
    sources: [official, event],
    locations: [
      location(id, 1, "Recife", "PE", "Pernambuco", "2611606", [event.id]),
    ],
    festival: {
      activity: "atividade não confirmada",
      frequency: "anual",
      description:
        "Festival internacional realizado em salas históricas do Recife; nenhuma chamada pública atual foi localizada.",
      languages: allLanguages,
      workTypes: ["filme"],
    },
    seasonality: {
      opening: {
        months: [],
        evidenceYears: [],
        confidence: "desconhecida",
        note: "Nenhuma chamada pública atual localizada.",
      },
      event: {
        months: [11],
        evidenceYears: [2025],
        confidence: "baixa",
        note: "Última edição localizada ocorreu em novembro de 2025; não prevê 2026.",
      },
    },
    edition: {
      year: 2025,
      number: "16",
      start: "2025-11-01",
      end: "2025-11-05",
      opening: "",
      closing: "",
      resultDate: "",
      status: "realizada",
      rulesUrl: "",
      confidence: "parcial",
      notes:
        "Última edição pública localizada. O site oficial consultado em outubro de 2026 permanecia desatualizado e sem regulamento/chamada pública identificável.",
    },
    calls: [
      {
        name: "Curadoria — chamada pública não localizada",
        slug: "curadoria",
        submissionMode: "curadoria sem chamada",
        selectionType: "não confirmado",
        genresConfirmed: false,
        rulesUrl: "",
        confidence: "não verificado",
        sourceIds: [official.id, event.id],
        notes:
          "Registro explícito de ausência documental: não pressupõe que inscrições sejam aceitas nem que o festival opere apenas por convite.",
      },
    ],
    coverage: statuses(
      {},
      {
        localização: "Recife está confirmado apenas para a edição 2025 localizada.",
        atividade: "Atividade em 2026 não confirmada; última edição localizada é de 2025.",
        categorias: "Chamada/regulamento atual não localizado.",
        duração: "Não localizada.",
        "elegibilidade territorial": "Não localizada.",
        "produção/conclusão": "Não localizada.",
        estreia: "Não localizada.",
        "exibição online": "Não localizada.",
        "pessoa autorizada a inscrever": "Não localizada.",
        taxas: "Não localizadas.",
        abertura: "Não localizada.",
        encerramento: "Não localizado.",
        realização: "Somente a edição 2025 foi localizada; 2026 permanece sem confirmação.",
        relevância: "Histórico e 16ª edição permitem apenas avaliação provisória de baixa confiança.",
      },
    ),
    relevance: {
      scores: [18, 12, 8, 14, 8],
      range: [45, 70],
      impact: "regional/local",
      confidence: "baixa",
      rationale:
        "Dezesseis edições e ocupação de salas históricas sustentam relevância documentada, mas a atividade atual e as regras não foram confirmadas.",
      evidence: [
        "A 16ª edição em 2025 documenta continuidade histórica.",
        "A programação ocupou salas relevantes do Recife.",
        "Oportunidades profissionais atuais não foram documentadas.",
        "Importância territorial recifense observável na edição localizada.",
        "Site oficial desatualizado reduziu a nota de transparência atual.",
      ],
    },
  });
}

// Cine Ceará — 36ª edição, 2026.
{
  const id = "festival-011";
  const callUrl = "https://cineceara.com/inscricoes/es/home-es.html";
  const callPage = makeSource(
    `${id}-source-call-2026`,
    callUrl,
    "Portal oficial de inscrições do 36º Cine Ceará",
    "36ª edição / 2026",
    "Chamada e condições publicadas no portal oficial",
    [
      "location",
      "activity",
      "categories",
      "formats",
      "languages",
      "duration",
      "productionYear",
      "countries",
      "premiere",
      "fees",
      "opening",
      "deadlines",
      "eventDates",
      "materials",
      "relevance",
    ],
    {
      confidence: "parcial",
      note: "O portal oficial atual foi localizado e indexado, mas seu tamanho impediu a leitura integral direta; as regras estruturadas são as explicitamente publicadas na página da chamada.",
    },
  );
  applyFestival({
    id,
    sources: [callPage],
    locations: [
      location(id, 1, "Fortaleza", "CE", "Ceará", "2304400", [callPage.id]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival ibero-americano com competições de longas, curtas brasileiros e produções cearenses.",
      languages: ["documentário", "ficção", "animação", "híbrido"],
      workTypes: ["filme"],
    },
    seasonality: {
      opening: {
        months: [7, 8],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Inscrições da edição 2026 de julho a agosto.",
      },
      event: {
        months: [11],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição 2026 realizada de 7 a 13 de novembro.",
      },
    },
    edition: {
      number: "36",
      start: "2026-11-07",
      end: "2026-11-13",
      opening: "2026-07-01",
      closing: "2026-08-15",
      resultDate: "2026-09-20",
      status: "planejada",
      rulesUrl: callUrl,
      confidence: "parcial",
      notes:
        "Três competições e calendário confirmados no portal atual. O documento integral não foi recuperado separadamente; campos ausentes não foram inferidos.",
    },
    calls: [
      {
        name: "Mostra Competitiva Brasileira de Curta-Metragem",
        slug: "curta-brasileiro",
        formats: ["curta"],
        genres: ["documentário", "ficção", "animação", "híbrido"],
        languages: ["documentário", "ficção", "animação", "híbrido"],
        maxMinutes: 25,
        maxSeconds: 1500,
        minYear: 2025,
        premiere: "preferência",
        premiereRequirement: "preferencial",
        premiereTerritory: "Brasil",
        premiereConditions: "Ineditismo é critério de prioridade, não requisito obrigatório.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Obra produzida ou dirigida por brasileiros, ou por residentes no Brasil há mais de três anos; finalização a partir de janeiro de 2025; não pode ter sido selecionada em edição anterior.",
        resubmission: "não",
        opening: "2026-07-01",
        deadlines: [
          deadline("final", "2026-08-15", "", callPage.id, "prazo final"),
        ],
        fees: [freeFee(callPage.id)],
        platform: callUrl,
        rulesUrl: callUrl,
        confidence: "parcial",
      },
      {
        name: "Mostra Competitiva Ibero-Americana de Longa-Metragem",
        slug: "longa-ibero-americano",
        formats: ["longa"],
        genres: ["documentário", "ficção", "animação", "híbrido"],
        languages: ["documentário", "ficção", "animação", "híbrido"],
        minMinutes: 60,
        minSeconds: 3600,
        minYear: 2025,
        premiere: "preferência",
        premiereRequirement: "preferencial",
        premiereConditions: "Ineditismo é critério de prioridade, não requisito obrigatório.",
        countries: [
          "Argentina",
          "Bolívia",
          "Brasil",
          "Chile",
          "Colômbia",
          "Costa Rica",
          "Cuba",
          "Equador",
          "Espanha",
          "Guatemala",
          "México",
          "Panamá",
          "Paraguai",
          "Peru",
          "Portugal",
          "República Dominicana",
          "Uruguai",
          "Venezuela",
        ],
        territoriesConfirmed: true,
        restrictions:
          "Produções de países da América Latina, Caribe, Portugal e Espanha, finalizadas a partir de janeiro de 2025; não aceita obra selecionada em edição anterior.",
        resubmission: "não",
        opening: "2026-07-01",
        deadlines: [
          deadline("final", "2026-08-15", "", callPage.id, "prazo final"),
        ],
        fees: [freeFee(callPage.id)],
        platform: callUrl,
        rulesUrl: callUrl,
        confidence: "parcial",
      },
      {
        name: "Mostra Olhar do Ceará — curtas e longas",
        slug: "olhar-do-ceara",
        formats: ["curta", "longa"],
        genres: ["documentário", "ficção", "animação", "híbrido"],
        languages: ["documentário", "ficção", "animação", "híbrido"],
        minYear: 2025,
        premiere: "preferência",
        premiereRequirement: "preferencial",
        premiereConditions: "Ineditismo é critério de prioridade, não requisito obrigatório.",
        countries: ["Brasil"],
        regions: ["CE"],
        territoriesConfirmed: true,
        restrictions:
          "Produções de realizadores/produtores cearenses ou residentes conforme a regra local; curtas até 25 minutos e longas a partir de 60; finalização a partir de janeiro de 2025.",
        resubmission: "não",
        opening: "2026-07-01",
        deadlines: [
          deadline("final", "2026-08-15", "", callPage.id, "prazo final"),
        ],
        fees: [freeFee(callPage.id)],
        platform: callUrl,
        rulesUrl: callUrl,
        confidence: "parcial",
        notes:
          "Chamada agregada porque reúne curta e longa com faixas distintas; a duração deve ser conferida antes da inscrição.",
      },
    ],
    coverage: statuses(
      {
        localização: "Fortaleza/CE confirmada para a edição 2026.",
        atividade: "36ª edição anunciada para novembro de 2026.",
        categorias: "Três mostras competitivas publicadas no portal oficial.",
        duração: "Curtas até 25 minutos e longas a partir de 60 minutos.",
        "elegibilidade territorial": "Brasil, Ibero-América e Ceará têm chamadas próprias.",
        "produção/conclusão": "Finalização a partir de janeiro de 2025.",
        estreia: "Ineditismo tratado como prioridade, não como obrigação geral.",
        taxas: "Inscrição gratuita no portal atual.",
        abertura: "1º de julho de 2026.",
        encerramento: "15 de agosto de 2026.",
        realização: "7 a 13 de novembro de 2026.",
        relevância: "36ª edição, três competições e premiação atual documentadas.",
      },
      {
        "exibição online": "Histórico anterior de exibição online não localizado no conteúdo recuperado.",
        "pessoa autorizada a inscrever": "Natureza física/jurídica não foi confirmada no regulamento integral.",
      },
    ),
    relevance: {
      scores: [22, 15, 13, 17, 14],
      range: [73, 87],
      impact: "internacional amplo",
      rationale:
        "A 36ª edição e as competições brasileira, ibero-americana e cearense sustentam forte importância histórica e territorial.",
      evidence: [
        "Trinta e seis edições e recorte ibero-americano documentados.",
        "Três competições e vinte prêmios informados para a edição.",
        "A chamada inclui intercâmbio ibero-americano e presença profissional.",
        "Importância para o cinema cearense e para a conexão ibero-americana.",
        "Calendário atual transparente; integralidade do portal não pôde ser validada.",
      ],
    },
  });
}

// Cine PE — 30ª edição, 2026.
{
  const id = "festival-012";
  const rulesUrl =
    "https://festivalcinepe.com.br/wp-content/uploads/2025/11/Regulamento.pdf";
  const rules = makeSource(
    `${id}-source-regulation-2026`,
    rulesUrl,
    "Regulamento das Mostras Competitivas do Cine PE 2026",
    "30ª edição / 2026",
    "Regulamento integral (8 páginas)",
    [
      "location",
      "activity",
      "categories",
      "formats",
      "languages",
      "duration",
      "countries",
      "premiere",
      "opening",
      "deadlines",
      "eventDates",
      "materials",
      "relevance",
    ],
    {
      note: "Lido integralmente. O documento não declara taxa de inscrição, ano de produção, histórico online ou natureza física/jurídica do responsável.",
    },
  );
  applyFestival({
    id,
    sources: [rules],
    locations: [
      location(id, 1, "Recife", "PE", "Pernambuco", "2611606", [rules.id]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival nacional com mostras competitivas de curtas pernambucanos, curtas brasileiros e longas brasileiros.",
      languages: ["ficção", "documentário", "animação"],
      workTypes: ["filme"],
      platforms: ["Vimeo", "link privado"],
    },
    seasonality: {
      opening: {
        months: [11, 12],
        evidenceYears: [2025],
        confidence: "baixa",
        note: "Chamada da edição 2026 abriu no fim de 2025.",
      },
      event: {
        months: [6],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição realizada de 1º a 7 de junho de 2026.",
      },
    },
    edition: {
      number: "30",
      start: "2026-06-01",
      end: "2026-06-07",
      opening: "2025-11-17",
      closing: "2025-12-31",
      resultDate: "",
      status: "realizada",
      rulesUrl,
      confidence: "confirmado",
      notes:
        "Regulamento integral lido. O ineditismo pontua a seleção (nacional peso 3, regional peso 2, ausência peso 1), mas não constitui barreira obrigatória geral.",
    },
    calls: [
      {
        name: "Mostra Competitiva de Curtas Pernambucanos",
        slug: "curtas-pernambucanos",
        formats: ["curta"],
        genres: ["ficção", "documentário", "animação"],
        languages: ["ficção", "documentário", "animação"],
        maxMinutes: 22,
        maxSeconds: 1320,
        creditsIncluded: true,
        premiere: "preferência",
        premiereRequirement: "preferencial",
        premiereTerritory: "Brasil/Pernambuco",
        premiereConditions:
          "Ineditismo nacional ou regional recebe maior peso de seleção; ausência de ineditismo não causa inelegibilidade automática.",
        countries: ["Brasil"],
        regions: ["PE"],
        territoriesConfirmed: true,
        restrictions:
          "Filme pernambucano na produção, coprodução ou direção; ficha assinada e link de seleção obrigatórios.",
        opening: "2025-11-17",
        deadlines: [
          deadline("final", "2025-12-31", "23:55", rules.id, "prazo final"),
        ],
        platform: "https://festivalcinepe.com.br/inscricao2026/",
        rulesUrl,
        notes: "Taxa de inscrição não mencionada no regulamento.",
      },
      {
        name: "Mostra Competitiva de Curtas Brasileiros",
        slug: "curtas-brasileiros",
        formats: ["curta"],
        genres: ["ficção", "documentário", "animação"],
        languages: ["ficção", "documentário", "animação"],
        maxMinutes: 22,
        maxSeconds: 1320,
        creditsIncluded: true,
        premiere: "preferência",
        premiereRequirement: "preferencial",
        premiereTerritory: "Brasil/Pernambuco",
        premiereConditions:
          "Ineditismo nacional ou regional recebe maior peso de seleção; ausência de ineditismo não causa inelegibilidade automática.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions: "Filme brasileiro na produção, coprodução ou direção.",
        opening: "2025-11-17",
        deadlines: [
          deadline("final", "2025-12-31", "23:55", rules.id, "prazo final"),
        ],
        platform: "https://festivalcinepe.com.br/inscricao2026/",
        rulesUrl,
      },
      {
        name: "Mostra Competitiva de Longas Brasileiros",
        slug: "longas-brasileiros",
        formats: ["longa"],
        genres: ["ficção", "documentário", "animação"],
        languages: ["ficção", "documentário", "animação"],
        minMinutes: 70,
        minSeconds: 4200,
        minInclusive: false,
        premiere: "preferência",
        premiereRequirement: "preferencial",
        premiereTerritory: "Brasil/Pernambuco",
        premiereConditions:
          "Ineditismo nacional ou regional recebe maior peso de seleção; ausência de ineditismo não causa inelegibilidade automática.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Longa brasileiro na produção, coprodução ou direção; coprodução internacional é aceita. A curadoria também pode convidar títulos.",
        opening: "2025-11-17",
        deadlines: [
          deadline("final", "2025-12-31", "23:55", rules.id, "prazo final"),
        ],
        platform: "https://festivalcinepe.com.br/inscricao2026/",
        rulesUrl,
      },
    ],
    coverage: statuses(
      {
        localização: "Recife/PE confirmado no regulamento.",
        atividade: "30ª edição realizada em junho de 2026.",
        categorias: "Três mostras competitivas separadas no regulamento.",
        duração: "Curtas até 22 minutos com créditos; longas acima de 70 minutos.",
        "elegibilidade territorial": "Pernambuco, Brasil e coprodução internacional têm regras próprias.",
        estreia: "Ineditismo é critério ponderado, não obrigação geral.",
        abertura: "17 de novembro de 2025.",
        encerramento: "31 de dezembro de 2025 às 23h55.",
        realização: "1º a 7 de junho de 2026.",
        relevância: "30ª edição e três mostras nacionais documentadas.",
      },
      {
        "produção/conclusão": "Ano/data de produção não localizado no regulamento.",
        "exibição online": "Histórico anterior de exibição online não abordado.",
        "pessoa autorizada a inscrever": "Responsável/produtora citados sem esclarecer PF/PJ.",
        taxas: "O regulamento não informa taxa nem declara gratuidade.",
      },
    ),
    relevance: {
      scores: [20, 14, 10, 15, 13],
      range: [64, 79],
      impact: "nacional",
      rationale:
        "Trinta edições e três competições nacionais sustentam relevância alta, com menor evidência atual de mercado e alcance de público.",
      evidence: [
        "Trinta edições e competição nacional documentadas.",
        "Mostras de curtas e longas com ampla premiação técnica.",
        "Convite a representantes e presença de crítica/público, com dados de mercado limitados.",
        "Importância territorial para Pernambuco e circulação brasileira.",
        "Regulamento atual detalhado e calendário íntegro.",
      ],
    },
  });
}

// Festival de Cinema de Vitória — 33ª edição, 2026.
{
  const id = "festival-013";
  const rulesUrl = "https://festivaldevitoria.com.br/33fv/regulamento/";
  const rules = makeSource(
    `${id}-source-regulation-2026`,
    rulesUrl,
    "Regulamento do 33º Festival de Cinema de Vitória",
    "33ª edição / 2026",
    "Regulamento integral",
    [
      "location",
      "activity",
      "categories",
      "formats",
      "duration",
      "productionYear",
      "countries",
      "premiere",
      "pf",
      "pj",
      "fees",
      "opening",
      "deadlines",
      "eventDates",
      "resubmission",
      "materials",
      "relevance",
    ],
  );
  applyFestival({
    id,
    sources: [rules],
    locations: [
      location(id, 1, "Vitória", "ES", "Espírito Santo", "3205309", [rules.id]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      organizer: "IBCA / Galpão Produções",
      description:
        "Festival competitivo nacional com onze mostras, incluindo recortes capixaba, de gênero, negritude, ambiente e fantástico.",
      languages: allLanguages,
      workTypes: ["filme", "videoclipe"],
      platforms: ["Vimeo", "YouTube"],
    },
    seasonality: {
      opening: {
        months: [3, 4],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Chamada 2026 de março a abril.",
      },
      event: {
        months: [7],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição realizada de 18 a 25 de julho de 2026.",
      },
    },
    edition: {
      number: "33",
      start: "2026-07-18",
      end: "2026-07-25",
      opening: "2026-03-02",
      closing: "2026-04-03",
      resultDate: "2026-06-10",
      status: "realizada",
      rulesUrl,
      confidence: "confirmado",
      notes:
        "Regulamento integral lido. Onze mostras competitivas; os curtas são direcionados pela seleção à mostra adequada. Itinerância é condicionada à captação.",
    },
    calls: [
      {
        name: "Curtas e videoclipes — direcionamento às mostras competitivas",
        slug: "curtas-e-videoclipes",
        formats: ["curta"],
        genres: allLanguages,
        languages: allLanguages,
        workTypes: ["filme", "videoclipe"],
        themes: ["cinema negro", "socioambiental"],
        contentGenres: ["fantástico"],
        maxMinutes: 25,
        maxSeconds: 1500,
        creditsIncluded: true,
        minYear: 2025,
        premiere: "estadual",
        premiereRequirement: "obrigatória",
        premiereTerritory: "Espírito Santo",
        premiereConditions:
          "Para obras realizadas fora do ES, exige ineditismo em mostras competitivas no estado e veda circuito comercial; sessões não competitivas, alternativas e cineclubistas são aceitas.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Obra concluída, no máximo dois filmes por realizador/coletivo; mulheres no cinema exige direção exclusivamente feminina e Cinema e Negritude exige direção autodeclarada negra.",
        resubmission: "não",
        opening: "2026-03-02",
        deadlines: [
          deadline("final", "2026-04-03", "17:59", rules.id, "prazo final"),
        ],
        fees: [freeFee(rules.id)],
        platform: "https://festivaldevitoria.com.br/33fv/",
        rulesUrl,
        notes:
          "A plataforma/curadoria direciona os curtas às onze mostras; requisitos temáticos específicos são avaliados no direcionamento.",
      },
      {
        name: "16ª Mostra Competitiva Nacional de Longas",
        slug: "longas-nacionais",
        formats: ["longa"],
        genres: allLanguages,
        languages: allLanguages,
        minMinutes: 70,
        minSeconds: 4200,
        minInclusive: true,
        premiere: "estadual",
        premiereRequirement: "obrigatória",
        premiereTerritory: "Espírito Santo",
        premiereConditions:
          "Para obras realizadas fora do ES, exige ineditismo em mostras competitivas no estado e veda circuito comercial; sessões não competitivas, alternativas e cineclubistas são aceitas.",
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Obra concluída; no máximo dois filmes por realizador ou coletivo. O corte de realização a partir de 2025 é explicitado para curtas, não para longas.",
        resubmission: "não",
        opening: "2026-03-02",
        deadlines: [
          deadline("final", "2026-04-03", "17:59", rules.id, "prazo final"),
        ],
        fees: [freeFee(rules.id)],
        platform: "https://festivaldevitoria.com.br/33fv/",
        rulesUrl,
      },
    ],
    coverage: statuses(
      {
        localização: "Vitória/ES confirmada no regulamento.",
        atividade: "33ª edição realizada em julho de 2026.",
        categorias: "Onze mostras competitivas listadas; curtas são direcionados pela seleção.",
        duração: "Curtas até 25 minutos com créditos; longas a partir de 70 minutos.",
        "elegibilidade territorial": "Produção nacional; regra estadual específica para obras de fora do ES.",
        "produção/conclusão": "Curta a partir de 2025; todas as obras devem estar concluídas.",
        estreia: "Regra de ineditismo competitivo no ES conferida para obras de fora do estado.",
        "pessoa autorizada a inscrever": "Proponente/responsável legal pelos direitos; natureza não especificada.",
        taxas: "Inscrição gratuita.",
        abertura: "2 de março de 2026 às 14h.",
        encerramento: "3 de abril de 2026 às 17h59.",
        realização: "18 a 25 de julho de 2026.",
        relevância: "33 edições e onze competições documentadas.",
      },
      {
        "exibição online": "Histórico anterior de exibição online não é tratado como regra autônoma.",
      },
    ),
    relevance: {
      scores: [21, 14, 10, 17, 13],
      range: [67, 82],
      impact: "nacional",
      rationale:
        "Trinta e três edições, onze mostras e atenção a recortes específicos sustentam relevância alta no circuito nacional e capixaba.",
      evidence: [
        "Trinta e três edições e longa história competitiva.",
        "Onze mostras e programação aproximada de cem filmes.",
        "Debates sobre produção/distribuição e intercâmbio constam dos objetivos.",
        "Centralidade no circuito do Espírito Santo e recortes especializados.",
        "Regulamento atual integral, cronograma e materiais detalhados.",
      ],
    },
  });
}

// Panorama Internacional Coisa de Cinema — 22ª edição, 2027.
{
  const id = "festival-014";
  const rulesUrl =
    "https://panorama.coisadecinema.com.br/wp-content/uploads/2026/09/Regulamento_Rules-and-Terms_Panorama2027.pdf";
  const rules = makeSource(
    `${id}-source-regulation-2027`,
    rulesUrl,
    "Regulamento / Rules and Terms Panorama 2027",
    "22ª edição / 2027",
    "Regulamento integral",
    [
      "location",
      "activity",
      "categories",
      "formats",
      "languages",
      "duration",
      "productionYear",
      "countries",
      "premiere",
      "online",
      "pf",
      "pj",
      "fees",
      "deadlines",
      "eventDates",
      "resubmission",
      "materials",
      "relevance",
    ],
    {
      note: "Lido integralmente. O documento não informa a data de abertura da chamada.",
    },
  );
  const signup = makeSource(
    `${id}-source-signup-2027`,
    "https://panorama.coisadecinema.com.br/inscricoes/",
    "Página oficial de inscrições Panorama 2027",
    "22ª edição / 2027",
    "Inscrição e formulários",
    ["activity", "categories", "fees", "deadlines", "eventDates"],
  );
  const commonDeadlines = [
    deadline("final", "2026-11-13", "", rules.id, "prazo final"),
  ];
  applyFestival({
    id,
    sources: [rules, signup],
    locations: [
      location(id, 1, "Salvador", "BA", "Bahia", "2927408", [rules.id]),
      location(id, 2, "Cachoeira", "BA", "Bahia", "2904902", [rules.id], "exibição"),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival internacional sediado em Salvador e Cachoeira, com competições nacionais, baianas e internacionais.",
      languages: allLanguages,
      workTypes: ["filme"],
      traveling: true,
    },
    seasonality: {
      opening: {
        months: [9, 10, 11],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Chamada observada em setembro e encerrada em novembro; abertura exata não publicada.",
      },
      event: {
        months: [3],
        evidenceYears: [2027],
        confidence: "baixa",
        note: "Realização prevista de 17 a 24 de março de 2027.",
      },
    },
    edition: {
      year: 2027,
      number: "22",
      start: "2027-03-17",
      end: "2027-03-24",
      opening: "",
      closing: "2026-11-13",
      resultDate: "",
      status: "planejada",
      rulesUrl,
      confidence: "confirmado",
      notes:
        "Regulamento integral lido. Inscrições nacionais via formulário e internacionais por e-mail. Data exata de abertura não publicada.",
    },
    calls: [
      ...[
        ["curta", 30, null, "Curtas brasileiros", "br-curta"],
        ["longa", null, 60, "Longas brasileiros", "br-longa"],
      ].map(([format, max, min, name, slug]) => ({
        name,
        slug,
        formats: [format],
        genres: allLanguages,
        languages: allLanguages,
        maxMinutes: max,
        maxSeconds: max ? max * 60 : null,
        minMinutes: min,
        minSeconds: min ? min * 60 : null,
        minYear: 2026,
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Obra produzida e/ou dirigida no Brasil, lançada após 1º de janeiro de 2026; não aceita reinscrição de edição anterior.",
        resubmission: "não",
        deadlines: commonDeadlines,
        fees: [freeFee(rules.id)],
        platform: "https://panorama.coisadecinema.com.br/inscricoes/",
        rulesUrl,
        sourceIds: [rules.id, signup.id],
      })),
      ...[
        ["curta", 30, null, "Competição baiana — curtas", "ba-curta"],
        ["longa", null, 60, "Competição baiana — longas", "ba-longa"],
      ].map(([format, max, min, name, slug]) => ({
        name,
        slug,
        formats: [format],
        genres: allLanguages,
        languages: allLanguages,
        maxMinutes: max,
        maxSeconds: max ? max * 60 : null,
        minMinutes: min,
        minSeconds: min ? min * 60 : null,
        minYear: 2026,
        premiere: "estadual",
        premiereRequirement: "obrigatória",
        premiereTerritory: "Bahia",
        premiereConditions: "Deve ser inédito em festivais realizados na Bahia.",
        countries: ["Brasil"],
        regions: ["BA"],
        territoriesConfirmed: true,
        restrictions:
          "Produção baiana, lançada após 1º de janeiro de 2026; não aceita reinscrição.",
        resubmission: "não",
        deadlines: commonDeadlines,
        fees: [freeFee(rules.id)],
        platform: "https://panorama.coisadecinema.com.br/inscricoes/",
        rulesUrl,
        sourceIds: [rules.id, signup.id],
      })),
      ...[
        ["curta", 30, null, "Competição internacional — curtas", "intl-curta"],
        ["longa", null, 60, "Competição internacional — longas", "intl-longa"],
      ].map(([format, max, min, name, slug]) => ({
        name,
        slug,
        formats: [format],
        genres: allLanguages,
        languages: allLanguages,
        maxMinutes: max,
        maxSeconds: max ? max * 60 : null,
        minMinutes: min,
        minSeconds: min ? min * 60 : null,
        minYear: 2025,
        restrictions:
          "Filme internacional concluído/lançado após 1º de julho de 2025; cópia de seleção com legendas em inglês quando necessário; não aceita reinscrição.",
        resubmission: "não",
        deadlines: commonDeadlines,
        fees: [freeFee(rules.id)],
        platform: "E-mail indicado no regulamento",
        rulesUrl,
        sourceIds: [rules.id, signup.id],
      })),
    ],
    coverage: statuses(
      {
        localização: "Salvador e Cachoeira/BA confirmadas no regulamento.",
        atividade: "22ª edição anunciada para março de 2027.",
        categorias: "Brasil, Bahia e internacional separados por curta/longa.",
        duração: "Curtas até 30 minutos; longas a partir de 60 minutos.",
        "elegibilidade territorial": "Regras próprias para Brasil, Bahia e internacional.",
        "produção/conclusão": "Cortes de 1º/1/2026 (Brasil/BA) e 1º/7/2025 (internacional).",
        estreia: "Ineditismo em festivais da Bahia é obrigatório apenas na competição baiana.",
        "pessoa autorizada a inscrever": "Produtores, realizadores ou responsável pelos direitos; PF/PJ não distinguido.",
        taxas: "Inscrição gratuita.",
        encerramento: "13 de novembro de 2026.",
        realização: "17 a 24 de março de 2027.",
        relevância: "22 edições, três competições e itinerância documentadas.",
      },
      {
        "exibição online": "Histórico de exibição online anterior não localizado.",
        abertura: "Data exata de abertura não publicada no regulamento nem na página de inscrição.",
      },
    ),
    relevance: {
      scores: [20, 13, 12, 17, 13],
      range: [68, 82],
      impact: "internacional amplo",
      rationale:
        "Vinte e duas edições, recortes internacional/nacional/baiano e ações de circulação sustentam relevância alta.",
      evidence: [
        "Vinte e duas edições e curadoria internacional continuada.",
        "Programação em Salvador e Cachoeira com três eixos competitivos.",
        "Itinerância e articulação profissional aparecem no regulamento.",
        "Importância para o cinema baiano e diálogo internacional.",
        "Regulamento bilíngue detalhado; somente a abertura exata ficou ausente.",
      ],
    },
  });
}

// MixBrasil — 34ª edição, 2026.
{
  const id = "festival-015";
  const official = makeSource(
    `${id}-source-site-2026`,
    "https://rede.mixbrasil.org.br/",
    "Site oficial do Festival MixBrasil",
    "34ª edição / 2026",
    "Identidade e edição atual",
    ["location", "activity", "eventDates", "relevance"],
  );
  const platform = makeSource(
    `${id}-source-filmfreeway-2026`,
    "https://filmfreeway.com/FestivalMixBrasil",
    "Festival MixBrasil — regras e taxas no FilmFreeway",
    "34ª edição / 2026",
    "Página oficial de inscrição e regras",
    [
      "categories",
      "formats",
      "languages",
      "duration",
      "productionYear",
      "countries",
      "premiere",
      "pf",
      "pj",
      "fees",
      "opening",
      "deadlines",
      "eventDates",
      "materials",
      "relevance",
    ],
    { type: "plataforma de inscrição" },
  );
  const finalDeadline = [
    deadline("final", "2026-08-03", "", platform.id, "deadline"),
  ];
  const common = {
    genres: ["ficção", "documentário", "animação", "experimental"],
    languages: ["ficção", "documentário", "animação", "experimental"],
    themes: ["LGBTQIA+"],
    minYear: 2025,
    premiere: "municipal",
    premiereRequirement: "obrigatória",
    premiereTerritory: "São Paulo",
    premiereConditions:
      "A versão inglesa das regras exige estreia em São Paulo; a versão portuguesa da plataforma omite a frase. O conflito de tradução foi preservado.",
    restrictions:
      "Tema LGBTQIA+ ou direção por pessoa LGBTQIA+; obra concluída após 1º de janeiro de 2025.",
    pf: "sim",
    pj: "sim",
    opening: "2026-04-15",
    deadlines: finalDeadline,
    platform: "https://filmfreeway.com/FestivalMixBrasil",
    rulesUrl: platform.url,
    sourceIds: [platform.id],
  };
  applyFestival({
    id,
    sources: [official, platform],
    locations: [
      location(id, 1, "São Paulo", "SP", "São Paulo", "3550308", [official.id]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival de cultura da diversidade com programação audiovisual LGBTQIA+ nacional, latino-americana e internacional.",
      languages: ["ficção", "documentário", "animação", "experimental"],
      themes: ["LGBTQIA+"],
      workTypes: ["filme", "instalação", "outro"],
      platforms: ["FilmFreeway"],
    },
    seasonality: {
      opening: {
        months: [4, 5, 6, 7, 8],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Chamada 2026 aberta em abril e encerrada em agosto.",
      },
      event: {
        months: [11],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição 2026 de 11 a 22 de novembro.",
      },
    },
    edition: {
      number: "34",
      start: "2026-11-11",
      end: "2026-11-22",
      opening: "2026-04-15",
      closing: "2026-08-03",
      resultDate: "2026-10-07",
      status: "planejada",
      rulesUrl: platform.url,
      confidence: "confirmado",
      notes:
        "Regras atuais da plataforma oficial lidas. A exigência de estreia em São Paulo aparece na versão inglesa e foi omitida na tradução portuguesa; tratada como conflito documental, não ignorada.",
    },
    calls: [
      {
        ...common,
        name: "Brasil — curtas",
        slug: "br-curta",
        formats: ["curta"],
        maxMinutes: 25,
        maxSeconds: 1500,
        countries: ["Brasil"],
        territoriesConfirmed: true,
        fees: [freeFee(platform.id, ["curtas brasileiros"])],
      },
      {
        ...common,
        name: "Brasil — médias e longas",
        slug: "br-media-longa",
        formats: ["média", "longa"],
        minMinutes: 26,
        minSeconds: 1560,
        countries: ["Brasil"],
        territoriesConfirmed: true,
        fees: [freeFee(platform.id, ["médias e longas brasileiros"])],
      },
      {
        ...common,
        name: "América Latina — curtas",
        slug: "latam-curta",
        formats: ["curta"],
        maxMinutes: 25,
        maxSeconds: 1500,
        countries: [],
        regions: ["América Latina"],
        territoriesConfirmed: true,
        fees: [freeFee(platform.id, ["curtas latino-americanos"])],
      },
      {
        ...common,
        name: "América Latina — médias e longas",
        slug: "latam-media-longa",
        formats: ["média", "longa"],
        minMinutes: 26,
        minSeconds: 1560,
        regions: ["América Latina"],
        territoriesConfirmed: true,
        fees: [freeFee(platform.id, ["médias e longas latino-americanos"])],
      },
      {
        ...common,
        name: "Internacional fora da América Latina — curtas",
        slug: "intl-curta",
        formats: ["curta"],
        maxMinutes: 25,
        maxSeconds: 1500,
        territoriesConfirmed: true,
        restrictions: `${common.restrictions} Categoria exclui produções latino-americanas.`,
        fees: [paidFee(10, "USD", "final", platform.id, ["curtas internacionais fora da América Latina"])],
      },
      {
        ...common,
        name: "Internacional fora da América Latina — médias e longas",
        slug: "intl-media-longa",
        formats: ["média", "longa"],
        minMinutes: 26,
        minSeconds: 1560,
        territoriesConfirmed: true,
        restrictions: `${common.restrictions} Categoria exclui produções latino-americanas.`,
        fees: [
          paidFee(20, "USD", "final", platform.id, ["médias e longas internacionais fora da América Latina"], {
            discount: "FilmFreeway Gold: USD 15",
          }),
        ],
      },
      {
        ...common,
        name: "XR e filmes gerados por IA",
        slug: "xr-ia",
        formats: ["outro"],
        workTypes: ["instalação", "outro"],
        fees: [freeFee(platform.id, ["XR", "filmes gerados por IA"])],
      },
    ],
    coverage: statuses(
      {
        localização: "São Paulo/SP confirmada para a edição 2026.",
        atividade: "34ª edição anunciada para novembro de 2026.",
        categorias: "Brasil, América Latina, internacional, XR e IA separados na plataforma.",
        duração: "Curtas até 25 minutos; médias 26–49; longas acima de 50 conforme as categorias publicadas.",
        "elegibilidade territorial": "Brasil, América Latina e restante internacional separados.",
        "produção/conclusão": "Conclusão posterior a 1º de janeiro de 2025.",
        "pessoa autorizada a inscrever": "Filmmakers/companies; PF e PJ aceitos.",
        taxas: "Categorias brasileiras/latino-americanas gratuitas; valores internacionais em USD registrados.",
        abertura: "15 de abril de 2026.",
        encerramento: "3 de agosto de 2026.",
        realização: "11 a 22 de novembro de 2026.",
        relevância: "34 anos, seleção, audiência e premiações documentados na plataforma oficial.",
      },
      {
        "exibição online": "Histórico prévio de exibição online não localizado como regra autônoma.",
      },
      {
        estreia: "Exigência de estreia em São Paulo consta na versão inglesa e foi omitida na tradução portuguesa da mesma plataforma.",
      },
    ),
    relevance: {
      scores: [24, 19, 16, 20, 14],
      range: [87, 96],
      impact: "especializado",
      rationale:
        "Trinta e quatro anos, grande audiência, seleção internacional e centralidade LGBTQIA+ sustentam relevância muito alta no circuito especializado.",
      evidence: [
        "Trinta e quatro anos de curadoria LGBTQIA+ documentados.",
        "Plataforma informa cerca de 140 selecionados, 850 inscrições e ampla audiência recente.",
        "Premiações, debates e conexões profissionais integram a edição.",
        "Centralidade latino-americana no circuito audiovisual LGBTQIA+.",
        "Regras, taxas e calendário atuais publicados, com um conflito de tradução registrado.",
      ],
    },
  });
}

// Fantaspoa — 23ª edição, 2027.
{
  const id = "festival-016";
  const official = makeSource(
    `${id}-source-site-2027`,
    "https://fantaspoa.com/",
    "Site oficial do Fantaspoa",
    "23ª edição / 2027",
    "Identidade, histórico e edição",
    ["location", "activity", "eventDates", "relevance"],
  );
  const platform = makeSource(
    `${id}-source-filmfreeway-2027`,
    "https://filmfreeway.com/fantaspoa",
    "Fantaspoa — regras e taxas 2027",
    "23ª edição / 2027",
    "Regras integrais e tabela de taxas no FilmFreeway",
    [
      "categories",
      "formats",
      "languages",
      "duration",
      "productionYear",
      "premiere",
      "online",
      "pf",
      "pj",
      "fees",
      "opening",
      "deadlines",
      "eventDates",
      "materials",
      "relevance",
    ],
    { type: "plataforma de inscrição" },
  );
  const deadlines = [
    deadline("early", "2026-07-15", "", platform.id, "early deadline"),
    deadline("regular", "2026-09-15", "", platform.id, "regular deadline"),
    deadline("late", "2026-11-15", "", platform.id, "late deadline"),
    deadline("extended", "2027-01-10", "", platform.id, "extended/final deadline"),
  ];
  const common = {
    genres: ["ficção", "animação", "experimental", "híbrido"],
    languages: ["ficção", "animação", "experimental", "híbrido"],
    contentGenres: ["fantástico", "horror"],
    minYear: 2025,
    premiere: "municipal",
    premiereRequirement: "obrigatória",
    premiereTerritory: "Porto Alegre",
    premiereConditions:
      "Não pode ter ocorrido exibição pública em Porto Alegre, exceto mostras universitárias/estudantis.",
    online: "permitido",
    onlineConditions:
      "O regulamento não proíbe histórico online; exige apenas ausência de exibição pública prévia em Porto Alegre.",
    pf: "sim",
    pj: "sim",
    restrictions:
      "Fantasia, horror, bizarro, thriller ou ficção científica; conclusão após 1º de janeiro de 2025; áudio ou legendas em inglês, espanhol ou português.",
    opening: "2026-05-15",
    deadlines,
    platform: "https://filmfreeway.com/fantaspoa",
    rulesUrl: platform.url,
    sourceIds: [platform.id],
  };
  const fees = (amounts, appliesTo) =>
    ["early", "regular", "late", "extended"].flatMap((kind, index) => [
      paidFee(amounts[index], "USD", kind, platform.id, appliesTo, {
        discount: `FilmFreeway Gold: USD ${amounts[index + 4]}`,
        waiver: "O regulamento declara que não concede waivers.",
      }),
    ]);
  applyFestival({
    id,
    sources: [official, platform],
    locations: [
      location(id, 1, "Porto Alegre", "RS", "Rio Grande do Sul", "4314902", [
        official.id,
        platform.id,
      ]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival internacional dedicado ao cinema fantástico, horror, ficção científica e gêneros correlatos.",
      languages: ["ficção", "animação", "experimental", "híbrido"],
      contentGenres: ["fantástico", "horror"],
      workTypes: ["filme"],
      platforms: ["FilmFreeway"],
    },
    seasonality: {
      opening: {
        months: [5, 7, 9, 11, 1],
        evidenceYears: [2026, 2027],
        confidence: "baixa",
        note: "Janela da edição 2027 de maio de 2026 a janeiro de 2027.",
      },
      event: {
        months: [4],
        evidenceYears: [2027],
        confidence: "baixa",
        note: "Realização prevista de 7 a 25 de abril de 2027.",
      },
    },
    edition: {
      year: 2027,
      number: "23",
      start: "2027-04-07",
      end: "2027-04-25",
      opening: "2026-05-15",
      closing: "2027-01-10",
      resultDate: "2027-03-01",
      status: "planejada",
      rulesUrl: platform.url,
      confidence: "confirmado",
      notes:
        "Regras e taxas atuais lidas integralmente na plataforma oficial. O festival não paga taxa de exibição salvo acordo expresso.",
    },
    calls: [
      {
        ...common,
        name: "Produções brasileiras — curtas",
        slug: "br-curta",
        formats: ["curta"],
        maxMinutes: 30,
        maxSeconds: 1800,
        countries: ["Brasil"],
        territoriesConfirmed: true,
        fees: fees([5, 7, 9, 12, 4, 6, 8, 10], ["curtas brasileiros"]),
      },
      {
        ...common,
        name: "Produções brasileiras — longas",
        slug: "br-longa",
        formats: ["longa"],
        minMinutes: 60,
        minSeconds: 3600,
        countries: ["Brasil"],
        territoriesConfirmed: true,
        fees: fees([5, 7, 9, 12, 4, 6, 8, 10], ["longas brasileiros"]),
      },
      {
        ...common,
        name: "Curtas internacionais de animação",
        slug: "intl-curta-animacao",
        formats: ["curta"],
        genres: ["animação"],
        languages: ["animação"],
        maxMinutes: 30,
        maxSeconds: 1800,
        fees: fees([54, 60, 64, 74, 48.5, 54, 57.5, 66.5], ["curtas internacionais de animação"]),
      },
      {
        ...common,
        name: "Curtas internacionais live action",
        slug: "intl-curta-live-action",
        formats: ["curta"],
        maxMinutes: 30,
        maxSeconds: 1800,
        fees: fees([54, 60, 64, 74, 48.5, 54, 57.5, 66.5], ["curtas internacionais live action"]),
      },
      {
        ...common,
        name: "Longas internacionais",
        slug: "intl-longa",
        formats: ["longa"],
        minMinutes: 60,
        minSeconds: 3600,
        fees: fees([64, 74, 84, 94, 57.5, 66.5, 75.5, 84.5], ["longas internacionais"]),
      },
    ],
    coverage: statuses({
      localização: "Porto Alegre/RS confirmada nas fontes oficiais.",
      atividade: "23ª edição anunciada para abril de 2027.",
      categorias: "Brasil e internacional separados por duração e animação/live action.",
      duração: "Curtas até 30 minutos; longas a partir de 60 minutos.",
      "elegibilidade territorial": "Brasil e internacional têm tabelas próprias.",
      "produção/conclusão": "Conclusão posterior a 1º de janeiro de 2025.",
      estreia: "Ausência de exibição pública anterior em Porto Alegre, com exceção estudantil.",
      "exibição online": "Não há vedação geral de histórico online nas regras atuais.",
      "pessoa autorizada a inscrever": "Filmmakers e companies; PF e PJ aceitos.",
      taxas: "Quatro lotes, valores em USD e descontos Gold estruturados por categoria.",
      abertura: "15 de maio de 2026.",
      encerramento: "10 de janeiro de 2027.",
      realização: "7 a 25 de abril de 2027.",
      relevância: "23 anos, programação, estreias e audiência documentadas.",
    }),
    relevance: {
      scores: [23, 17, 13, 20, 14],
      range: [82, 92],
      impact: "especializado",
      rationale:
        "Vinte e três anos, grande volume de programação e centralidade no fantástico latino-americano sustentam relevância muito alta especializada.",
      evidence: [
        "Vinte e três anos de curadoria especializada documentados.",
        "Fontes oficiais informam cerca de duzentos selecionados e grande audiência recente.",
        "Convidados, estreias e encontros profissionais integram o festival.",
        "Alta importância no circuito de cinema fantástico e horror.",
        "Regras, prazos e taxas atuais detalhados na plataforma.",
      ],
    },
  });
}

// FICA — 27ª edição, 2026. Editais integrais ficaram presos à plataforma dinâmica.
{
  const id = "festival-017";
  const editionPage = makeSource(
    `${id}-source-edition-2026`,
    "https://fica.go.gov.br/n/199834-fica-2026-reformula-premiacao-e-garante-distribuicao-igualitaria-entre-categorias-tecnicas",
    "FICA 2026 reformula premiação",
    "27ª edição / 2026",
    "Edição, competições e premiação",
    ["location", "activity", "categories", "eventDates", "relevance"],
  );
  const competitions = makeSource(
    `${id}-source-competitions-2026`,
    "https://fica.go.gov.br/p/61398-mostras-competitivas-2026",
    "Mostras competitivas FICA 2026",
    "27ª edição / 2026",
    "Descrição das mostras",
    ["categories", "themes", "relevance"],
  );
  const addendum = makeSource(
    `${id}-source-addendum-2026`,
    "https://goias.gov.br/lista-de-filmes-selecionados-para-fica-2026-sera-divulgada-nesta-sexta-feira/",
    "Termo Aditivo 02/2026 — calendário da seleção do FICA",
    "27ª edição / 2026",
    "Retificação de resultado e envio de cópias",
    ["activity", "resultDate", "materials", "eventDates"],
    {
      note: "A notícia oficial documenta o termo aditivo que moveu o resultado para 22 de maio e as cópias para 31 de maio.",
    },
  );
  const platformAttempt = makeSource(
    `${id}-source-platform-attempt-2026`,
    "https://web.ufg.br/plateia-editais/",
    "Plataforma Plateia Editais — chamadas FICA 2026",
    "27ª edição / 2026",
    "Tentativa de leitura dos editais CP01, CP02, CP03 e CP04",
    ["duration", "productionYear", "countries", "premiere", "online", "pf", "pj", "fees", "opening", "deadlines"],
    {
      confidence: "não verificado",
      evidenceState: "não localizado",
      note: "A plataforma dinâmica confirmou referências às quatro chamadas, mas não expôs anexos/regulamentos integrais à ferramenta de leitura; regras ausentes não foram inferidas.",
    },
  );
  applyFestival({
    id,
    sources: [editionPage, competitions, addendum, platformAttempt],
    locations: [
      location(id, 1, "Goiás", "GO", "Goiás", "5208905", [editionPage.id]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival internacional de cinema e vídeo ambiental realizado na cidade de Goiás.",
      themes: ["socioambiental", "indígena"],
      languages: allLanguages,
      workTypes: ["filme"],
      platforms: ["Plateia Editais UFG"],
    },
    seasonality: {
      opening: {
        months: [],
        evidenceYears: [],
        confidence: "desconhecida",
        note: "Datas de chamada não foram confirmadas nos editais integrais.",
      },
      event: {
        months: [6],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição realizada de 16 a 21 de junho de 2026.",
      },
    },
    edition: {
      number: "27",
      start: "2026-06-16",
      end: "2026-06-21",
      opening: "",
      closing: "",
      resultDate: "2026-05-22",
      status: "realizada",
      rulesUrl: platformAttempt.url,
      confidence: "parcial",
      notes:
        "Mostras e calendário atual confirmados; editais integrais na plataforma dinâmica não foram recuperados. Termo Aditivo 02/2026 conferido.",
    },
    calls: [
      ["Mostra Internacional Washington Novaes", "washington-novaes", []],
      ["Mostra de Cinema Goiano", "cinema-goiano", ["GO"]],
      ["Mostra Becos — produção local", "becos", ["GO"]],
      ["Mostra de Povos Indígenas e Tradicionais", "povos", []],
    ].map(([name, slug, regions]) => ({
      name,
      slug,
      genres: allLanguages,
      languages: allLanguages,
      themes: ["socioambiental", ...(slug === "povos" ? ["indígena"] : [])],
      regions,
      territoriesConfirmed: regions.length > 0,
      submissionMode: "não confirmado",
      selectionType: "competitiva",
      genresConfirmed: false,
      rulesUrl: platformAttempt.url,
      confidence: "parcial",
      sourceIds: [competitions.id, platformAttempt.id],
      notes:
        "A existência e o foco da mostra são oficiais; duração, elegibilidade, datas, taxas, estreia e pessoa autorizada aguardam o edital integral.",
    })),
    coverage: statuses(
      {
        localização: "Cidade de Goiás/GO confirmada para a edição 2026.",
        atividade: "27ª edição realizada em junho de 2026.",
        categorias: "Quatro mostras competitivas descritas oficialmente.",
        realização: "16 a 21 de junho de 2026.",
        relevância: "27 edições, foco ambiental e estrutura de premiação documentados.",
      },
      {
        duração: "Editais integrais não recuperados da plataforma dinâmica.",
        "elegibilidade territorial": "Focos goiano/local/indígena conhecidos, mas critérios integrais não recuperados.",
        "produção/conclusão": "Não localizada nos documentos acessíveis.",
        estreia: "Não localizada nos documentos acessíveis.",
        "exibição online": "Não localizada nos documentos acessíveis.",
        "pessoa autorizada a inscrever": "Não localizada nos documentos acessíveis.",
        taxas: "Não localizadas nos documentos acessíveis.",
        abertura: "Não confirmada sem o edital integral.",
        encerramento: "Não confirmado sem o edital integral.",
      },
    ),
    relevance: {
      scores: [22, 18, 15, 20, 13],
      range: [78, 93],
      impact: "especializado",
      confidence: "baixa",
      rationale:
        "Vinte e sete edições, foco socioambiental e mostras territoriais sustentam relevância muito alta, com incerteza documental nas chamadas.",
      evidence: [
        "Vinte e sete edições e curadoria ambiental documentadas.",
        "Quatro mostras e premiação técnica atual publicadas.",
        "Licenciamento, debates e circulação aparecem nas fontes oficiais.",
        "Referência especializada em cinema socioambiental e territórios tradicionais.",
        "Edição e retificação transparentes; editais integrais ficaram inacessíveis.",
      ],
    },
  });
}

// Mostra Ecofalante — 15ª edição, 2026.
{
  const id = "festival-018";
  const territoriesUrl = "https://ecofalante.org.br/competicao/territorios-2026";
  const territories = makeSource(
    `${id}-source-territories-2026`,
    territoriesUrl,
    "Regulamento Territórios e Memória 2026",
    "15ª edição / 2026",
    "Regulamento integral da competição",
    [
      "location",
      "categories",
      "formats",
      "languages",
      "productionYear",
      "countries",
      "premiere",
      "pf",
      "pj",
      "fees",
      "deadlines",
      "eventDates",
      "materials",
    ],
  );
  const student = makeSource(
    `${id}-source-student-2026`,
    "https://ecofalante.org.br/competicao/curta-2026",
    "Regulamento Curta Ecofalante 2026",
    "15ª edição / 2026",
    "Regulamento integral da competição estudantil",
    ["categories", "formats", "duration", "productionYear", "countries", "pf", "pj", "fees", "deadlines", "materials"],
  );
  const opening = makeSource(
    `${id}-source-opening-2026`,
    "https://ecofalante.org.br/blog/ecofalante-inscricoes-abertas-2026/",
    "Inscrições abertas para a Ecofalante 2026",
    "15ª edição / 2026",
    "Abertura e gratuidade",
    ["activity", "fees", "opening", "deadlines"],
  );
  const program = makeSource(
    `${id}-source-program-2026`,
    "https://ecofalante.org.br/programacao",
    "Programação da 15ª Mostra Ecofalante",
    "15ª edição / 2026",
    "Datas e programação",
    ["location", "activity", "eventDates", "relevance"],
  );
  const common = {
    genres: allLanguages,
    languages: allLanguages,
    themes: ["socioambiental"],
    minYear: 2024,
    countries: ["Brasil"],
    territoriesConfirmed: true,
    pf: "não confirmado",
    pj: "não confirmado",
    opening: "2025-11-24",
    deadlines: [
      deadline("final", "2026-01-15", "", opening.id, "prazo final"),
    ],
    fees: [freeFee(opening.id)],
    platform: "https://ecofalante.org.br",
  };
  applyFestival({
    id,
    sources: [territories, student, opening, program],
    locations: [
      location(id, 1, "São Paulo", "SP", "São Paulo", "3550308", [program.id]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Mostra especializada em temas socioambientais, com competições brasileiras e itinerância educativa.",
      themes: ["socioambiental"],
      languages: allLanguages,
      workTypes: ["filme"],
      traveling: true,
    },
    seasonality: {
      opening: {
        months: [11, 12, 1],
        evidenceYears: [2025, 2026],
        confidence: "baixa",
        note: "Chamada da edição 2026 de novembro de 2025 a janeiro de 2026.",
      },
      event: {
        months: [5, 6],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Programação de 28 de maio a 10 de junho de 2026.",
      },
    },
    edition: {
      number: "15",
      start: "2026-05-28",
      end: "2026-06-10",
      opening: "2025-11-24",
      closing: "2026-01-15",
      resultDate: "",
      status: "realizada",
      rulesUrl: territoriesUrl,
      confidence: "confirmado",
      notes:
        "Regulamentos das duas competições lidos integralmente. Autorização de itinerância é opcional; uso predominante de IA pode causar exclusão.",
    },
    calls: [
      {
        ...common,
        name: "Competição Territórios e Memória",
        slug: "territorios-memoria",
        formats: ["curta", "média", "longa", "outro"],
        rulesUrl: territoriesUrl,
        sourceIds: [territories.id, opening.id],
        restrictions:
          "Produção ou coprodução brasileira, qualquer duração e gênero, finalizada a partir de 2024, com tema socioambiental. Responsável deve deter os direitos; uso predominante de IA pode motivar exclusão.",
        premiere: "nenhuma",
        premiereRequirement: "sem exigência confirmada",
        premiereConditions:
          "Não exige estreia; lançamento comercial no Brasil antes do evento pode causar exclusão a critério da organização.",
        online: "não confirmado",
        onlineConditions: "Histórico online anterior não é tratado como barreira autônoma.",
      },
      {
        ...common,
        name: "Curta Ecofalante — competição estudantil",
        slug: "curta-estudantil",
        formats: ["curta"],
        maxMinutes: 30,
        maxSeconds: 1800,
        participationConditions: ["universitário", "escolar"],
        audiences: ["juvenil", "geral"],
        rulesUrl: student.url,
        sourceIds: [student.id, opening.id],
        restrictions:
          "Curta brasileiro de tema social/ambiental relacionado aos ODS, finalizado a partir de 2024 e dirigido/produzido por estudantes de escola, curso técnico, curso livre audiovisual, ensino médio ou superior; exige comprovação.",
      },
    ],
    coverage: statuses(
      {
        localização: "São Paulo/SP confirmada na programação; itinerância posterior autorizável.",
        atividade: "15ª edição realizada em maio/junho de 2026.",
        categorias: "Territórios e Memória e Curta Ecofalante separados.",
        duração: "Qualquer duração na primeira; até 30 minutos na estudantil.",
        "elegibilidade territorial": "Produções e coproduções brasileiras.",
        "produção/conclusão": "Finalização a partir de 2024.",
        estreia: "Sem obrigação geral; lançamento comercial prévio pode excluir Territórios e Memória.",
        "pessoa autorizada a inscrever": "Titular/responsável pelos direitos; PF/PJ não diferenciado.",
        taxas: "Inscrições gratuitas.",
        abertura: "24 de novembro de 2025.",
        encerramento: "15 de janeiro de 2026.",
        realização: "28 de maio a 10 de junho de 2026.",
        relevância: "15 edições e circuito socioambiental/educativo documentados.",
      },
      {
        "exibição online": "Histórico online anterior não localizado como regra autônoma.",
      },
    ),
    relevance: {
      scores: [20, 17, 15, 20, 13],
      range: [79, 90],
      impact: "especializado",
      rationale:
        "Quinze edições, programação gratuita, itinerância e foco socioambiental sustentam relevância muito alta especializada.",
      evidence: [
        "Quinze edições e curadoria socioambiental continuada.",
        "Programação pública em São Paulo e circulação educativa documentadas.",
        "Itinerância e diálogo com escolas ampliam circulação e impacto.",
        "Alta importância no circuito de cinema socioambiental.",
        "Dois regulamentos atuais detalhados e calendário transparente.",
      ],
    },
  });
}

// CineBH — 20ª edição, 2026.
{
  const id = "festival-020";
  const callPage = makeSource(
    `${id}-source-call-2026`,
    "https://universoproducao.com.br/news/inscricoes-de-filmes-para-a-20a-cinebh-mostra-internacional-de-cinema-de-belo-horizonte-estao-abertas-ate-24-de-abril/",
    "Inscrições de filmes para a 20ª CineBH",
    "20ª edição / 2026",
    "Chamada oficial resumida",
    ["location", "activity", "categories", "formats", "productionYear", "countries", "fees", "opening", "deadlines"],
    {
      confidence: "parcial",
      note: "Página oficial da organizadora lida integralmente; o regulamento completo vinculado não permaneceu disponível na listagem atual de inscrições.",
    },
  );
  const program = makeSource(
    `${id}-source-program-2026`,
    "https://cinebh.com.br/n/20a-cinebh-anuncia-102-filmes-homenagem-a-paz-encina-e-estreia-de-conceicao-evaristo-como-atriz/",
    "20ª CineBH anuncia 102 filmes",
    "20ª edição / 2026",
    "Programação e alcance",
    ["activity", "categories", "eventDates", "relevance"],
  );
  const history = makeSource(
    `${id}-source-history-2026`,
    "https://cinebh.com.br/n/cinebh-celebra-20-anos-de-uma-trajetoria-que-transformou-belo-horizonte-em-territorio-de-cinema/",
    "CineBH celebra 20 anos de trajetória",
    "20ª edição / 2026",
    "Histórico e Brasil CineMundi",
    ["activity", "industry", "relevance"],
  );
  const common = {
    genres: allLanguages,
    languages: allLanguages,
    opening: "2026-03-25",
    deadlines: [
      deadline("final", "2026-04-24", "23:59", callPage.id, "prazo final"),
    ],
    fees: [freeFee(callPage.id)],
    platform: "https://universoproducao.com.br/inscricoes/",
    rulesUrl: callPage.url,
    confidence: "parcial",
  };
  applyFestival({
    id,
    sources: [callPage, program, history],
    locations: [
      location(id, 1, "Belo Horizonte", "MG", "Minas Gerais", "3106200", [
        callPage.id,
        program.id,
      ]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      organizer: "Universo Produção",
      description:
        "Mostra internacional com cinema brasileiro e latino-americano, formação e o encontro de coprodução Brasil CineMundi.",
      languages: allLanguages,
      workTypes: ["filme"],
      platforms: ["Universo Produção"],
    },
    seasonality: {
      opening: {
        months: [3, 4],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Chamada 2026 de março a abril.",
      },
      event: {
        months: [9],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição realizada de 22 a 27 de setembro de 2026.",
      },
    },
    edition: {
      number: "20",
      start: "2026-09-22",
      end: "2026-09-27",
      opening: "2026-03-25",
      closing: "2026-04-24",
      resultDate: "",
      status: "realizada",
      rulesUrl: callPage.url,
      confidence: "parcial",
      notes:
        "Chamada oficial resumida lida; regulamento integral não recuperado. Programa confirmou 102 filmes e recortes brasileiro/latino-americano.",
    },
    calls: [
      {
        ...common,
        name: "Filmes brasileiros — curtas, médias e longas",
        slug: "brasil",
        formats: ["curta", "média", "longa"],
        minYear: 2025,
        countries: ["Brasil"],
        territoriesConfirmed: true,
        resubmission: "não",
        restrictions:
          "Filme brasileiro finalizado a partir de 2025 e ainda não exibido em edição anterior da CineBH.",
      },
      {
        ...common,
        name: "Mostras Território e Horizonte — América Latina",
        slug: "latino-americana",
        formats: ["curta", "média", "longa"],
        regions: ["América Latina"],
        territoriesConfirmed: true,
        restrictions:
          "Obras latino-americanas de perfil autoral e novos realizadores; duração e demais critérios integrais aguardam o regulamento completo.",
      },
      {
        ...common,
        name: "A Cidade em Movimento — Belo Horizonte e região metropolitana",
        slug: "cidade-em-movimento",
        formats: ["curta", "média", "longa"],
        countries: ["Brasil"],
        regions: ["MG"],
        territoriesConfirmed: true,
        restrictions:
          "Produção audiovisual ligada a Belo Horizonte e região metropolitana; demais critérios aguardam o regulamento integral.",
      },
    ],
    coverage: statuses(
      {
        localização: "Belo Horizonte/MG e espaços da edição confirmados.",
        atividade: "20ª edição realizada em setembro de 2026.",
        categorias: "Cinema brasileiro, mostras latino-americanas e recorte metropolitano publicados.",
        "elegibilidade territorial": "Brasil, América Latina e BH/região têm recortes separados.",
        "produção/conclusão": "Chamada brasileira exige finalização a partir de 2025.",
        taxas: "Inscrições gratuitas.",
        abertura: "25 de março de 2026.",
        encerramento: "24 de abril de 2026 às 23h59.",
        realização: "22 a 27 de setembro de 2026.",
        relevância: "20 edições, 102 filmes e dados históricos/industriais documentados.",
      },
      {
        duração: "Faixas exatas por chamada não localizadas sem o regulamento integral.",
        estreia: "Regras de estreia não localizadas no resumo oficial.",
        "exibição online": "Histórico online anterior não localizado.",
        "pessoa autorizada a inscrever": "Não localizada no resumo oficial.",
      },
    ),
    relevance: {
      scores: [22, 18, 20, 17, 14],
      range: [85, 95],
      impact: "internacional amplo",
      rationale:
        "Vinte edições, programação de 102 filmes e o Brasil CineMundi sustentam relevância muito alta de circulação e indústria.",
      evidence: [
        "Vinte edições e 1.751 filmes historicamente documentados.",
        "Edição 2026 com 102 filmes e participação de vários países e estados.",
        "Brasil CineMundi registra centenas de projetos e profissionais internacionais.",
        "Importância para o cinema brasileiro, latino-americano e o território mineiro.",
        "Chamada e programação atuais transparentes; regulamento integral não recuperado.",
      ],
    },
  });
}

// Mostra de Cinema Infantil de Florianópolis — 25ª edição, 2026.
{
  const id = "festival-021";
  const rulesUrl = "https://www.mostradecinemainfantil.com.br/registration-2026/";
  const rules = makeSource(
    `${id}-source-regulation-2026`,
    rulesUrl,
    "Regulamento de inscrições 2026 da Mostra de Cinema Infantil",
    "25ª edição / 2026",
    "Regulamento integral publicado no site",
    [
      "location",
      "activity",
      "categories",
      "formats",
      "duration",
      "countries",
      "premiere",
      "pf",
      "pj",
      "fees",
      "deadlines",
      "eventDates",
      "materials",
      "relevance",
    ],
    {
      confidence: "parcial",
      note: "A página foi lida integralmente, mas apresenta conflito: o título anuncia inscrição internacional e o item 3.1 descreve a Competição Nacional. O prazo também chama 24/5/2026 de segunda-feira, embora a data caia num domingo.",
    },
  );
  const landing = makeSource(
    `${id}-source-signup-2026`,
    "https://www.mostradecinemainfantil.com.br/inscricoes/",
    "Página de inscrições da 25ª Mostra de Cinema Infantil",
    "25ª edição / 2026",
    "Inscrição e edição atual",
    ["activity", "categories", "deadlines", "eventDates"],
    { confidence: "parcial" },
  );
  applyFestival({
    id,
    sources: [rules, landing],
    locations: [
      location(id, 1, "Florianópolis", "SC", "Santa Catarina", "4205407", [
        rules.id,
      ]),
      location(id, 2, "Grande Florianópolis", "SC", "Santa Catarina", "", [
        rules.id,
      ], "exibição"),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Mostra voltada a crianças e jovens, com sessões presenciais, itinerância metropolitana e janela online.",
      languages: allLanguages,
      workTypes: ["filme"],
      audiences: ["infantil", "juvenil"],
      traveling: true,
    },
    seasonality: {
      opening: {
        months: [5],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Somente o encerramento de maio foi confirmado; abertura não publicada.",
      },
      event: {
        months: [10],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição realizada de 9 a 17 de outubro de 2026.",
      },
    },
    edition: {
      number: "25",
      start: "2026-10-09",
      end: "2026-10-17",
      opening: "",
      closing: "2026-05-24",
      resultDate: "2026-07-22",
      status: "realizada",
      rulesUrl,
      confidence: "parcial",
      notes:
        "Regulamento atual lido, com conflito interno sobre alcance nacional/internacional e discrepância no dia da semana do prazo. A data numérica 24/05/2026 foi preservada.",
    },
    calls: [
      {
        name: "Competição de curtas infantis — escopo territorial conflitante",
        slug: "curtas-infantis",
        formats: ["curta"],
        genres: allLanguages,
        languages: allLanguages,
        audiences: ["infantil", "juvenil"],
        maxMinutes: 20,
        maxSeconds: 1200,
        pf: "não confirmado",
        pj: "não confirmado",
        premiere: "estadual",
        premiereRequirement: "obrigatória",
        premiereTerritory: "Santa Catarina",
        premiereConditions: "Não pode ter sido lançado anteriormente em Santa Catarina.",
        online: "restrito",
        onlineConditions:
          "Selecionados podem ser exibidos no canal/plataforma parceira da mostra; histórico online anterior não é esclarecido.",
        territoriesConfirmed: false,
        restrictions:
          "Curta de qualquer gênero para crianças/jovens, até 20 minutos; responsável deve deter direitos. A página conflita ao chamar a inscrição de internacional e a competição de nacional.",
        deadlines: [
          deadline("final", "2026-05-24", "", rules.id, "prazo final; dia da semana conflitante no texto"),
        ],
        fees: [freeFee(rules.id)],
        platform: "https://www.mostradecinemainfantil.com.br/inscricoes/",
        rulesUrl,
        confidence: "parcial",
        sourceIds: [rules.id, landing.id],
      },
    ],
    coverage: statuses(
      {
        localização: "Florianópolis e Grande Florianópolis confirmadas no regulamento.",
        atividade: "25ª edição realizada em outubro de 2026.",
        duração: "Curtas de até 20 minutos.",
        estreia: "Ineditismo em Santa Catarina.",
        "exibição online": "Janela online/streaming dos selecionados é prevista; histórico anterior não esclarecido.",
        "pessoa autorizada a inscrever": "Responsável/diretor/titular dos direitos; natureza PF/PJ não distinguida.",
        taxas: "Inscrição gratuita.",
        encerramento: "Data numérica publicada: 24 de maio de 2026.",
        realização: "9 a 17 de outubro de 2026.",
        relevância: "25 edições e especialização infantil documentadas.",
      },
      {
        "produção/conclusão": "Ano ou data de conclusão não localizado.",
        abertura: "Data exata de abertura não localizada.",
      },
      {
        categorias: "Título da página diz inscrição internacional, mas o item 3.1 define Competição Nacional.",
        "elegibilidade territorial": "Escopo nacional/internacional conflitante no mesmo regulamento.",
      },
    ),
    relevance: {
      scores: [20, 14, 11, 20, 13],
      range: [70, 84],
      impact: "especializado",
      rationale:
        "Vinte e cinco edições e dedicação contínua ao público infantil sustentam alta relevância especializada, com conflito documental na chamada.",
      evidence: [
        "Vinte e cinco edições de curadoria infantil.",
        "Sessões presenciais, itinerância e canal online ampliam o alcance.",
        "Premiações e circulação educativa geram oportunidades específicas.",
        "Alta importância no circuito audiovisual infantil brasileiro.",
        "Regulamento atual disponível, mas com conflitos internos registrados.",
      ],
    },
  });
}

// forumdoc.bh — 30ª edição, 2026.
{
  const id = "festival-022";
  const callPage = makeSource(
    `${id}-source-call-2026`,
    "https://www.forumdoc.org.br/noticias/inscricoes-forumdoc-bh-2026",
    "Inscrições forumdoc.bh 2026 (encerradas)",
    "30ª edição / 2026",
    "Página oficial da chamada encerrada",
    ["location", "activity", "categories", "formats", "productionYear", "countries", "eventDates"],
    {
      confidence: "parcial",
      note: "A página oficial atual foi lida integralmente, mas não publica regulamento, datas de inscrição, taxa, duração por faixa, estreia ou pessoa autorizada.",
    },
  );
  const history = makeSource(
    `${id}-source-history-2025`,
    "https://www.forumdoc.org.br/ensaios/territorios-da-intimidade-no-documentario-brasileiro-contemporaneo",
    "Territórios da intimidade no documentário brasileiro contemporâneo",
    "29ª edição / 2025",
    "Inscrições e curadoria da edição anterior",
    ["programmingReach", "relevance"],
    {
      type: "oficial",
      confidence: "edição anterior",
      evidenceState: "confirmado em edição anterior",
      note: "Usada apenas para contextualizar alcance: 433 inscrições brasileiras em 2025; não fornece regras de 2026.",
    },
  );
  applyFestival({
    id,
    sources: [callPage, history],
    locations: [
      location(id, 1, "Belo Horizonte", "MG", "Minas Gerais", "3106200", [
        callPage.id,
      ]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival dedicado ao filme documentário e etnográfico, com mostras brasileiras e internacionais, debates e acervo.",
      genres: ["documentário"],
      languages: ["documentário"],
      workTypes: ["filme"],
    },
    seasonality: {
      opening: {
        months: [],
        evidenceYears: [],
        confidence: "desconhecida",
        note: "Datas da chamada 2026 não foram publicadas na página acessível.",
      },
      event: {
        months: [11],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição 2026 de 19 a 29 de novembro.",
      },
    },
    edition: {
      number: "30",
      start: "2026-11-19",
      end: "2026-11-29",
      opening: "",
      closing: "",
      resultDate: "",
      status: "planejada",
      rulesUrl: callPage.url,
      confidence: "parcial",
      notes:
        "Página oficial confirma a chamada encerrada, escopo brasileiro, anos de conclusão e datas do evento. Regulamento integral não foi publicado/localizado.",
    },
    calls: [
      {
        name: "Mostra Contemporânea Brasileira",
        slug: "contemporanea-brasileira",
        formats: ["curta", "média", "longa", "experimental", "outro"],
        genres: ["documentário"],
        languages: ["documentário"],
        minYear: 2025,
        maxYear: 2026,
        countries: ["Brasil"],
        territoriesConfirmed: true,
        restrictions:
          "Produções e coproduções brasileiras de qualquer duração e formato, concluídas em 2025 ou 2026.",
        submissionMode: "aberta",
        rulesUrl: callPage.url,
        confidence: "parcial",
        sourceIds: [callPage.id],
        notes:
          "Datas, taxa, estreia, histórico online, natureza do proponente e regras integrais não constam da página oficial disponível.",
      },
    ],
    coverage: statuses(
      {
        localização: "Belo Horizonte/MG confirmada na página oficial.",
        atividade: "30ª edição anunciada para novembro de 2026.",
        categorias: "Mostra Contemporânea Brasileira confirmada; demais mostras são de programação/curadoria.",
        duração: "A chamada aceita qualquer duração.",
        "elegibilidade territorial": "Produções e coproduções brasileiras.",
        "produção/conclusão": "Concluídas em 2025 ou 2026.",
        realização: "19 a 29 de novembro de 2026.",
        relevância: "30 edições e volume da edição anterior documentados.",
      },
      {
        estreia: "Não localizada na página oficial atual.",
        "exibição online": "Não localizada na página oficial atual.",
        "pessoa autorizada a inscrever": "Não localizada na página oficial atual.",
        taxas: "Não localizadas na página oficial atual.",
        abertura: "Data não publicada na página acessível.",
        encerramento: "Data não publicada na página acessível.",
      },
    ),
    relevance: {
      scores: [24, 14, 10, 20, 12],
      range: [72, 87],
      impact: "especializado",
      confidence: "baixa",
      rationale:
        "Trinta edições e dedicação ao documentário/filme etnográfico sustentam relevância muito alta especializada, com lacunas na chamada atual.",
      evidence: [
        "Trinta edições de curadoria documental e etnográfica.",
        "A edição anterior recebeu 433 inscrições brasileiras e selecionou dezenas de obras.",
        "Fórum de debates, ensaios, catálogos e acervo ampliam a circulação crítica.",
        "Centralidade no circuito brasileiro de documentário e cinema etnográfico.",
        "Edição atual confirmada, mas regulamento e calendário da chamada não publicados.",
      ],
    },
  });
}

// Goiânia Mostra Curtas — 24ª edição, 2026.
{
  const id = "festival-023";
  const news = makeSource(
    `${id}-source-call-2026`,
    "https://agencia.go.gov.br/goiania-mostra-curtas-abre-periodo-de-inscricoes/",
    "Goiânia Mostra Curtas abre período de inscrições",
    "24ª edição / 2026",
    "Comunicado oficial da chamada",
    ["location", "activity", "categories", "formats", "duration", "productionYear", "countries", "deadlines", "eventDates", "relevance"],
    {
      confidence: "parcial",
      note: "Comunicado oficial lido; o site próprio/regulamento integral não ficou acessível. Taxa, estreia, online e pessoa autorizada não foram inferidos.",
    },
  );
  applyFestival({
    id,
    sources: [news],
    locations: [
      location(id, 1, "Goiânia", "GO", "Goiás", "5208707", [news.id]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival dedicado ao curta-metragem brasileiro com recortes nacional, goiano, universitário e infantil.",
      languages: allLanguages,
      workTypes: ["filme"],
    },
    seasonality: {
      opening: {
        months: [6],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Chamada observada em junho; data exata de abertura não foi confirmada no regulamento integral.",
      },
      event: {
        months: [10],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição realizada de 6 a 11 de outubro de 2026.",
      },
    },
    edition: {
      number: "24",
      start: "2026-10-06",
      end: "2026-10-11",
      opening: "",
      closing: "2026-06-23",
      resultDate: "",
      status: "realizada",
      rulesUrl: news.url,
      confidence: "parcial",
      notes:
        "Comunicado oficial atual estruturado. Regulamento integral não recuperado; campos ausentes permanecem não localizados.",
    },
    calls: [
      ["Curta Mostra Brasil", "brasil", [], ["geral"], []],
      ["Curta Mostra Goiás", "goias", ["GO"], ["geral"], []],
      ["Curta Mostra Origens — universitária", "origens", ["GO"], ["geral"], ["universitário"]],
      ["23ª Mostrinha — infantil", "mostrinha", [], ["infantil"], []],
    ].map(([name, slug, regions, audiences, participationConditions]) => ({
      name,
      slug,
      formats: ["curta"],
      genres: allLanguages,
      languages: allLanguages,
      audiences,
      participationConditions,
      maxMinutes: 25,
      maxSeconds: 1500,
      minYear: 2025,
      countries: ["Brasil"],
      regions,
      territoriesConfirmed: true,
      restrictions:
        "Curta de qualquer gênero, concluído a partir de janeiro de 2025; condições específicas de cada recorte aguardam o regulamento integral.",
      deadlines: [
        deadline("final", "2026-06-23", "", news.id, "prazo final"),
      ],
      platform: "https://www.goianiamostracurtas.com.br",
      rulesUrl: news.url,
      confidence: "parcial",
      sourceIds: [news.id],
    })),
    coverage: statuses(
      {
        localização: "Goiânia/GO e Teatro Goiânia confirmados.",
        atividade: "24ª edição realizada em outubro de 2026.",
        categorias: "Brasil, Goiás, Origens universitária e Mostrinha infantil.",
        duração: "Curtas de até 25 minutos.",
        "elegibilidade territorial": "Produção brasileira com recortes goiano e universitário local.",
        "produção/conclusão": "Conclusão a partir de janeiro de 2025.",
        encerramento: "23 de junho de 2026.",
        realização: "6 a 11 de outubro de 2026.",
        relevância: "24 edições e posição territorial documentadas em comunicado oficial.",
      },
      {
        estreia: "Não localizada sem o regulamento integral.",
        "exibição online": "Não localizada sem o regulamento integral.",
        "pessoa autorizada a inscrever": "Não localizada sem o regulamento integral.",
        taxas: "A programação é gratuita ao público, mas a taxa de inscrição não foi confirmada.",
        abertura: "Data exata de abertura não confirmada no documento recuperado.",
      },
    ),
    relevance: {
      scores: [19, 12, 10, 18, 13],
      range: [63, 79],
      impact: "regional/local",
      confidence: "baixa",
      rationale:
        "Vinte e quatro edições e recortes brasileiro/goiano/universitário/infantil sustentam relevância alta territorial.",
      evidence: [
        "Vinte e quatro edições dedicadas ao curta-metragem.",
        "Quatro mostras e programação no Teatro Goiânia.",
        "Ações formativas e universitárias ampliam oportunidades locais.",
        "Importância para a circulação de curtas em Goiás.",
        "Comunicado atual disponível; regulamento integral inacessível.",
      ],
    },
  });
}

// FAM — Florianópolis Audiovisual Mercosul, 30ª edição, 2026.
{
  const id = "festival-024";
  const site = makeSource(
    `${id}-source-site-2026`,
    "https://www.famdetodos.com.br/home",
    "Site oficial do FAM 2026",
    "30ª edição / 2026",
    "Edição e inscrição",
    ["location", "activity", "eventDates", "relevance"],
  );
  const rulesUrl =
    "https://drive.google.com/file/d/161OjVB49PRxfa5VO-Tpk_8VDf7-0qC1w/view?usp=sharing";
  const rules = makeSource(
    `${id}-source-regulation-2026`,
    rulesUrl,
    "Regulamento FAM 2026",
    "30ª edição / 2026",
    "Regulamento integral",
    [
      "location",
      "activity",
      "categories",
      "formats",
      "languages",
      "duration",
      "productionYear",
      "countries",
      "premiere",
      "online",
      "pf",
      "pj",
      "opening",
      "deadlines",
      "eventDates",
      "resubmission",
      "materials",
      "relevance",
    ],
    {
      note: "PDF oficial baixado e lido integralmente. Há um erro tipográfico no quadro de datas ('FAM20256'); as datas numéricas de 2026 foram preservadas. O documento não informa taxa de inscrição.",
    },
  );
  const countries = [
    "Argentina",
    "Bolívia",
    "Brasil",
    "Chile",
    "Colômbia",
    "Equador",
    "Paraguai",
    "Peru",
    "Uruguai",
    "Venezuela",
  ];
  const common = {
    genres: allLanguages,
    languages: allLanguages,
    minYear: 2025,
    countries,
    territoriesConfirmed: true,
    opening: "2026-03-31",
    deadlines: [
      deadline("final", "2026-06-17", "", rules.id, "prazo final"),
    ],
    platform: "https://panvision.com.br",
    rulesUrl,
    sourceIds: [rules.id],
    restrictions:
      "Obra de país membro do Mercosul ou associado hispanofalante aceito, finalizada a partir de 2025. Work in progress de som/cor/mix é aceito na inscrição. Obras brasileiras precisam de LSE.",
  };
  applyFestival({
    id,
    sources: [site, rules],
    locations: [
      location(id, 1, "Florianópolis", "SC", "Santa Catarina", "4205407", [
        site.id,
        rules.id,
      ]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival audiovisual do Mercosul com mostras de curtas, longas, videoclipes, público infantojuvenil e obras online.",
      languages: allLanguages,
      workTypes: ["filme", "videoclipe", "outro"],
      platforms: ["Panvision", "Vimeo", "YouTube"],
    },
    seasonality: {
      opening: {
        months: [3, 4, 5, 6],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Chamada 2026 de março a junho.",
      },
      event: {
        months: [9],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição realizada de 3 a 9 de setembro de 2026.",
      },
    },
    edition: {
      number: "30",
      start: "2026-09-03",
      end: "2026-09-09",
      opening: "2026-03-31",
      closing: "2026-06-17",
      resultDate: "2026-08-03",
      status: "realizada",
      rulesUrl,
      confidence: "confirmado",
      notes:
        "Regulamento integral lido. Selecionados autorizam arquivo Panvision e possível Circuito FAM; taxa de inscrição não foi declarada.",
    },
    calls: [
      {
        ...common,
        name: "Mostra Curtas",
        slug: "curtas",
        formats: ["curta"],
        maxMinutes: 15,
        maxSeconds: 900,
      },
      {
        ...common,
        name: "Mostra Longas",
        slug: "longas",
        formats: ["longa"],
        minMinutes: 70,
        minSeconds: 4200,
        minInclusive: false,
      },
      {
        ...common,
        name: "Mostra Videoclipe",
        slug: "videoclipe",
        formats: ["outro"],
        workTypes: ["videoclipe"],
        themes: ["música"],
        restrictions: `${common.restrictions} Duração correspondente à música.` ,
      },
      {
        ...common,
        name: "Mostra Infantojuvenil",
        slug: "infantojuvenil",
        formats: ["curta"],
        maxMinutes: 15,
        maxSeconds: 900,
        audiences: ["infantil", "juvenil"],
      },
      {
        ...common,
        name: "Mostra On-line",
        slug: "online",
        formats: ["curta", "média", "longa", "outro"],
        online: "permitido",
        onlineConditions: "Mostra concebida para exibição online; duração livre.",
      },
      {
        ...common,
        name: "Mostra Catarinense — curtas",
        slug: "catarinense",
        formats: ["curta"],
        maxMinutes: 15,
        maxSeconds: 900,
        countries: ["Brasil"],
        regions: ["SC"],
        premiere: "nacional",
        premiereRequirement: "obrigatória",
        premiereTerritory: "Brasil",
        premiereConditions: "Exige estreia nacional.",
      },
    ],
    coverage: statuses(
      {
        localização: "Florianópolis/SC confirmada no regulamento.",
        atividade: "30ª edição realizada em setembro de 2026.",
        categorias: "Curtas, longas, videoclipes, infantojuvenil, online e catarinense separados.",
        duração: "Faixas específicas confirmadas por mostra.",
        "elegibilidade territorial": "Países do Mercosul e associados hispanofalantes listados.",
        "produção/conclusão": "Finalização a partir de 2025; WIP técnico aceito.",
        estreia: "Obrigatória somente para curtas catarinenses; desejável em outras mostras.",
        "exibição online": "Mostra online própria e autorização de circulação registradas.",
        "pessoa autorizada a inscrever": "Responsável pelos direitos; natureza PF/PJ não distinguida.",
        abertura: "31 de março de 2026.",
        encerramento: "17 de junho de 2026.",
        realização: "3 a 9 de setembro de 2026.",
        relevância: "30 edições, alcance Mercosul e atividades de mercado/formação documentadas.",
      },
      {
        taxas: "O regulamento integral não informa taxa nem declara gratuidade.",
      },
    ),
    relevance: {
      scores: [22, 16, 18, 18, 14],
      range: [82, 93],
      impact: "internacional amplo",
      rationale:
        "Trinta edições consecutivas, alcance Mercosul e atividades de mercado/formação sustentam relevância muito alta.",
      evidence: [
        "Trinta edições consecutivas e mais de 2.500 filmes historicamente exibidos.",
        "Mais de 260 mil pessoas no histórico informado pelo regulamento.",
        "ECM+LAB e atividades de formação/mercado conectam projetos e profissionais.",
        "Importância para a integração audiovisual do Mercosul.",
        "Regulamento atual integral e cronograma completo, exceto taxa.",
      ],
    },
  });
}

// Fest Aruanda — 21ª edição, 2026.
{
  const id = "festival-025";
  const rulesUrl =
    "https://festaruanda.com.br/sistema/uploads/arquivos/regulamento/regulamento-festaruanda.pdf";
  const rules = makeSource(
    `${id}-source-regulation-2026`,
    rulesUrl,
    "Regulamento do 21º Fest Aruanda",
    "21ª edição / 2026",
    "Regulamento oficial",
    [
      "location",
      "activity",
      "categories",
      "formats",
      "duration",
      "productionYear",
      "countries",
      "fees",
      "opening",
      "deadlines",
      "eventDates",
      "materials",
    ],
    {
      confidence: "parcial",
      note: "O PDF oficial atual foi indexado e seus itens de inscrição foram lidos; a ferramenta retornou erro ao abrir o arquivo completo, portanto estreia, online e disposições finais permanecem não localizadas.",
    },
  );
  const news = makeSource(
    `${id}-source-call-2026`,
    "https://mail.festaruanda.com.br/noticias/fest-aruanda-ano-21-abre-inscricoes-para-curtas-e-longas-",
    "Fest Aruanda ano 21 abre inscrições",
    "21ª edição / 2026",
    "Comunicado oficial da chamada",
    ["activity", "categories", "formats", "duration", "fees", "opening", "deadlines", "eventDates", "relevance"],
  );
  const presentation = makeSource(
    `${id}-source-presentation-2026`,
    "https://mail.festaruanda.com.br/apresentacao",
    "Apresentação do 21º Fest Aruanda",
    "21ª edição / 2026",
    "Histórico e perfil",
    ["activity", "location", "categories", "relevance"],
  );
  const common = {
    genres: allLanguages,
    languages: allLanguages,
    minYear: 2025,
    maxYear: 2026,
    countries: ["Brasil"],
    territoriesConfirmed: true,
    opening: "2026-04-02",
    deadlines: [
      deadline("final", "2026-07-02", "23:59", news.id, "prazo final"),
    ],
    fees: [freeFee(news.id)],
    platform: "https://www.festaruanda.com.br/inscricao",
    rulesUrl,
    confidence: "parcial",
    sourceIds: [rules.id, news.id],
    restrictions:
      "Obra finalizada entre julho de 2025 e julho de 2026; até dois trabalhos por realizador em cada categoria.",
  };
  applyFestival({
    id,
    sources: [rules, news, presentation],
    locations: [
      location(id, 1, "João Pessoa", "PB", "Paraíba", "2507507", [
        rules.id,
        news.id,
      ]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      description:
        "Festival brasileiro e internacional realizado em João Pessoa, com competições nacionais, nordestinas e universitárias.",
      languages: allLanguages,
      workTypes: ["filme", "videoclipe", "outro"],
    },
    seasonality: {
      opening: {
        months: [4, 5, 6, 7],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Chamada 2026 de abril a julho.",
      },
      event: {
        months: [12],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição prevista de 2 a 10 de dezembro de 2026.",
      },
    },
    edition: {
      number: "21",
      start: "2026-12-02",
      end: "2026-12-10",
      opening: "2026-04-02",
      closing: "2026-07-02",
      resultDate: "",
      status: "planejada",
      rulesUrl,
      confidence: "parcial",
      notes:
        "Regulamento oficial atual parcialmente indexado e comunicado integral lido. Itens não recuperados do PDF permanecem não localizados.",
    },
    calls: [
      {
        ...common,
        name: "Curtas-metragens nacionais",
        slug: "curtas-nacionais",
        formats: ["curta"],
        maxMinutes: 15,
        maxSeconds: 900,
      },
      {
        ...common,
        name: "Longas-metragens nacionais",
        slug: "longas-nacionais",
        formats: ["longa"],
      },
      {
        ...common,
        name: "Sob o Céu Nordestino",
        slug: "nordestino",
        formats: ["curta", "longa"],
        regions: ["Nordeste"],
        restrictions: `${common.restrictions} Curtas paraibanos e longas da região Nordeste; curtas têm máximo de 15 minutos.`,
      },
      {
        ...common,
        name: "TV Universitária",
        slug: "tv-universitaria",
        formats: ["curta", "outro"],
        workTypes: ["filme", "série/episódio", "outro"],
        participationConditions: ["universitário"],
        restrictions: `${common.restrictions} Produções de emissoras universitárias brasileiras nas categorias reportagem, interprograma, documentário e programa de TV.`,
      },
      {
        ...common,
        name: "TCC audiovisual — Paraíba",
        slug: "tcc-pb",
        formats: ["curta", "outro"],
        participationConditions: ["universitário"],
        regions: ["PB"],
        restrictions: `${common.restrictions} Exclusiva a produções paraibanas de TCC audiovisual.`,
      },
      {
        ...common,
        name: "Videoclipe — Paraíba",
        slug: "videoclipe-pb",
        formats: ["outro"],
        workTypes: ["videoclipe"],
        themes: ["música"],
        regions: ["PB"],
        restrictions: `${common.restrictions} Exclusiva a produções paraibanas.`,
      },
    ],
    coverage: statuses(
      {
        localização: "João Pessoa/PB, Cinépolis Manaíra e Praia de Tambaú confirmados.",
        atividade: "21ª edição anunciada para dezembro de 2026.",
        categorias: "Longa, curta, Nordeste, TV universitária, TCC e videoclipe publicados.",
        duração: "Curtas até 15 minutos; demais faixas não publicadas no trecho recuperado.",
        "elegibilidade territorial": "Brasil, Nordeste e Paraíba separados por categoria.",
        "produção/conclusão": "Finalização entre julho de 2025 e julho de 2026.",
        taxas: "Inscrições gratuitas.",
        abertura: "2 de abril de 2026.",
        encerramento: "2 de julho de 2026 às 23h59.",
        realização: "2 a 10 de dezembro de 2026.",
        relevância: "21 edições e importância territorial documentadas.",
      },
      {
        estreia: "Não localizada no conteúdo integralmente recuperado.",
        "exibição online": "Não localizada no conteúdo integralmente recuperado.",
        "pessoa autorizada a inscrever": "Realizador citado, sem distinção PF/PJ.",
      },
    ),
    relevance: {
      scores: [18, 13, 12, 17, 13],
      range: [65, 81],
      impact: "nacional",
      confidence: "baixa",
      rationale:
        "Vinte e uma edições, competições nacionais/nordestinas e expansão em espaços públicos sustentam relevância alta.",
      evidence: [
        "Vinte e uma edições desde 2005.",
        "Programação em cinema comercial e praia amplia o alcance local.",
        "Parcerias universitárias e mostras de formação ampliam oportunidades.",
        "Importância para a circulação audiovisual paraibana e nordestina.",
        "Calendário atual disponível; parte do PDF não foi recuperada integralmente.",
      ],
    },
  });
}

// Guarnicê de Cinema — 49ª edição, 2026.
{
  const id = "festival-026";
  const rulesUrl =
    "https://guarnice49.ufma.br/wp-content/uploads/2026/01/Edital_49-Guarnice-2026.pdf";
  const rules = makeSource(
    `${id}-source-regulation-2026`,
    rulesUrl,
    "Edital do 49º Guarnicê de Cinema",
    "49ª edição / 2026",
    "Regulamento integral das mostras Nacional e Maranhão",
    [
      "location",
      "activity",
      "categories",
      "formats",
      "languages",
      "duration",
      "productionYear",
      "countries",
      "premiere",
      "online",
      "pf",
      "pj",
      "fees",
      "opening",
      "deadlines",
      "eventDates",
      "resubmission",
      "materials",
      "relevance",
    ],
  );
  const university = makeSource(
    `${id}-source-university-2026`,
    "https://guarnice49.ufma.br/regulamento-mostra-universitaria-de-cinema/",
    "Regulamento da Mostra Universitária de Cinema",
    "49ª edição / 2026",
    "Regulamento integral da chamada universitária",
    ["categories", "formats", "duration", "productionYear", "countries", "pf", "fees", "opening", "deadlines", "eventDates", "materials"],
  );
  const page = makeSource(
    `${id}-source-page-2026`,
    "https://guarnice49.ufma.br/edital/",
    "Editais e regulamentos do 49º Guarnicê",
    "49ª edição / 2026",
    "Página de documentos e edição",
    ["activity", "categories", "eventDates", "relevance"],
  );
  const mainCommon = {
    genres: allLanguages,
    languages: allLanguages,
    minYear: 2024,
    countries: ["Brasil"],
    territoriesConfirmed: true,
    pf: "sim",
    pj: "não confirmado",
    resubmission: "não",
    restrictions:
      "Obra brasileira finalizada a partir de julho de 2024; realizador com 18 anos ou mais; não aceita publicidade/institucional nem obra já inscrita em edição anterior.",
    opening: "2026-01-20",
    deadlines: [
      deadline("final", "2026-02-22", "", rules.id, "prazo final"),
    ],
    fees: [freeFee(rules.id)],
    platform: "https://guarnice49.ufma.br/edital/",
    rulesUrl,
    sourceIds: [rules.id, page.id],
  };
  applyFestival({
    id,
    sources: [rules, university, page],
    locations: [
      location(id, 1, "São Luís", "MA", "Maranhão", "2111300", [rules.id]),
    ],
    festival: {
      activity: "ativo",
      frequency: "anual",
      organizer: "Universidade Federal do Maranhão",
      description:
        "Festival universitário e nacional realizado em São Luís, com mostras nacional, maranhense e universitária.",
      languages: allLanguages,
      workTypes: ["filme", "videoclipe"],
      platforms: ["Portal Guarnicê"],
    },
    seasonality: {
      opening: {
        months: [1, 2, 4, 5],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Chamada principal em janeiro/fevereiro e universitária em abril/maio.",
      },
      event: {
        months: [7],
        evidenceYears: [2026],
        confidence: "baixa",
        note: "Edição híbrida realizada de 9 a 16 de julho de 2026.",
      },
    },
    edition: {
      number: "49",
      start: "2026-07-09",
      end: "2026-07-16",
      opening: "2026-01-20",
      closing: "2026-05-15",
      resultDate: "",
      status: "realizada",
      rulesUrl,
      confidence: "confirmado",
      notes:
        "Regulamentos principal e universitário lidos integralmente. A data de fechamento da edição usa a chamada universitária mais tardia; cada chamada mantém seu próprio prazo.",
    },
    calls: [
      {
        ...mainCommon,
        name: "Mostra Competitiva Nacional — curtas",
        slug: "nacional-curta",
        formats: ["curta"],
        maxMinutes: 30,
        maxSeconds: 1800,
        creditsIncluded: true,
      },
      {
        ...mainCommon,
        name: "Mostra Competitiva Nacional — longas",
        slug: "nacional-longa",
        formats: ["longa"],
        minMinutes: 70,
        minSeconds: 4200,
        creditsIncluded: true,
      },
      {
        ...mainCommon,
        name: "Mostra Competitiva Maranhão — curtas",
        slug: "maranhao-curta",
        formats: ["curta"],
        maxMinutes: 30,
        maxSeconds: 1800,
        creditsIncluded: true,
        regions: ["MA"],
        restrictions: `${mainCommon.restrictions} Deve ser realizado no Maranhão, sobre o estado e por realizador maranhense conforme os critérios do edital.`,
      },
      {
        ...mainCommon,
        name: "Mostra Competitiva Maranhão — longas",
        slug: "maranhao-longa",
        formats: ["longa"],
        minMinutes: 50,
        minSeconds: 3000,
        creditsIncluded: true,
        regions: ["MA"],
        restrictions: `${mainCommon.restrictions} Deve ser realizado no Maranhão, sobre o estado e por realizador maranhense conforme os critérios do edital.`,
      },
      {
        ...mainCommon,
        name: "Mostra Competitiva Maranhão — videoclipe",
        slug: "maranhao-videoclipe",
        formats: ["outro"],
        workTypes: ["videoclipe"],
        themes: ["música"],
        regions: ["MA"],
        restrictions: `${mainCommon.restrictions} Videoclipe vinculado à produção maranhense conforme os critérios territoriais do edital.`,
      },
      {
        name: "Mostra Universitária de Cinema",
        slug: "universitaria",
        formats: ["curta"],
        genres: ["ficção", "documentário"],
        languages: ["ficção", "documentário"],
        maxMinutes: 30,
        maxSeconds: 1800,
        minYear: 2024,
        countries: ["Brasil"],
        regions: ["MA"],
        territoriesConfirmed: true,
        pf: "sim",
        pj: "não confirmado",
        participationConditions: ["universitário"],
        restrictions:
          "Curta de ficção ou documentário finalizado a partir de julho de 2024; até dois por pessoa; ao menos uma função criativa central deve ser de estudante vinculado a instituição/curso do Maranhão.",
        opening: "2026-04-15",
        deadlines: [
          deadline("final", "2026-05-15", "", university.id, "prazo final"),
        ],
        fees: [freeFee(university.id)],
        platform: "https://guarnice49.ufma.br/regulamento-mostra-universitaria-de-cinema/",
        rulesUrl: university.url,
        sourceIds: [university.id],
      },
    ],
    coverage: statuses({
      localização: "São Luís/MA confirmada nos regulamentos.",
      atividade: "49ª edição híbrida realizada em julho de 2026.",
      categorias: "Nacional, Maranhão e Universitária estruturadas por formato.",
      duração: "Nacional: curta até 30, longa a partir de 70; Maranhão longa a partir de 50; universitária até 30.",
      "elegibilidade territorial": "Brasil, Maranhão e estudantes vinculados ao estado têm chamadas próprias.",
      "produção/conclusão": "Finalização a partir de julho de 2024.",
      estreia: "Nenhuma exigência de estreia localizada; não foi fabricada.",
      "exibição online": "Edição híbrida; histórico online anterior não é vedado no edital.",
      "pessoa autorizada a inscrever": "Realizadores maiores de 18 anos; PJ não especificada.",
      taxas: "Inscrições gratuitas nas chamadas principal e universitária.",
      abertura: "Principal em 20/1 e universitária em 15/4/2026.",
      encerramento: "Principal em 22/2 e universitária em 15/5/2026.",
      realização: "9 a 16 de julho de 2026.",
      relevância: "49 edições, vínculo universitário e circulação nacional documentados.",
    }),
    relevance: {
      scores: [24, 15, 13, 19, 14],
      range: [80, 91],
      impact: "nacional",
      rationale:
        "Quarenta e nove edições e vínculo com a UFMA sustentam relevância muito alta histórica, nacional e territorial.",
      evidence: [
        "Quarenta e nove edições documentam longa continuidade curatorial.",
        "Mostras nacional, maranhense e universitária ampliam o alcance.",
        "Seminários, formação e circulação conectam realizadores e universidade.",
        "Alta importância para o cinema maranhense e universitário brasileiro.",
        "Dois regulamentos atuais completos e calendário transparente.",
      ],
    },
  });
}

db.settings.catalogVersion = "2026-10-04.3";
fs.writeFileSync(catalogPath, `${JSON.stringify(db, null, 2)}\n`);
console.log(
  `BR-01 aplicado: 20 festivais; catálogo ${db.settings.catalogVersion}; ${db.calls.length} chamadas.`,
);
