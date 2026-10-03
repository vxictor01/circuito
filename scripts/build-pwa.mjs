import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const root = path.resolve("dist");
async function walk(dir) {
  const all = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) all.push(...(await walk(p)));
    else all.push(p);
  }
  return all;
}
const html = await readFile(path.join(root, "index.html"), "utf8");
const base = html.match(/href="([^\"]*)icon\.svg"/)?.[1];
if (!base || !base.startsWith("/") || !base.endsWith("/"))
  throw new Error("Base inválida; use /nome-do-repositorio/ ou /.");
const manifest = {
  name: "Circuito — circulação de filmes",
  short_name: "Circuito",
  description: "Pesquisa, filmes e inscrições. Dados locais, backup portátil.",
  lang: "pt-BR",
  id: base,
  start_url: base + "#/",
  scope: base,
  display: "standalone",
  background_color: "#f4f3ed",
  theme_color: "#315648",
  icons: [
    {
      src: "icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
    { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
  ],
};
await writeFile(
  path.join(root, "manifest.webmanifest"),
  JSON.stringify(manifest, null, 2),
);
await writeFile(path.join(root, ".nojekyll"), "");
const files = (await walk(root))
  .filter((p) => !p.endsWith("sw.js") && !p.endsWith(".map"))
  .sort();
const hash = createHash("sha256");
for (const f of files) hash.update(await readFile(f));
const version = hash.digest("hex").slice(0, 16);
const urls = files
  .map((p) => base + path.relative(root, p).replaceAll(path.sep, "/"))
  .filter((u) => !u.endsWith(".nojekyll"));
const source = `/* Circuito: cache estático versionado. Não acessa nem apaga IndexedDB. */
const BASE=${JSON.stringify(base)};
const PREFIX='circuito:'+BASE+':';
const CACHE=PREFIX+${JSON.stringify(version)};
const FILES=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request;const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>response.ok?response:caches.match(BASE+'index.html')).catch(()=>caches.match(BASE+'index.html')));return;}
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
`;
await writeFile(path.join(root, "sw.js"), source);
console.log(`PWA: ${urls.length} arquivos, base ${base}, versão ${version}.`);
