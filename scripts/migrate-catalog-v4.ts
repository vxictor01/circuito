import { readFile, writeFile } from "node:fs/promises";
import { migrateV3ToV4 } from "../src/migrations/v4";
import { validateDatabase } from "../src/utils/validation";

const path = new URL("../src/data/catalog.json", import.meta.url);
const current = JSON.parse(await readFile(path, "utf8"));
const next = migrateV3ToV4(current);
next.settings.catalogVersion = "2026-10-03.2";
validateDatabase(next);
await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(
  `Catálogo migrado: schema ${next.schemaVersion}, ${next.festivals.length} festivais, ${next.calls.length} chamadas.`,
);
