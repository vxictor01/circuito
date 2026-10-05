import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import "fake-indexeddb/auto";
import {
  emptyDatabase,
  blankFestival,
  blankEdition,
  blankCall,
  blankFilm,
  blankSubmission,
} from "../src/utils/defaults";
import { validateDatabase } from "../src/utils/validation";
import { migrateLegacy } from "../src/migrations/legacy";
import {
  readImport,
  mergeCatalogDatabase,
  mergeDatabases,
} from "../src/migrations";
import { backupText, parseBackup, publicExportText } from "../src/utils/backup";
import {
  deadlineStatus,
  effectiveDeadline,
  nextDeadline,
  currentFees,
  todayISO,
  isISODate,
  daysBetween,
} from "../src/utils/deadlines";
import { eligibility } from "../src/utils/eligibility";
import { duplicateEdition } from "../src/utils/duplicate";
import {
  emptyFilters,
  filterFestivalMatches,
  filterFestivals,
  indexes,
} from "../src/utils/search";
import { calendarEvents, calendarToICS } from "../src/utils/calendar";
import { IndexedDBRepository } from "../src/db/repository";
import { safeURL } from "../src/utils/links";
import catalog from "../src/data/catalog.json";
import type { Database } from "../src/types";
const now = new Date("2026-10-03T15:00:00Z");
function sample() {
  const db = emptyDatabase();
  const f = Object.assign(blankFestival("f1"), {
    name: "Festival Exemplo",
    website: "https://example.org/festival",
  });
  const e = blankEdition(f.id, "e1");
  const c = Object.assign(blankCall(e.id, "c1"), {
    name: "Curtas documentais",
    formats: ["curta"],
    genres: ["documentário"],
    genresConfirmed: true,
    maxMinutes: 20,
    minYear: 2025,
    maxYear: 2027,
    pf: "sim",
    pj: "sim",
    premiere: "nenhuma",
    online: "permitido",
    territoriesConfirmed: true,
    confidence: "confirmado",
    opening: "2026-09-01",
    deadlines: [
      {
        kind: "final",
        date: "2026-10-10",
        time: "23:59",
        timezone: "America/Sao_Paulo",
        confirmed: true,
        originalLabel: "prazo final",
        sourceId: "",
        supersedes: "",
      },
    ],
    fees: [
      {
        amount: 0,
        currency: "BRL",
        free: "sim",
        deadlineKind: "final",
        discount: "",
        waiver: "",
        notes: "",
        appliesTo: [],
        platformAmount: null,
        sourceId: "",
      },
    ],
  } as const);
  const film = Object.assign(blankFilm("film1"), {
    title: "Filme privado",
    year: 2026,
    minutes: 14,
    format: "curta",
    genres: ["documentário"],
    worldPremiereAvailable: "sim",
    links: [
      {
        label: "Screener",
        url: "https://example.org/private-film",
        private: true,
      },
    ],
    notes: "Nota pessoal",
  } as const);
  db.festivals.push(f);
  db.editions.push(e);
  db.calls.push(c);
  db.films.push(film);
  return db;
}
const legacy = {
  schemaVersion: 1,
  lastUpdated: "2026-10-03",
  festivals: [
    {
      id: "old-1",
      name: "Festival Legado",
      uf: "MG",
      city: "Belo Horizonte",
      site: "https://example.org/legado",
      favorite: true,
      personalNotes: "Manter minha nota",
      profile: "Documentário",
      editions: [
        {
          year: 2025,
          pf: "Não confirmado",
          pj: "Sim",
          limit: "até 20 minutos",
          rules: "Regra textual completa",
          reg: "https://example.org/regulamento",
          fee: "Consultar",
          exactStart: "Março",
          deadline: "2025-05-31",
          checkedAt: "2025-02-01",
          shorts: "Sim",
          online: "Não informado",
          premiere: "Consultar",
        },
      ],
    },
    {
      id: "old-2",
      name: "Nome abreviado",
      site: "https://example.org/legado",
      editions: [],
    },
    {
      id: "old-animation",
      name: "ANIMAGE — Festival Internacional de Animação de Pernambuco",
      site: "https://animagefestival.com/",
      editions: [{ year: 2025 }],
    },
  ],
  films: [],
  submissions: [],
  customUnknown: { valuable: "preservar" },
};
test("migração legada preserva original, notas, aliases, ambiguidades e exclusão", () => {
  const { db, report } = readImport(legacy);
  assert.equal(report.total, 3);
  assert.equal(report.imported, 1);
  assert.equal(report.merged, 1);
  assert.equal(report.removed.length, 1);
  assert.deepEqual(db.archive.legacyRoot, legacy);
  assert.equal(db.festivals[0].id, "old-1");
  assert.equal(db.festivals[0].personalNotes, "Manter minha nota");
  assert.ok(db.festivals[0].aliases.includes("Nome abreviado"));
  assert.equal(db.calls[0].pf, "não confirmado");
  assert.equal(db.calls[0].maxMinutes, null);
  assert.equal(db.calls[0].opening, "");
  assert.equal(db.calls[0].deadlines[0].confirmed, false);
  assert.ok(report.ambiguous.length > 0);
  assert.equal(db.archive.excludedFestivals.length, 1);
});
test("animação aceita em festival generalista permanece", () => {
  const input = {
    ...legacy,
    festivals: [
      {
        id: "general",
        name: "Festival Geral",
        profile: "Ficção / documentário / animação",
        editions: [{ year: 2026, shorts: "Sim" }],
      },
    ],
  };
  assert.equal(migrateLegacy(input).db.festivals.length, 1);
});
test("backup legível conserva todos os dados e relações após restauração", () => {
  const db = sample();
  db.submissions.push({
    ...blankSubmission("s1"),
    filmId: "film1",
    festivalId: "f1",
    editionId: "e1",
    callId: "c1",
    code: "CODIGO-PRIVADO",
  });
  db.archive.legacyRoot = { raw: "arquivo preservado" };
  const text = backupText(db, now);
  assert.ok(text.includes('\n  "schemaVersion"'));
  const restored = readImport(parseBackup(text)).db;
  for (const key of [
    "festivals",
    "editions",
    "calls",
    "films",
    "submissions",
    "settings",
    "archive",
  ] as const)
    assert.deepEqual(restored[key], db[key]);
  assert.equal(restored.submissions[0].code, "CODIGO-PRIVADO");
});
test("schema recusa JSON inválido, versões futuras e vínculos inconsistentes", () => {
  assert.throws(() => parseBackup("{"));
  assert.throws(
    () => readImport({ ...sample(), schemaVersion: 99 }),
    /não suportado/,
  );
  const db = sample();
  db.submissions.push({
    ...blankSubmission(),
    filmId: "film1",
    festivalId: "f1",
    editionId: "e1",
    callId: "ausente",
  });
  assert.throws(() => validateDatabase(db), /Relacionamento inválido/);
  const wrong = sample();
  wrong.festivals.push({ ...blankFestival("other"), name: "Outro" });
  wrong.submissions.push({
    ...blankSubmission(),
    filmId: "film1",
    festivalId: "other",
    editionId: "e1",
    callId: "c1",
  });
  assert.throws(() => validateDatabase(wrong), /incompatíveis/);
});
test("schema recusa datas impossíveis, faixas invertidas e taxas contraditórias", () => {
  const db = sample();
  db.calls[0].deadlines[0].date = "2026-02-30";
  assert.throws(() => validateDatabase(db), /Deadline inválido/);
  db.calls[0].deadlines[0].date = "2026-10-10";
  db.calls[0].minMinutes = 30;
  assert.throws(() => validateDatabase(db), /invertida/);
  db.calls[0].minMinutes = 0;
  db.calls[0].fees[0].amount = 10;
  assert.throws(() => validateDatabase(db), /gratuita/);
});
test("migração de schema 2 chega ao schema atual sem apagar filmes", () => {
  const old = sample() as unknown as Record<string, unknown>;
  old.schemaVersion = 2;
  delete (old.festivals as Record<string, unknown>[])[0].aliases;
  const next = readImport(old).db;
  assert.equal(next.schemaVersion, 4);
  assert.deepEqual(next.festivals[0].aliases, []);
  assert.equal(next.films[0].notes, "Nota pessoal");
});
test("mescla é pura, deduplica por site e preserva IDs e históricos originais", () => {
  const a = sample();
  a.archive.legacyRoot = { version: "primeira" };
  const b = sample();
  b.festivals[0].id = "different";
  b.festivals[0].name = "Nome oficial atualizado";
  b.editions[0].festivalId = "different";
  b.archive.legacyRoot = { version: "segunda" };
  const before = structuredClone(b);
  const result = mergeDatabases(a, b);
  assert.equal(result.festivals.length, 1);
  assert.equal(result.festivals[0].id, "f1");
  assert.ok(result.festivals[0].aliases.includes("Festival Exemplo"));
  assert.equal(result.editions[0].festivalId, "f1");
  assert.deepEqual(b, before);
  assert.deepEqual(result.archive.legacyHistory, [{ version: "primeira" }]);
  assert.deepEqual(result.archive.legacyRoot, { version: "segunda" });
});
test("plataformas de inscrição diferentes no mesmo domínio não são aliases", () => {
  const a = sample();
  a.festivals[0].website = "https://filmfreeway.com/FestivalA";
  const b = sample();
  b.festivals[0].id = "b";
  b.festivals[0].name = "Festival B";
  b.festivals[0].website = "https://filmfreeway.com/FestivalB";
  b.editions[0].id = "e2";
  b.editions[0].festivalId = "b";
  b.calls[0].id = "c2";
  b.calls[0].editionId = "e2";
  assert.equal(mergeDatabases(a, b).festivals.length, 2);
});
test("datas respeitam fusos e não dependem de diferença por horário de verão", () => {
  assert.equal(
    todayISO("America/Sao_Paulo", new Date("2026-10-04T01:00:00Z")),
    "2026-10-03",
  );
  assert.equal(
    todayISO("Asia/Tokyo", new Date("2026-10-03T23:00:00Z")),
    "2026-10-04",
  );
  assert.equal(daysBetween("2026-03-28", "2026-03-30"), 2);
  assert.equal(isISODate("2026-02-29"), false);
  assert.equal(isISODate("2028-02-29"), true);
});
test("prazos calculam abertura, hoje, amanhã, dias e encerramento", () => {
  const c = sample().calls[0];
  assert.equal(deadlineStatus(c, now).label, "Termina em 7 dias");
  c.opening = "2026-10-05";
  assert.equal(deadlineStatus(c, now).label, "Ainda não abriu");
  c.opening = "";
  c.deadlines[0].date = "2026-10-03";
  assert.equal(deadlineStatus(c, now).label, "Termina hoje");
  c.deadlines[0].time = "11:00";
  assert.equal(deadlineStatus(c, now).label, "Encerrado");
  c.deadlines[0].date = "2026-10-04";
  assert.equal(deadlineStatus(c, now).label, "Termina amanhã");
  c.deadlines[0].date = "2026-10-02";
  assert.equal(deadlineStatus(c, now).label, "Encerrado");
});
test("abertura sozinha e datas antigas/incertas não criam inscrições abertas", () => {
  const c = sample().calls[0];
  c.deadlines[0].kind = "opening";
  assert.equal(effectiveDeadline(c), undefined);
  assert.equal(deadlineStatus(c, now).open, false);
  c.deadlines[0].kind = "final";
  c.deadlines[0].confirmed = false;
  assert.equal(deadlineStatus(c, now).open, false);
  c.deadlines[0].confirmed = true;
  c.confidence = "edição anterior";
  assert.equal(deadlineStatus(c, now).open, false);
});
test("prorrogação substitui encerramento; próxima etapa e taxa são dinâmicas", () => {
  const c = sample().calls[0];
  c.deadlines = [
    { ...c.deadlines[0], kind: "early", date: "2026-10-01" },
    { ...c.deadlines[0], kind: "regular", date: "2026-10-10" },
    { ...c.deadlines[0], kind: "extended", date: "2026-11-30" },
  ];
  c.fees = [
    { ...c.fees[0], deadlineKind: "early" },
    { ...c.fees[0], deadlineKind: "regular", amount: 15, free: "não" },
    { ...c.fees[0], deadlineKind: "extended", amount: 20, free: "não" },
  ];
  assert.equal(effectiveDeadline(c, true)?.date, "2026-11-30");
  assert.equal(nextDeadline(c, now)?.kind, "regular");
  assert.equal(currentFees(c, now)[0].amount, 15);
  const db = sample();
  db.calls[0] = c;
  assert.equal(
    filterFestivals(db, { ...emptyFilters, fee: "free" }, now).length,
    0,
  );
  assert.equal(
    filterFestivals(db, { ...emptyFilters, fee: "paid", deadline: "7" }, now)
      .length,
    1,
  );
});
test("elegibilidade explica compatibilidade, conflito e desconhecidos", () => {
  const db = sample();
  assert.equal(
    eligibility(db.films[0], db.calls[0]).status,
    "compatível pelas regras verificadas",
  );
  db.films[0].minutes = 21;
  const conflict = eligibility(db.films[0], db.calls[0]);
  assert.equal(conflict.status, "incompatível");
  assert.equal(
    conflict.rules.find((r) => r.rule === "Duração precisa")?.state,
    "conflict",
  );
  db.films[0].minutes = 14;
  db.calls[0].pf = "não confirmado";
  db.calls[0].confidence = "edição anterior";
  assert.equal(
    eligibility(db.films[0], db.calls[0]).status,
    "depende de confirmação",
  );
});
test("restrições territoriais e estreia mundial nunca viram compatibilidade automática", () => {
  const db = sample();
  const c = db.calls[0];
  c.countries = ["França"];
  assert.equal(eligibility(db.films[0], c).status, "incompatível");
  c.countries = [];
  c.premiere = "mundial";
  db.films[0].worldPremiereAvailable = "não";
  assert.equal(
    eligibility(db.films[0], c).rules.find((r) => r.rule === "Estreia")?.state,
    "conflict",
  );
  c.premiere = "nacional";
  assert.equal(
    eligibility(db.films[0], c).rules.find((r) => r.rule === "Estreia")?.state,
    "unknown",
  );
});
test("filtros não juntam regras de duas chamadas e preservam desconhecidos", () => {
  const db = sample();
  db.calls[0].pf = "não";
  const other = {
    ...db.calls[0],
    id: "c2",
    pf: "sim" as const,
    maxMinutes: 10,
  };
  db.calls.push(other);
  assert.equal(
    filterFestivals(db, { ...emptyFilters, minutes: "14", pf: "sim" }, now)
      .length,
    0,
  );
  assert.equal(
    filterFestivals(
      db,
      {
        ...emptyFilters,
        query: "festival exemplo",
        country: "Brasil",
        genre: "documentário",
      },
      now,
    ).length,
    1,
  );
  db.calls[0].pf = "não confirmado";
  assert.equal(
    filterFestivals(db, { ...emptyFilters, pf: "sim", minutes: "14" }, now)
      .length,
    0,
  );
});
test("filtros usam edição mais recente, sem reutilizar chamada antiga", () => {
  const db = sample();
  db.editions[0].year = 2025;
  const e = { ...db.editions[0], id: "e2", year: 2027 };
  db.editions.push(e);
  db.calls.push({
    ...db.calls[0],
    id: "c2",
    editionId: "e2",
    pf: "não confirmado",
  });
  assert.equal(
    filterFestivals(db, { ...emptyFilters, pf: "sim" }, now).length,
    0,
  );
});
test("exportação pública remove filmes, inscrições, notas e links privados", () => {
  const db = sample();
  db.festivals[0].personalNotes = "ESTRATÉGIA-SECRETA";
  db.submissions.push({
    ...blankSubmission("private"),
    filmId: "film1",
    festivalId: "f1",
    editionId: "e1",
    callId: "c1",
    protocol: "PROTOCOLO-SECRETO",
  });
  const exported = publicExportText(db);
  assert.doesNotMatch(exported, /ESTRATÉGIA-SECRETA/);
  assert.doesNotMatch(exported, /PROTOCOLO-SECRETO/);
  assert.doesNotMatch(exported, /private-film/);
  const parsed = JSON.parse(exported) as Database;
  assert.deepEqual(parsed.films, []);
  assert.deepEqual(parsed.submissions, []);
  validateDatabase(parsed);
});
test("atualização do catálogo preserva escolhas pessoais e expõe diferenças", () => {
  const current = sample();
  current.settings.catalogVersion = "1";
  current.festivals[0].favorite = true;
  current.festivals[0].personalNotes = "Minha estratégia";
  current.festivals[0].basePriority = "alta";
  const nextCatalog = sample();
  nextCatalog.settings.catalogVersion = "2";
  nextCatalog.festivals[0].description = "Descrição pública atualizada";
  nextCatalog.festivals[0].favorite = false;
  nextCatalog.festivals[0].personalNotes = "";
  nextCatalog.festivals[0].basePriority = "baixa";
  const merged = mergeCatalogDatabase(
    current,
    nextCatalog,
    "2026-10-04T12:00:00.000Z",
  );
  assert.equal(merged.settings.catalogVersion, "2");
  assert.equal(merged.festivals[0].favorite, true);
  assert.equal(merged.festivals[0].personalNotes, "Minha estratégia");
  assert.equal(merged.festivals[0].basePriority, "alta");
  const update = merged.archive.catalogUpdates.find(
    (item) => item.entityType === "festival",
  );
  assert.ok(update?.fields.includes("description"));
  assert.equal(update?.fields.includes("favorite"), false);
  assert.equal(update?.fields.includes("personalNotes"), false);
  assert.equal(update?.fields.includes("basePriority"), false);
});
test("filtros de Brasil e exterior usam localidades, não palavras no nome", () => {
  const db = sample();
  db.festivals[0].name = "Festival Internacional Brasileiro";
  db.festivals[0].locations = [
    {
      id: "loc-br",
      role: "sede",
      countryCode: "BR",
      countryName: "Brasil",
      subdivisionCode: "SP",
      subdivisionName: "São Paulo",
      city: "São Paulo",
      municipalityCode: "3550308",
      district: "",
      confirmed: true,
      sourceIds: [],
    },
  ];
  assert.equal(
    filterFestivals(db, { ...emptyFilters, locationScope: "brasil" }, now)
      .length,
    1,
  );
  assert.equal(
    filterFestivals(db, { ...emptyFilters, locationScope: "exterior" }, now)
      .length,
    0,
  );
  db.festivals[0].locations.push({
    ...db.festivals[0].locations[0],
    id: "loc-fr",
    role: "exibição",
    countryCode: "FR",
    countryName: "França",
    subdivisionCode: "",
    subdivisionName: "Île-de-France",
    city: "Paris",
    municipalityCode: "",
  });
  assert.equal(
    filterFestivals(db, { ...emptyFilters, locationScope: "exterior" }, now)
      .length,
    1,
  );
});
test("festival multicidade aparece uma única vez em filtros de UF e cidade", () => {
  const db = sample();
  const baseLocation = {
    id: "loc-sp",
    role: "sede" as const,
    countryCode: "BR",
    countryName: "Brasil",
    subdivisionCode: "SP",
    subdivisionName: "São Paulo",
    city: "São Paulo",
    municipalityCode: "3550308",
    district: "",
    confirmed: true,
    sourceIds: [],
  };
  db.festivals[0].locations = [
    baseLocation,
    {
      ...baseLocation,
      id: "loc-rj",
      role: "exibição",
      subdivisionCode: "RJ",
      subdivisionName: "Rio de Janeiro",
      city: "Rio de Janeiro",
      municipalityCode: "3304557",
    },
  ];
  assert.equal(
    filterFestivals(db, { ...emptyFilters, region: "SP" }, now).length,
    1,
  );
  assert.equal(
    filterFestivals(db, { ...emptyFilters, region: "RJ" }, now).length,
    1,
  );
  assert.equal(
    filterFestivals(db, { ...emptyFilters, city: "Rio de Janeiro" }, now)
      .length,
    1,
  );
});
test("duração em segundos distingue 20min de 20min30s", () => {
  const db = sample();
  db.calls[0].maxSeconds = 20 * 60;
  db.calls[0].maxInclusive = true;
  db.films[0].durationSeconds = 20 * 60 + 30;
  assert.equal(eligibility(db.films[0], db.calls[0]).status, "incompatível");
  assert.equal(
    filterFestivals(db, { ...emptyFilters, minutes: "20.5" }, now).length,
    0,
  );
  assert.equal(
    filterFestivals(db, { ...emptyFilters, minutes: "20" }, now).length,
    1,
  );
});
test("dados desconhecidos aparecem como pendentes, nunca como confirmação", () => {
  const db = sample();
  db.calls[0].pf = "não confirmado";
  db.calls[0].confidence = "não verificado";
  assert.equal(
    filterFestivals(db, { ...emptyFilters, pf: "sim" }, now).length,
    0,
  );
  const matches = filterFestivalMatches(
    db,
    { ...emptyFilters, pf: "sim", dataQuality: "include-pending" },
    now,
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].confirmedCalls.length, 0);
  assert.equal(matches[0].pendingCalls.length, 1);
});
test("sazonalidade não transforma previsão histórica em data confirmada", () => {
  const db = sample();
  db.festivals[0].seasonality.opening = {
    months: [9],
    evidenceYears: [2024, 2025],
    confidence: "média",
    note: "Estimativa histórica",
  };
  db.calls[0].opening = "";
  db.calls[0].deadlines = [];
  assert.equal(
    filterFestivals(db, { ...emptyFilters, openingMonth: "9" }, now).length,
    1,
  );
  assert.equal(deadlineStatus(db.calls[0], now).open, false);
});
test("relevância documentada e prioridade pessoal são independentes", () => {
  const db = sample();
  db.festivals[0].relevance.score = 88;
  db.festivals[0].relevance.band = "muito alta";
  db.festivals[0].basePriority = "baixa";
  db.submissions.push({
    ...blankSubmission("priority"),
    filmId: "film1",
    festivalId: "f1",
    editionId: "e1",
    callId: "c1",
    personalPriority: "alta",
  });
  assert.equal(
    filterFestivals(db, { ...emptyFilters, relevanceMin: "80" }, now).length,
    1,
  );
  assert.equal(
    filterFestivals(
      db,
      { ...emptyFilters, filmId: "film1", priority: "alta" },
      now,
    ).length,
    1,
  );
  assert.equal(db.festivals[0].basePriority, "baixa");
});
test("calendário inclui tarefas e prazo interno sem exportar protocolo privado", () => {
  const db = sample();
  db.submissions.push({
    ...blankSubmission("calendar"),
    filmId: "film1",
    festivalId: "f1",
    editionId: "e1",
    callId: "c1",
    protocol: "SEGREDO-123",
    internalDeadline: "2026-10-08",
    tasks: [
      {
        id: "task-1",
        title: "Revisar legendas",
        due: "2026-10-07",
        done: false,
        kind: "material",
      },
    ],
  });
  const events = calendarEvents(db);
  assert.ok(events.some((event) => event.kind === "prazo interno"));
  assert.ok(events.some((event) => event.kind === "tarefa"));
  assert.doesNotMatch(calendarToICS(events), /SEGREDO-123/);
});
test("duplicar edição limpa datas e exige revalidação da nova edição", () => {
  const db = sample();
  const result = duplicateEdition(db.editions[0], db.calls, 2027);
  assert.notEqual(result.edition.id, db.editions[0].id);
  assert.equal(result.edition.year, 2027);
  assert.equal(result.edition.start, "");
  assert.equal(result.calls[0].opening, "");
  assert.equal(result.calls[0].deadlines.length, 0);
  assert.equal(result.calls[0].confidence, "não verificado");
  assert.equal(result.calls[0].maxMinutes, 20);
  assert.equal(result.calls[0].genresConfirmed, false);
});
test("IndexedDB preserva dados após nova instância e rejeita restauração inválida", async () => {
  const name = "persist-" + crypto.randomUUID();
  const repo = new IndexedDBRepository(name);
  const db = sample();
  await repo.replace(db);
  const reopened = new IndexedDBRepository(name);
  assert.deepEqual(await reopened.load(), db);
  const invalid = structuredClone(db);
  invalid.calls[0].editionId = "ausente";
  await assert.rejects(() => reopened.replace(invalid));
  assert.deepEqual(await reopened.load(), db);
});
test("IndexedDB aborta escrita inteira quando há falha de clonagem", async () => {
  const repo = new IndexedDBRepository("atomic-" + crypto.randomUUID());
  const db = sample();
  await repo.replace(db);
  const bad = sample();
  bad.archive.legacyRoot = { notSerializable: () => 0 };
  await assert.rejects(() => repo.replace(bad));
  assert.deepEqual(await repo.load(), db);
});
test("upgrade de IndexedDB adiciona índices e migra schema sem reset", async () => {
  const name = "upgrade-" + crypto.randomUUID();
  const old = sample() as unknown as Record<string, unknown>;
  old.schemaVersion = 2;
  delete (old.festivals as Record<string, unknown>[])[0].aliases;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      for (const t of [
        "festivals",
        "editions",
        "calls",
        "films",
        "submissions",
        "meta",
      ])
        request.result.createObjectStore(t, { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(
        ["festivals", "editions", "calls", "films", "submissions", "meta"],
        "readwrite",
      );
      for (const t of [
        "festivals",
        "editions",
        "calls",
        "films",
        "submissions",
      ])
        for (const item of old[t] as unknown[]) tx.objectStore(t).put(item);
      for (const k of ["schemaVersion", "settings", "archive"])
        tx.objectStore("meta").put({ id: k, value: old[k] });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
  const restored = await new IndexedDBRepository(name).load();
  assert.equal(restored.schemaVersion, 4);
  assert.equal(restored.films[0].links[0].private, true);
  assert.equal(restored.films[0].notes, "Nota pessoal");
});
test("catálogo público contém ao menos 150 IDs únicos e nenhum dado pessoal", () => {
  validateDatabase(catalog);
  const db = catalog as Database;
  assert.ok(db.festivals.length >= 150);
  assert.equal(db.films.length, 0);
  assert.equal(db.submissions.length, 0);
  assert.equal(db.archive.legacyRoot, undefined);
  assert.ok(db.festivals.every((f) => !f.favorite && !f.personalNotes));
  assert.ok(db.festivals.every((f) => f.sources.length > 0));
  assert.equal(
    new Set(db.festivals.map((f) => f.id)).size,
    db.festivals.length,
  );
});
test("lote BR-01 alimenta filtros sem combinar regras de chamadas distintas", () => {
  const db = catalog as Database;
  const index = indexes(db);
  const current = new Date("2026-10-04T15:00:00Z");
  const rioLong = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Festival do Rio",
      format: "longa",
      premiere: "municipal",
    },
    current,
    index,
  );
  const rioShort = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Festival do Rio",
      format: "curta",
      premiere: "municipal",
    },
    current,
    index,
  );
  const fantaspoaPaid = filterFestivals(
    db,
    { ...emptyFilters, query: "Fantaspoa", fee: "paid" },
    current,
    index,
  );
  const ecofalanteNoPremiere = filterFestivals(
    db,
    { ...emptyFilters, query: "Ecofalante", premiere: "none" },
    current,
    index,
  );
  assert.deepEqual(
    rioLong.map((festival) => festival.id),
    ["festival-007"],
  );
  assert.equal(rioShort.length, 0);
  assert.deepEqual(
    fantaspoaPaid.map((festival) => festival.id),
    ["festival-016"],
  );
  assert.deepEqual(
    ecofalanteNoPremiere.map((festival) => festival.id),
    ["festival-018"],
  );
});
test("lote BR-02 preserva localidades, desconhecidos e coerência por chamada", () => {
  const db = catalog as Database;
  const index = indexes(db);
  const current = new Date("2026-10-04T15:00:00Z");
  const inEditSalvador = filterFestivals(
    db,
    { ...emptyFilters, query: "In-Edit Brasil", city: "Salvador" },
    current,
    index,
  );
  const santosImpossibleCombination = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Santos Film Fest",
      format: "longa",
      participation: "universitário",
    },
    current,
    index,
  );
  const triunfoOpenAndFree = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Cinema de Triunfo",
      format: "longa",
      fee: "free",
      deadline: "30",
    },
    current,
    index,
  );
  const cineEsquemaUnknownDuration = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Cine Esquema Novo",
      minutes: "10",
    },
    current,
    index,
  );
  const cineEsquemaPendingDuration = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Cine Esquema Novo",
      minutes: "10",
      dataQuality: "include-pending",
    },
    current,
    index,
  );
  const olharLongAt25 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Olhar do Norte",
      format: "longa",
      minutes: "25",
    },
    current,
    index,
  );
  const olharShortAt25 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Olhar do Norte",
      format: "curta",
      minutes: "25",
    },
    current,
    index,
  );
  assert.deepEqual(
    inEditSalvador.map((festival) => festival.id),
    ["festival-030"],
  );
  assert.equal(santosImpossibleCombination.length, 0);
  assert.deepEqual(
    triunfoOpenAndFree.map((festival) => festival.id),
    ["festival-038"],
  );
  assert.equal(cineEsquemaUnknownDuration.length, 0);
  assert.deepEqual(
    cineEsquemaPendingDuration.map((festival) => festival.id),
    ["festival-029"],
  );
  assert.equal(olharLongAt25.length, 0);
  assert.deepEqual(
    olharShortAt25.map((festival) => festival.id),
    ["festival-043"],
  );
});
test("lote BR-03 mantém regras, taxas e territórios na mesma chamada", () => {
  const db = catalog as Database;
  const index = indexes(db);
  const current = new Date("2026-10-04T15:00:00Z");
  const caruaruEdition = db.editions.find(
    (edition) => edition.festivalId === "festival-060" && edition.year === 2026,
  );
  const caruaruInfantil = db.calls.find(
    (call) =>
      call.editionId === caruaruEdition?.id && call.name === "Mostra Infantil",
  );
  const sescUnknownFeeIsNotFree = filterFestivals(
    db,
    { ...emptyFilters, query: "Mostra Sesc de Cinema", fee: "free" },
    current,
    index,
  );
  const primeiroPlanoImpossibleCombination = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Primeiro Plano",
      format: "longa",
      participation: "universitário",
    },
    current,
    index,
  );
  const cineAlterLongAt51 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "CineAlter",
      format: "longa",
      minutes: "51",
      city: "Alter do Chão",
    },
    current,
    index,
  );
  const adeliaLongAt70 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Adélia Sampaio",
      format: "longa",
      minutes: "70",
    },
    current,
    index,
  );
  const adeliaLongAt71 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Adélia Sampaio",
      format: "longa",
      minutes: "71",
    },
    current,
    index,
  );
  assert.equal(caruaruInfantil?.maxMinutes, 15);
  assert.deepEqual(caruaruInfantil?.audiences, ["infantil"]);
  assert.equal(sescUnknownFeeIsNotFree.length, 0);
  assert.equal(primeiroPlanoImpossibleCombination.length, 0);
  assert.deepEqual(
    cineAlterLongAt51.map((festival) => festival.id),
    ["festival-062"],
  );
  assert.equal(adeliaLongAt70.length, 0);
  assert.deepEqual(
    adeliaLongAt71.map((festival) => festival.id),
    ["festival-055"],
  );
});
test("lote BR-04 preserva faixas, gratuidade e regras atuais sem promover texto residual", () => {
  const db = catalog as Database;
  const index = indexes(db);
  const current = new Date("2026-10-04T15:00:00Z");
  const bonitoLongAt20 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Bonito CineSur",
      format: "longa",
      minutes: "20",
      fee: "free",
    },
    current,
    index,
  );
  const bonitoShortAt20 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Bonito CineSur",
      format: "curta",
      minutes: "20",
      fee: "free",
    },
    current,
    index,
  );
  const finosFirstFeatureAt21 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Finos Filmes",
      minutes: "21",
      participation: "direção estreante",
    },
    current,
    index,
  );
  const finosFirstFeatureAt20 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Finos Filmes",
      minutes: "20",
      participation: "direção estreante",
    },
    current,
    index,
  );
  const missoesEdition = db.editions.find(
    (edition) => edition.festivalId === "festival-missoes",
  );
  const missoesCall = db.calls.find(
    (call) => call.editionId === missoesEdition?.id,
  );
  assert.equal(bonitoLongAt20.length, 0);
  assert.deepEqual(
    bonitoShortAt20.map((festival) => festival.id),
    ["festival-bonito"],
  );
  assert.equal(finosFirstFeatureAt21.length, 0);
  assert.deepEqual(
    finosFirstFeatureAt20.map((festival) => festival.id),
    ["festival-finos"],
  );
  assert.equal(missoesEdition?.confidence, "parcial");
  assert.equal(missoesCall?.confidence, "parcial");
  assert.equal(missoesCall?.fees[0]?.amount, 5);
});
test("lote BR-05 separa chamadas, limites e desconhecidos nos filtros", () => {
  const db = catalog as Database;
  const index = indexes(db);
  const current = new Date("2026-10-04T15:00:00Z");
  const mostraLongaComEstreia = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Mostra Internacional de Cinema em São Paulo",
      format: "longa",
      minutes: "70",
      premiere: "nacional",
    },
    current,
    index,
  );
  const mostraCurta = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Mostra Internacional de Cinema em São Paulo",
      format: "curta",
    },
    current,
    index,
  );
  const mostraTaxaDesconhecidaNaoGratuita = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Mostra Internacional de Cinema em São Paulo",
      fee: "free",
    },
    current,
    index,
  );
  const estranhosCurta45 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Estranhos Encontros",
      format: "curta",
      minutes: "45",
      fee: "paid",
    },
    current,
    index,
  );
  const estranhosLonga45 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Estranhos Encontros",
      format: "longa",
      minutes: "45",
      fee: "paid",
    },
    current,
    index,
  );
  const sururuCurta30 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Mostra Sururu",
      format: "curta",
      minutes: "30",
      region: "AL",
      fee: "free",
    },
    current,
    index,
  );
  const sururuCurta31 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Mostra Sururu",
      format: "curta",
      minutes: "31",
      region: "AL",
      fee: "free",
    },
    current,
    index,
  );
  const macacuEdition = db.editions.find(
    (edition) => edition.festivalId === "festival-macacucine",
  );
  const micro = db.calls.find(
    (call) =>
      call.editionId === macacuEdition?.id && call.name === "Micrometragens",
  );
  assert.deepEqual(
    mostraLongaComEstreia.map((festival) => festival.id),
    ["festival-mostrasp"],
  );
  assert.equal(mostraCurta.length, 0);
  assert.equal(mostraTaxaDesconhecidaNaoGratuita.length, 0);
  assert.deepEqual(
    estranhosCurta45.map((festival) => festival.id),
    ["festival-estranhos"],
  );
  assert.deepEqual(
    estranhosLonga45.map((festival) => festival.id),
    ["festival-estranhos"],
  );
  assert.deepEqual(
    sururuCurta30.map((festival) => festival.id),
    ["festival-sururu"],
  );
  assert.equal(sururuCurta31.length, 0);
  assert.equal(micro?.maxSeconds, 30);
  assert.equal(micro?.fees[0]?.amount, 0);
});
test("lote BR-06 preserva limites, isenções e desconhecidos por chamada", () => {
  const db = catalog as Database;
  const index = indexes(db);
  const current = new Date("2026-10-04T15:00:00Z");
  const cph49 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "CPH:DOX",
      format: "média",
      minutes: "49",
      fee: "paid",
    },
    current,
    index,
  );
  const cph50 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "CPH:DOX",
      format: "média",
      minutes: "50",
      fee: "paid",
    },
    current,
    index,
  );
  const docsBarcelona60 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "DocsBarcelona",
      format: "longa",
      minutes: "60",
      fee: "paid",
    },
    current,
    index,
  );
  const dokBrazilWaiver = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "DOK Leipzig",
      format: "curta",
      fee: "waiver",
    },
    current,
    index,
  );
  const mataPinhaisFree = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Mata Atlântica Film Festival",
      city: "Pinhais",
      fee: "free",
    },
    current,
    index,
  );
  const iffrShort64 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "IFFR",
      format: "curta",
      minutes: "64",
    },
    current,
    index,
  );
  const sundanceInternational50 = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Sundance",
      format: "longa",
      minutes: "50",
      premiere: "internacional",
    },
    current,
    index,
  );
  const uppsalaUnknownPremiereIsNotNone = filterFestivals(
    db,
    {
      ...emptyFilters,
      query: "Uppsala",
      premiere: "none",
    },
    current,
    index,
  );
  assert.deepEqual(cph49.map((festival) => festival.id), ["festival-cphdox"]);
  assert.equal(cph50.length, 0);
  assert.deepEqual(docsBarcelona60.map((festival) => festival.id), [
    "festival-docsbarcelona",
  ]);
  assert.deepEqual(dokBrazilWaiver.map((festival) => festival.id), [
    "festival-dokleipzig",
  ]);
  assert.deepEqual(mataPinhaisFree.map((festival) => festival.id), [
    "festival-mataatlantica",
  ]);
  assert.equal(iffrShort64.length, 0);
  assert.deepEqual(sundanceInternational50.map((festival) => festival.id), [
    "festival-sundance",
  ]);
  assert.equal(uppsalaUnknownPremiereIsNotNone.length, 0);
});
test("lote BR-07 mantém conflitos, lacunas e compatibilidade na mesma chamada", () => {
  const db = catalog as Database;
  const index = indexes(db);
  const current = new Date("2026-10-04T15:00:00Z");
  const run = (query: string, filters: Partial<typeof emptyFilters>) =>
    filterFestivals(db, { ...emptyFilters, query, ...filters }, current, index);

  assert.deepEqual(
    run("Encounters Film Festival", {
      format: "curta",
      minutes: "39",
      fee: "paid",
    }).map((festival) => festival.id),
    ["festival-encounters"],
  );
  assert.equal(
    run("Encounters Film Festival", {
      format: "curta",
      minutes: "40",
      fee: "paid",
    }).length,
    0,
  );
  assert.deepEqual(
    run("Toronto International Film Festival", {
      format: "curta",
      minutes: "40",
      premiere: "continental",
      fee: "paid",
    }).map((festival) => festival.id),
    ["festival-tiff"],
  );
  assert.equal(
    run("Toronto International Film Festival", {
      format: "curta",
      minutes: "41",
      fee: "paid",
    }).length,
    0,
  );
  assert.equal(
    run("SXSW Film & TV Festival", {
      format: "curta",
      minutes: "40",
      fee: "paid",
    }).length,
    0,
  );
  assert.equal(
    run("Paris Courts Devant", { fee: "free" }).length,
    0,
  );
  assert.deepEqual(
    run("Palm Springs International ShortFest", {
      format: "curta",
      minutes: "40",
      deadline: "open",
    }).map((festival) => festival.id),
    ["festival-palmsprings"],
  );

  const berlinEdition = db.editions.find(
    (edition) => edition.festivalId === "festival-berlinale",
  );
  const locarnoEdition = db.editions.find(
    (edition) => edition.festivalId === "festival-locarno",
  );
  assert.equal(berlinEdition?.confidence, "parcial");
  assert.equal(locarnoEdition?.confidence, "parcial");
  assert.equal(berlinEdition?.notes.includes("503"), true);
  assert.equal(locarnoEdition?.notes.includes("402"), true);
});
test("lote BR-08 separa limites, território e chamadas não públicas", () => {
  const db = catalog as Database;
  const index = indexes(db);
  const current = new Date("2026-10-04T15:00:00Z");
  const run = (query: string, filters: Partial<typeof emptyFilters>) =>
    filterFestivals(db, { ...emptyFilters, query, ...filters }, current, index);

  assert.deepEqual(
    run("Docudays UA", {
      format: "curta",
      minutes: "40",
      fee: "paid",
    }).map((festival) => festival.id),
    ["festival-docudays"],
  );
  assert.equal(
    run("Docudays UA", {
      format: "média",
      minutes: "40",
      fee: "paid",
    }).length,
    0,
  );
  assert.deepEqual(
    run("Docudays UA", {
      format: "média",
      minutes: "41",
      fee: "paid",
    }).map((festival) => festival.id),
    ["festival-docudays"],
  );
  assert.deepEqual(
    run("FEST — New Directors", {
      format: "curta",
      minutes: "54",
      fee: "paid",
    }).map((festival) => festival.id),
    ["festival-fest"],
  );
  assert.deepEqual(
    run("FEST — New Directors", {
      format: "longa",
      minutes: "55",
      fee: "paid",
    }).map((festival) => festival.id),
    ["festival-fest"],
  );
  assert.equal(
    run("FEST — New Directors", {
      format: "curta",
      minutes: "55",
    }).length,
    0,
  );
  assert.equal(
    run("Ambulante", { deadline: "open" }).length,
    0,
  );

  const moreliaEdition = db.editions.find(
    (edition) => edition.festivalId === "festival-morelia",
  );
  const moreliaCalls = db.calls.filter(
    (call) => call.editionId === moreliaEdition?.id,
  );
  assert.equal(
    moreliaCalls.every((call) => call.countries.includes("México")),
    true,
  );
  assert.equal(
    db.editions.find((edition) => edition.festivalId === "festival-habana")
      ?.confidence,
    "edição anterior",
  );
});
test("lote BR-09 preserva limites, datas futuras e confiança documental", () => {
  const db = catalog as Database;
  const index = indexes(db);
  const current = new Date("2026-10-04T15:00:00Z");
  const run = (query: string, filters: Partial<typeof emptyFilters>) =>
    filterFestivals(db, { ...emptyFilters, query, ...filters }, current, index);

  assert.equal(db.settings.catalogVersion, "2026-10-04.11");
  assert.deepEqual(
    run("SEMINCI", { format: "curta", minutes: "30" }).map(
      (festival) => festival.id,
    ),
    ["festival-seminci"],
  );
  assert.equal(
    run("SEMINCI", { format: "longa", minutes: "60" }).length,
    0,
  );
  assert.deepEqual(
    run("SEMINCI", { format: "longa", minutes: "61" }).map(
      (festival) => festival.id,
    ),
    ["festival-seminci"],
  );
  assert.deepEqual(
    run("Festival de Málaga", {
      language: "documentário",
      format: "curta",
      minutes: "30",
      fee: "paid",
    }).map((festival) => festival.id),
    ["festival-malaga"],
  );
  assert.equal(
    run("Festival de Málaga", {
      language: "ficção",
      format: "curta",
      fee: "free",
    }).length,
    0,
  );
  assert.deepEqual(
    run("Slamdance", {
      format: "curta",
      minutes: "39",
      fee: "paid",
    }).map((festival) => festival.id),
    ["festival-slamdance"],
  );
  assert.equal(
    run("Slamdance", { format: "curta", minutes: "40" }).length,
    0,
  );
  assert.deepEqual(
    run("Slamdance", {
      format: "longa",
      minutes: "41",
      fee: "paid",
    }).map((festival) => festival.id),
    ["festival-slamdance"],
  );
  assert.deepEqual(
    run("Seattle International", {
      format: "curta",
      minutes: "40",
      fee: "paid",
    }).map((festival) => festival.id),
    ["festival-siff"],
  );
  assert.deepEqual(
    run("Seattle International", {
      format: "longa",
      minutes: "41",
      fee: "paid",
    }).map((festival) => festival.id),
    ["festival-siff"],
  );
  assert.equal(run("Frameline", { deadline: "open" }).length, 0);
  assert.deepEqual(
    run("BOGOSHORTS", {
      format: "curta",
      minutes: "30",
      fee: "paid",
      premiere: "nacional",
      onlineRule: "proibido",
    }).map((festival) => festival.id),
    ["festival-bogoshorts"],
  );

  const bfiEdition = db.editions.find(
    (edition) => edition.festivalId === "festival-bfiflare",
  );
  const nashvilleEdition = db.editions.find(
    (edition) => edition.festivalId === "festival-nashville",
  );
  const ambulante = db.festivals.find(
    (festival) => festival.id === "festival-ambulante",
  );
  assert.equal(bfiEdition?.confidence, "edição anterior");
  assert.equal(nashvilleEdition?.confidence, "edição anterior");
  assert.equal(ambulante?.traveling, true);
  assert.deepEqual(ambulante?.locations, []);
});
test("URL externa aceita somente HTTP/HTTPS", () => {
  assert.equal(safeURL("javascript:alert(1)"), "");
  assert.equal(safeURL("data:text/html,secret"), "");
  assert.ok(safeURL("https://example.org/"));
});
test("filtros sobre 2000 festivais / 18000 chamadas continuam rápidos", () => {
  const db = emptyDatabase();
  const base = sample();
  for (let i = 0; i < 2000; i++) {
    const id = "f" + i;
    db.festivals.push({ ...base.festivals[0], id });
    for (let year = 2024; year <= 2026; year++) {
      const eid = id + "-" + year;
      db.editions.push({ ...base.editions[0], id: eid, festivalId: id, year });
      for (let j = 0; j < 3; j++)
        db.calls.push({ ...base.calls[0], id: eid + "-" + j, editionId: eid });
    }
  }
  const begin = performance.now();
  const idx = indexes(db);
  const result = filterFestivals(
    db,
    {
      ...emptyFilters,
      genre: "documentário",
      format: "curta",
      pf: "sim",
      fee: "free",
      minutes: "14",
      deadline: "30",
    },
    now,
    idx,
  );
  const duration = performance.now() - begin;
  assert.equal(result.length, 2000);
  assert.ok(duration < 2500, `Filtro levou ${duration.toFixed(0)} ms`);
  console.log(
    `BENCHMARK: 2000 festivais, 18000 chamadas: ${duration.toFixed(1)} ms`,
  );
});
