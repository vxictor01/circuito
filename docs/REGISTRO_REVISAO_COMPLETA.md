# Registro da revisão completa

Este arquivo registra fatos observados, decisões, testes e pendências da branch `codex/revisao-completa-circuito`. Não contém filmes, links privados, códigos de inscrição ou outras informações pessoais dos backups fornecidos.

## 2026-10-03 — diagnóstico inicial

### Ambiente e versão

- O diretório inicialmente compartilhado não era um checkout Git; continha a especificação, dois backups JSON e uma planilha.
- O remoto `https://github.com/vxictor01/circuito.git` foi validado antes do clone. `HEAD`/`main`: `3e9f2c427679cf4e32183982142017cf134f48d5`.
- O checkout foi feito em `D:\Cinema\Estrategia nacional\circuito` e a branch de trabalho criada a partir de `main` limpa.
- `package.json`: versão 1.0.0; Node >= 22.12; React 19.2, TypeScript 5.9 e Vite 7.3.

### Arquitetura e publicação

- Estado em React, persistência transacional em IndexedDB e catálogo público empacotado em `src/data/catalog.json`.
- Migrações disponíveis para backup legado schema 1 e schema 2; schema atual 3.
- O catálogo é mesclado ao banco local, com precedência atual para registros pessoais já existentes.
- `.github/workflows/deploy.yml` valida TypeScript, testes de regras, build/PWA, caminhos e Playwright. Push em `main` publica `dist` via `actions/deploy-pages`.

### Inventário do catálogo

- 182 festivais, 182 edições e 188 chamadas; 26 países; 106 festivais localizados no Brasil.
- Todos os festivais possuem ao menos uma entrada de fonte, mas isso não significa regra verificada.
- Nenhuma chamada está com confiança `confirmado`; 86 estão como `edição anterior` e as demais como `parcial`.
- Localidades compostas ou não normalizadas incluem `SP / RJ`, `RN / PB`, `Nacional`, cidades separadas por `/` e descrições itinerantes.
- A ficha do É Tudo Verdade mantém uma chamada genérica curta/longa com máximo de 30 minutos, confirmando o falso agrupamento descrito na especificação.
- O catálogo público não contém filmes nem inscrições. Os backups fornecidos não serão adicionados ao Git.

### Acesso externo

- O remoto Git público está acessível.
- A ferramenta de leitura web não conseguiu abrir diretamente a página do GitHub nem a aplicação publicada; o acesso documental será testado por fonte e cada impedimento será registrado.

### Próximo passo

Rodar a suíte recebida, concluir o mapa dos filtros/formulários e então implementar o schema versionado e as consultas antes de alterar o catálogo.

## 2026-10-03 — checkpoint de ambiente e migração

- Pasta confirmada: `D:\Cinema\Estrategia nacional\circuito`.
- `origin` confirmado: `https://github.com/vxictor01/circuito.git`.
- Branch confirmada: `codex/revisao-completa-circuito`, ainda baseada em `3e9f2c4`; nenhum push realizado.
- O migrador versionado em `scripts/migrate-catalog-v4.ts` grava exclusivamente `src/data/catalog.json`.
- O catálogo anterior continua recuperável diretamente do commit-base em `3e9f2c4:src/data/catalog.json`.
- Os dois backups pessoais permanecem fora do checkout e não foram modificados.
- Resultado local: schema 4, catálogo `2026-10-03.2`, 182 festivais e 188 chamadas. A migração acrescentou estrutura; não alegou verificação documental onde ela não existia.
- Baseline: 23/23 testes lógicos passaram; typecheck e build/PWA passaram. A execução de interface precisa ser repetida ao final porque o navegador não iniciou corretamente no sandbox.

## 2026-10-04 — implementação funcional

### Estrutura, filtros e compatibilidade

- O schema 4 já migrado foi preservado; o migrador não foi reaplicado.
- A busca e os filtros passaram a usar localidades normalizadas e as chamadas da edição mais recente. Brasil/exterior depende do país do evento; critérios de duração, taxa, estreia e território não são combinados entre chamadas.
- Desconhecidos produzem correspondência pendente e explicada. O modo “somente confirmados” os exclui.
- Duração usa segundos e limites inclusivos/exclusivos; período de abertura e realização permanecem independentes; prazos históricos não abrem chamadas atuais.
- Tabela e cards compartilham consulta, contagens de festivais/chamadas e CSV. Foram acrescentadas seleção/ordem de colunas, vistas salvas e comparação de até quatro festivais.

### Filmes, inscrições, calendário e privacidade

- Filmes agora registram fatos de disponibilidade online, histórico territorial de exibições e materiais versionados.
- Inscrições separam planejamento, envio, resultado, sessões e prêmios; incluem checklist, tarefas, prazo interno, gasto real, filtros de operação e ações em lote com revisão.
- O calendário inclui abertura, prazos, resultado, tarefas, sessões e filtro por filme, com exportação ICS sem protocolo privado.
- Importação tem prévia e estratégia de mesclagem/substituição. Atualizações do catálogo geram diferenças revisáveis e preservam favoritos, notas e prioridades.
- A exportação pública remove filmes, inscrições, notas, links privados e histórico local. Edições manuais registram versão anterior e campos alterados apenas no armazenamento/backup privado.

### Pesquisa documental — lote verificável

- Catálogo público atualizado para `2026-10-04.2`: 182 festivais, 182 edições e 199 chamadas.
- Regulamentos/páginas oficiais lidos integralmente e estruturados para Festival de Brasília 2026, Curta Kinoforum 2026, Curta Cinema 2027, É Tudo Verdade 2026 e FestCurtasBH 2026.
- Chamadas nacionais, internacionais, locais e por duração foram separadas. Taxas, datas, duração, estreia e online permanecem nulos/não localizados quando o documento não responde.
- Relevância provisória foi aplicada com rubrica 25/20/20/20/15, fontes, intervalo de incerteza e impacto, sem alterar prioridade pessoal.
- `docs/pesquisa/MATRIZ_COBERTURA.csv`, `INVENTARIO_FONTES.csv` e `RESUMO_PESQUISA.md` registram 571 fontes herdadas/atuais e as pendências por campo. Cinco edições e 16 chamadas estão confirmadas; 177 festivais ainda aguardam leitura integral de regulamento atual.

### Testes executados até este checkpoint

- TypeScript: aprovado após as alterações funcionais e o segundo lote documental.
- Núcleo: 32/32 aprovados, incluindo migrações, restauração, persistência, chamadas coerentes, Brasil/exterior, múltiplas cidades, segundos, desconhecidos, sazonalidade, relevância/prioridade, calendário, privacidade e catálogo real.
- Benchmark controlado: 2.000 festivais e 18.000 chamadas em aproximadamente 1,4 s no ambiente local (limite de aceite: 2,5 s).

### Próximo passo exato

Executar formatação, build/PWA, verificação de `dist`, Playwright em navegador/telas pequenas, revisar o diff e a ausência de dados pessoais; depois gerar relatório de testes e guia de revisão/publicação da pull request.

## 2026-10-04 — validação final local

- Prettier aplicado aos arquivos alterados; `git diff --check` será usado na auditoria de entrega.
- TypeScript, 32/32 testes de núcleo, build Vite, geração PWA e verificação estática de `/circuito/` aprovados.
- O Playwright inicialmente não encontrou o Chromium `1194`; após instalar apenas o navegador de teste, 12/12 cenários de interface passaram em 24,4 s.
- Três expectativas antigas da suíte foram alinhadas às mudanças exigidas pela especificação: “Filtros avançados”, protocolo privado e separação entre estado legado e situação do envio.
- Relatório reproduzível criado em `docs/RELATORIO_TESTES.md`; instruções de uso, backup, revisão e publicação em `docs/GUIA_USO_E_PUBLICACAO.md`.
- Pesquisa continua declaradamente incompleta: cinco festivais tiveram regulamento atual integralmente estruturado; 177 permanecem na matriz de pendências.

### Próximo passo exato

Auditar diff/privacidade, confirmar branch e remoto, criar commit, publicar a branch e abrir a pull request sem publicar diretamente em `main`.
