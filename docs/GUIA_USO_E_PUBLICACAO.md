# Guia curto — usar, revisar e publicar o Circuito

## Pesquisar e filtrar

Na página **Festivais**, escolha primeiro `Todos`, `No Brasil` ou `Fora do Brasil`. “No Brasil” significa local de realização, mesmo quando o nome contém “Internacional”. País, UF/subdivisão e cidade são filtros dependentes.

Os filtros principais cobrem filme, linguagem, formato, prazo, taxa, relevância e prioridade. Em **Filtros avançados** estão duração exata, participação, estreia, histórico online, sazonalidade, realização, teto em BRL e qualidade documental.

Use **Somente correspondências confirmadas** para excluir lacunas. Em **Incluir pendências identificadas**, o resultado informa que depende de confirmação; ausência de dado nunca equivale a compatibilidade.

Ao escolher um filme, o Circuito avalia cada chamada separadamente. Duração de uma seção, taxa de outra e estreia de outra edição não são combinadas. É possível escolher/reordenar colunas, salvar vistas e comparar até quatro festivais.

## Atualizar festivais e edições

Na ficha do festival, mantenha identidade/localidades separadas das edições e chamadas. Ao criar uma nova edição por duplicação, datas e confirmação são limpas para revisão.

Para confirmar uma regra:

1. leia o regulamento da edição e eventuais retificações;
2. registre a fonte, edição, seção, data de acesso e campos comprovados;
3. mantenha valores ausentes como nulos/não localizados;
4. separe chamadas quando duração, território, categoria ou preço diferirem.

O formulário alerta sobre alterações não salvas, permite revisar os campos modificados e guarda localmente a versão anterior de cada registro editado. O histórico fica em **Dados e backup** e só acompanha o backup privado.

## Organizar filmes e inscrições

Na ficha do filme, use duração em minutos e segundos, fatos de disponibilidade online, histórico de exibições e materiais versionados. Links e senhas privadas ficam apenas no navegador/backup.

Em **Inscrições**, planejamento, envio, resultado, sessões e prêmios são estados separados. Use checklist, tarefas, próxima ação, prazo interno e gasto real. Os filtros atendem filme, festival, ano, responsável, prioridade e pendências. Ações em lote sempre exibem uma revisão antes de aplicar.

O **Calendário** aceita filtro por filme e exporta o recorte visível em ICS. O arquivo não inclui protocolo ou código privado.

## Backup e privacidade

Os dados pessoais ficam no IndexedDB do navegador/dispositivo e não sincronizam sozinhos. Antes de atualizar, limpar o navegador ou trocar de computador:

1. abra **Dados e backup**;
2. clique em **Exportar backup**;
3. guarde o JSON em local seguro — ele pode conter links, protocolos e notas pessoais;
4. use **Exportar somente dados públicos** quando precisar compartilhar o catálogo sem dados pessoais.

Uma importação mostra prévia, conversões, ambiguidades e estratégia de mesclagem/substituição antes de gravar. Na substituição, o Circuito baixa uma cópia de segurança da base atual.

## Revisar a pull request

1. Abra a pull request da branch `codex/revisao-completa-circuito` contra `main` no repositório `vxictor01/circuito`.
2. Confira os checks de TypeScript, núcleo, build/PWA, artefato e Playwright.
3. Revise principalmente `src/data/catalog.json`, `docs/pesquisa/RESUMO_PESQUISA.md` e a matriz de cobertura; cinco festivais foram integralmente estruturados e 177 continuam pendentes.
4. Teste a branch preservando antes um backup da versão publicada.
5. Aprove e faça o merge somente quando as diferenças e pendências estiverem aceitas.

## Publicar no GitHub Pages

O mecanismo existente foi preservado. Um push/merge em `main` aciona `.github/workflows/deploy.yml`, valida a aplicação, gera `dist` com base `/circuito/` e publica o artefato no GitHub Pages.

Depois do workflow **Deploy Circuito to GitHub Pages** ficar verde, abra `https://vxictor01.github.io/circuito/`, atualize a página e confirme a versão. O service worker troca o cache estático sem apagar o IndexedDB; ainda assim, mantenha o backup anterior até concluir a verificação.
