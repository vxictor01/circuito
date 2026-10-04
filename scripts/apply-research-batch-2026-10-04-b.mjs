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

const setCoverage = (festival, entries) => {
  for (const [field, value] of Object.entries(entries)) {
    festival.researchCoverage[field] = value;
  }
};

const setRelevance = (festival, config) => {
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

const baseCall = (oldCall, callSource, rulesUrl) => ({
  ...oldCall,
  formats: [],
  genres: [],
  workTypes: ["filme"],
  languages: [],
  approaches: [],
  contentGenres: [],
  themes: [],
  audiences: ["geral"],
  participationConditions: [],
  submissionMode: "aberta",
  selectionType: "competitiva",
  genresConfirmed: true,
  minMinutes: null,
  maxMinutes: null,
  minSeconds: null,
  maxSeconds: null,
  minInclusive: true,
  maxInclusive: true,
  creditsIncluded: null,
  minYear: null,
  maxYear: null,
  pf: "sim",
  pj: "sim",
  premiere: "não confirmado",
  premiereRequirement: "desconhecida",
  premiereTerritory: "",
  premiereConditions: "",
  online: "não confirmado",
  onlineConditions: "",
  countries: [],
  regions: [],
  territoriesConfirmed: false,
  restrictions: "",
  resubmission: "não confirmado",
  platform: "",
  opening: "",
  deadlines: [],
  fees: [],
  rulesUrl,
  checkedAt,
  confidence: "confirmado",
  notes: "",
  sources: [callSource],
});

const deadline = (
  date,
  time,
  sourceId,
  originalLabel = "encerramento das inscrições",
) => ({
  kind: "final",
  date,
  time,
  timezone: "America/Sao_Paulo",
  confirmed: true,
  originalLabel,
  sourceId,
  supersedes: "",
});

const freeFee = (sourceId, notes) => ({
  amount: 0,
  currency: "BRL",
  free: "sim",
  deadlineKind: "final",
  discount: "",
  waiver: "",
  notes,
  appliesTo: ["todas as inscrições"],
  platformAmount: null,
  sourceId,
});

// É Tudo Verdade — 31ª edição, 2026.
{
  const festival = db.festivals.find((item) => item.id === "festival-005");
  const edition = db.editions.find((item) => item.festivalId === festival.id);
  const oldCall = db.calls.find((item) => item.editionId === edition.id);
  const rulesUrl =
    "https://etudoverdade.com.br/inscricao_2026_/Regulamento-E-Tudo-Verdade-2026.pdf";
  const rulesSource = source(
    "festival-005-source-regulation-2026",
    rulesUrl,
    "Regulamento do 31º É Tudo Verdade",
    "31ª edição / 2026",
    "Regulamento integral",
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
      "fees",
      "opening",
      "deadlines",
      "eventDates",
      "resubmission",
      "materials",
      "relevance",
    ],
    "O edital foi lido integralmente. Restrições de estreia e histórico online variam entre as categorias brasileiras; o documento não declara equivalentes para as competições internacionais.",
  );
  festival.sources = [rulesSource];
  festival.activity = "ativo";
  festival.frequency = "anual";
  festival.organizer = "É Tudo Verdade / It's All True";
  festival.description =
    "Festival internacional competitivo dedicado ao documentário e à produção audiovisual não ficcional.";
  festival.genres = ["documentário"];
  festival.languages = ["documentário"];
  festival.workTypes = ["filme"];
  festival.audiences = ["geral"];
  festival.traveling = true;
  festival.platforms = ["Vimeo", "Dropbox", "Google Drive"];
  festival.locations = [
    {
      ...festival.locations[0],
      id: "festival-005-location-1",
      role: "sede",
      countryCode: "BR",
      countryName: "Brasil",
      subdivisionCode: "SP",
      subdivisionName: "São Paulo",
      city: "São Paulo",
      municipalityCode: "3550308",
      confirmed: true,
      sourceIds: [rulesSource.id],
    },
    {
      ...festival.locations[1],
      id: "festival-005-location-2",
      role: "exibição",
      countryCode: "BR",
      countryName: "Brasil",
      subdivisionCode: "RJ",
      subdivisionName: "Rio de Janeiro",
      city: "Rio de Janeiro",
      municipalityCode: "3304557",
      confirmed: true,
      sourceIds: [rulesSource.id],
    },
  ];
  festival.seasonality.opening = {
    months: [8],
    evidenceYears: [2026],
    confidence: "baixa",
    note: "Baseada apenas na abertura da edição 2026; não substitui confirmação da próxima chamada.",
  };
  festival.seasonality.event = {
    months: [4],
    evidenceYears: [2026],
    confidence: "baixa",
    note: "Baseada apenas na realização confirmada da edição 2026.",
  };

  edition.number = "31";
  edition.start = "2026-04-09";
  edition.end = "2026-04-19";
  edition.opening = "2025-08-25";
  edition.closing = "2025-11-30";
  edition.resultDate = "2026-02-20";
  edition.status = "realizada";
  edition.rulesUrl = rulesUrl;
  edition.checkedAt = checkedAt;
  edition.confidence = "confirmado";
  edition.notes =
    "As quatro competições foram mantidas como chamadas separadas. O horário de encerramento é 23h59 de Brasília. Cópias de seleção podiam chegar até 22/12/2025.";
  edition.sources = [
    { ...rulesSource, id: "festival-005-edition-source-regulation-2026" },
  ];

  const callSource = {
    ...rulesSource,
    id: "festival-005-call-source-regulation-2026",
  };
  const common = {
    ...baseCall(oldCall, callSource, rulesUrl),
    genres: ["documentário"],
    languages: ["documentário"],
    minYear: 2025,
    restrictions:
      "Documentário finalizado a partir de janeiro de 2025. O proponente deve deter ou licenciar os direitos necessários. Cópia de seleção por link privado ou pen drive; obra em idioma diferente de português ou inglês precisa de legendas em inglês.",
    resubmission: "não",
    opening: "2025-08-25",
    deadlines: [deadline("2025-11-30", "23:59", callSource.id)],
    fees: [
      freeFee(callSource.id, "O regulamento declara a inscrição gratuita."),
    ],
    platform: "https://etudoverdade.com.br",
    notes:
      "Filmes inscritos e não selecionados em edições passadas, inclusive versões reeditadas ou reduzidas, não são aceitos. Inclusão de créditos na duração não foi esclarecida.",
  };
  const brazilLong = {
    ...structuredClone(common),
    id: oldCall.id,
    name: "Competição Brasileira — longa ou média-metragem",
    formats: ["média", "longa"],
    minMinutes: 31,
    minSeconds: 1860,
    countries: ["Brasil"],
    territoriesConfirmed: true,
    premiere: "nacional",
    premiereRequirement: "obrigatória",
    premiereTerritory: "Brasil",
    premiereConditions:
      "Exige ineditismo em território brasileiro, sem exibição pública prévia, TV, disponibilização online ou lançamento em mídia.",
    online: "proibido",
    onlineConditions:
      "Não pode ter sido disponibilizado online; a vedação também alcança remontagens de obras não ficcionais anteriormente exibidas.",
  };
  const brazilShort = {
    ...structuredClone(common),
    id: `${edition.id}-call-brazil-short`,
    name: "Competição Brasileira — curta-metragem",
    formats: ["curta"],
    maxMinutes: 30,
    maxSeconds: 1800,
    countries: ["Brasil"],
    territoriesConfirmed: true,
    premiere: "preferência",
    premiereRequirement: "preferencial",
    premiereTerritory: "Brasil",
    premiereConditions:
      "O ineditismo recebe prioridade, mas não é formulado como obrigação geral para curtas.",
    online: "proibido",
    onlineConditions:
      "Não aceita obra disponibilizada online ou já exibida em canais de TV ou na internet.",
  };
  const internationalLong = {
    ...structuredClone(common),
    id: `${edition.id}-call-international-long`,
    name: "Competição Internacional — longa ou média-metragem",
    formats: ["média", "longa"],
    minMinutes: 31,
    minSeconds: 1860,
    countries: [],
    territoriesConfirmed: false,
    restrictions: `${common.restrictions} Competição destinada a produções estrangeiras ou coproduções entre empresa brasileira e empresa de outro país.`,
    premiereConditions:
      "Exigência de estreia anterior não localizada para esta categoria.",
    onlineConditions:
      "Regra sobre histórico online anterior não localizada para esta categoria; selecionados entram em janela de exclusividade até o fim do festival.",
  };
  const internationalShort = {
    ...structuredClone(internationalLong),
    id: `${edition.id}-call-international-short`,
    name: "Competição Internacional — curta-metragem",
    formats: ["curta"],
    minMinutes: null,
    minSeconds: null,
    maxMinutes: 30,
    maxSeconds: 1800,
  };
  db.calls = db.calls.filter((item) => item.editionId !== edition.id);
  db.calls.push(brazilLong, brazilShort, internationalLong, internationalShort);

  setCoverage(festival, {
    localização: {
      status: "confirmado na edição atual",
      note: "São Paulo e Rio de Janeiro confirmados no regulamento 2026; itinerância posterior prevista.",
      sourceIds: [rulesSource.id],
    },
    atividade: {
      status: "confirmado na edição atual",
      note: "31ª edição realizada em abril de 2026.",
      sourceIds: [rulesSource.id],
    },
    categorias: {
      status: "confirmado na edição atual",
      note: "Quatro competições por território e duração, além de mostras informativas.",
      sourceIds: [rulesSource.id],
    },
    duração: {
      status: "confirmado na edição atual",
      note: "Curtas até 30 minutos; longas/médias a partir de 31 minutos. Créditos não esclarecidos.",
      sourceIds: [rulesSource.id],
    },
    "elegibilidade territorial": {
      status: "confirmado na edição atual",
      note: "Competições brasileiras e internacionais têm regra territorial própria.",
      sourceIds: [rulesSource.id],
    },
    "produção/conclusão": {
      status: "confirmado na edição atual",
      note: "Produções finalizadas a partir de janeiro de 2025.",
      sourceIds: [rulesSource.id],
    },
    estreia: {
      status: "não localizado",
      note: "Regras brasileiras conferidas; exigência equivalente não localizada para as competições internacionais.",
      sourceIds: [rulesSource.id],
    },
    "exibição online": {
      status: "não localizado",
      note: "Regras brasileiras e janela dos selecionados conferidas; histórico online anterior internacional não localizado.",
      sourceIds: [rulesSource.id],
    },
    "pessoa autorizada a inscrever": {
      status: "confirmado na edição atual",
      note: "Empresa produtora ou pessoa responsável, produtora ou realizador com os direitos necessários.",
      sourceIds: [rulesSource.id],
    },
    taxas: {
      status: "confirmado na edição atual",
      note: "Inscrição gratuita.",
      sourceIds: [rulesSource.id],
    },
    abertura: {
      status: "confirmado na edição atual",
      note: "25/08/2025.",
      sourceIds: [rulesSource.id],
    },
    encerramento: {
      status: "confirmado na edição atual",
      note: "30/11/2025 às 23h59 de Brasília.",
      sourceIds: [rulesSource.id],
    },
    realização: {
      status: "confirmado na edição atual",
      note: "09 a 19/04/2026.",
      sourceIds: [rulesSource.id],
    },
    relevância: {
      status: "confirmado na edição atual",
      note: "Rubrica provisória baseada no regulamento oficial da 31ª edição; reconhecimento da Academia é autodeclarado pelo festival.",
      sourceIds: [rulesSource.id],
    },
  });
  setRelevance(festival, {
    uncertaintyMin: 75,
    uncertaintyMax: 89,
    band: "muito alta",
    impact: "internacional amplo",
    rationale:
      "Avaliação editorial provisória, separada de prioridade pessoal e compatibilidade: 31 edições, quatro competições documentais, realização em duas capitais e itinerância sustentam alto impacto especializado. O reconhecimento pela Academia consta no próprio regulamento; falta confirmação independente atual e dados públicos adicionais de audiência/mercado.",
    dimensions: {
      curatorialHistory: {
        score: 22,
        evidence: "31ª edição realizada em 2026.",
        sourceIds: [rulesSource.id],
      },
      programmingReach: {
        score: 16,
        evidence:
          "Duas capitais, itinerância prevista e mínimo de 37 obras nas quatro competições.",
        sourceIds: [rulesSource.id],
      },
      industryOpportunities: {
        score: 10,
        evidence:
          "O regulamento documenta circulação e janela de prioridade, mas não um mercado estruturado.",
        sourceIds: [rulesSource.id],
      },
      specializedImportance: {
        score: 20,
        evidence:
          "Foco exclusivo em documentário e reconhecimento classificatório declarado pelo festival para prêmios documentais.",
        sourceIds: [rulesSource.id],
      },
      continuityTransparency: {
        score: 14,
        evidence:
          "Regulamento integral com calendário, categorias, seleção, materiais e premiação publicado.",
        sourceIds: [rulesSource.id],
      },
    },
  });
}

// FestCurtasBH — 28ª edição, 2026.
{
  const festival = db.festivals.find((item) => item.id === "festival-009");
  const edition = db.editions.find((item) => item.festivalId === festival.id);
  const oldCall = db.calls.find((item) => item.editionId === edition.id);
  const rulesUrl =
    "https://fcs.mg.gov.br/wp-content/uploads/2026/03/Edital_Regulation_28oFestCurtasBH_2026.FINAL_.pdf";
  const pageUrl =
    "https://fcs.mg.gov.br/evento/abertura-de-inscricoes-para-o-28o-festcurtasbh-festival-internacional-de-curtas-de-belo-horizonte/";
  const rulesSource = source(
    "festival-009-source-regulation-2026",
    rulesUrl,
    "Edital 03/2026 — 28º FestCurtasBH",
    "28ª edição / 2026",
    "Edital e anexos integrais",
    [
      "location",
      "activity",
      "formats",
      "languages",
      "duration",
      "productionYear",
      "countries",
      "pf",
      "pj",
      "fees",
      "opening",
      "deadlines",
      "eventDates",
      "online",
      "materials",
      "awards",
    ],
    "O edital em português e inglês foi lido integralmente. A versão inglesa do cronograma diverge em um dia para o resultado; foi preservida a data de 21/09 repetida no corpo e no cronograma em português.",
  );
  const programSource = source(
    "festival-009-source-program-2026",
    pageUrl,
    "Abertura de inscrições do 28º FestCurtasBH",
    "28ª edição / 2026",
    "Apresentação, categorias, premiação, atividades e itinerância",
    ["activity", "programmingReach", "industryOpportunities", "relevance"],
  );
  festival.sources = [rulesSource, programSource];
  festival.activity = "ativo";
  festival.frequency = "anual";
  festival.organizer = "Fundação Clóvis Salgado e APPA — Cultura & Patrimônio";
  festival.description =
    "Festival internacional de curtas-metragens com competitivas Minas, Brasil e Internacional, mostras paralelas, formação e itinerância.";
  festival.genres = [...allLanguages];
  festival.languages = [...allLanguages];
  festival.workTypes = ["filme"];
  festival.audiences = ["geral", "infantil", "juvenil"];
  festival.traveling = true;
  festival.platforms = ["site oficial", "ShortFilmDepot"];
  festival.locations[0] = {
    ...festival.locations[0],
    role: "sede",
    subdivisionName: "Minas Gerais",
    municipalityCode: "3106200",
    confirmed: true,
    sourceIds: [rulesSource.id],
  };
  festival.seasonality.opening = {
    months: [4],
    evidenceYears: [2026],
    confidence: "baixa",
    note: "Baseada apenas na abertura da edição 2026; não substitui confirmação da próxima chamada.",
  };
  festival.seasonality.event = {
    months: [10, 11],
    evidenceYears: [2026],
    confidence: "baixa",
    note: "Baseada apenas na realização confirmada da edição 2026.",
  };

  edition.number = "28";
  edition.start = "2026-10-30";
  edition.end = "2026-11-08";
  edition.opening = "2026-04-02";
  edition.closing = "2026-05-17";
  edition.resultDate = "2026-09-21";
  edition.status = "planejada";
  edition.rulesUrl = rulesUrl;
  edition.checkedAt = checkedAt;
  edition.confidence = "confirmado";
  edition.notes =
    "Resultado em 21/09/2026 conforme o corpo e o cronograma em português; a tradução inglesa do anexo registra 20/09, divergência mantida nesta nota. Evento presencial e na plataforma cineHumbertoMauro/MAIS.";
  edition.sources = [
    { ...rulesSource, id: "festival-009-edition-source-regulation-2026" },
  ];

  const callSource = {
    ...rulesSource,
    id: "festival-009-call-source-regulation-2026",
  };
  const common = {
    ...baseCall(oldCall, callSource, rulesUrl),
    formats: ["curta"],
    genres: [...allLanguages],
    languages: [...allLanguages],
    maxMinutes: 45,
    maxSeconds: 2700,
    minYear: 2025,
    maxYear: 2026,
    premiere: "nenhuma",
    premiereRequirement: "sem exigência confirmada",
    premiereConditions:
      "O edital aceita filmes não inéditos e usa a primeira exibição pública como data de finalização; não localiza exigência de estreia.",
    online: "não confirmado",
    onlineConditions:
      "Histórico online anterior não é tratado. A edição inclui exibição virtual oficial e pode solicitar autorização para itinerância e exibições futuras presenciais ou virtuais.",
    restrictions:
      "Curta de até 45 minutos, concluído em 2025 ou 2026. Não aceita publicidade, filme institucional, série ou videoclipe. Obra exibida em edição anterior não integra as competitivas.",
    resubmission: "não confirmado",
    platform: "https://www.shortfilmdepot.com ou https://festcurtasbh.com.br",
    opening: "2026-04-02",
    deadlines: [deadline("2026-05-17", "", callSource.id)],
    fees: [
      freeFee(
        callSource.id,
        "O festival não cobra inscrição; eventuais tarifas internas da ShortFilmDepot são do candidato e o valor não foi publicado no edital.",
      ),
    ],
    notes:
      "PF maior de 18 anos ou emancipada e PJ responsável pela produção/distribuição podem inscrever. Créditos na duração máxima e regra geral de reinscrição não foram esclarecidos.",
  };
  const minas = {
    ...structuredClone(common),
    id: oldCall.id,
    name: "Mostra Competitiva Minas",
    countries: ["Brasil"],
    regions: ["MG"],
    territoriesConfirmed: true,
    restrictions: `${common.restrictions} A programação respeita a região principal de produção para a Mostra Minas.`,
  };
  const brazil = {
    ...structuredClone(common),
    id: `${edition.id}-call-brazil`,
    name: "Mostra Competitiva Brasil",
    countries: ["Brasil"],
    territoriesConfirmed: true,
    restrictions: `${common.restrictions} A programação respeita o país principal de produção para a Mostra Brasil.`,
  };
  const international = {
    ...structuredClone(common),
    id: `${edition.id}-call-international`,
    name: "Mostra Competitiva Internacional",
    territoriesConfirmed: false,
    restrictions: `${common.restrictions} A Mostra Internacional considera o país principal de produção; a estrutura atual não presume que país vazio significa estrangeiro.`,
  };
  db.calls = db.calls.filter((item) => item.editionId !== edition.id);
  db.calls.push(minas, brazil, international);

  setCoverage(festival, {
    localização: {
      status: "confirmado na edição atual",
      note: "Cine Humberto Mauro/Palácio das Artes em Belo Horizonte e plataforma virtual oficial.",
      sourceIds: [rulesSource.id],
    },
    atividade: {
      status: "confirmado na edição atual",
      note: "28ª edição programada para outubro e novembro de 2026.",
      sourceIds: [rulesSource.id, programSource.id],
    },
    categorias: {
      status: "confirmado na edição atual",
      note: "Competitivas Minas, Brasil e Internacional, mais mostras paralelas.",
      sourceIds: [rulesSource.id, programSource.id],
    },
    duração: {
      status: "confirmado na edição atual",
      note: "Curtas de até 45 minutos; inclusão de créditos não esclarecida.",
      sourceIds: [rulesSource.id],
    },
    "elegibilidade territorial": {
      status: "confirmado na edição atual",
      note: "Mostras respeitam região ou país principal de produção; a lista exata de países internacionais não é enumerada.",
      sourceIds: [rulesSource.id],
    },
    "produção/conclusão": {
      status: "confirmado na edição atual",
      note: "Finalizados em 2025 ou 2026; para filmes não inéditos vale a primeira exibição pública.",
      sourceIds: [rulesSource.id],
    },
    estreia: {
      status: "confirmado na edição atual",
      note: "Não há exigência localizada; o edital admite filmes não inéditos.",
      sourceIds: [rulesSource.id],
    },
    "exibição online": {
      status: "não localizado",
      note: "Exibição virtual do festival confirmada; efeito do histórico online anterior sobre elegibilidade não localizado.",
      sourceIds: [rulesSource.id],
    },
    "pessoa autorizada a inscrever": {
      status: "confirmado na edição atual",
      note: "PF maior de 18 anos/emancipada e PJ responsável por produção ou distribuição.",
      sourceIds: [rulesSource.id],
    },
    taxas: {
      status: "confirmado na edição atual",
      note: "Festival gratuito; eventual tarifa interna ShortFilmDepot é do candidato e não tem valor publicado.",
      sourceIds: [rulesSource.id],
    },
    abertura: {
      status: "confirmado na edição atual",
      note: "02/04/2026.",
      sourceIds: [rulesSource.id],
    },
    encerramento: {
      status: "confirmado na edição atual",
      note: "17/05/2026; horário não publicado.",
      sourceIds: [rulesSource.id],
    },
    realização: {
      status: "confirmado na edição atual",
      note: "30/10 a 08/11/2026.",
      sourceIds: [rulesSource.id],
    },
    relevância: {
      status: "confirmado na edição atual",
      note: "Rubrica provisória baseada no edital e na apresentação institucional de 2026.",
      sourceIds: [rulesSource.id, programSource.id],
    },
  });
  setRelevance(festival, {
    uncertaintyMin: 73,
    uncertaintyMax: 87,
    band: "muito alta",
    impact: "nacional",
    rationale:
      "Avaliação editorial provisória, separada de prioridade e compatibilidade: 28 edições, competições regional, nacional e internacional, programação formativa, prêmios e itinerância por mais de 30 cidades sustentam forte alcance nacional e especialização em curtas. Faltam fontes independentes e métricas de público/mercado.",
    dimensions: {
      curatorialHistory: {
        score: 20,
        evidence: "28ª edição em 2026, com curadoria e júri especializados.",
        sourceIds: [rulesSource.id, programSource.id],
      },
      programmingReach: {
        score: 17,
        evidence:
          "Sede física, plataforma virtual e itinerância institucional em mais de 30 cidades mineiras.",
        sourceIds: [rulesSource.id, programSource.id],
      },
      industryOpportunities: {
        score: 12,
        evidence:
          "Debates, mesas, cursos, convidados e oficina de crítica; não foi localizado mercado formal.",
        sourceIds: [programSource.id],
      },
      specializedImportance: {
        score: 18,
        evidence:
          "Foco em curta-metragem, três competitivas e premiação financeira por mostra.",
        sourceIds: [rulesSource.id, programSource.id],
      },
      continuityTransparency: {
        score: 15,
        evidence:
          "Edital bilíngue integral, cronograma, critérios, premiação e anexos publicados; divergência de tradução foi registrada.",
        sourceIds: [rulesSource.id],
      },
    },
  });
}

db.settings.catalogVersion = "2026-10-04.2";
fs.writeFileSync(path, `${JSON.stringify(db, null, 2)}\n`);
console.log("Applied documented research batch: festival-005, festival-009");
