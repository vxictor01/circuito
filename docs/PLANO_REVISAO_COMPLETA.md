# Plano de revisão completa do Circuito

Atualizado em 2026-10-05. Branch de trabalho: `codex/revisao-completa-circuito`.

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
- **Concluído — pesquisa verificável inicial:** cinco regulamentos/páginas oficiais integralmente estruturados: Festival de Brasília 2026, Curta Kinoforum 2026, Curta Cinema 2027, É Tudo Verdade 2026 e FestCurtasBH 2026.
- **Concluído — checkpoint BR-01 (20 festivais):** nove edições com regulamento atual integralmente estruturado (Festival do Rio, Cine PE, Festival de Vitória, Panorama, MixBrasil, Fantaspoa, Ecofalante, FAM e Guarnicê) e onze edições parciais com impedimentos por campo (Gramado, Tiradentes, Olhar, Janela, Cine Ceará, FICA, CineBH, Mostra Infantil, forumdoc, Goiânia Mostra Curtas e Fest Aruanda). O catálogo passou de 199 para 250 chamadas; matriz e inventário foram regenerados.
- **Concluído — checkpoint BR-02 (20 festivais):** nove edições atuais confirmadas (Mostra de Cinema de Gostoso, In-Edit Brasil, Curta Taquary, Curta-SE, Circuito Penedo, Santos Film Fest, CINEMATO, Olhar do Norte e RioLGBTQIA+), oito atuais parciais (Cine Esquema Novo, Cinema da Fronteira, Curta Santos, Kinoarte, Triunfo, Maranhão na Tela, Cinefantasy e Encontro de Cinema Negro) e três cuja última chamada localizada continua sendo 2025 (CachoeiraDoc, Curta Brasília e Curta Canoa). O catálogo passou de 250 para 300 chamadas.
- **Concluído — checkpoint BR-03 (20 festivais):** onze edições atuais confirmadas (ECRÃ, Mostra Sesc, Entretodos, EGBÉ, FENDA, Caruaru, Itabaiana, CineAlter, Primeiro Plano, NOIA e Metrô), seis atuais parciais (Visões Periféricas, Adélia Sampaio, FIC Ribeirão, Marília, Cinema Urbana e Curta Caicó) e três cuja última edição documental localizada permanece anterior (Dobra, FINCAR e Taguá). O catálogo passou de 300 para 345 chamadas.
- **Concluído — checkpoint BR-04 (20 festivais):** quatro edições atuais confirmadas (Curta Campos do Jordão, Seridó Cine, Bonito CineSur e Finos Filmes), onze atuais parciais (Curta na Serra, Muriaé, Fama, Cine Lapinhô, Cine Pojichá, FestCiMM, Sinédoque, SAN, Missões, MAFF e Nicho) e cinco cuja última edição documental localizada permanece em 2025 (Revoada, Respira, CineDiamante, Contagem e Cinegro). O catálogo passou de 345 para 366 chamadas.
- **Concluído — checkpoint BR-05 (20 festivais):** cinco edições atuais confirmadas (Mostra Internacional de Cinema em São Paulo, Arapiraca, Estranhos Encontros, MacacuCine e Sururu), nove atuais parciais (Cinecipó, FESTCINE Pinhais, Noturno, Cine Jardim, Lobo Fest, Black Queer, FIACAFI, Recanto e CineOP) e seis cuja última edição documental localizada permanece anterior (FEMUCINE, Fronteira, Motriz, FECINE, Cine dos Campos e Cine Verão). O catálogo passou de 366 para 394 chamadas.
- **Concluído — checkpoint BR-06 (20 festivais):** dezessete edições atuais confirmadas (Mata Atlântica, Porto/Post/Doc, Doclisboa, Sundance, IndieLisboa, IDFA, IFFR, CPH:DOX, Oberhausen, Clermont-Ferrand, Visions du Réel, FIDMarseille, DOK Leipzig, Hot Docs, DocsBarcelona, Ji.hlava e Tampere) e três atuais parciais (Sheffield DocFest, Curtas Vila do Conde e Uppsala). O catálogo passou de 394 para 450 chamadas.
- **Concluído — checkpoint BR-07 (20 festivais):** treze edições atuais confirmadas (Winterthur, Krakow, Vienna Shorts, Palm Springs, Aspen, Cannes, Venezia, San Sebastián, TIFF, Tribeca, SXSW, Brive e Beldocs) e sete atuais parciais (Encounters, Go Short, Berlinale, Locarno, Film Fest Gent, Leuven e Paris Courts Devant). O catálogo passou de 450 para 498 chamadas.
- **Concluído — checkpoint BR-08 (20 festivais):** seis edições atuais confirmadas (Docudays UA, One World, Guadalajara, Morelia, Mar del Plata e FEST), treze atuais parciais e La Habana preservada na última edição documental de 2025. O catálogo passou de 498 para 516 chamadas.
- **Concluído — checkpoint BR-09 (17 festivais):** onze edições atuais confirmadas (SEMINCI, ZINEBI, Punto de Vista, Málaga, L'Alternativa, Play-Doc, Slamdance, SIFF, NewFest, Inside Out e BOGOSHORTS), quatro atuais parciais (Documenta Madrid, FICX, SFFILM e Frameline) e duas preservadas na última edição publicada (BFI Flare e Nashville). O catálogo passou de 516 para 533 chamadas.
- **Concluído — varredura manual do acervo:** os 182 festivais passaram por pesquisa documental. Há 161 com ao menos uma fonte da edição corrente, 90 edições confirmadas, 72 parciais e 20 baseadas na última edição disponível. Somente 32 festivais têm as 14 dimensões da matriz confirmadas na edição atual; 372 de 533 chamadas estão confirmadas. As 182 avaliações de relevância permanecem explicitamente provisórias, separadas da prioridade pessoal.
- **Em andamento — integração final:** validar a suíte completa, build/PWA e interface; revisar os artefatos versionados; atualizar a PR #1. Merge e publicação continuam suspensos até os checks finais aprovarem.

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
