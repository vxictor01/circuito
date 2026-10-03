# Validação da entrega

Data: **03/10/2026**. Código publicado em [vxictor01/circuito](https://github.com/vxictor01/circuito), com aplicação em [GitHub Pages](https://vxictor01.github.io/circuito/), histórico Git e dados pessoais separados. O arquivo original de 78 festivais não foi colocado no repositório.

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
| Publicação real e execução remota no GitHub Actions               | **Passaram**    |
| Verificação do endereço HTTPS real no GitHub Pages                | **Passou**      |

Os testes usaram Node **24.19.0**, TypeScript **5.9.3**, Vite **7.3.1** e Playwright **1.56.1**, com Chromium. O workflow remoto executou Node **22.23.3** e aprovou novamente os **23 testes de regras** e os **12 testes de interface**. As tarefas `build` e `deploy` concluíram com sucesso na [execução 37161849560](https://github.com/vxictor01/circuito/actions/runs/37161849560), para o commit `60d4945`. O repositório foi criado na conta `vxictor01`; Pages usa GitHub Actions e exige HTTPS.

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

A publicação externa foi concluída em **03/10/2026**. O endereço real abriu em HTTPS com **182 festivais, 182 edições e 188 chamadas**, sem filmes ou inscrições pessoais. A ficha do Slamdance abriu pela rota hash e permaneceu acessível após refresh. Os scripts, estilos e link do manifest usam o prefixo `/circuito/`; a interface ofereceu a instalação da PWA. Não foram observados erros do aplicativo no console; mensagens de uma extensão do ambiente foram desconsideradas.

No site real, um backup público com um filme sintético foi importado com prévia e **0 erros**. O filme permaneceu após refresh. A restauração integral do catálogo público retirou esse registro de teste e conservou os 182 festivais. O comando de exportação registrou a data na interface, mas o mecanismo de captura de downloads do navegador remoto não disponibilizou o JSON para comparação nesta conferência. A exportação/restauração completa com comparação do JSON e o uso offline foram aprovados pelos testes Chromium locais e pela execução remota de produção; não foi simulada uma queda de rede no endereço HTTPS real. Os dados pessoais recebidos continuam somente no backup entregue separadamente.

Os sete commits de implementação foram publicados com as mesmas árvores de arquivos do histórico local. O commit inicial do repositório e este registro de publicação completam o histórico remoto; a branch `preparacao-local` no bundle conserva os hashes originais. Alterações futuras em `main` continuam sujeitas ao workflow de validação e publicação.

Referências técnicas consultadas: [GitHub Pages — custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Vite — static deploy](https://vite.dev/guide/static-deploy.html), [upload-pages-artifact](https://github.com/actions/upload-pages-artifact) e [deploy-pages](https://github.com/actions/deploy-pages). As verificações locais foram feitas contra os arquivos e o comportamento do projeto, além da leitura dessas referências.
