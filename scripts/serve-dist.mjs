// Servidor de verificação local. GitHub Pages publica somente dist/; nenhum servidor é usado em produção.
import http from "node:http";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
const root = path.resolve("dist");
const html = await readFile(path.join(root, "index.html"), "utf8");
const base = html.match(/href="([^\"]*)icon\.svg"/)?.[1];
if (!base) throw Error("Execute npm run build antes de servir dist.");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (!url.pathname.startsWith(base)) {
        res.writeHead(404);
        res.end("404");
        return;
      }
      let relative = decodeURIComponent(url.pathname.slice(base.length));
      if (!relative) relative = "index.html";
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile())
        throw Error("404");
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 — arquivo não encontrado");
    }
  })
  .listen(4173, "127.0.0.1", () =>
    console.log(
      `Arquivos estáticos em http://127.0.0.1:4173${base}; caminhos inexistentes retornam 404.`,
    ),
  );
