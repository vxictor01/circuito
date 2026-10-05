import {
  SCHEMA_VERSION,
  type Database,
  type ImportReport,
  type Legacy,
} from "../types";
import { migrateLegacy, norm, websiteKey } from "./legacy";
import { validateDatabase } from "../utils/validation";
import { emptyDatabase } from "../utils/defaults";
import { migrateV3ToV4 } from "./v4";
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
    const db = migrateV3ToV4(r.db);
    validateDatabase(db);
    return { ...r, db };
  }
  let db = structuredClone(raw) as unknown as Database;
  const originalVersion = Number(raw.schemaVersion);
  if (raw.schemaVersion === 2) {
    (db as unknown as Legacy).schemaVersion = 3;
    db.festivals = db.festivals.map((f) => ({
      ...f,
      aliases: f.aliases || [],
    }));
    db.settings = { ...emptyDatabase().settings, ...db.settings };
    db.archive = db.archive || emptyDatabase().archive;
  }
  if (originalVersion === 2 || originalVersion === 3) db = migrateV3ToV4(db);
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
        originalVersion === 2
          ? [
              "Schema 2 → 3: aliases e configurações adicionados",
              "Schema 3 → 4: localidades, taxonomias, pesquisa e acompanhamento normalizados",
            ]
          : originalVersion === 3
            ? [
                "Schema 3 → 4: localidades, taxonomias, pesquisa e acompanhamento normalizados",
              ]
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
  out.archive.editHistory = [
    ...(out.archive.editHistory || []),
    ...(incoming.archive.editHistory || []),
  ].slice(-200);
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

const catalogFestivalPersonalFields = new Set([
  "favorite",
  "priority",
  "basePriority",
  "personalNotes",
]);

const changedCatalogFields = (
  current: Legacy,
  incoming: Legacy,
  excluded = new Set<string>(),
) => {
  const values: Legacy = {};
  for (const [field, value] of Object.entries(incoming)) {
    if (field === "id" || field === "legacy" || excluded.has(field)) continue;
    if (JSON.stringify(current[field]) !== JSON.stringify(value))
      values[field] = structuredClone(value) as never;
  }
  return values;
};

export function mergeCatalogDatabase(
  current: Database,
  incoming: Database,
  detectedAt = new Date().toISOString(),
) {
  const updates: Database["archive"]["catalogUpdates"] = [];
  const festivalIds = new Map<string, string>();
  for (const festival of incoming.festivals) {
    const key = websiteKey(festival.website);
    const match = current.festivals.find(
      (item) =>
        item.id === festival.id ||
        (norm(item.name) === norm(festival.name) &&
          norm(item.country) === norm(festival.country)) ||
        (key && websiteKey(item.website) === key) ||
        item.aliases.some((alias) => norm(alias) === norm(festival.name)),
    );
    festivalIds.set(festival.id, match?.id || festival.id);
    if (!match) continue;
    const values = changedCatalogFields(
      match as unknown as Legacy,
      festival as unknown as Legacy,
      catalogFestivalPersonalFields,
    );
    if (Object.keys(values).length)
      updates.push({
        festivalId: match.id,
        detectedAt,
        fields: Object.keys(values),
        entityType: "festival",
        entityId: match.id,
        incoming: values,
      });
  }
  for (const edition of incoming.editions) {
    const match = current.editions.find((item) => item.id === edition.id);
    if (!match) continue;
    const values = changedCatalogFields(
      match as unknown as Legacy,
      edition as unknown as Legacy,
    );
    if (Object.keys(values).length)
      updates.push({
        festivalId: festivalIds.get(edition.festivalId) || edition.festivalId,
        detectedAt,
        fields: Object.keys(values),
        entityType: "edition",
        entityId: match.id,
        incoming: values,
      });
  }
  for (const call of incoming.calls) {
    const match = current.calls.find((item) => item.id === call.id);
    if (!match) continue;
    const edition = incoming.editions.find(
      (item) => item.id === call.editionId,
    );
    const values = changedCatalogFields(
      match as unknown as Legacy,
      call as unknown as Legacy,
    );
    if (Object.keys(values).length)
      updates.push({
        festivalId:
          festivalIds.get(edition?.festivalId || "") ||
          edition?.festivalId ||
          "",
        detectedAt,
        fields: Object.keys(values),
        entityType: "call",
        entityId: match.id,
        incoming: values,
      });
  }
  const out = mergeDatabases(current, incoming, "current");
  const keys = new Set(
    updates.map((update) => `${update.entityType}:${update.entityId}`),
  );
  out.archive.catalogUpdates = [
    ...out.archive.catalogUpdates.filter(
      (update) =>
        !keys.has(
          `${update.entityType || "festival"}:${update.entityId || update.festivalId}`,
        ),
    ),
    ...updates,
  ];
  out.settings.catalogVersion = incoming.settings.catalogVersion;
  validateDatabase(out);
  return out;
}
