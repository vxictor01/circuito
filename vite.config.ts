import { defineConfig } from "vite";

// A mesma configuração é usada localmente e no Actions. Não depende da raiz do domínio.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/circuito/",
  esbuild: { jsx: "automatic" },
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { target: "es2022", sourcemap: false },
});
