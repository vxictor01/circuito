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

## 2026-10-04 — pesquisa documental ampliada, checkpoint BR-01

### Escopo e preservação

- A branch `codex/revisao-completa-circuito`, o schema 4 e a implementação já publicada na PR #1 foram preservados. A migração não foi reaplicada.
- O lote BR-01 tratou 20 festivais brasileiros ainda pendentes, sem repetir os cinco registros iniciais: Gramado, Tiradentes, Festival do Rio, Olhar de Cinema, Janela, Cine Ceará, Cine PE, Festival de Vitória, Panorama, MixBrasil, Fantaspoa, FICA, Ecofalante, CineBH, Mostra Infantil de Florianópolis, forumdoc, Goiânia Mostra Curtas, FAM, Fest Aruanda e Guarnicê.
- O script idempotente `scripts/apply-research-batch-br-01.mjs` altera somente os 20 festivais/edições/chamadas identificados e `settings.catalogVersion`; a base anterior permanece recuperável no commit `1a4108b` e pelo histórico Git.

### Resultado documental

- Catálogo `2026-10-04.3`: 182 festivais, 182 edições e 250 chamadas.
- Nove edições do lote ficaram confirmadas após leitura integral das regras atuais: Festival do Rio, Cine PE, Festival de Vitória, Panorama, MixBrasil, Fantaspoa, Ecofalante, FAM e Guarnicê.
- Onze edições ficaram parciais, com lacunas registradas por campo: Gramado (editais gaúchos separados ausentes), Tiradentes (PDF integral não extraído), Olhar de Cinema (regulamento atual inacessível), Janela (nenhuma chamada atual localizada), Cine Ceará (portal excessivamente grande), FICA (anexos em plataforma dinâmica), CineBH (regulamento integral indisponível), Mostra Infantil (conflito nacional/internacional e dia da semana), forumdoc (página atual sem edital/datas), Goiânia Mostra Curtas (regulamento integral inacessível) e Fest Aruanda (PDF não abriu integralmente).
- Fontes secundárias foram usadas apenas quando explicitamente marcadas e não substituem edital para confirmar regras. Ausência de taxa, estreia, histórico online ou autorização não foi convertida em gratuidade ou elegibilidade.
- A matriz registra 25 festivais com ao menos uma fonte atual, 14 edições confirmadas, 11 parciais e 157 festivais ainda sem fonte atual estruturada. Restam 168 festivais sem edição integralmente confirmada.

### Verificação afetada

- `node --check scripts/apply-research-batch-br-01.mjs`: aprovado.
- TypeScript: aprovado.
- Testes de catálogo/privacidade: aprovados após corrigir o valor de estreia da Ecofalante para `nenhuma` com requisito `sem exigência confirmada`.
- Benchmark de filtros: primeira execução fria excedeu o limite (4,06 s); repetição isolada aprovada em 1,47 s para 2.000 festivais/18.000 chamadas, sem alteração do mecanismo de busca.
- Matriz, inventário e resumo regenerados: 707 referências inventariadas.

### Próximo passo exato

Continuar no lote BR-02 com os próximos festivais brasileiros sem fonte atual, atualizar o catálogo e a matriz ao fim do lote e executar apenas os testes afetados. PR #1 deve permanecer aberta; não fazer merge nem publicar enquanto a cobertura ampliada estiver em andamento.

## 2026-10-04 — pesquisa documental ampliada, checkpoint BR-02

### Escopo e preservação

- A branch, o schema 4, o lote BR-01 e a PR #1 foram preservados; nenhuma migração foi reaplicada e nenhum dado pessoal foi incorporado.
- O lote BR-02 tratou os 20 festivais de `festival-027` a `festival-046`: Mostra de Cinema de Gostoso, CachoeiraDoc, Cine Esquema Novo, In-Edit Brasil, Curta Brasília, Curta Taquary, Cinema da Fronteira, Curta Santos, Kinoarte, Curta-SE, Curta Canoa, Cinema de Triunfo, Maranhão na Tela, Circuito Penedo, Santos Film Fest, CINEMATO, Olhar do Norte, Cinefantasy, RioLGBTQIA+ e Encontro de Cinema Negro.
- O script idempotente `scripts/apply-research-batch-br-02.mjs` substitui somente as chamadas das edições desses 20 IDs, atualiza seus campos documentais e `settings.catalogVersion`. A base anterior permanece recuperável no histórico Git e no commit publicado antes dos lotes.

### Resultado documental

- Catálogo `2026-10-04.4`: 182 festivais, 182 edições, 300 chamadas e 811 referências inventariadas.
- Nove edições atuais ficaram confirmadas: Mostra de Cinema de Gostoso, In-Edit Brasil, Curta Taquary, Curta-SE, Circuito Penedo, Santos Film Fest, CINEMATO, Olhar do Norte e RioLGBTQIA+.
- Oito edições atuais ficaram parciais: Cine Esquema Novo (regulamento integral não recuperado), Cinema da Fronteira (sem chamada pública localizada), Curta Santos (regulamento doméstico ausente), Kinoarte (PDF servido em caminho/cópia histórica), Triunfo (edital integral em plataforma dinâmica), Maranhão na Tela (sem chamada pública), Cinefantasy (conflitos internos de prazo e realização) e Encontro de Cinema Negro (curadoria sem chamada pública localizada).
- CachoeiraDoc, Curta Brasília e Curta Canoa permanecem na última chamada integral ou suficientemente documentada de 2025; referências à continuidade ou ao financiamento de edição posterior não foram promovidas a regras de 2026.
- A pesquisa encontrou e incorporou a 17ª edição corrente de Triunfo, aberta de 1º a 15/10/2026, em vez de reutilizar o edital da 16ª edição. Taxas de Cinefantasy foram separadas por categoria e lote; localidades itinerantes/múltiplas foram normalizadas; conflitos e campos não localizados permanecem explícitos.
- Cobertura manual acumulada: 45 festivais processados e 137 ainda não processados por lote. Cobertura corrente: 42 com ao menos uma fonte atual, 23 edições confirmadas, 19 atuais parciais e 140 sem fonte atual estruturada. Permanecem 159 sem edição atual integralmente confirmada.

### Verificação afetada

- `node --check scripts/apply-research-batch-br-02.mjs`: aprovado.
- A primeira validação detectou três pontuações de dimensão acima do teto da rubrica e ausência do marcador de evidência de formato na chamada parcial de Triunfo. As notas foram redistribuídas dentro dos limites 25/20/20/20/15 e o campo `formats` foi associado à fonte sem promover o restante do edital.
- Núcleo, catálogo real, filtros BR-01/BR-02, privacidade e benchmark: 34/34 aprovados. O benchmark registrou aproximadamente 1,16 s para 2.000 festivais e 18.000 chamadas.
- O teste BR-02 confirma: localização múltipla do In-Edit, não combinação de longa e universitário entre chamadas do Santos Film Fest, chamada aberta/gratuita de Triunfo, duração desconhecida como pendência no Cine Esquema Novo e limites distintos do Olhar do Norte.

### Próximo passo exato

Continuar no lote BR-03 com os próximos 20 registros brasileiros existentes no catálogo, a partir de `festival-047`; os IDs `festival-052` a `festival-054` não existem. Salvar catálogo e matriz ao fim do lote e manter a PR #1 aberta sem merge/publicação.

## 2026-10-04 — pesquisa documental ampliada, checkpoint BR-03

### Escopo e preservação

- A branch, o schema 4, os lotes anteriores e a PR #1 foram preservados; nenhuma migração foi reaplicada e nenhum dado pessoal foi incorporado.
- O lote BR-03 tratou os 20 registros brasileiros seguintes efetivamente existentes: `festival-047` a `festival-051` e `festival-055` a `festival-069`. Os IDs `festival-052` a `festival-054` não existem no catálogo.
- O script idempotente `scripts/apply-research-batch-br-03.mjs` substitui somente as chamadas das edições desses 20 IDs, atualiza os campos documentais e `settings.catalogVersion`. A base anterior permanece recuperável no histórico Git e no commit publicado antes dos lotes.

### Resultado documental

- Catálogo `2026-10-04.5`: 182 festivais, 182 edições, 345 chamadas e 964 referências inventariadas.
- Onze edições atuais ficaram confirmadas: ECRÃ 2027, Mostra Sesc de Cinema, Entretodos, EGBÉ, FENDA, Festival de Cinema de Caruaru, Festival Internacional de Cinema de Itabaiana, CineAlter, Primeiro Plano, NOIA e Metrô.
- Seis edições atuais ficaram parciais: Visões Periféricas (datas da chamada ausentes), Adélia Sampaio (texto residual da edição anterior), FIC Ribeirão (conflito julho/outubro), Marília (regulamento integral não recuperado), Cinema Urbana (metadados e texto com datas conflitantes) e Curta Caicó (prazo oficial divergente de publicação externa).
- Dobra, FINCAR e Taguá permanecem na última edição documental localizada, sem promover atividade recente, taxa ou regras antigas para 2026.
- O ECRÃ foi atualizado para a 11ª edição/2027, separada da edição de 2026, com oito lotes de taxas por origem. Caruaru foi dividido em nove mostras; FENDA preserva os valores internacionais como desconhecidos após o encerramento; dados desconhecidos da Mostra Sesc não foram interpretados como gratuidade.
- Cobertura manual acumulada: 65 festivais processados e 117 ainda não processados por lote. Cobertura corrente: 59 com ao menos uma fonte atual, 34 edições confirmadas, 25 atuais parciais e 123 sem fonte atual estruturada. Permanecem 148 sem edição atual integralmente confirmada.

### Verificação afetada

- `node --check scripts/apply-research-batch-br-03.mjs`: aprovado; aplicação idempotente resultou em 345 chamadas.
- A validação detectou tipos de fonte fora do vocabulário controlado; catálogo oficial, comunicado institucional e imprensa foram normalizados para `oficial` ou `fonte secundária`, preservando título e nota de proveniência.
- Um teste do lote revelou que o filtro de duração tratava chamadas com mínimo confirmado e sem teto como desconhecidas. O avaliador agora aceita faixa com ao menos um limite documentado; ambos ausentes continuam pendentes. CineAlter (longa acima de 50 minutos) e Adélia Sampaio (longa acima de 70 minutos) passaram a ser reconhecidos corretamente.
- Testes afetados de duração, desconhecidos e BR-03: 3/3 aprovados. A execução integral anterior à correção teve 34/35 aprovações e benchmark de aproximadamente 1,24 s; a suíte integral será repetida no checkpoint de integração seguinte.

### Próximo passo exato

Continuar no lote BR-04 com os próximos 20 festivais brasileiros ainda não processados: Curta Campos do Jordão, Revoada, Curta na Serra, Festival de Cinema de Muriaé, Mostra de Cinema de Fama, Cine Lapinhô, Seridó Cine, Respira, Cine Pojichá, Bonito CineSur, FestCiMM, CineDiamante, Sinédoque, Festival de Cinema de Contagem, Festival de Finos Filmes, Semana do Audiovisual Negro, Cinegro, Mostra de Cinema das Missões, MAFF e Festival Nicho. Manter a PR #1 aberta sem merge/publicação.

## 2026-10-04 — pesquisa documental ampliada, checkpoint BR-04

### Escopo e preservação

- A branch, o schema 4, os lotes BR-01 a BR-03 e a PR #1 foram preservados; nenhuma migração foi reaplicada e nenhum dado pessoal foi incorporado.
- O lote BR-04 tratou os 20 festivais listados no checkpoint anterior, priorizando todos os registros brasileiros seguintes mesmo com IDs alfanuméricos.
- O script idempotente `scripts/apply-research-batch-br-04.mjs` substitui somente as chamadas das edições desses 20 registros, atualiza seus campos documentais e `settings.catalogVersion`. A base anterior permanece recuperável no histórico Git e no commit publicado antes dos lotes.

### Resultado documental

- Catálogo `2026-10-04.6`: 182 festivais, 182 edições, 366 chamadas e 1.049 referências inventariadas.
- Quatro edições atuais ficaram confirmadas após leitura das regras correntes: Curta Campos do Jordão, Seridó Cine, Bonito CineSur e Festival de Finos Filmes.
- Onze edições atuais ficaram parciais: Curta na Serra (convocatória atual ausente), Muriaé (página abre 2026, regulamento segue em 2025), Fama (número e prazos conflitantes), Cine Lapinhô (15/3 versus 16/3 e linha residual), Cine Pojichá (programação sem chamada pública), FestCiMM (regras genéricas e calendário externo), Sinédoque (regulamento sem datas da chamada e agenda residual), SAN (programação sem chamada), Missões (metadados 2026 e texto de 2025), MAFF (regulamento externo não recuperado) e Nicho (chamada detalhada sem documento oficial integral recuperado).
- Revoada, Respira, CineDiamante, Festival de Cinema de Contagem e Cinegro permanecem na última edição documental de 2025; projetos, páginas institucionais ou ausência de atualização não foram promovidos a regras de 2026.
- Missões conserva taxas e prazos dos cartões operacionais de 2026, mas duração, ano mínimo e critérios do texto residual permanecem parciais. Gratuidade de acesso público da SAN e do MAFF não foi convertida em gratuidade de inscrição. As cinco cidades do Seridó Cine, as três do Cine Pojichá e as sete da circulação do Respira foram normalizadas como localidades de sede/exibição.
- Cobertura manual acumulada: 85 festivais processados e 97 ainda não processados por lote. Cobertura corrente: 74 com ao menos uma fonte atual, 38 edições confirmadas, 36 atuais parciais e 108 sem fonte atual estruturada. Permanecem 144 sem edição atual integralmente confirmada.

### Verificação afetada

- `node --check scripts/apply-research-batch-br-04.mjs`: aprovado; aplicação idempotente resultou em 366 chamadas.
- A validação inicial encontrou dois valores fora dos vocabulários do schema (`itinerância` como papel de local e `curadoria` como modo de inscrição). Foram normalizados para `exibição` e `curadoria sem chamada`, sem alterar o significado documental.
- Schema, catálogo real e teste BR-04: 4/4 aprovados após a primeira correção e 2/2 na repetição final do recorte. O teste confirma que Bonito não combina formato longa com limite de curta, Finos não combina direção estreante com duração acima do teto e Missões não promove regras residuais a confirmadas.
- Matriz, inventário e resumo regenerados: 1.049 referências inventariadas. A suíte integral será executada no checkpoint final de integração, evitando repetição sem mudança funcional adicional.

### Próximo passo exato

Continuar no lote BR-05 com os 20 festivais brasileiros seguintes ainda não processados: FEMUCINE, Fronteira, Cinecipó, FESTCINE Pinhais, Mostra Internacional de Cinema em São Paulo, Noturno, Festival de Cinema de Arapiraca, Motriz, Cine Jardim, FECINE, Lobo Fest, Estranhos Encontros, Cine dos Campos, Black Queer Festival, MacacuCine, FIACAFI, Recanto do Cinema, Mostra Sururu, CineOP e Cine Verão. A Mata Atlântica Film Festival permanecerá como o último festival brasileiro para o lote seguinte. Manter a PR #1 aberta sem merge/publicação.

## 2026-10-04 — pesquisa documental ampliada, checkpoint BR-05

### Escopo e preservação

- A branch, o schema 4, os lotes BR-01 a BR-04 e a PR #1 foram preservados; nenhuma migração foi reaplicada e nenhum dado pessoal foi incorporado.
- O lote BR-05 tratou exatamente os 20 festivais indicados no checkpoint anterior. O script idempotente `scripts/apply-research-batch-br-05.mjs` substitui somente as chamadas desses registros, atualiza seus campos documentais e `settings.catalogVersion`.
- A base anterior permanece recuperável pelo histórico Git e pelo commit `1a4108b`; os PDFs baixados para leitura são temporários e não integram o catálogo nem a entrega.

### Resultado documental

- Catálogo `2026-10-04.7`: 182 festivais, 182 edições, 394 chamadas e 1.202 referências inventariadas.
- Cinco edições atuais ficaram confirmadas: Mostra Internacional de Cinema em São Paulo, Festival de Cinema de Arapiraca, Estranhos Encontros, MacacuCine e Mostra Sururu.
- Nove edições atuais ficaram parciais: Cinecipó (mês e cláusula de edição residuais), FESTCINE Pinhais (edital ausente), Noturno (domínio oficial redirecionando para conteúdo estranho), Cine Jardim (datas e rótulos internos conflitantes), Lobo Fest (prazo internacional divergente), Black Queer (texto residual e lotes conflitantes), FIACAFI (realização remarcada para 2027), Recanto (somente edital interno recuperado) e CineOP (programação curatorial sem chamada pública de filmes localizada).
- FEMUCINE, Fronteira, Motriz, FECINE, Cine dos Campos e Cine Verão permanecem na última edição documental localizada. Atividade posterior, gratuidade e regras antigas não foram promovidas para 2026.
- A 50ª Mostra de São Paulo foi dividida em Novos Diretores e Perspectiva, preservando critérios distintos de estreia/conclusão; curtas programados por curadoria não foram tratados como chamada aberta. Arapiraca foi dividido em quatro panoramas; Estranhos, Black Queer, MacacuCine, FIACAFI e Sururu mantêm limites, territórios, taxas e prazos por chamada.
- Seis regulamentos atuais do MacacuCine foram lidos integralmente. As categorias internacionais não receberam restrição territorial não publicada; a micrometragem mantém teto exato de 30 segundos.
- Cobertura acumulada: 105 festivais processados e 77 ainda não processados por lote. Há 88 com ao menos uma fonte atual, 43 edições confirmadas, 45 atuais parciais e 94 sem fonte atual estruturada. Permanecem 139 sem edição atual integralmente confirmada.

### Verificação afetada

- `node --check scripts/apply-research-batch-br-05.mjs`: aprovado; aplicação idempotente resultou em 394 chamadas.
- TypeScript: aprovado com o script de projeto.
- A validação detectou e corrigiu somente incompatibilidades de vocabulário controlado (tipo de fonte, papel de local, impacto, reenvio e aliases de taxonomia), sem alterar os fatos documentais. Schema/privacidade e teste BR-05: 2/2 aprovados.
- O teste BR-05 confirma separação das chamadas da Mostra SP, taxa desconhecida sem falso positivo de gratuidade, sobreposição literal de 45 minutos do Estranhos, teto de 30 minutos da Sururu e micrometragem de 30 segundos do MacacuCine.
- Matriz, inventário e resumo regenerados: 1.202 referências inventariadas. A suíte integral permanece reservada ao checkpoint final de integração.

### Próximo passo exato

Iniciar o lote BR-06 pela Mata Atlântica Film Festival, último registro brasileiro pendente, e completar o lote com os 19 primeiros festivais internacionais ainda não processados. Manter a PR #1 aberta, sem merge ou publicação, até concluir a pesquisa acessível e os checks finais.

## 2026-10-04 — pesquisa documental ampliada, checkpoint BR-06

### Escopo e preservação

- A branch, o schema 4, os lotes BR-01 a BR-05 e a PR #1 foram preservados; nenhuma migração foi reaplicada e nenhum dado pessoal foi incorporado.
- O lote BR-06 tratou exatamente a Mata Atlântica Film Festival e os 19 festivais internacionais seguintes: Porto/Post/Doc, Doclisboa, Sundance, IndieLisboa, IDFA, IFFR, CPH:DOX, Oberhausen, Clermont-Ferrand, Visions du Réel, FIDMarseille, DOK Leipzig, Hot Docs, Sheffield DocFest, DocsBarcelona, Ji.hlava, Curtas Vila do Conde, Tampere e Uppsala.
- O script idempotente `scripts/apply-research-batch-br-06.mjs` substitui somente as chamadas desses 20 registros, atualiza seus campos documentais e `settings.catalogVersion`. A base anterior permanece recuperável pelo histórico Git e pelo commit `1a4108b`; PDFs baixados para leitura são temporários e não integram a entrega.

### Resultado documental

- Catálogo `2026-10-04.8`: 182 festivais, 182 edições, 450 chamadas e 1.363 referências inventariadas.
- Dezessete edições atuais ficaram confirmadas: Mata Atlântica, Porto/Post/Doc, Doclisboa, Sundance, IndieLisboa, IDFA, IFFR, CPH:DOX, Oberhausen, Clermont-Ferrand, Visions du Réel, FIDMarseille, DOK Leipzig, Hot Docs, DocsBarcelona, Ji.hlava e Tampere.
- Três edições atuais ficaram parciais. O regulamento 2026 do Sheffield DocFest está em Google Drive com download desativado pelo proprietário; a página oficial foi estruturada, mas o PDF integral não pôde ser lido. O regulamento do Curtas Vila do Conde redireciona para autenticação no Box, de modo que foram usados apenas a página corrente e seus campos publicados. Uppsala tem conflito entre a página de inscrição (45ª edição) e a página institucional (44ª), e não foi localizado regulamento integral público; o número da edição permaneceu desconhecido.
- As regras foram separadas por chamada e edição. Lacunas literais das fontes permaneceram lacunas: CPH:DOX não classifica exatamente 50 minutos; IFFR não classifica exatamente 64 minutos; Doclisboa mantém o conflito de taxa no limite de 60 minutos; Visions du Réel preserva a sobreposição publicada entre 61 e 70 minutos; DocsBarcelona usa o limite inclusivo de 60 minutos do regulamento PDF, registrando o conflito com a página-resumo.
- Taxas ausentes não foram convertidas em gratuidade. DOK Leipzig mantém a isenção publicada para produções exclusivamente brasileiras, com o conflito documental entre €60 no regulamento em inglês e €65 em uma FAQ alemã isolada registrado na fonte; o valor normativo de €60 foi usado.
- Cobertura acumulada: 125 festivais processados e 57 ainda não processados por lote. Há 107 com ao menos uma fonte atual, 60 edições confirmadas, 47 atuais parciais e 75 sem fonte atual estruturada. Permanecem 122 sem edição atual integralmente confirmada.

### Verificação afetada

- `node --check scripts/apply-research-batch-br-06.mjs`: aprovado; aplicação única resultou em 450 chamadas.
- Validação estrutural do catálogo: aprovada para 182 festivais, 182 edições e 450 chamadas.
- Testes direcionados de catálogo público e BR-06: 2/2 aprovados. O teste confirma limites exatos de CPH:DOX, DocsBarcelona e IFFR, isenção brasileira do DOK Leipzig, múltiplas cidades da Mata Atlântica, longa internacional do Sundance e estreia desconhecida de Uppsala sem falso positivo.
- Matriz, inventário e resumo regenerados: 1.363 referências inventariadas. A suíte integral permanece reservada ao checkpoint final de integração.

### Próximo passo exato

Continuar no lote BR-07 com os 20 festivais internacionais seguintes ainda não processados: Encounters, Internationale Kurzfilmtage Winterthur, Krakow Film Festival, Go Short, Vienna Shorts, Palm Springs International ShortFest, Aspen Shortsfest, Cannes, Berlinale, Locarno, Venezia, San Sebastián, TIFF, Tribeca, SXSW, Film Fest Gent, Kortfilmfestival Leuven, Paris Courts Devant, Brive e Beldocs. Manter a PR #1 aberta, sem merge ou publicação, até concluir a pesquisa acessível e os checks finais.

## 2026-10-04 — pesquisa documental ampliada, checkpoint BR-07

### Escopo e preservação

- A branch `codex/revisao-completa-circuito`, o schema 4, os lotes BR-01 a BR-06 e a PR #1 foram preservados; nenhuma migração foi reaplicada, nenhum dado pessoal foi incorporado e não houve merge ou publicação.
- O lote BR-07 tratou exatamente os 20 festivais internacionais indicados no checkpoint anterior. O script idempotente `scripts/apply-research-batch-br-07.mjs` substitui somente as chamadas das edições desses registros, atualiza seus campos documentais e `settings.catalogVersion`.
- A base anterior permanece recuperável no histórico Git e no commit `1a4108b`. Os placeholders migrados foram substituídos apenas para os 20 IDs do lote.

### Resultado documental

- Catálogo `2026-10-04.9`: 182 festivais, 182 edições, 498 chamadas e 1.540 referências inventariadas.
- Treze edições atuais ficaram confirmadas: Internationale Kurzfilmtage Winterthur 2026, Krakow 2026, Vienna Shorts 2027, Palm Springs ShortFest 2027, Aspen Shortsfest 2027, Cannes 2026, Venezia 2026, San Sebastián 2026, TIFF 2026, Tribeca 2027, SXSW 2027, Brive 2026 e Beldocs 2027.
- Sete edições atuais ficaram parciais: Encounters (conflito `<40`/`máximo 40`), Go Short (resíduos da 18ª edição/2026 no PDF 2027), Berlinale (regulamento oficial retornou 503), Locarno (portal normativo retornou 402), Film Fest Gent (ordinal residual no PDF), Leuven (divergência textual no prazo internacional) e Paris Courts Devant (cabeçalho 2025 versus cláusulas/evento 2026, sem prazo ou valor da taxa localizados).
- Regras foram separadas por edição e chamada. La Cinef 2027 não foi combinada com Cannes 2026; o resumo parceiro da Berlinale e as taxas resumidas de Locarno permanecem parciais; ausência de taxa em Cannes e Courts Devant não foi convertida em gratuidade.
- Limites conflitantes foram conservadores nos filtros: Encounters e SXSW usam `<40`, enquanto TIFF e Palm Springs aceitam `<=40`; Cannes usa `<=15` do artigo normativo e registra o texto-resumo “under 15”. TIFF preserva o hiato publicado entre curtas `<=40` e longas `>=60`; Venezia preserva a faixa 21–59 não elegível nas duas vias abertas.
- Cobertura manual acumulada: 145 festivais processados e 37 ainda não processados por lote. Há 127 com ao menos uma fonte atual, 73 edições confirmadas, 54 atuais parciais e 55 sem fonte atual estruturada. Permanecem 109 sem edição atual integralmente confirmada.

### Relevância e confiança

- A rubrica 25/20/20/20/15 foi aplicada separadamente da prioridade pessoal e da compatibilidade dos filmes. Cannes, Venezia, San Sebastián, TIFF e outros festivais globais receberam faixas altas pela história, alcance e indústria; festivais especializados como Brive foram avaliados pelo impacto de nicho.
- Berlinale e Locarno mantêm intervalos de incerteza maiores e confiança média porque as fontes normativas atuais não foram recuperadas. A nota provisória não oculta o bloqueio documental e não é previsão de seleção.

### Verificação afetada

- `node --check scripts/apply-research-batch-br-07.mjs`: aprovado; aplicação única resultou em 498 chamadas.
- `node scripts/generate-research-coverage.mjs`: aprovado; matriz, inventário e resumo regenerados para 1.540 referências.
- `pnpm typecheck`: aprovado.
- Teste focal `lote BR-07 mantém conflitos, lacunas e compatibilidade na mesma chamada`: 1/1 aprovado. Confirma os limites de Encounters, TIFF e SXSW, abertura do Palm Springs, taxa desconhecida de Courts Devant e confiança parcial de Berlinale/Locarno.

### Próximo passo exato

Continuar no lote BR-08 com os 20 festivais internacionais seguintes ainda não processados: Docudays UA, One World, Valdivia, Guadalajara, Morelia, Guanajuato, Ambulante, FICUNAM, BAFICI, Lima PUCP, Viña del Mar, Cartagena, Festival de La Habana, Mar del Plata, DocsMX, Cali, FEST — New Directors New Films, DOC.Coimbra, Curtocircuíto e FILMADRID. Salvar catálogo e matriz ao fim do lote e manter a PR #1 aberta, sem merge ou publicação.

## 2026-10-04 — pesquisa documental ampliada, checkpoint BR-08

### Escopo e preservação

- O schema 4, a branch, os lotes anteriores e a PR #1 foram preservados; a migração não foi reaplicada e não houve merge ou publicação.
- O script idempotente `scripts/apply-research-batch-br-08.mjs` tratou exatamente os 20 festivais indicados no checkpoint BR-07 e atualizou somente suas fichas, edições, chamadas e a versão do catálogo.

### Resultado documental

- Catálogo `2026-10-04.10`: 182 festivais, 182 edições, 516 chamadas e 1.569 referências inventariadas.
- Seis edições atuais ficaram confirmadas após leitura integral das regras disponíveis: Docudays UA 2027, One World 2027, Guadalajara 2027, Morelia 2026, Mar del Plata 2026 e FEST 2027.
- Treze edições atuais ficaram parciais: Valdivia (erro residual 2025 no comunicado 2026), Guanajuato, Ambulante, FICUNAM, BAFICI, Lima, Viña del Mar, Cartagena, DocsMX, Cali, DOC.Coimbra, Curtocircuíto e FILMADRID. La Habana permaneceu na 46ª edição/2025 porque nenhuma chamada 2026 foi localizada.
- Ambulante e Cali foram marcados como curadoria sem chamada pública, portanto não aparecem como inscrições abertas. Morelia conserva a elegibilidade mexicana; não foi promovido a oportunidade para produção exclusivamente brasileira. Cartagena 2027 tem dez seções e calendário confirmados, mas os valores e limites do regulamento/Festhome permanecem desconhecidos.
- Docudays separa `DOCU/SHORT <=40` de `DOCU/WORLD >40`, registra as exclusões territoriais literais e a biblioteca online restrita. FEST separa curtas `<=54` de longas `>=55`. Mar del Plata usa a prorrogação oficial de 15/7 e mantém VOD pública como vedação.
- Cobertura manual acumulada: 165 festivais processados e 17 ainda não processados. Há 146 com fonte atual, 79 edições confirmadas, 67 atuais parciais e 36 sem fonte atual estruturada. Permanecem 103 sem edição atual integralmente confirmada.

### Verificação afetada

- `node --check scripts/apply-research-batch-br-08.mjs`: aprovado; aplicação resultou em 516 chamadas.
- Matriz, inventário e resumo regenerados para 1.569 referências.
- `pnpm typecheck`: aprovado.
- Teste focal BR-08: 1/1 aprovado. Confirma os limiares Docudays 40/41, FEST 54/55, ausência de prazo aberto para Ambulante, elegibilidade mexicana de Morelia e edição anterior de La Habana.
- `git diff --check`: sem erro; somente avisos esperados de normalização LF/CRLF no Windows.

### Próximo passo exato

Concluir o lote final BR-09 com os 17 festivais ainda não processados: SEMINCI, ZINEBI, Punto de Vista, Documenta Madrid, Málaga, L'Alternativa, Play-Doc, FICX, Slamdance, SIFF, SFFILM, Frameline, NewFest, Inside Out, BFI Flare, Nashville e BOGOSHORTS. Depois executar a suíte final de integração, revisar a cobertura real e atualizar a PR #1 antes de qualquer merge/publicação.

## 2026-10-05 — pesquisa documental ampliada, checkpoint BR-09

### Escopo e preservação

- O schema 4, a branch `codex/revisao-completa-circuito`, os oito lotes anteriores e a PR #1 foram preservados; a migração do catálogo não foi reaplicada e nenhum dado pessoal foi incorporado.
- O script `scripts/apply-research-batch-br-09.mjs` tratou exatamente os 17 festivais restantes: SEMINCI, ZINEBI, Punto de Vista, Documenta Madrid, Málaga, L'Alternativa, Play-Doc, FICX, Slamdance, SIFF, SFFILM, Frameline, NewFest, Inside Out, BFI Flare, Nashville e BOGOSHORTS.
- O lote foi aplicado uma única vez. A base anterior continua recuperável no histórico Git e no commit `1a4108b`; os PDFs temporários usados na leitura não integram a entrega.

### Resultado documental

- Catálogo `2026-10-04.11`: 182 festivais, 182 edições, 533 chamadas e 1.645 linhas de fonte no inventário normalizado.
- Onze edições atuais ficaram confirmadas: SEMINCI 2026, ZINEBI 2026, Punto de Vista 2027, Málaga 2027, L'Alternativa 2026, Play-Doc 2027, Slamdance 2027, SIFF 2027, NewFest 2026, Inside Out 2027 e BOGOSHORTS 2026.
- Quatro edições atuais ficaram parciais. Documenta Madrid conserva o conflito oficial de encerramento (PDF: 16/2; página da chamada: 20/2). O FICX publicou a edição e a programação, mas não uma chamada pública de filmes. O SFFILM tem FAQ e FilmFreeway atuais, enquanto sua página detalhada ainda descreve 2026. A Frameline anunciou datas futuras de abertura, prazos e evento, mas ainda não havia publicado categorias, taxas e regras em 4/10/2026.
- BFI Flare e Nashville permaneceram como `edição anterior`: nenhuma chamada 2027 foi publicada até a consulta. Suas regras de 2026 não são apresentadas como confirmação atual nem como inscrição aberta.
- SEMINCI preserva o intervalo documental sem classificação operacional entre curtas `<=30` e longas `>60`; Málaga separa curtas documentais ibero-americanos das vias espanholas; Slamdance usa curtas `<40` e longas `>40`; SIFF usa curtas `<=40` e longas `>=41`; BOGOSHORTS separa competições internacional, F3 e nacional, incluindo taxas e isenções próprias.
- Ambulante foi corrigido como festival itinerante sem sede fixa única, evitando uma localidade fictícia nos filtros.
- A pesquisa manual alcançou os 182 festivais do acervo. A cobertura final deste ciclo registra 161 com fonte da edição corrente, 90 edições confirmadas, 72 parciais e 20 de edição anterior. Somente 32 possuem as 14 dimensões confirmadas na edição atual; 372 de 533 chamadas estão confirmadas. As 182 notas de relevância são provisórias e nenhuma lacuna foi convertida em confirmação.

### Verificação afetada

- `node --check scripts/apply-research-batch-br-09.mjs`: aprovado; a aplicação única resultou em 533 chamadas.
- `node scripts/generate-research-coverage.mjs`: aprovado; matriz, inventário e resumo foram regenerados para 182 festivais e 1.645 linhas de fonte.
- A validação detectou três incompatibilidades de vocabulário antes da integração: gêneros de conteúdo não controlados, `videoclipe` no campo de gênero e estreia `regional`. Os fatos foram preservados em descrições/territórios e os campos foram normalizados para `workTypes`, `fantástico`/`horror` e `estadual`.
- Testes direcionados de schema/privacidade e BR-09: 2/2 aprovados. Confirmam os limites de SEMINCI, Málaga, Slamdance e SIFF, a abertura futura da Frameline, a confiança histórica de BFI Flare/Nashville, as regras combinadas de BOGOSHORTS e a itinerância da Ambulante.

### Próximo passo exato

Executar a suíte integral, typecheck, build/PWA e verificação de `dist`; revisar o diff para excluir PDFs temporários e lockfile não intencional; atualizar a PR #1. Com os checks aprovados, incorporar em `main`, acompanhar o workflow existente do GitHub Pages e verificar a página publicada sem declarar como confirmados os campos documentais ainda parciais.

## 2026-10-05 — integração final local

- Testes unitários e de integração: **41/41 aprovados**, incluindo schema, migrações, restauração de backup, privacidade, filtros por mesma chamada, lotes BR-01 a BR-09 e benchmark de 2.000 festivais/18.000 chamadas.
- Interface de produção: **12/12 cenários Playwright aprovados**, cobrindo subdiretório `/circuito/`, filtros combinados, persistência IndexedDB, importação/exportação, atualização PWA, teclado, tela móvel, formulários e calendário.
- A ampliação documental criou múltiplas linhas de calendário para Slamdance e Oberhausen. As asserções antigas, que pressupunham uma única chamada, foram ajustadas para conferir a primeira ocorrência sem reduzir a cobertura sobre ausência/presença no mês.
- `pnpm typecheck`: aprovado. O script `build` deixou de chamar `npm` internamente e agora usa diretamente os binários locais, mantendo compatibilidade com `npm run build` e `pnpm build`.
- `pnpm build`: aprovado; Vite gerou o catálogo público, os assets e o PWA com base `/circuito/`. `pnpm check:dist`: aprovado para quatro assets, manifesto e service worker.
- `git diff --check`: sem erro; somente avisos de conversão LF/CRLF do Git no Windows.
- PDFs temporários, `pnpm-lock.yaml`, `dist`, resultados do Playwright e quaisquer dados locais não serão incluídos no commit. Os nove scripts de lote, a matriz, o inventário e o resumo fazem parte da proveniência versionada da pesquisa.

### Próximo passo exato

Criar o commit do ciclo documental e de integração, enviar a branch, atualizar a PR #1 e aguardar os checks remotos. Somente após aprovação, fazer merge em `main`, acompanhar o deploy do workflow `Validar e publicar Circuito` e verificar a versão pública.
