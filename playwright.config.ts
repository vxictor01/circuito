import { defineConfig } from "@playwright/test";
const base = process.env.VITE_BASE_PATH || "/circuito/";
export default defineConfig({
  testDir: "tests/ui",
  timeout: 30000,
  use: { baseURL: `http://127.0.0.1:4173${base}`, browserName: "chromium" },
  webServer: {
    command: "node scripts/serve-dist.mjs",
    url: `http://127.0.0.1:4173${base}`,
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
