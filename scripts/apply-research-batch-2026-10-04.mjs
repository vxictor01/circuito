import fs from "node:fs";

const path = new URL("../src/data/catalog.json", import.meta.url);
const db = JSON.parse(fs.readFileSync(path, "utf8"));
const checkedAt = "2026-10-04";
const allLanguages = [
  "documentário",
  "ficção",
  "animação",
  "experimental",
  "híbrido",
];

const source = (id, url, title, editionLabel, section, fields, note = "") => ({
  id,
  url,
  title,
  type: "oficial",
  checkedAt,
  accessedAt: checkedAt,
  confidence: "confirmado",
  evidenceState: "confirmado na edição atual",
  editionLabel,
  section,
  note,
  fields,
});

const coverage = (festival, statuses) => {
  for (const [field, entry] of Object.entries(statuses))
    festival.researchCoverage[field] = {
      status: entry.status,
      note: entry.note,
      sourceIds: entry.sourceIds,
    };
};

const relevance = (festival, config) => {
  festival.relevance = {
    status: "provisória",
    score: Object.values(config.dimensions).reduce(
      (sum, item) => sum + item.score,
      0,
    ),
    uncertaintyMin: config.uncertaintyMin,
    uncertaintyMax: config.uncertaintyMax,
    band: config.band,
    impact: config.impact,
    confidence: "média",
    assessedAt: checkedAt,
    rationale: config.rationale,
    dimensions: config.dimensions,
  };
};

const baseCall = (call, sourceId) => ({
  ...call,
  genres: [...allLanguages],
  workTypes: ["filme"],
  languages: [...allLanguages],
  approaches: [],
  contentGenres: [],
  themes: [],
  audiences: ["geral"],
  participationConditions: [],
  genresConfirmed: true,
  submissionMode: "aberta",
  selectionType: "competitiva",
  minMinutes: null,
  minSeconds: null,
  minInclusive: true,
  maxInclusive: true,
  creditsIncluded: null,
  pf: "não confirmado",
  pj: "não confirmado",
  online: "não confirmado",
  onlineConditions: "",
  deadlines: [],
  fees: [
    {
      amount: null,
      currency: "BRL",
      free: "não confirmado",
      deadlineKind: "final",
      discount: "",
      waiver: "",
      notes: "Valor de inscrição não localizado na fonte consultada.",
      appliesTo: [],
      platformAmount: null,
      sourceId,
    },
  ],
  checkedAt,
  confidence: "confirmado",
});

// Festival de Brasília — 59ª edição, 2026.
{
  const festival = db.festivals.find((item) => item.id === "festival-001");
  const edition = db.editions.find((item) => item.festivalId === festival.id);
  const oldCall = db.calls.find((item) => item.editionId === edition.id);
  const rulesUrl = "https://festcinebrasilia.com.br/inscricoes/";
  const rulesSource = source(
    "festival-001-source-regulation-2026",
    rulesUrl,
    "Regulamentos e inscrições do 59º Festival de Brasília",
    "59ª edição / 2026",
    "Regulamento da seleção e edital do 28º Troféu Câmara Legislativa",
    [
      "location",
      "activity",
      "formats",
      "languages",
      "duration",
      "productionYear",
      "countries",
      "regions",
      "pf",
      "pj",
      "premiere",
      "opening",
      "deadlines",
      "eventDates",
      "resubmission",
    ],
    "A página reúne duas chamadas distintas. Há um lapso textual que menciona a 58ª edição no passo de inscrição, mas datas, título, contexto e demais itens identificam a 59ª edição de 2026.",
  );
  const reachSource = source(
    "festival-001-source-program-2026",
    "https://festcinebrasilia.com.br/59-fbcb-informacoes-praticas/",
    "Informações práticas e balanço de programação da 59ª edição",
    "59ª edição / 2026",
    "Programação, inscrições, seleção e Ambiente de Mercado",
    ["relevance", "programmingReach", "industryOpportunities", "activity"],
  );
  festival.sources = [rulesSource, reachSource];
  festival.activity = "ativo";
  festival.frequency = "anual";
  festival.organizer =
    "Secretaria de Cultura e Economia Criativa do DF e Instituto Alvorada Brasil";
  festival.languages = [...allLanguages];
  festival.workTypes = ["filme"];
  festival.audiences = ["geral"];
  festival.description =
    "Festival dedicado ao cinema brasileiro, com mostras competitivas nacionais e a Mostra Brasília.";
  festival.locations[0] = {
    ...festival.locations[0],
    subdivisionName: "Distrito Federal",
    municipalityCode: "5300108",
    confirmed: true,
    sourceIds: [rulesSource.id],
  };
  festival.seasonality.event = {
    months: [9],
    evidenceYears: [2026],
    confidence: "baixa",
    note: "Baseada apenas na realização confirmada da 59ª edição; não substitui datas futuras.",
  };
  edition.number = "59";
  edition.start = "2026-09-11";
  edition.end = "2026-09-19";
  edition.opening = "2026-03-25";
  edition.closing = "2026-05-24";
  edition.status = "realizada";
  edition.rulesUrl = rulesUrl;
  edition.checkedAt = checkedAt;
  edition.confidence = "confirmado";
  edition.notes =
    "Regras nacionais e da Mostra Brasília foram mantidas em chamadas separadas. Taxa de inscrição não localizada na página oficial consultada.";
  edition.sources = [
    { ...rulesSource, id: "festival-001-edition-2026-source-regulation" },
  ];
  const callSource = {
    ...rulesSource,
    id: "festival-001-call-source-regulation-2026",
  };
  const common = baseCall(oldCall, callSource.id);
  const deadline = {
    kind: "final",
    date: "2026-05-24",
    time: "",
    timezone: "America/Sao_Paulo",
    confirmed: true,
    originalLabel: "encerramento das inscrições",
    sourceId: callSource.id,
    supersedes: "",
  };
  const national = {
    ...common,
    id: oldCall.id,
    name: "Mostra Competitiva Nacional — curta-metragem",
    formats: ["curta"],
    maxMinutes: 30,
    maxSeconds: 1800,
    creditsIncluded: null,
    minYear: 2025,
    maxYear: 2026,
    pf: "sim",
    pj: "sim",
    premiere: "preferência",
    premiereRequirement: "preferencial",
    premiereTerritory: "Brasil",
    premiereConditions:
      "O regulamento informa preferência por obras inéditas no Brasil, sem tornar a estreia requisito absoluto.",
    countries: ["Brasil"],
    regions: [],
    territoriesConfirmed: true,
    restrictions:
      "Obra brasileira, finalizada em 2025 ou 2026, com até 30 minutos. Obras inscritas em edições anteriores não são consideradas.",
    resubmission: "não",
    opening: "2026-03-25",
    deadlines: [deadline],
    rulesUrl,
    notes:
      "O documento autoriza inscrição por pessoas físicas e jurídicas. O horário-limite não foi publicado na fonte consultada.",
    sources: [callSource],
  };
  const nationalLong = {
    ...structuredClone(national),
    id: `${edition.id}-call-national-long`,
    name: "Mostra Competitiva Nacional — longa-metragem",
    formats: ["longa"],
    minMinutes: 60,
    minSeconds: 3600,
    minInclusive: false,
    maxMinutes: null,
    maxSeconds: null,
  };
  const brasiliaShort = {
    ...structuredClone(national),
    id: `${edition.id}-call-brasilia-short`,
    name: "Mostra Brasília / Troféu Câmara — curta-metragem",
    premiere: "estadual",
    premiereTerritory: "Distrito Federal",
    premiereConditions:
      "Preferência por ineditismo no Distrito Federal; não é obrigação expressa.",
    countries: ["Brasil"],
    regions: ["DF"],
    restrictions:
      "Produção local: equipe majoritariamente nascida ou residente no DF há pelo menos dois anos, incluindo obrigatoriamente direção ou produção; produtora constituída deve ter sede no DF. Conclusão em 2025 ou 2026.",
    resubmission: "sim",
    notes:
      "Pode reinscrever obra da edição anterior se não tiver sido premiada. Consulte o edital para documentos de comprovação territorial.",
  };
  const brasiliaLong = {
    ...structuredClone(brasiliaShort),
    id: `${edition.id}-call-brasilia-long`,
    name: "Mostra Brasília / Troféu Câmara — longa-metragem",
    formats: ["longa"],
    minMinutes: 60,
    minSeconds: 3600,
    minInclusive: false,
    maxMinutes: null,
    maxSeconds: null,
  };
  db.calls = db.calls.filter((item) => item.editionId !== edition.id);
  db.calls.push(national, nationalLong, brasiliaShort, brasiliaLong);
  coverage(festival, {
    localização: {
      status: "confirmado na edição atual",
      note: "Brasília/DF confirmada no regulamento 2026.",
      sourceIds: [rulesSource.id],
    },
    atividade: {
      status: "confirmado na edição atual",
      note: "59ª edição realizada em setembro de 2026.",
      sourceIds: [rulesSource.id, reachSource.id],
    },
    categorias: {
      status: "confirmado na edição atual",
      note: "Chamadas nacional e Brasília separadas por curta e longa.",
      sourceIds: [rulesSource.id],
    },
    duração: {
      status: "confirmado na edição atual",
      note: "Curtas até 30 minutos; longas acima de 60 minutos.",
      sourceIds: [rulesSource.id],
    },
    "elegibilidade territorial": {
      status: "confirmado na edição atual",
      note: "Nacional exige obra brasileira; Mostra Brasília tem critérios locais próprios.",
      sourceIds: [rulesSource.id],
    },
    "produção/conclusão": {
      status: "confirmado na edição atual",
      note: "Obras finalizadas em 2025 ou 2026.",
      sourceIds: [rulesSource.id],
    },
    estreia: {
      status: "confirmado na edição atual",
      note: "Ineditismo é preferência, não obrigação expressa.",
      sourceIds: [rulesSource.id],
    },
    "exibição online": {
      status: "pendente",
      note: "A fonte trata de plataformas de exibição, mas não esclarece elegibilidade por histórico online anterior.",
      sourceIds: [rulesSource.id],
    },
    "pessoa autorizada a inscrever": {
      status: "confirmado na edição atual",
      note: "Pessoas físicas e jurídicas, realizadores, diretores e produtores, observadas as vedações.",
      sourceIds: [rulesSource.id],
    },
    taxas: {
      status: "não localizado",
      note: "Valor ou gratuidade da inscrição não localizado na fonte oficial consultada.",
      sourceIds: [rulesSource.id],
    },
    abertura: {
      status: "confirmado na edição atual",
      note: "25/03/2026.",
      sourceIds: [rulesSource.id],
    },
    encerramento: {
      status: "confirmado na edição atual",
      note: "24/05/2026; horário não publicado.",
      sourceIds: [rulesSource.id],
    },
    realização: {
      status: "confirmado na edição atual",
      note: "11 a 19/09/2026.",
      sourceIds: [rulesSource.id],
    },
    relevância: {
      status: "confirmado na edição atual",
      note: "Avaliação provisória baseada em fontes oficiais de 2026.",
      sourceIds: [rulesSource.id, reachSource.id],
    },
  });
  relevance(festival, {
    uncertaintyMin: 80,
    uncertaintyMax: 91,
    band: "muito alta",
    impact: "nacional",
    rationale:
      "Avaliação editorial provisória, não ranking oficial: 59 edições, recorde próximo de 2 mil inscrições, mais de 70 obras e atividades de mercado/formação sustentam alto alcance nacional; falta ampliar fontes independentes de crítica e público.",
    dimensions: {
      curatorialHistory: {
        score: 23,
        evidence:
          "59ª edição em 2026 e continuidade institucional documentada no site oficial.",
        sourceIds: [rulesSource.id],
      },
      programmingReach: {
        score: 17,
        evidence:
          "Quase 2 mil inscrições e mais de 70 produções na programação de 2026.",
        sourceIds: [reachSource.id],
      },
      industryOpportunities: {
        score: 17,
        evidence:
          "Ambiente de Mercado, Conferência do Audiovisual, debates, oficinas e cachês de seleção.",
        sourceIds: [reachSource.id],
      },
      specializedImportance: {
        score: 16,
        evidence:
          "Mostras competitivas nacionais e local voltadas à produção brasileira e candanga.",
        sourceIds: [rulesSource.id],
      },
      continuityTransparency: {
        score: 13,
        evidence:
          "Regulamentos, programação e responsáveis publicados; a página contém um lapso de numeração registrado na fonte.",
        sourceIds: [rulesSource.id, reachSource.id],
      },
    },
  });
}

// Curta Kinoforum — 37ª edição, 2026.
{
  const festival = db.festivals.find((item) => item.id === "festival-003");
  const edition = db.editions.find((item) => item.festivalId === festival.id);
  const oldCall = db.calls.find((item) => item.editionId === edition.id);
  const rulesUrl = "https://2026.kinoforum.org/sobre-o-festival/regulamento";
  const rulesSource = source(
    "festival-003-source-regulation-2026",
    rulesUrl,
    "Regulamento do 37º Curta Kinoforum",
    "37ª edição / 2026",
    "Regulamento integral",
    [
      "location",
      "activity",
      "formats",
      "languages",
      "duration",
      "creditsIncluded",
      "productionYear",
      "countries",
      "premiere",
      "online",
      "deadlines",
      "eventDates",
      "resubmission",
      "materials",
    ],
  );
  const reachSource = source(
    "festival-003-source-program-2026",
    "https://2026.kinoforum.org/",
    "Site oficial da 37ª edição",
    "37ª edição / 2026",
    "Balanço de inscrições e atividades",
    ["relevance", "programmingReach", "industryOpportunities", "activity"],
  );
  festival.sources = [rulesSource, reachSource];
  festival.activity = "ativo";
  festival.frequency = "anual";
  festival.organizer = "Associação Cultural Kinoforum";
  festival.contact = "inscricoes@kinoforum.org";
  festival.languages = [...allLanguages];
  festival.audiences = ["geral", "infantil", "juvenil"];
  festival.traveling = true;
  festival.description =
    "Festival internacional dedicado ao curta-metragem, com programas brasileiros, internacionais, latino-americanos, infantojuvenis, experimentais e atividades profissionais.";
  festival.locations[0] = {
    ...festival.locations[0],
    subdivisionName: "São Paulo",
    municipalityCode: "3550308",
    confirmed: true,
    sourceIds: [rulesSource.id],
  };
  festival.seasonality.event = {
    months: [8],
    evidenceYears: [2026],
    confidence: "baixa",
    note: "Baseada apenas na realização confirmada da 37ª edição; não substitui datas futuras.",
  };
  edition.number = "37";
  edition.start = "2026-08-20";
  edition.end = "2026-08-30";
  edition.resultDate = "2026-07-15";
  edition.status = "realizada";
  edition.rulesUrl = rulesUrl;
  edition.checkedAt = checkedAt;
  edition.confidence = "confirmado";
  edition.notes =
    "O regulamento publica prazos diferentes por ano de conclusão e programa; foram mantidos em chamadas separadas. Abertura e taxa de inscrição não foram localizadas.";
  edition.sources = [
    { ...rulesSource, id: "festival-003-edition-2026-source-regulation" },
  ];
  const callSource = {
    ...rulesSource,
    id: "festival-003-call-source-regulation-2026",
  };
  const common = {
    ...baseCall(oldCall, callSource.id),
    formats: ["curta"],
    maxMinutes: 25,
    maxSeconds: 1500,
    creditsIncluded: true,
    premiere: "nenhuma",
    premiereRequirement: "sem exigência confirmada",
    premiereTerritory: "",
    premiereConditions:
      "A estreia nacional é condição apenas do Prêmio Zita Carvalhosa, não da seleção geral.",
    countries: [],
    regions: [],
    territoriesConfirmed: true,
    restrictions:
      "Filmes de todos os gêneros, até 25 minutos incluindo créditos; WIP somente em corte final e com conclusão até 31/05/2026. Não aceita vídeos publicitários ou institucionais.",
    resubmission: "não",
    platform: "https://www.shortfilmdepot.com",
    opening: "",
    rulesUrl,
    notes:
      "A natureza PF/PJ do responsável e eventual tarifa da plataforma não são esclarecidas no regulamento. Filmes selecionados autorizam exibição online geolocalizada conforme as condições do festival.",
    sources: [callSource],
  };
  const makeDeadline = (date, label) => ({
    kind: "final",
    date,
    time: "",
    timezone: "America/Sao_Paulo",
    confirmed: true,
    originalLabel: label,
    sourceId: callSource.id,
    supersedes: "",
  });
  const calls = [
    {
      ...structuredClone(common),
      id: oldCall.id,
      name: "Curtas concluídos em 2025 — todos os programas elegíveis",
      minYear: 2025,
      maxYear: 2025,
      deadlines: [makeDeadline("2026-03-31", "filmes concluídos em 2025")],
    },
    {
      ...structuredClone(common),
      id: `${edition.id}-call-international-2026`,
      name: "Mostra Internacional — filmes concluídos em 2026",
      minYear: 2026,
      maxYear: 2026,
      territoriesConfirmed: false,
      restrictions: `${common.restrictions} Esta chamada corresponde à Mostra Internacional para filmes estrangeiros.`,
      deadlines: [
        makeDeadline("2026-04-15", "Mostra Internacional — concluídos em 2026"),
      ],
    },
    {
      ...structuredClone(common),
      id: `${edition.id}-call-latin-brazil-2026`,
      name: "Mostra Latino-Americana e Programas Brasileiros — concluídos em 2026",
      minYear: 2026,
      maxYear: 2026,
      territoriesConfirmed: false,
      restrictions: `${common.restrictions} Elegibilidade territorial depende do programa brasileiro ou latino-americano escolhido.`,
      deadlines: [
        makeDeadline(
          "2026-04-30",
          "Mostra Latino-Americana e Programas Brasileiros — concluídos em 2026",
        ),
      ],
    },
  ];
  db.calls = db.calls.filter((item) => item.editionId !== edition.id);
  db.calls.push(...calls);
  coverage(festival, {
    localização: {
      status: "confirmado na edição atual",
      note: "São Paulo/SP confirmada; o regulamento também prevê itinerâncias.",
      sourceIds: [rulesSource.id],
    },
    atividade: {
      status: "confirmado na edição atual",
      note: "37ª edição realizada em agosto de 2026.",
      sourceIds: [rulesSource.id, reachSource.id],
    },
    categorias: {
      status: "confirmado na edição atual",
      note: "Programas brasileiros, internacional, latino-americano, infantojuvenil, Limite e especiais.",
      sourceIds: [rulesSource.id],
    },
    duração: {
      status: "confirmado na edição atual",
      note: "Até 25 minutos incluindo créditos.",
      sourceIds: [rulesSource.id],
    },
    "elegibilidade territorial": {
      status: "confirmado na edição atual",
      note: "O regulamento separa programas por país de produção; listas territoriais exaustivas não foram publicadas.",
      sourceIds: [rulesSource.id],
    },
    "produção/conclusão": {
      status: "confirmado na edição atual",
      note: "Finalizados em 2025 ou 2026; WIP com conclusão até 31/05/2026.",
      sourceIds: [rulesSource.id],
    },
    estreia: {
      status: "confirmado na edição atual",
      note: "Sem exigência geral localizada; estreia nacional vale apenas para prêmio específico.",
      sourceIds: [rulesSource.id],
    },
    "exibição online": {
      status: "confirmado na edição atual",
      note: "Selecionados autorizam exibição online geolocalizada; histórico online anterior não é esclarecido.",
      sourceIds: [rulesSource.id],
    },
    "pessoa autorizada a inscrever": {
      status: "não localizado",
      note: "O regulamento fala em interessado/responsável, mas não define natureza PF/PJ.",
      sourceIds: [rulesSource.id],
    },
    taxas: {
      status: "não localizado",
      note: "Taxa ou gratuidade da inscrição não localizada; custos da plataforma não foram presumidos.",
      sourceIds: [rulesSource.id],
    },
    abertura: {
      status: "não localizado",
      note: "Data de abertura não localizada no regulamento.",
      sourceIds: [rulesSource.id],
    },
    encerramento: {
      status: "confirmado na edição atual",
      note: "Prazos de 31/03, 15/04 e 30/04 conforme ano/programa.",
      sourceIds: [rulesSource.id],
    },
    realização: {
      status: "confirmado na edição atual",
      note: "20 a 30/08/2026.",
      sourceIds: [rulesSource.id],
    },
    relevância: {
      status: "confirmado na edição atual",
      note: "Avaliação provisória baseada em fontes oficiais de 2026.",
      sourceIds: [rulesSource.id, reachSource.id],
    },
  });
  relevance(festival, {
    uncertaintyMin: 76,
    uncertaintyMax: 89,
    band: "muito alta",
    impact: "internacional amplo",
    rationale:
      "Avaliação editorial provisória, não previsão de seleção: 37 edições, milhares de inscrições de mais de cem países, foco especializado em curtas e atividades profissionais sustentam relevância internacional; ainda faltam fontes independentes adicionais.",
    dimensions: {
      curatorialHistory: {
        score: 21,
        evidence:
          "37ª edição e organização continuada pela Associação Cultural Kinoforum.",
        sourceIds: [rulesSource.id],
      },
      programmingReach: {
        score: 18,
        evidence:
          "2.208 inscrições internacionais de mais de cem países e 276 latino-americanas na edição.",
        sourceIds: [reachSource.id],
      },
      industryOpportunities: {
        score: 15,
        evidence:
          "Laboratórios Wipkino, Incubadora Kino, Curta ao Longa e ações do Curta & Mercado.",
        sourceIds: [reachSource.id],
      },
      specializedImportance: {
        score: 18,
        evidence:
          "Festival exclusivamente dedicado ao curta, com programas brasileiros, internacionais e latino-americanos.",
        sourceIds: [rulesSource.id],
      },
      continuityTransparency: {
        score: 13,
        evidence:
          "Regulamento integral, datas, seleção, materiais e contatos publicados para a edição.",
        sourceIds: [rulesSource.id],
      },
    },
  });
}

// Curta Cinema — 36ª edição, 2027.
{
  const festival = db.festivals.find((item) => item.id === "festival-004");
  const edition = db.editions.find((item) => item.festivalId === festival.id);
  const oldCall = db.calls.find((item) => item.editionId === edition.id);
  const rulesUrl = "https://curtacinema.com.br/regulamento-nacional-35-edicao/";
  const rulesSource = source(
    "festival-004-source-regulation-2027",
    rulesUrl,
    "Regulamento nacional da 36ª edição do Curta Cinema",
    "36ª edição / 2027",
    "Regulamento integral",
    [
      "location",
      "activity",
      "formats",
      "duration",
      "productionYear",
      "countries",
      "premiere",
      "opening",
      "deadlines",
      "fees",
      "eventDates",
      "selectionType",
      "online",
    ],
    "Apesar do slug mencionar a 35ª edição, o conteúdo identifica expressamente a 36ª edição, de 17 a 24/03/2027.",
  );
  const reachSource = source(
    "festival-004-source-selection-2026",
    "https://curtacinema.com.br/filmes-selecionados-2026/",
    "Seleção oficial 2026 do Curta Cinema",
    "35ª edição / 2026",
    "Balanço da seleção",
    ["relevance", "programmingReach"],
  );
  const historySource = source(
    "festival-004-source-history",
    "https://curtacinema.com.br/sobre/",
    "Apresentação e histórico do Curta Cinema",
    "Histórico consultado em 2026",
    "Apresentação",
    ["relevance", "curatorialHistory", "specializedImportance"],
  );
  const academySource = source(
    "festival-004-source-academy-99",
    "https://www.oscars.org/sites/oscars/files/2026-05/99AA_Shorts%20Qualifying%20Festivals.pdf",
    "99th Academy Awards — Short Film Qualifying Festival List",
    "99ª edição do Oscar",
    "Rio de Janeiro International Short Film Festival",
    ["relevance", "awardQualification"],
  );
  festival.sources = [rulesSource, reachSource, historySource, academySource];
  festival.activity = "ativo";
  festival.frequency = "anual";
  festival.organizer =
    "FRANCO — Associação Franco Cultural, em parceria com Franco Produções";
  festival.languages = [...allLanguages];
  festival.audiences = ["geral", "infantil", "juvenil"];
  festival.description =
    "Festival internacional exclusivamente dedicado à exibição e promoção de curtas-metragens, com competições nacional, internacional e de primeiras obras.";
  festival.locations[0] = {
    ...festival.locations[0],
    subdivisionName: "Rio de Janeiro",
    municipalityCode: "3304557",
    confirmed: true,
    sourceIds: [rulesSource.id],
  };
  festival.seasonality.event = {
    months: [3],
    evidenceYears: [2027],
    confidence: "baixa",
    note: "Baseada apenas na realização confirmada da 36ª edição; não substitui datas futuras.",
  };
  edition.number = "36";
  edition.start = "2027-03-17";
  edition.end = "2027-03-24";
  edition.opening = "2026-07-20";
  edition.closing = "2027-01-08";
  edition.resultDate = "2027-02-15";
  edition.status = "planejada";
  edition.rulesUrl = rulesUrl;
  edition.checkedAt = checkedAt;
  edition.confidence = "confirmado";
  edition.notes =
    "Regulamento publicado para a 36ª edição / 2027. Chamadas nacional e internacional separadas por taxas. O horário-limite não foi publicado.";
  edition.sources = [
    { ...rulesSource, id: "festival-004-edition-2027-source-regulation" },
  ];
  const callSource = {
    ...rulesSource,
    id: "festival-004-call-source-regulation-2027",
  };
  const deadline = (kind, date, label) => ({
    kind,
    date,
    time: "",
    timezone: "America/Sao_Paulo",
    confirmed: true,
    originalLabel: label,
    sourceId: callSource.id,
    supersedes: "",
  });
  const common = {
    ...baseCall(oldCall, callSource.id),
    formats: ["curta"],
    maxMinutes: 30,
    maxSeconds: 1800,
    minYear: 2026,
    maxYear: 2027,
    premiere: "municipal",
    premiereRequirement: "preferencial",
    premiereTerritory: "Rio de Janeiro",
    premiereConditions:
      "Não exige estreia internacional, latino-americana ou brasileira; a seleção dá preferência a inéditos na cidade do Rio de Janeiro.",
    online: "não confirmado",
    onlineConditions:
      "Filmes em competição não participam das eventuais exibições online posteriores; obras fora de competição dependem de autorização expressa. O histórico online anterior não é tratado.",
    regions: [],
    resubmission: "não confirmado",
    platform: "https://filmfreeway.com/FestivalCurtaCinema",
    opening: "2026-07-20",
    rulesUrl,
    restrictions:
      "Curtas de até 30 minutos, produzidos entre janeiro de 2026 e janeiro de 2027.",
    notes:
      "Responsável deve deter os direitos autorais e conexos. Natureza PF/PJ e regra de reinscrição não foram localizadas.",
    sources: [callSource],
  };
  const national = {
    ...structuredClone(common),
    id: oldCall.id,
    name: "Competição Nacional",
    countries: ["Brasil"],
    territoriesConfirmed: true,
    deadlines: [
      deadline("early", "2026-12-15", "fim da isenção para filmes brasileiros"),
      deadline("final", "2027-01-08", "encerramento nacional"),
    ],
    fees: [
      {
        amount: 0,
        currency: "EUR",
        free: "sim",
        deadlineKind: "early",
        discount: "",
        waiver: "",
        notes: "Isento para filmes brasileiros até 15/12/2026.",
        appliesTo: ["filmes brasileiros"],
        platformAmount: null,
        sourceId: callSource.id,
      },
      {
        amount: 5,
        currency: "EUR",
        free: "não",
        deadlineKind: "final",
        discount: "",
        waiver: "",
        notes: "Entre 16/12/2026 e 08/01/2027.",
        appliesTo: ["filmes brasileiros"],
        platformAmount: null,
        sourceId: callSource.id,
      },
    ],
  };
  const international = {
    ...structuredClone(common),
    id: `${edition.id}-call-international`,
    name: "Competição Internacional",
    countries: [],
    territoriesConfirmed: false,
    deadlines: [
      deadline("early", "2026-09-12", "early bird internacional"),
      deadline("regular", "2026-11-20", "regular internacional"),
      deadline("late", "2026-12-14", "late internacional"),
      deadline("final", "2027-01-08", "extended internacional"),
    ],
    fees: [
      {
        amount: 12,
        currency: "EUR",
        free: "não",
        deadlineKind: "early",
        discount: "",
        waiver: "",
        notes:
          "Early bird; o regulamento menciona 15/07, enquanto a abertura geral é 20/07.",
        appliesTo: ["filmes internacionais"],
        platformAmount: null,
        sourceId: callSource.id,
      },
      {
        amount: 16,
        currency: "EUR",
        free: "não",
        deadlineKind: "regular",
        discount: "",
        waiver: "",
        notes: "13/09 a 20/11/2026.",
        appliesTo: ["filmes internacionais"],
        platformAmount: null,
        sourceId: callSource.id,
      },
      {
        amount: 22,
        currency: "EUR",
        free: "não",
        deadlineKind: "late",
        discount: "",
        waiver: "",
        notes: "21/11 a 14/12/2026.",
        appliesTo: ["filmes internacionais"],
        platformAmount: null,
        sourceId: callSource.id,
      },
      {
        amount: 30,
        currency: "EUR",
        free: "não",
        deadlineKind: "final",
        discount: "",
        waiver: "",
        notes: "15/12/2026 a 08/01/2027.",
        appliesTo: ["filmes internacionais"],
        platformAmount: null,
        sourceId: callSource.id,
      },
    ],
  };
  db.calls = db.calls.filter((item) => item.editionId !== edition.id);
  db.calls.push(national, international);
  coverage(festival, {
    localização: {
      status: "confirmado na edição atual",
      note: "Rio de Janeiro/RJ e realização presencial confirmadas no regulamento 2027.",
      sourceIds: [rulesSource.id],
    },
    atividade: {
      status: "confirmado na edição atual",
      note: "36ª edição anunciada para março de 2027.",
      sourceIds: [rulesSource.id],
    },
    categorias: {
      status: "confirmado na edição atual",
      note: "Competições nacional, internacional e Primeiros Quadros, panoramas e programas especiais.",
      sourceIds: [rulesSource.id],
    },
    duração: {
      status: "confirmado na edição atual",
      note: "Até 30 minutos; inclusão de créditos não esclarecida.",
      sourceIds: [rulesSource.id],
    },
    "elegibilidade territorial": {
      status: "confirmado na edição atual",
      note: "Nacional e internacional separadas; coprodução segue país majoritário ou orientação da organização.",
      sourceIds: [rulesSource.id],
    },
    "produção/conclusão": {
      status: "confirmado na edição atual",
      note: "Produção entre janeiro de 2026 e janeiro de 2027.",
      sourceIds: [rulesSource.id],
    },
    estreia: {
      status: "confirmado na edição atual",
      note: "Sem exigência territorial de estreia; preferência por ineditismo na cidade do Rio.",
      sourceIds: [rulesSource.id],
    },
    "exibição online": {
      status: "confirmado na edição atual",
      note: "Competição excluída de exibição online posterior; histórico anterior não esclarecido.",
      sourceIds: [rulesSource.id],
    },
    "pessoa autorizada a inscrever": {
      status: "não localizado",
      note: "Exige titularidade de direitos, mas não define natureza PF/PJ.",
      sourceIds: [rulesSource.id],
    },
    taxas: {
      status: "confirmado na edição atual",
      note: "Nacional isenta até 15/12 e €5 depois; internacional €12/€16/€22/€30 por lote.",
      sourceIds: [rulesSource.id],
    },
    abertura: {
      status: "confirmado na edição atual",
      note: "20/07/2026; há divergência interna com o início do early bird internacional em 15/07.",
      sourceIds: [rulesSource.id],
    },
    encerramento: {
      status: "confirmado na edição atual",
      note: "08/01/2027; horário não publicado.",
      sourceIds: [rulesSource.id],
    },
    realização: {
      status: "confirmado na edição atual",
      note: "17 a 24/03/2027.",
      sourceIds: [rulesSource.id],
    },
    relevância: {
      status: "confirmado na edição atual",
      note: "Avaliação provisória com lista qualificadora oficial da 99ª edição do Oscar.",
      sourceIds: [historySource.id, reachSource.id, academySource.id],
    },
  });
  relevance(festival, {
    uncertaintyMin: 78,
    uncertaintyMax: 90,
    band: "muito alta",
    impact: "internacional amplo",
    rationale:
      "Avaliação editorial provisória, não previsão de seleção: 35 anos de atuação, alcance internacional documentado e qualificação vigente de prêmios nacionais/internacionais para o 99º Oscar sustentam alta relevância no circuito de curtas; faltam dados independentes de público e mercado para reduzir a incerteza.",
    dimensions: {
      curatorialHistory: {
        score: 22,
        evidence: "35 anos de atuação dedicados à promoção do curta-metragem.",
        sourceIds: [historySource.id],
      },
      programmingReach: {
        score: 17,
        evidence:
          "Seleção 2026 com 130 filmes, 33 países e 15 estados brasileiros.",
        sourceIds: [reachSource.id],
      },
      industryOpportunities: {
        score: 12,
        evidence:
          "Circulação, encontros e debates com realizadores são documentados; não foi localizado mercado estruturado na pesquisa atual.",
        sourceIds: [historySource.id],
      },
      specializedImportance: {
        score: 20,
        evidence:
          "Foco exclusivo em curtas; Grand Prizes nacional e internacional constam na lista qualificadora oficial da 99ª edição do Oscar.",
        sourceIds: [academySource.id, rulesSource.id],
      },
      continuityTransparency: {
        score: 13,
        evidence:
          "Histórico de edições e regulamento detalhado estão publicados; divergência de datas do early bird foi mantida visível.",
        sourceIds: [rulesSource.id, historySource.id],
      },
    },
  });
}

db.settings.catalogVersion = "2026-10-04.1";
fs.writeFileSync(path, `${JSON.stringify(db, null, 2)}\n`);
console.log(
  "Applied documented research batch: festival-001, festival-003, festival-004",
);
