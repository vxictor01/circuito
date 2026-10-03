import {
  SCHEMA_VERSION,
  type Database,
  type ImportReport,
  type Legacy,
} from "../types";
import { migrateLegacy, norm, websiteKey } from "./legacy";
import { validateDatabase } from "../utils/validation";
import { emptyDatabase } from "../utils/defaults";
export function readImport(input: unknown): {
  db: Database;
  report: ImportReport;
} {
  if (!input || typeof input !== "object")
    throw new Error("O arquivo não contém um backup JSON.");
  const raw = input as Legacy;
  if (
    raw.schemaVersion === 1 &&
    Array.isArray(raw.festivals) &&
    !Array.isArray(raw.editions)
  ) {
    const r = migrateLegacy(raw);
    validateDatabase(r.db);
    return r;
  }
  const db = structuredClone(raw) as unknown as Database;
  if (raw.schemaVersion === 2) {
    db.schemaVersion = SCHEMA_VERSION;
    db.festivals = db.festivals.map((f) => ({
      ...f,
      aliases: f.aliases || [],
    }));
    db.settings = { ...emptyDatabase().settings, ...db.settings };
    db.archive = db.archive || emptyDatabase().archive;
  }
  if (db.schemaVersion !== SCHEMA_VERSION)
    throw new Error(
      `Schema ${raw.schemaVersion} não suportado. Atualize o Circuito antes de restaurar este backup.`,
    );
  validateDatabase(db);
  return {
    db,
    report: {
      total: db.festivals.length,
      imported: db.festivals.length,
      merged: 0,
      convertedFields:
        raw.schemaVersion === 2
          ? ["Schema 2 → 3: aliases e configurações adicionados"]
          : [],
      ambiguous: [],
      preserved: ["Todas as entidades e arquivo de preservação"],
      errors: [],
      removed: [],
    },
  };
}
export function mergeDatabases(
  current: Database,
  incoming: Database,
  prefer: "incoming" | "current" = "incoming",
): Database {
  const out = structuredClone(current);
  incoming = structuredClone(incoming);
  const ids = new Map<string, string>();
  for (const f of incoming.festivals) {
    const key = websiteKey(f.website);
    const match = out.festivals.find(
      (x) =>
        x.id === f.id ||
        (norm(x.name) === norm(f.name) &&
          norm(x.country) === norm(f.country)) ||
        (key && websiteKey(x.website) === key) ||
        x.aliases.some((a) => norm(a) === norm(f.name)),
    );
    if (match) {
      ids.set(f.id, match.id);
      const winner = prefer === "incoming" ? f : match;
      Object.assign(match, winner, {
        id: match.id,
        aliases: [
          ...new Set([
            ...match.aliases,
            ...f.aliases,
            ...(match.name !== f.name ? [match.name, f.name] : []),
          ]),
        ],
        legacy: { ...match.legacy, ...f.legacy },
      });
    } else {
      out.festivals.push(f);
      ids.set(f.id, f.id);
    }
  }
  for (const e of incoming.editions)
    e.festivalId = ids.get(e.festivalId) || e.festivalId;
  for (const s of incoming.submissions)
    s.festivalId = ids.get(s.festivalId) || s.festivalId;
  for (const table of ["editions", "calls", "films", "submissions"] as const) {
    const map = new Map(out[table].map((x) => [x.id, x]));
    for (const item of incoming[table]) {
      if (prefer === "incoming" || !map.has(item.id))
        map.set(item.id, item as never);
    }
    out[table] = [...map.values()] as never;
  }
  out.archive.excludedFestivals = [
    ...new Map(
      [
        ...out.archive.excludedFestivals,
        ...incoming.archive.excludedFestivals,
      ].map((x) => [JSON.stringify(x), x]),
    ).values(),
  ];
  out.archive.importReports.push(...incoming.archive.importReports);
  out.archive.legacyHistory = [
    ...(out.archive.legacyHistory || []),
    ...(incoming.archive.legacyHistory || []),
  ];
  if (incoming.archive.legacyRoot) {
    if (
      out.archive.legacyRoot &&
      JSON.stringify(out.archive.legacyRoot) !==
        JSON.stringify(incoming.archive.legacyRoot)
    )
      out.archive.legacyHistory.push(out.archive.legacyRoot);
    out.archive.legacyRoot = incoming.archive.legacyRoot;
  }
  out.settings = {
    ...out.settings,
    ...(prefer === "incoming" ? incoming.settings : {}),
    catalogVersion:
      current.settings.catalogVersion || incoming.settings.catalogVersion,
  };
  validateDatabase(out);
  return out;
}
