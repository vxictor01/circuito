# Validação da entrega

Data: **03/10/2026**. Código completo preparado para GitHub Pages, com histórico Git local e dados pessoais separados. O arquivo original de 78 festivais não foi colocado no repositório.

## Resultado executado

| Verificação                                                       | Resultado       |
| ----------------------------------------------------------------- | --------------- |
| TypeScript                                                        | Sem erros       |
| Testes de regras, schema, migração, backup e IndexedDB            | **23 passaram** |
| Testes Chromium de interface e produção                           | **12 passaram** |
| Build de produção em `/circuito/`                                 | Passou          |
| Manifest, ícones, assets e escopo do service worker               | Passaram        |
| Link direto por hash e refresh em servidor estático sem fallback  | Passaram        |
| Build e teste de rotas na raiz `/`                                | Passaram        |
| Build e teste de rotas em `/outro-nome/`                          | Passaram        |
| Cadastro e persistência offline na PWA de produção                | Passaram        |
| Ativação de atualização de service worker com preservação da base | Passou          |
| Migração do backup recebido e comparação do original completo     | Passou          |
| Exportação/restauração integral do backup migrado                 | Passou          |
| YAML, eventos, dependência de jobs, permissões e ambiente Pages   | Conferidos      |
| Publicação real e execução remota no GitHub Actions               | **Pendente**    |
| Verificação do endereço HTTPS real no GitHub Pages                | **Pendente**    |

Os testes usaram Node **24.19.0**, TypeScript **5.9.3**, Vite **7.3.1** e Playwright **1.56.1**, com Chromium. O workflow remoto está configurado para Node **22**. Não foi alegada execução remota do workflow ou validação de um site publicado. A conexão GitHub confirmou a conta `vxictor01`, mas não encontrou um repositório Circuito acessível e os comandos expostos não incluem criação de repositório ou administração de Pages.

## O que os testes críticos cobrem

- Migração legada mantém originais, IDs, notas, ambiguidades e os eventos excluídos da listagem; um generalista que recebe animação permanece.
- Backup de dados sintéticos mantém todos os vínculos, notas, códigos e links privados. Schema futuro, JSON inválido, referências quebradas, datas impossíveis e intervalos/taxas contraditórios são recusados.
- Mesclagem não altera o objeto de entrada, mantém aliases, IDs e históricos originais; URLs de eventos diferentes na mesma plataforma não provocam união indevida.
- Cálculo de prazo cobre fuso, mudança de horário de verão, abertura, hoje, amanhã, próximos dias, encerramento e prorrogação. Datas antigas ou não confirmadas não geram chamada aberta. Etapas determinam a taxa vigente.
- Elegibilidade explica compatibilidade, conflito e informações desconhecidas, incluindo território e estreia.
- Filtros aplicam critérios à mesma chamada da edição mais recente; regras de categorias distintas não são combinadas.
- Duplicação conserva o histórico, limpa datas e exige revalidação da nova edição.
- IndexedDB mantém a base após reabertura, recusa restauração inválida e aborta toda a transação em uma falha de clonagem. Upgrade físico cria índices e migra conteúdo sem reset.
- Catálogo tem mais de 150 IDs únicos e não contém filmes, inscrições, notas pessoais, favoritos nem o original bruto.

## O que os testes de interface cobrem

1. Produção em subdiretório, assets, manifest, ícones, hash routing, refresh e 404 real para um caminho HTTP inexistente.
2. Criação e edição de filme, link privado e persistência após refresh.
3. Favorito, filtros combinados, alternância entre tabela/cards e preferência mantida.
4. Prévia da importação legada, relatório, mesclagem, alias, exclusão arquivada e consulta após refresh.
5. Exportação com todos os vínculos e restauração em contexto de navegador novo.
6. Arquivo corrompido não altera a base existente.
7. PWA de produção permite consultar, criar filme e recarregar offline.
8. Uma nova instância do service worker é ativada e mantém o IndexedDB.
9. Pesquisa global por teclado, Escape e foco no formulário.
10. Navegação e formulário em viewport móvel de 390 pixels.
11. Formulários completos criam festival, edição, chamada e inscrição com os quatro vínculos; duplicação não copia datas antigas.
12. Calendário combina mês, tipo e confirmação; preferências persistem; a grade móvel rola dentro do conteúdo sem ampliar a largura do documento.

O teste de atualização ativa uma nova URL do mesmo script de service worker. Ele confirma a troca de worker sem perda de IndexedDB, mas não equivale a um ensaio de todos os possíveis pares de versões ou schemas. O upgrade físico/schema é coberto pelos testes de banco. As verificações de PWA automatizadas usaram Chromium; Safari, Firefox e instalação em dispositivos físicos não foram testados.

## Backup real recebido

O arquivo schema 1 foi transformado e combinado com o catálogo final. Foram conferidos **78 registros originais**, **74 IDs mantidos**, **4 exclusões arquivadas**, **123 apontamentos ambíguos**, **0 erros de importação**, **182 festivais finais**, **0 filmes** e **0 inscrições**. A comparação profunda de `archive.legacyRoot` com o JSON recebido passou. A exportação e sua releitura também conservaram a estrutura integral.

O backup migrado e seu relatório são entregues separadamente. O catálogo público não contém o arquivo bruto nem notas privadas. A licença do código não concede direitos sobre regulamentos ou marcas dos festivais.

## Escala e revisão visual

O teste gera **2.000 festivais e 18.000 chamadas** e mede a criação dos índices e a aplicação de um filtro composto. A rodada registrada ficou em aproximadamente **0,41 segundo** no ambiente de teste. Esse resultado é uma referência local de código, não uma promessa de tempo em qualquer computador. A interface pagina o resultado; não cria milhares de linhas de uma vez.

Dashboard, tabela de festivais, cards, ficha do festival e calendário foram abertos no build de produção e inspecionados visualmente. Sem erros de JavaScript observados. Na viewport de 390 pixels, corpo e área principal permaneceram com largura de 390 pixels. A grade mensal possui rolagem horizontal própria; a lista oferece uma alternativa compacta.

## Fechamento da publicação

Para encerrar a validação externa ainda é necessário criar ou selecionar um repositório acessível, publicar a branch `main`, habilitar Pages com GitHub Actions, aguardar `build` e `deploy` concluídos e abrir o endereço real. No endereço publicado, conferir assets, hash/refresh, manifest/escopo, backup de teste e offline antes da importação pessoal. As instruções estão no README; o aplicativo já está preparado para esse processo.

Referências técnicas consultadas: [GitHub Pages — custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Vite — static deploy](https://vite.dev/guide/static-deploy.html), [upload-pages-artifact](https://github.com/actions/upload-pages-artifact) e [deploy-pages](https://github.com/actions/deploy-pages). As verificações locais foram feitas contra os arquivos e o comportamento do projeto, além da leitura dessas referências.
