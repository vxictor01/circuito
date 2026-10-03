import { readFile, access, readdir } from "node:fs/promises";
import path from "node:path";
const html = await readFile("dist/index.html", "utf8");
const manifest = JSON.parse(
  await readFile("dist/manifest.webmanifest", "utf8"),
);
const base = process.env.VITE_BASE_PATH || "/circuito/";
if (manifest.scope !== base || manifest.start_url !== base + "#/")
  throw new Error("Manifest fora da base configurada.");
const paths = [...html.matchAll(/(?:src|href)="([^\"]+)"/g)].map((m) => m[1]);
for (const p of paths) {
  if (!p.startsWith(base)) throw new Error(`Asset fora do base path: ${p}`);
  await access(path.join("dist", p.slice(base.length)));
}
for (const i of manifest.icons) await access("dist/" + i.src);
const sw = await readFile("dist/sw.js", "utf8");
if (!sw.includes(JSON.stringify(base)) || !sw.includes("index.html"))
  throw new Error("Service worker sem fallback correto.");
if (sw.includes("indexedDB.deleteDatabase"))
  throw new Error("Service worker não deve limpar banco.");
const files = await readdir("dist");
if (!files.includes(".nojekyll")) throw new Error(".nojekyll ausente");
console.log(
  `Build estático validado: base ${base}, ${paths.length} assets, manifest e service worker.`,
);
