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
import { readImport, mergeDatabases } from "../src/migrations";
import { backupText, parseBackup } from "../src/utils/backup";
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
import { emptyFilters, filterFestivals, indexes } from "../src/utils/search";
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
test("migração de schema 2 preenche novos campos sem apagar filmes", () => {
  const old = sample() as unknown as Record<string, unknown>;
  old.schemaVersion = 2;
  delete (old.festivals as Record<string, unknown>[])[0].aliases;
  const next = readImport(old).db;
  assert.equal(next.schemaVersion, 3);
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
    "provavelmente compatível",
  );
  db.films[0].minutes = 21;
  const conflict = eligibility(db.films[0], db.calls[0]);
  assert.equal(conflict.status, "possível conflito");
  assert.equal(
    conflict.rules.find((r) => r.rule === "Duração")?.state,
    "conflict",
  );
  db.films[0].minutes = 14;
  db.calls[0].pf = "não confirmado";
  db.calls[0].confidence = "edição anterior";
  assert.equal(
    eligibility(db.films[0], db.calls[0]).status,
    "faltam informações",
  );
});
test("restrições territoriais e estreia mundial nunca viram compatibilidade automática", () => {
  const db = sample();
  const c = db.calls[0];
  c.countries = ["França"];
  assert.equal(eligibility(db.films[0], c).status, "possível conflito");
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
  assert.equal(restored.schemaVersion, 3);
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
