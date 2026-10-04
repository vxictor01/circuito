# Relatório de testes — revisão completa

Data: 2026-10-04. Branch: `codex/revisao-completa-circuito`.

## Resultado final

- TypeScript (`tsc --noEmit`): **aprovado**.
- Testes de núcleo (`tests/core.test.ts`): **32/32 aprovados**.
- Testes de interface no Chromium (`tests/ui/circuito.spec.ts`): **12/12 aprovados**.
- Build Vite de produção: **aprovado**.
- Geração PWA: **aprovada**, com base `/circuito/` e cache versionado.
- Verificação do artefato (`scripts/check-dist.mjs`): **aprovada** para assets, manifest, service worker e caminhos do GitHub Pages.
- Benchmark de filtros: 2.000 festivais e 18.000 chamadas em aproximadamente 1,45 s; limite do teste: 2,5 s.

O Chromium 141 do Playwright precisou ser instalado no ambiente. A primeira tentativa não executou os testes por ausência do binário; após a instalação, a suíte funcional completa passou.

## Cobertura funcional automatizada

Os testes de núcleo verificam:

- migração dos schemas antigos, preservação de `legacy`, vínculos e restauração fiel;
- persistência e atomicidade do IndexedDB;
- Brasil/exterior pela localidade do evento, múltiplas cidades e contagens sem duplicação;
- busca sem acentos, edição mais recente e critérios operacionais na mesma chamada;
- duração em segundos, limites, prazos, prorrogações, fuso, sazonalidade e desconhecidos;
- compatibilidade, conflito territorial, estreia, relevância separada de prioridade e benchmark;
- atualização do catálogo sem perda de escolhas pessoais;
- calendário/ICS sem protocolo privado e exportação pública saneada;
- integridade do catálogo real e ausência de filmes/inscrições no catálogo publicado.

Os testes de navegador verificam:

- funcionamento sob `/circuito/`, hash routing, recarga e 404;
- cadastro/edição de filme, link privado e persistência após recarga;
- favoritos, filtros cumulativos, tabela/cards e estado preservado;
- prévia/importação legada, relatório, aliases e exclusões;
- backup completo, restauração em outro contexto e arquivo corrompido sem alteração da base;
- uso offline, atualização PWA sem perda do IndexedDB;
- teclado, foco, navegação e formulário em viewport móvel;
- criação encadeada de festival, edição, chamada e inscrição;
- duplicação anual sem herdar datas confirmadas;
- calendário por mês/tipo/confirmação e configurações persistentes.

## Relação com os 22 testes de aceite

Os itens 1, 2, 5–15 e 17–21 possuem cobertura automatizada direta ou combinada nas suítes. Os itens 3, 4, 16 e 22 também são exercitados por validação estrutural/catálogo real e pela interface, mas dependem de revisão documental ou inspeção manual para cada novo dado editado. A matriz de pesquisa é a evidência auditável do item 22.

Pendência que não deve ser confundida com falha técnica: 177 festivais ainda não tiveram o regulamento atual integralmente pesquisado. Eles permanecem como edição anterior, pendente ou não localizado e não entram como compatíveis no modo “somente confirmados”.

## Comandos reproduzíveis

Com Node e as dependências instaladas:

```text
npm run typecheck
npm test
npm run build
npm run check:dist
npm run test:ui
```

O fluxo de GitHub Actions executa as mesmas famílias de validação antes da publicação.
