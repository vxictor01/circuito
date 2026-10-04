import {
  SCHEMA_VERSION,
  FORMATS,
  GENRES,
  WORK_TYPES,
  LANGUAGES,
  APPROACHES,
  CONTENT_GENRES,
  THEMES,
  AUDIENCES,
  PARTICIPATION_CONDITIONS,
  PREMIERES,
  SUBMISSION_STATUSES,
  type Database,
  type Legacy,
} from "../types";
import { isISODate } from "./deadlines";
export function validateDatabase(value: unknown): asserts value is Database {
  const d = value as Database;
  if (!d || typeof d !== "object" || d.schemaVersion !== SCHEMA_VERSION)
    throw new Error("Versão de dados não suportada.");
  const tables = [
    "festivals",
    "editions",
    "calls",
    "films",
    "submissions",
  ] as const;
  const ids: Record<string, Set<string>> = {};
  for (const table of tables) {
    if (!Array.isArray(d[table])) throw new Error(`Lista ausente: ${table}`);
    ids[table] = new Set();
    for (const e of d[table]) {
      if (
        !e ||
        typeof e.id !== "string" ||
        !e.id.trim() ||
        ids[table].has(e.id)
      )
        throw new Error(`ID vazio ou duplicado em ${table}`);
      ids[table].add(e.id);
    }
  }
  const requireRef = (table: string, id: string) => {
    if (!ids[table].has(id))
      throw new Error(`Relacionamento inválido: ${table}/${id}`);
  };
  const strs = (e: Legacy, fields: string[]) => {
    for (const k of fields)
      if (typeof e[k] !== "string")
        throw new Error(`Campo textual inválido: ${k}`);
  };
  const dates = (e: Legacy, fields: string[]) => {
    for (const k of fields)
      if (e[k] !== "" && !isISODate(e[k]))
        throw new Error(`Data inválida: ${k}`);
  };
  const arr = (v: unknown, allowed?: readonly string[]) => {
    if (
      !Array.isArray(v) ||
      v.some((x) => typeof x !== "string" || (allowed && !allowed.includes(x)))
    )
      throw new Error("Lista de opções inválida.");
  };
  const number = (v: unknown) => {
    if (v !== null && (typeof v !== "number" || !Number.isFinite(v) || v < 0))
      throw new Error("Número inválido.");
  };
  const choice = (v: unknown, allowed: readonly string[]) => {
    if (typeof v !== "string" || !allowed.includes(v))
      throw new Error(`Opção inválida: ${v}`);
  };
  const answers = ["sim", "não", "não confirmado", "não se aplica"];
  const confidence = [
    "confirmado",
    "parcial",
    "edição anterior",
    "não verificado",
  ];
  const evidenceStates = [
    "confirmado na edição atual",
    "confirmado em edição anterior",
    "estimativa histórica",
    "informação conflitante",
    "não localizado",
    "pendente",
  ];
  const priorities = [
    "alta",
    "média",
    "baixa",
    "fora do plano",
    "sem prioridade",
  ];
  const sources = (v: unknown) => {
    if (!Array.isArray(v)) throw new Error("Fontes inválidas");
    for (const s of v) {
      strs(s, [
        "id",
        "url",
        "title",
        "type",
        "checkedAt",
        "accessedAt",
        "confidence",
        "evidenceState",
        "editionLabel",
        "section",
        "note",
      ]);
      if (!s.id.trim()) throw new Error("Fonte sem identificador");
      dates(s, ["checkedAt", "accessedAt"]);
      arr(s.fields);
      choice(s.type, [
        "oficial",
        "plataforma de inscrição",
        "fonte secundária",
        "estimativa",
        "não verificado",
      ]);
      choice(s.confidence, confidence);
      choice(s.evidenceState, evidenceStates);
    }
  };
  for (const f of d.festivals) {
    strs(f as unknown as Legacy, [
      "name",
      "internationalName",
      "acronym",
      "country",
      "region",
      "city",
      "website",
      "instagram",
      "contact",
      "organizer",
      "description",
      "scale",
      "frequency",
      "personalNotes",
    ]);
    if (!f.name.trim()) throw new Error("Festival sem nome");
    arr(f.aliases);
    arr(f.platforms);
    arr(f.genres, GENRES);
    arr(f.tags);
    if (typeof f.favorite !== "boolean") throw new Error("Favorito inválido");
    choice(f.activity, ["ativo", "atividade não confirmada", "inativo"]);
    choice(f.priority, priorities);
    choice(f.basePriority, priorities);
    if (
      typeof f.traveling !== "boolean" ||
      typeof f.onlineOnly !== "boolean" ||
      !Array.isArray(f.locations)
    )
      throw new Error("Localização normalizada inválida");
    for (const location of f.locations) {
      strs(location as unknown as Legacy, [
        "id",
        "role",
        "countryCode",
        "countryName",
        "subdivisionCode",
        "subdivisionName",
        "city",
        "municipalityCode",
        "district",
      ]);
      choice(location.role, ["sede", "exibição", "organização"]);
      if (typeof location.confirmed !== "boolean")
        throw new Error("Confirmação de local inválida");
      arr(location.sourceIds);
    }
    arr(f.workTypes, WORK_TYPES);
    arr(f.languages, LANGUAGES);
    arr(f.approaches, APPROACHES);
    arr(f.contentGenres, CONTENT_GENRES);
    arr(f.themes, THEMES);
    arr(f.audiences, AUDIENCES);
    arr(f.participationConditions, PARTICIPATION_CONDITIONS);
    for (const estimate of [f.seasonality.opening, f.seasonality.event]) {
      if (
        !estimate ||
        !Array.isArray(estimate.months) ||
        estimate.months.some(
          (month) => !Number.isInteger(month) || month < 1 || month > 12,
        ) ||
        !Array.isArray(estimate.evidenceYears) ||
        estimate.evidenceYears.some((year) => !Number.isInteger(year)) ||
        typeof estimate.note !== "string"
      )
        throw new Error("Sazonalidade inválida");
      choice(estimate.confidence, ["alta", "média", "baixa", "desconhecida"]);
    }
    if (!f.relevance || !f.researchCoverage)
      throw new Error("Pesquisa ou relevância ausente");
    choice(f.relevance.status, ["avaliada", "provisória", "pendente"]);
    choice(f.relevance.band, [
      "muito alta",
      "alta",
      "intermediária",
      "menor alcance documentado",
      "pendente",
    ]);
    choice(f.relevance.impact, [
      "internacional amplo",
      "nacional",
      "especializado",
      "regional/local",
      "comunitário",
      "pendente",
    ]);
    choice(f.relevance.confidence, ["alta", "média", "baixa", "pendente"]);
    strs(f.relevance as unknown as Legacy, ["assessedAt", "rationale"]);
    for (const score of [
      f.relevance.score,
      f.relevance.uncertaintyMin,
      f.relevance.uncertaintyMax,
    ]) {
      number(score);
      if (score !== null && score > 100)
        throw new Error("Nota de relevância inválida");
    }
    dates(f.relevance as unknown as Legacy, ["assessedAt"]);
    const dimensionMaximums = [25, 20, 20, 20, 15];
    const dimensions = Object.values(f.relevance.dimensions);
    if (dimensions.length !== dimensionMaximums.length)
      throw new Error("Rubrica de relevância incompleta");
    dimensions.forEach((dimension, index) => {
      number(dimension.score);
      if (
        dimension.score !== null &&
        dimension.score > dimensionMaximums[index]
      )
        throw new Error("Dimensão de relevância fora da faixa");
      if (typeof dimension.evidence !== "string")
        throw new Error("Evidência de relevância inválida");
      arr(dimension.sourceIds);
    });
    if (f.relevance.status === "avaliada") {
      if (
        f.relevance.score === null ||
        dimensions.some(
          (dimension) =>
            dimension.score === null ||
            !dimension.evidence.trim() ||
            !dimension.sourceIds.length,
        )
      )
        throw new Error("Relevância avaliada sem evidência completa");
      const calculated = dimensions.reduce(
        (total, dimension) => total + Number(dimension.score),
        0,
      );
      if (calculated !== f.relevance.score)
        throw new Error("Nota de relevância difere da rubrica");
    }
    for (const coverage of Object.values(f.researchCoverage)) {
      choice(coverage.status, evidenceStates);
      if (typeof coverage.note !== "string")
        throw new Error("Cobertura inválida");
      arr(coverage.sourceIds);
    }
    sources(f.sources);
  }
  for (const e of d.editions) {
    requireRef("festivals", e.festivalId);
    strs(e as unknown as Legacy, [
      "number",
      "start",
      "end",
      "opening",
      "closing",
      "resultDate",
      "rulesUrl",
      "checkedAt",
      "notes",
    ]);
    dates(e as unknown as Legacy, [
      "start",
      "end",
      "opening",
      "closing",
      "resultDate",
      "checkedAt",
    ]);
    if (!Number.isInteger(e.year) || e.year < 1900 || e.year > 2200)
      throw new Error("Ano de edição inválido");
    if (e.start && e.end && e.start > e.end)
      throw new Error("Fim da edição anterior ao início");
    choice(e.confidence, confidence);
    choice(e.status, ["planejada", "realizada", "não confirmado"]);
    sources(e.sources);
  }
  for (const c of d.calls) {
    requireRef("editions", c.editionId);
    strs(c as unknown as Legacy, [
      "name",
      "opening",
      "restrictions",
      "platform",
      "rulesUrl",
      "checkedAt",
      "notes",
    ]);
    if (!c.name.trim()) throw new Error("Chamada sem nome");
    arr(c.formats, FORMATS);
    arr(c.genres, GENRES);
    arr(c.workTypes, WORK_TYPES);
    arr(c.languages, LANGUAGES);
    arr(c.approaches, APPROACHES);
    arr(c.contentGenres, CONTENT_GENRES);
    arr(c.themes, THEMES);
    arr(c.audiences, AUDIENCES);
    arr(c.participationConditions, PARTICIPATION_CONDITIONS);
    arr(c.countries);
    arr(c.regions);
    dates(c as unknown as Legacy, ["opening", "checkedAt"]);
    for (const v of [
      c.minMinutes,
      c.maxMinutes,
      c.minSeconds,
      c.maxSeconds,
      c.minYear,
      c.maxYear,
    ])
      number(v);
    if (
      c.minMinutes !== null &&
      c.maxMinutes !== null &&
      c.minMinutes > c.maxMinutes
    )
      throw new Error("Faixa de duração invertida");
    if (c.minYear !== null && c.maxYear !== null && c.minYear > c.maxYear)
      throw new Error("Faixa de anos invertida");
    choice(c.pf, answers);
    choice(c.pj, answers);
    choice(c.resubmission, answers);
    choice(c.premiere, PREMIERES);
    choice(c.premiereRequirement, [
      "obrigatória",
      "preferencial",
      "sem exigência confirmada",
      "desconhecida",
    ]);
    choice(c.submissionMode, [
      "aberta",
      "convite",
      "indicação",
      "curadoria sem chamada",
      "não confirmado",
    ]);
    choice(c.selectionType, [
      "competitiva",
      "não competitiva",
      "mista",
      "não confirmado",
    ]);
    strs(c as unknown as Legacy, [
      "premiereTerritory",
      "premiereConditions",
      "onlineConditions",
    ]);
    choice(c.online, ["permitido", "proibido", "restrito", "não confirmado"]);
    choice(c.confidence, confidence);
    if (
      typeof c.genresConfirmed !== "boolean" ||
      typeof c.territoriesConfirmed !== "boolean" ||
      typeof c.minInclusive !== "boolean" ||
      typeof c.maxInclusive !== "boolean" ||
      (c.creditsIncluded !== null && typeof c.creditsIncluded !== "boolean")
    )
      throw new Error("Confirmação inválida");
    if (!Array.isArray(c.deadlines) || !Array.isArray(c.fees))
      throw new Error("Prazos ou taxas inválidos");
    for (const x of c.deadlines) {
      if (!isISODate(x.date)) throw new Error("Deadline inválido");
      choice(x.kind, [
        "opening",
        "early",
        "regular",
        "late",
        "extended",
        "final",
      ]);
      if (
        typeof x.confirmed !== "boolean" ||
        typeof x.timezone !== "string" ||
        (x.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time))
      )
        throw new Error("Hora de prazo inválida");
      strs(x as unknown as Legacy, ["originalLabel", "sourceId", "supersedes"]);
      try {
        new Intl.DateTimeFormat("pt-BR", { timeZone: x.timezone });
      } catch {
        throw new Error("Fuso de prazo inválido");
      }
      if (c.opening && x.date < c.opening)
        throw new Error("Deadline anterior à abertura");
    }
    for (const f of c.fees) {
      number(f.amount);
      choice(f.free, answers);
      strs(f as unknown as Legacy, [
        "currency",
        "deadlineKind",
        "discount",
        "waiver",
        "notes",
        "sourceId",
      ]);
      arr(f.appliesTo);
      number(f.platformAmount);
      if (f.free === "sim" && f.amount !== null && f.amount !== 0)
        throw new Error("Taxa gratuita com valor diferente de zero");
    }
    sources(c.sources);
  }
  for (const f of d.films) {
    strs(f as unknown as Legacy, [
      "title",
      "internationalTitle",
      "country",
      "region",
      "city",
      "language",
      "director",
      "producers",
      "company",
      "completionDate",
      "premiereDate",
      "premiereCountry",
      "premiereRegion",
      "premiereCity",
      "cpb",
      "synopsis",
      "notes",
    ]);
    if (!f.title.trim()) throw new Error("Filme sem título");
    number(f.year);
    number(f.minutes);
    number(f.durationSeconds);
    arr(f.genres, GENRES);
    arr(f.languages, LANGUAGES);
    arr(f.approaches, APPROACHES);
    arr(f.contentGenres, CONTENT_GENRES);
    arr(f.themes, THEMES);
    arr(f.audiences, AUDIENCES);
    arr(f.participationConditions, PARTICIPATION_CONDITIONS);
    choice(f.workType, ["", ...WORK_TYPES]);
    arr(f.coproduction);
    arr(f.subtitles);
    choice(f.format, ["", ...FORMATS]);
    choice(f.worldPremiereAvailable, answers);
    choice(f.online, ["permitido", "proibido", "restrito", "não confirmado"]);
    choice(f.onlineStatus, [
      "nunca publicado",
      "screener privado",
      "publicação pública atual",
      "publicação pública anterior",
      "sessão online restrita/geobloqueada",
      "TV/VOD",
      "não informado",
    ]);
    if (
      !Array.isArray(f.onlineHistory) ||
      !Array.isArray(f.exhibitionHistory) ||
      !Array.isArray(f.materials)
    )
      throw new Error("Histórico ou materiais inválidos");
    for (const history of f.onlineHistory) {
      strs(history as unknown as Legacy, ["status", "start", "end", "notes"]);
      dates(history as unknown as Legacy, ["start", "end"]);
      arr(history.territories);
    }
    for (const exhibition of f.exhibitionHistory) {
      strs(exhibition as unknown as Legacy, [
        "id",
        "date",
        "event",
        "country",
        "region",
        "city",
        "access",
        "modality",
        "notes",
      ]);
      dates(exhibition as unknown as Legacy, ["date"]);
      choice(exhibition.access, [
        "público",
        "restrito",
        "privado",
        "não informado",
      ]);
      choice(exhibition.modality, [
        "presencial",
        "online",
        "híbrida",
        "TV/VOD",
        "não informado",
      ]);
      if (typeof exhibition.announced !== "boolean")
        throw new Error("Exibição inválida");
    }
    for (const material of f.materials) {
      strs(material as unknown as Legacy, [
        "id",
        "type",
        "version",
        "url",
        "status",
        "notes",
      ]);
      choice(material.status, ["pronto", "revisar", "faltante"]);
      if (typeof material.private !== "boolean")
        throw new Error("Material inválido");
    }
    dates(f as unknown as Legacy, ["completionDate", "premiereDate"]);
    if (
      !Array.isArray(f.links) ||
      f.links.some(
        (l) =>
          typeof l.url !== "string" ||
          typeof l.label !== "string" ||
          typeof l.private !== "boolean",
      )
    )
      throw new Error("Links de filme inválidos");
  }
  const editionById = new Map(d.editions.map((e) => [e.id, e]));
  const callById = new Map(d.calls.map((c) => [c.id, c]));
  for (const s of d.submissions) {
    requireRef("films", s.filmId);
    requireRef("festivals", s.festivalId);
    requireRef("editions", s.editionId);
    requireRef("calls", s.callId);
    if (
      editionById.get(s.editionId)?.festivalId !== s.festivalId ||
      callById.get(s.callId)?.editionId !== s.editionId
    )
      throw new Error(
        "Inscrição combina festival, edição e chamada incompatíveis",
      );
    strs(s as unknown as Legacy, [
      "platform",
      "date",
      "deadline",
      "currency",
      "code",
      "result",
      "resultDate",
      "award",
      "notes",
    ]);
    dates(s as unknown as Legacy, ["date", "deadline", "resultDate"]);
    choice(s.status, SUBMISSION_STATUSES);
    choice(s.planningStatus, [
      "pesquisando",
      "priorizado",
      "aguardando abertura",
      "preparando",
      "fora do plano",
    ]);
    choice(s.sendStatus, [
      "não enviado",
      "enviado",
      "aguardando decisão",
      "retirado",
    ]);
    choice(s.resultStatus, [
      "pendente",
      "selecionado",
      "não selecionado",
      "lista de espera",
      "outro",
    ]);
    choice(s.personalPriority, priorities);
    strs(s as unknown as Legacy, [
      "responsible",
      "protocol",
      "expectedDecisionDate",
      "nextAction",
      "internalDeadline",
    ]);
    dates(s as unknown as Legacy, ["expectedDecisionDate", "internalDeadline"]);
    number(s.fee);
    number(s.originalFee);
    number(s.paidBRL);
    if (
      typeof s.waiverUsed !== "boolean" ||
      !Array.isArray(s.checklist) ||
      !Array.isArray(s.tasks) ||
      !Array.isArray(s.screenings) ||
      !Array.isArray(s.awards)
    )
      throw new Error("Acompanhamento de inscrição inválido");
    for (const item of s.checklist) {
      strs(item as unknown as Legacy, ["item", "notes"]);
      if (typeof item.required !== "boolean" || typeof item.done !== "boolean")
        throw new Error("Checklist inválido");
    }
    for (const task of s.tasks) {
      strs(task as unknown as Legacy, ["id", "title", "due", "kind"]);
      dates(task as unknown as Legacy, ["due"]);
      if (typeof task.done !== "boolean") throw new Error("Tarefa inválida");
    }
    for (const screening of s.screenings) {
      strs(screening as unknown as Legacy, [
        "id",
        "date",
        "place",
        "modality",
        "notes",
      ]);
      dates(screening as unknown as Legacy, ["date"]);
    }
    for (const award of s.awards) {
      strs(award as unknown as Legacy, ["id", "title", "date", "notes"]);
      dates(award as unknown as Legacy, ["date"]);
    }
  }
  if (
    !d.settings ||
    typeof d.settings.name !== "string" ||
    !Number.isInteger(d.settings.staleDays) ||
    d.settings.staleDays < 1 ||
    !Number.isInteger(d.settings.pageSize) ||
    d.settings.pageSize < 10 ||
    d.settings.pageSize > 200
  )
    throw new Error("Configurações inválidas");
  arr(d.settings.festivalColumns);
  if (!Array.isArray(d.settings.savedFestivalViews))
    throw new Error("Vistas salvas inválidas");
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: d.settings.timezone });
  } catch {
    throw new Error("Fuso inválido");
  }
  if (
    !d.archive ||
    !Array.isArray(d.archive.excludedFestivals) ||
    !Array.isArray(d.archive.importReports) ||
    (d.archive.editHistory !== undefined &&
      !Array.isArray(d.archive.editHistory)) ||
    !Array.isArray(d.archive.catalogUpdates)
  )
    throw new Error("Arquivo de preservação ausente");
}
