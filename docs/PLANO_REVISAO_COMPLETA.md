# Plano de revisão completa do Circuito

Atualizado em 2026-10-04. Branch de trabalho: `codex/revisao-completa-circuito`.

## Objetivo verificável

Evoluir o aplicativo publicado sem substituir sua arquitetura local-first: normalizar e versionar o modelo público e pessoal, fazer os filtros operarem sobre chamadas coerentes, tornar lacunas auditáveis e preservar a restauração dos backups dos schemas 1–3.

## Baseline confirmado

- Repositório: `https://github.com/vxictor01/circuito.git`, `main` em `3e9f2c4` no início do trabalho.
- Aplicação: React 19 + TypeScript + Vite, versão `1.0.0`.
- Persistência: IndexedDB (`circuito-personal`, versão física 2), schema lógico 3.
- Catálogo: 182 festivais, 182 edições, 188 chamadas, 26 países e 106 festivais no Brasil.
- Publicação: GitHub Actions em push para `main`; build validado é enviado ao GitHub Pages em `/circuito/`.
- Dados pessoais: filmes e inscrições não fazem parte do catálogo público; os backups fornecidos permanecem fora do repositório.

## Etapas e checkpoints

1. **Diagnóstico e proteção**
   - Rodar testes da versão recebida e registrar o baseline.
   - Inventariar inconsistências do catálogo e cobertura documental sem expor dados pessoais.
2. **Schema 4, migração e normalização**
   - Separar localidades, taxonomias, situação documental, relevância e prioridade pessoal.
   - Migrar schemas 1–3 de forma versionada, preservando IDs, vínculos e `legacy`.
   - Normalizar múltiplas cidades/UFs e códigos de país sem inferir localidades desconhecidas.
3. **Consultas, filtros e visualizações**
   - Garantir que critérios operacionais coexistam na mesma chamada.
   - Implementar Brasil/exterior, cidade/UF/país dependentes, estados desconhecidos, abertura/realização, custo, relevância e prioridade.
   - Separar colunas, contagens de festivais/chamadas, paginação e estado de navegação.
4. **Pesquisa documental e relevância**
   - Manter matriz de cobertura por festival e fonte por edição/chamada.
   - Preencher somente fatos sustentados por documentos efetivamente consultados.
   - Aplicar rubrica explícita; informação insuficiente permanece pendente, sem nota fabricada.
5. **Filmes, inscrições e rotina**
   - Duração em segundos, histórico de exibição, disponibilidade online factual, materiais e checklist.
   - Separar planejamento, envio, resultado, exibições, tarefas e orçamento.
6. **Aceite e entrega**
   - Ampliar testes unitários, migração/restauração, catálogo real e interface.
   - Validar privacidade, exportação pública, teclado/tela pequena, build/PWA e GitHub Pages.
   - Documentar cobertura e pendências reais e preparar a branch para pull request.

## Situação em 2026-10-04

- **Concluído — estrutura e preservação:** schema 4, migração 1–3, localidades múltiplas, taxonomias separadas, duração em segundos, histórico online/exibições, materiais, checklist e acompanhamento de inscrições. A migração do catálogo foi executada uma única vez e não será reaplicada.
- **Concluído — filtros prioritários:** Brasil/exterior pela sede real, país/UF/cidade dependentes, modalidade, linguagem, formato, duração, ano, PF/PJ, estreia, chamadas abertas, sazonalidade, realização, taxa, teto BRL, relevância, prioridade, qualidade documental e compatibilidade. Critérios operacionais são resolvidos dentro da mesma chamada da edição mais recente.
- **Concluído — visualizações e rotina:** tabela/cards, seleção e ordem de colunas, vistas salvas, comparação de até quatro festivais, paginação preservada, CSV, calendário/ICS por filme, tarefas, resultados, sessões, gastos, filtros e ações em lote revisáveis para inscrições.
- **Concluído — atualização e privacidade:** diferenças do catálogo público, preservação de dados pessoais/overrides, exportação pública saneada, alerta/revisão de mudanças não salvas e histórico local de edição.
- **Concluído — pesquisa verificável do lote atual:** cinco regulamentos/páginas oficiais lidos integralmente e estruturados: Festival de Brasília 2026, Curta Kinoforum 2026, Curta Cinema 2027, É Tudo Verdade 2026 e FestCurtasBH 2026. Matriz e inventário de fontes gerados em `docs/pesquisa/`.
- **Em validação final:** navegador, responsividade/teclado, build/PWA, caminhos de GitHub Pages e relatório final.
- **Pendência documental real:** 177 dos 182 festivais ainda não tiveram o regulamento atual integralmente estruturado. Eles permanecem explicitamente pendentes; não são promovidos a compatíveis no modo “somente confirmados”.

## Regras de decisão

- `null` ou estado explícito representa desconhecido; ausência nunca confirma gratuidade, elegibilidade ou abertura.
- Compatibilidade confirmada só usa regras da mesma chamada e edição.
- Dados públicos atualizados não sobrescrevem escolhas ou notas pessoais.
- Datas históricas e previsões não promovem uma chamada a “aberta agora”.
- Pesquisa incompleta será quantificada como pendência.

## Evidências e artefatos esperados

- `docs/REGISTRO_REVISAO_COMPLETA.md`: progresso, decisões, comandos e bloqueios.
- Matriz de cobertura pesquisável/exportável no catálogo ou em artefato versionado.
- Testes automatizados alinhados aos 22 cenários de aceite da especificação.
- Guia curto de atualização, edição, filtro, backup, revisão da PR e publicação.
