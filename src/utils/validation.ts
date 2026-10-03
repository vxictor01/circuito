import {
  SCHEMA_VERSION,
  FORMATS,
  GENRES,
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
  const sources = (v: unknown) => {
    if (!Array.isArray(v)) throw new Error("Fontes inválidas");
    for (const s of v) {
      strs(s, ["url", "type", "checkedAt", "confidence", "note"]);
      dates(s, ["checkedAt"]);
      arr(s.fields);
      choice(s.type, [
        "oficial",
        "plataforma de inscrição",
        "fonte secundária",
        "estimativa",
        "não verificado",
      ]);
      choice(s.confidence, confidence);
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
    choice(f.priority, ["alta", "média", "baixa", "sem prioridade"]);
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
    arr(c.countries);
    arr(c.regions);
    dates(c as unknown as Legacy, ["opening", "checkedAt"]);
    for (const v of [c.minMinutes, c.maxMinutes, c.minYear, c.maxYear])
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
    choice(c.online, ["permitido", "proibido", "restrito", "não confirmado"]);
    choice(c.confidence, confidence);
    if (
      typeof c.genresConfirmed !== "boolean" ||
      typeof c.territoriesConfirmed !== "boolean"
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
      ]);
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
    arr(f.genres, GENRES);
    arr(f.coproduction);
    arr(f.subtitles);
    choice(f.format, ["", ...FORMATS]);
    choice(f.worldPremiereAvailable, answers);
    choice(f.online, ["permitido", "proibido", "restrito", "não confirmado"]);
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
    number(s.fee);
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
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: d.settings.timezone });
  } catch {
    throw new Error("Fuso inválido");
  }
  if (
    !d.archive ||
    !Array.isArray(d.archive.excludedFestivals) ||
    !Array.isArray(d.archive.importReports)
  )
    throw new Error("Arquivo de preservação ausente");
}
