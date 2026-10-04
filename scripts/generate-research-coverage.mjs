import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const db = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/catalog.json"), "utf8"),
);
const output = path.join(root, "docs/pesquisa");
fs.mkdirSync(output, { recursive: true });

const fields = [
  "localização",
  "atividade",
  "categorias",
  "duração",
  "elegibilidade territorial",
  "produção/conclusão",
  "estreia",
  "exibição online",
  "pessoa autorizada a inscrever",
  "taxas",
  "abertura",
  "encerramento",
  "realização",
  "relevância",
];
const csv = (rows) =>
  "\ufeff" +
  rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\r\n") +
  "\r\n";

const editionByFestival = new Map();
for (const edition of db.editions) {
  const current = editionByFestival.get(edition.festivalId);
  if (!current || edition.year > current.year)
    editionByFestival.set(edition.festivalId, edition);
}
const callsByEdition = new Map();
for (const call of db.calls) {
  const calls = callsByEdition.get(call.editionId) || [];
  calls.push(call);
  callsByEdition.set(call.editionId, calls);
}

const matrixRows = [
  [
    "festival_id",
    "festival",
    "país",
    "localidades",
    "edição_consultada",
    "confiança_edição",
    "chamadas",
    "chamadas_confirmadas",
    "regulamento",
    "último_acesso",
    ...fields,
    "pendências",
  ],
];
for (const festival of db.festivals) {
  const edition = editionByFestival.get(festival.id);
  const calls = callsByEdition.get(edition?.id) || [];
  const dates = [
    ...festival.sources,
    ...(edition?.sources || []),
    ...calls.flatMap((call) => call.sources),
  ]
    .map((source) => source.accessedAt || source.checkedAt)
    .filter(Boolean)
    .sort();
  const pending = fields.filter((field) => {
    const status = festival.researchCoverage[field]?.status || "pendente";
    return status !== "confirmado na edição atual";
  });
  matrixRows.push([
    festival.id,
    festival.name,
    festival.country,
    festival.locations
      .map((location) =>
        [
          location.city,
          location.subdivisionCode || location.subdivisionName,
          location.countryName,
        ]
          .filter(Boolean)
          .join(" / "),
      )
      .join(" | ") ||
      (festival.traveling
        ? "itinerante; sem sede fixa confirmada"
        : "não estruturada"),
    edition
      ? `${edition.year}${edition.number ? ` / ${edition.number}` : ""}`
      : "",
    edition?.confidence || "",
    calls.length,
    calls.filter((call) => call.confidence === "confirmado").length,
    edition?.rulesUrl || calls.find((call) => call.rulesUrl)?.rulesUrl || "",
    dates.at(-1) || "",
    ...fields.map(
      (field) => festival.researchCoverage[field]?.status || "pendente",
    ),
    pending.join(" | "),
  ]);
}
fs.writeFileSync(path.join(output, "MATRIZ_COBERTURA.csv"), csv(matrixRows));

const sourceRows = [
  [
    "entidade",
    "entidade_id",
    "festival_id",
    "fonte_id",
    "título",
    "url",
    "tipo",
    "edição",
    "seção",
    "estado_evidência",
    "confiança",
    "verificado_em",
    "acessado_em",
    "campos",
    "observação",
  ],
];
const addSources = (entity, entityId, festivalId, sources) => {
  for (const item of sources)
    sourceRows.push([
      entity,
      entityId,
      festivalId,
      item.id,
      item.title,
      item.url,
      item.type,
      item.editionLabel,
      item.section,
      item.evidenceState,
      item.confidence,
      item.checkedAt,
      item.accessedAt,
      item.fields.join(" | "),
      item.note,
    ]);
};
for (const festival of db.festivals)
  addSources("festival", festival.id, festival.id, festival.sources);
for (const edition of db.editions)
  addSources("edição", edition.id, edition.festivalId, edition.sources);
for (const call of db.calls) {
  const edition = db.editions.find((item) => item.id === call.editionId);
  addSources("chamada", call.id, edition?.festivalId || "", call.sources);
}
fs.writeFileSync(path.join(output, "INVENTARIO_FONTES.csv"), csv(sourceRows));

const statusCounts = Object.fromEntries(
  fields.map((field) => [
    field,
    db.festivals.reduce((counts, festival) => {
      const status = festival.researchCoverage[field]?.status || "pendente";
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {}),
  ]),
);
const currentFestivals = db.festivals.filter((festival) =>
  festival.sources.some(
    (item) => item.evidenceState === "confirmado na edição atual",
  ),
).length;
const fullyCurrent = db.festivals.filter((festival) =>
  fields.every(
    (field) =>
      festival.researchCoverage[field]?.status === "confirmado na edição atual",
  ),
).length;
const exceptions = db.festivals.filter(
  (festival) => !festival.locations.length && festival.traveling,
);
const summary = `# Cobertura da pesquisa documental

Gerado em 2026-10-04 a partir do catálogo ${db.settings.catalogVersion}.

## Escopo efetivamente conferido

- Festivais no inventário: **${db.festivals.length}**.
- Festivais com ao menos uma fonte confirmada na edição atual: **${currentFestivals}**.
- Festivais com todas as 14 dimensões de cobertura confirmadas na edição atual: **${fullyCurrent}**.
- Edições marcadas como confirmadas: **${db.editions.filter((edition) => edition.confidence === "confirmado").length}/${db.editions.length}**.
- Chamadas marcadas como confirmadas: **${db.calls.filter((call) => call.confidence === "confirmado").length}/${db.calls.length}**.
- Avaliações de relevância avaliadas: **${db.festivals.filter((festival) => festival.relevance.status === "avaliada").length}**; provisórias: **${db.festivals.filter((festival) => festival.relevance.status === "provisória").length}**; pendentes: **${db.festivals.filter((festival) => festival.relevance.status === "pendente").length}**.
- Exceções sem localidade fixa: **${exceptions.length}**${exceptions.length ? ` (${exceptions.map((festival) => festival.name).join(", ")})` : ""}.

Nesta etapa foram lidos integralmente e estruturados os regulamentos/páginas oficiais do Festival de Brasília 2026, Curta Kinoforum 2026, Curta Cinema 2027, É Tudo Verdade 2026 e FestCurtasBH 2026. Para o Curta Cinema, a qualificação dos prêmios da competição nacional e internacional também foi conferida na lista oficial da 99ª edição do Oscar. No É Tudo Verdade, o reconhecimento pela Academia permanece identificado como declaração do próprio regulamento, sem validação independente neste lote. Os demais registros continuam identificados como edição anterior, parciais, não localizados ou pendentes; não são declarados integralmente conferidos.

## Contagem por campo e estado

| Campo | Atual confirmada | Edição anterior | Pendente | Não localizado | Outros |
|---|---:|---:|---:|---:|---:|
${fields
  .map((field) => {
    const counts = statusCounts[field];
    const current = counts["confirmado na edição atual"] || 0;
    const previous = counts["confirmado em edição anterior"] || 0;
    const pending = counts.pendente || 0;
    const missing = counts["não localizado"] || 0;
    const others = db.festivals.length - current - previous - pending - missing;
    return `| ${field} | ${current} | ${previous} | ${pending} | ${missing} | ${others} |`;
  })
  .join("\n")}

## Arquivos

- \`MATRIZ_COBERTURA.csv\`: uma linha por festival, com edição, chamada, fonte e pendências por campo.
- \`INVENTARIO_FONTES.csv\`: uma linha por fonte de festival, edição ou chamada, com estado da evidência e campos respaldados.

## Limitação real

A internet está acessível. O impedimento é de volume e tempo de leitura documental: **${db.festivals.length - db.editions.filter((edition) => edition.confidence === "confirmado").length} festivais ainda não tiveram o regulamento atual integralmente estruturado neste lote**; **${db.festivals.length - currentFestivals}** não têm sequer uma fonte do festival marcada como atual. Links existentes não contam como leitura. A aplicação mantém esses casos como pendentes e o modo “somente confirmados” não os promove a compatíveis.
`;
fs.writeFileSync(path.join(output, "RESUMO_PESQUISA.md"), summary);
console.log(
  `Coverage generated for ${db.festivals.length} festivals and ${sourceRows.length - 1} sources.`,
);
