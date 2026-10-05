import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  emptyDatabase,
  blankFestival,
  blankEdition,
  blankCall,
  blankFilm,
  blankSubmission,
} from "../../src/utils/defaults";
const date = new Date("2026-10-03T15:00:00Z");
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(date);
});
async function createFilm(
  page: import("@playwright/test").Page,
  title: string,
) {
  await page.goto("./#/filmes");
  await page.getByRole("button", { name: "+ Novo filme" }).click();
  await page.getByLabel("Título *", { exact: true }).fill(title);
  await page.getByLabel("Ano de produção", { exact: true }).fill("2026");
  await page.getByLabel("Duração (minutos)").fill("14");
  await page.getByLabel("Formato", { exact: true }).selectOption("curta");
  await page
    .getByRole("checkbox", { name: "documentário", exact: true })
    .check();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: title, exact: true }),
  ).toBeVisible();
}
test("produção em subdiretório, assets, hash routing, refresh e 404 real", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./#/festivais/festival-fest");
  await expect(
    page.getByRole("heading", {
      name: "FEST — New Directors New Films Festival",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "FEST — New Directors New Films Festival",
      exact: true,
    }),
  ).toBeVisible();
  const manifest = await (await request.get("manifest.webmanifest")).json();
  expect(manifest.scope).toBe(new URL(page.url()).pathname);
  expect(manifest.start_url).toBe(manifest.scope + "#/");
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).status()).toBe(200);
  expect((await request.get("caminho-inexistente/filmes")).status()).toBe(404);
  expect(errors).toEqual([]);
});
test("cadastro de filme, link privado, edição e persistência após refresh", async ({
  page,
}) => {
  await createFilm(page, "Memória da chuva");
  await page
    .getByRole("link", { name: "Memória da chuva", exact: true })
    .click();
  await page.getByRole("button", { name: "Editar ficha" }).click();
  await page.getByRole("button", { name: "+ Adicionar link" }).click();
  await page
    .getByLabel("URL", { exact: true })
    .fill("https://example.org/screener-privado");
  await page
    .getByLabel("Notas pessoais", { exact: true })
    .fill("Minha anotação privada");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Minha anotação privada", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Screener" })).toHaveAttribute(
    "href",
    "https://example.org/screener-privado",
  );
});
test("favorito, filtros combinados, cards e modo mantido após reload", async ({
  page,
}) => {
  await page.goto("./#/festivais");
  await page
    .getByLabel("Buscar festivais", { exact: true })
    .fill("BOGOSHORTS");
  await expect(
    page.getByRole("row").filter({ hasText: "BOGOSHORTS" }),
  ).toContainText("Gratuito ou pago por categoria");
  await page
    .getByLabel("Buscar festivais", { exact: true })
    .fill("FEST — New Directors");
  const row = page
    .getByRole("row")
    .filter({ hasText: "FEST — New Directors New Films Festival" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: /Adicionar aos favoritos/ }).click();
  await page
    .getByRole("button", { name: "Filtros avançados", exact: true })
    .click();
  await page.getByLabel("País", { exact: true }).selectOption("Portugal");
  await page.getByLabel("Formato", { exact: true }).selectOption("curta");
  await page.getByLabel("Taxa", { exact: true }).selectOption("paid");
  await page.getByLabel("Prazo", { exact: true }).selectOption("open");
  await page.getByRole("checkbox", { name: "Favoritos", exact: true }).check();
  await expect(
    page.getByRole("status").filter({ hasText: "festival encontrado" }),
  ).toContainText("1 festival encontrado");
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cards", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".festival-card")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Cards", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("importação legada mostra relatório, mescla, aliases e exclusões preservadas", async ({
  page,
}) => {
  await page.goto("./#/dados");
  const legacy = {
    schemaVersion: 1,
    festivals: [
      {
        id: "user-festival",
        name: "Meu Festival Legado",
        site: "https://example.org/festival",
        personalNotes: "Nota preservada",
        profile: "Documentário",
        editions: [
          {
            year: 2025,
            shorts: "Sim",
            limit: "Consultar regulamento",
            pf: "Não confirmado",
            deadline: "2025-06-30",
          },
        ],
      },
      {
        id: "animation-user",
        name: "ANIMAGE — Festival Internacional de Animação de Pernambuco",
        editions: [{ year: 2025 }],
      },
    ],
    films: [],
    submissions: [],
    lastUpdated: "2026-10-03",
  };
  await page.getByLabel("Escolher backup JSON").setInputFiles({
    name: "Circuito_legacy_v1.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await expect(page.getByText("2 no arquivo", { exact: true })).toBeVisible();
  await expect(page.getByText("1 importados", { exact: true })).toBeVisible();
  await expect(
    page.getByText("1 excluídos do catálogo", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar importação" }).click();
  await expect(
    page.getByText("Relatório da última importação", { exact: true }),
  ).toBeVisible();
  await page.goto("./#/festivais/user-festival");
  await expect(
    page.getByText("Nota preservada", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Prazo não confirmado", { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Meu Festival Legado", exact: true }),
  ).toBeVisible();
});
test("exporta todos os vínculos e restaura em navegador novo", async ({
  page,
  browser,
}) => {
  const db = emptyDatabase();
  db.festivals.push({
    ...blankFestival("backup-f"),
    name: "Festival do backup",
  });
  db.editions.push(blankEdition("backup-f", "backup-e"));
  db.calls.push({
    ...blankCall("backup-e", "backup-c"),
    name: "Competição brasileira",
  });
  db.films.push({
    ...blankFilm("backup-film"),
    title: "Filme do backup",
    links: [
      { label: "Privado", url: "https://example.org/private", private: true },
    ],
  });
  db.submissions.push({
    ...blankSubmission("backup-s"),
    filmId: "backup-film",
    festivalId: "backup-f",
    editionId: "backup-e",
    callId: "backup-c",
    code: "PRIVADO-123",
    status: "inscrito",
    sendStatus: "aguardando decisão",
  });
  await page.goto("./#/dados");
  await page.getByLabel("Escolher backup JSON").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(db)),
  });
  await page.getByRole("button", { name: "Confirmar importação" }).click();
  await expect(
    page.getByText(
      "Importação concluída. Os dados estão guardados neste navegador.",
      { exact: true },
    ),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar backup", exact: true })
    .click();
  const download = await downloadPromise;
  const bytes = await readFile((await download.path())!);
  const parsed = JSON.parse(bytes.toString());
  expect(parsed.submissions[0].code).toBe("PRIVADO-123");
  expect(parsed.films[0].links[0].private).toBe(true);
  const context = await browser.newContext();
  const second = await context.newPage();
  await second.goto(page.url());
  await second.getByLabel("Escolher backup JSON").setInputFiles({
    name: "restore.json",
    mimeType: "application/json",
    buffer: bytes,
  });
  await second.getByRole("button", { name: "Confirmar importação" }).click();
  await second.goto(new URL("./#/inscricoes", page.url()).href);
  await expect(
    second.getByRole("link", { name: "Filme do backup", exact: true }),
  ).toBeVisible();
  await second.reload();
  await second.goto(new URL("./#/inscricoes", page.url()).href);
  await expect(
    second
      .getByRole("row")
      .filter({ hasText: "Filme do backup" })
      .getByText("aguardando decisão", { exact: true }),
  ).toBeVisible();
  await context.close();
});
test("arquivo corrompido não modifica a base existente", async ({ page }) => {
  await createFilm(page, "Antes do erro");
  await page.goto("./#/dados");
  await page.getByLabel("Escolher backup JSON").setInputFiles({
    name: "corrompido.json",
    mimeType: "application/json",
    buffer: Buffer.from("{incompleto"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar importação" }),
  ).toHaveCount(0);
  await page.goto("./#/filmes");
  await expect(
    page.getByRole("link", { name: "Antes do erro", exact: true }),
  ).toBeVisible();
});
test("consulta, cria e persiste filme offline com PWA de produção", async ({
  page,
  context,
}) => {
  await page.goto("./#/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  try {
    await createFilm(page, "Filme criado offline");
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Filme criado offline", exact: true }),
    ).toBeVisible();
    await page.goto("./#/festivais/festival-fest");
    await expect(
      page.getByRole("heading", {
        name: "FEST — New Directors New Films Festival",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
test("ativação de uma atualização de PWA preserva IndexedDB", async ({
  page,
}) => {
  await createFilm(page, "Preservado após atualização");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await navigator.serviceWorker.register(
      new URL("sw.js?update-verification=1", document.baseURI),
    );
    await registration.update();
  });
  await page.waitForFunction(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return !!r?.waiting || r?.active?.scriptURL.includes("update-verification");
  });
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    r?.waiting?.postMessage({ type: "SKIP_WAITING" });
  });
  await page.waitForFunction(() =>
    navigator.serviceWorker.controller?.scriptURL.includes(
      "update-verification",
    ),
  );
  await page.reload();
  await expect(
    page.getByRole("link", {
      name: "Preservado após atualização",
      exact: true,
    }),
  ).toBeVisible();
});
test("teclado, pesquisa global e foco no formulário", async ({ page }) => {
  await page.goto("./#/");
  await expect(
    page.getByRole("heading", { name: "O próximo movimento.", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(page.getByLabel("Busca global")).toBeFocused();
  await page.getByLabel("Busca global").fill("FEST — New Directors");
  await expect(page.locator(".search-results")).toBeVisible();
  await page.goto("./#/filmes");
  await page.getByRole("button", { name: "+ Novo filme" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Novo filme");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("layout móvel mantém navegação e formulários acessíveis", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./#/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.goto("./#/filmes");
  await page.getByRole("button", { name: "+ Novo filme" }).click();
  await expect(page.getByLabel("Título *", { exact: true })).toBeVisible();
  await page.getByLabel("Título *", { exact: true }).fill("Filme no celular");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Filme no celular", exact: true }),
  ).toBeVisible();
});

test("formulários criam festival, edição, chamada, inscrição e duplicam sem datas antigas", async ({
  page,
}) => {
  await createFilm(page, "Filme para inscrição");
  await page.goto("./#/festivais");
  await page.getByRole("button", { name: "+ Novo festival" }).click();
  await page
    .getByLabel("Nome oficial *", { exact: true })
    .fill("Festival criado no formulário");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByLabel("Buscar festivais", { exact: true })
    .fill("Festival criado no formulário");
  await page
    .getByRole("link", { name: "Festival criado no formulário", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Nova edição" }).click();
  await page.getByLabel("Ano *", { exact: true }).fill("2026");
  await page
    .getByLabel("Início do festival", { exact: true })
    .fill("2026-11-01");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "+ Nova chamada" }).click();
  await page
    .getByLabel("Nome da chamada / competição *", { exact: true })
    .fill("Curtas brasileiros");
  await page.getByRole("checkbox", { name: "curta", exact: true }).check();
  await page
    .getByRole("checkbox", { name: "documentário", exact: true })
    .check();
  await page.getByLabel("Duração máxima (min)", { exact: true }).fill("20");
  await page.getByLabel("Pessoa física", { exact: true }).selectOption("sim");
  await page.getByRole("button", { name: "+ Adicionar prazo" }).click();
  await page.getByLabel("Data", { exact: true }).fill("2026-10-09");
  await page.getByRole("checkbox", { name: "Confirmado", exact: true }).check();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const festivalURL = page.url();
  await page.goto("./#/inscricoes");
  await page.getByRole("button", { name: "+ Nova inscrição" }).click();
  await page
    .getByRole("combobox", { name: "Filme *", exact: true })
    .selectOption({ label: "Filme para inscrição" });
  await page
    .getByRole("combobox", { name: "Festival *", exact: true })
    .selectOption({ label: "Festival criado no formulário" });
  await page
    .getByRole("combobox", { name: "Edição *", exact: true })
    .selectOption({ index: 1 });
  await page
    .getByRole("combobox", { name: "Chamada *", exact: true })
    .selectOption({ label: "Curtas brasileiros" });
  await page
    .getByLabel("Protocolo (privado)", { exact: true })
    .fill("TESTE-SINTETICO-123");
  await page
    .getByRole("dialog")
    .getByLabel("Situação do envio", { exact: true })
    .selectOption("enviado");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: "Filme para inscrição" }),
  ).toContainText("enviado");
  await page.goto(festivalURL);
  await page.getByLabel("Ano da nova edição", { exact: true }).fill("2027");
  await page.getByRole("button", { name: "Duplicar edição anterior" }).click();
  await expect(page.locator("#edition-select option:checked")).toContainText(
    "2027",
  );
  await page.goto("./#/dados");
  const promise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar backup", exact: true })
    .click();
  const download = await promise;
  const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
  const f = backup.festivals.find(
    (x: { name: string }) => x.name === "Festival criado no formulário",
  );
  const es = backup.editions.filter(
    (e: { festivalId: string }) => e.festivalId === f.id,
  );
  expect(es).toHaveLength(2);
  const next = es.find((e: { year: number }) => e.year === 2027);
  expect(next.start).toBe("");
  expect(
    backup.calls.find((c: { editionId: string }) => c.editionId === next.id)
      .deadlines,
  ).toEqual([]);
  expect(backup.submissions[0].code).toBe("TESTE-SINTETICO-123");
});

test("calendário combina mês, tipo e confirmação e configurações persistem", async ({
  page,
}) => {
  await page.goto("./#/calendario");
  await expect(
    page.getByRole("heading", { name: "Calendário", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await page
    .getByLabel("Tipo de evento", { exact: true })
    .selectOption("deadline");
  await page
    .getByRole("checkbox", { name: "Somente datas confirmadas" })
    .check();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Slamdance Film Festival" })
      .first(),
  ).toContainText("06/10/2026");
  await page.getByLabel("Mês", { exact: true }).fill("2027-01");
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Internationale Kurzfilmtage Oberhausen" })
      .first(),
  ).toContainText("18/01/2027");
  await expect(
    page.getByRole("row").filter({ hasText: "Slamdance Film Festival" }),
  ).toHaveCount(0);
  await page.goto("./#/configuracoes");
  await page.getByLabel("Seu nome", { exact: true }).fill("Pesquisa sintética");
  await page
    .getByLabel("Fuso padrão", { exact: true })
    .selectOption("Europe/Lisbon");
  await page
    .getByLabel("Festivais por página", { exact: true })
    .selectOption("25");
  await page
    .getByRole("button", { name: "Salvar preferências", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Preferências salvas");
  await page.reload();
  await expect(page.getByLabel("Seu nome", { exact: true })).toHaveValue(
    "Pesquisa sintética",
  );
  await expect(page.getByLabel("Fuso padrão", { exact: true })).toHaveValue(
    "Europe/Lisbon",
  );
  await expect(
    page.getByLabel("Festivais por página", { exact: true }),
  ).toHaveValue("25");
  await page.goto("./#/calendario");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("table", { name: "Calendário mensal" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBe(true);
});
