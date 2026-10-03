# Circuito

Circuito organiza pesquisa de festivais, filmes e inscrições em uma aplicação estática para GitHub Pages. O código é versionado no GitHub; os dados pessoais ficam no navegador. Não há servidor de aplicação, login ou sincronização automática.

## Para começar a usar

1. Abra o endereço indicado em **Settings → Pages** do repositório. Para um repositório chamado `circuito`, o endereço será `https://SEU-USUARIO.github.io/circuito/`. Substitua `SEU-USUARIO` pelo nome da conta; esse endereço é um exemplo.
2. A primeira abertura instala o catálogo público de **182 festivais**, com a confiança e as fontes de cada registro. Confira o regulamento da edição e da categoria antes de inscrever um filme.
3. Abra **Dados e backup** e importe seu arquivo JSON anterior, se tiver um. A aplicação mostra um relatório antes de alterar a base.
4. Cadastre seus filmes em **Filmes**. No festival, escolha uma edição e uma chamada; compare as regras com um filme e crie uma inscrição.
5. Use **Inscrições** para acompanhar códigos, pagamentos, resultados e prêmios. O calendário mostra aberturas, etapas de prazo, resultados e datas dos festivais.

**Importante:** metadados de perfil não equivalem a regras confirmadas. Uma data de edição anterior não torna uma chamada aberta. “Não confirmado” significa que falta informação. A comparação de elegibilidade é uma ajuda para revisar regras, sem garantir aceitação pelo festival.

### Importar o backup anterior

Em **Dados e backup**, escolha o JSON e revise os números, exclusões, ambiguidades e erros. **Mesclar** mantém os outros registros do navegador e incorpora o arquivo; registros com o mesmo ID ou identidade podem ser atualizados pelo conteúdo importado. Você pode escolher “Manter minhas informações atuais” nas coincidências. **Substituir** restaura exatamente a base do arquivo e baixa um backup da base atual antes da troca. Ao substituir, confirme que o navegador permitiu esse download e guarde-o.

O importador reconhece o formato anterior de schema 1, preserva IDs existentes e separa Festival, Edição e Chamada. Informações sem correspondência segura ficam em observações ou em `legacy`; o original inteiro fica no arquivo de preservação do backup. Os quatro eventos exclusivamente de animação saem da lista de circulação, mas seus registros completos continuam preservados nesse arquivo. O relatório pode ser baixado na própria página.

Também é possível importar o backup já migrado entregue separadamente. Esse arquivo é pessoal: **não o envie ao repositório**.

### Fazer backup e restaurar

- Abra **Dados e backup → Exportar backup**. Guarde o JSON em uma pasta sua e, se quiser, em um serviço de arquivos de sua escolha.
- Faça um backup depois de alterações importantes e antes de trocar de computador, navegador ou endereço do site. A data da última exportação aparece na aplicação.
- Para restaurar, abra Circuito no destino, escolha o JSON e use **Substituir**. Para juntar bases, use **Mesclar** e revise registros coincidentes.
- O arquivo contém filmes, inscrições, links privados, códigos, notas, configurações e o histórico preservado. Ele não é criptografado: compartilhe somente com quem deve ter acesso.
- Arquivos inválidos, schemas futuros ou vínculos quebrados são recusados antes de gravar. A troca acontece em uma transação: uma falha de gravação mantém a base anterior.

### Onde os dados ficam

Os dados ficam no **IndexedDB do navegador**, na origem do site e no perfil em que você abriu Circuito. Atualizar a página, fechar o navegador ou atualizar o código mantém a base. Outro navegador, outro perfil ou outro domínio não recebe esses dados automaticamente. Sites no mesmo domínio compartilham a origem; mantenha uma instalação pessoal de Circuito por origem.

Limpar os dados do site, usar uma janela privada ou uma limpeza feita pelo navegador pode apagar o armazenamento local. Backup é a forma de recuperação. Em **Dados e backup**, a opção de solicitar armazenamento persistente pode reduzir a limpeza automática; o navegador decide se concede. O cache offline e o banco pessoal são separados.

### Offline, instalação e atualizações

Depois de uma primeira abertura online completa, a versão de produção guarda os arquivos necessários para uso offline, incluindo o catálogo. Você pode consultar e editar a base sem internet. Links para regulamentos externos precisam de conexão. Para instalar a PWA, use **Instalar**, quando oferecido, ou a opção de instalação do navegador. A disponibilidade depende do navegador e exige HTTPS ou localhost.

Quando uma atualização estiver pronta, Circuito oferece **Atualizar aplicação**. Salve o formulário aberto antes de aplicar. A atualização troca os arquivos do aplicativo e conserva o IndexedDB. Não limpe o armazenamento para atualizar. Se uma migração não puder ser feita, a aplicação mostra o erro e não apaga a base.

## Publicar no GitHub Pages

### Opção pela interface do GitHub

1. Crie um repositório chamado **circuito**, na sua conta. Para usar Pages sem plano pago, escolha um repositório público. O catálogo é público; o backup pessoal nunca entra nele.
2. Envie os arquivos de código, mantendo as pastas. Confira que **`.github/workflows/deploy.yml`** foi enviado: algumas telas do sistema ocultam pastas cujo nome começa com ponto. Não envie `node_modules`, `dist`, backups ou arquivos pessoais.
3. Abra **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**. Não escolha uma pasta de branch.
4. Abra **Actions → Validar e publicar Circuito → Run workflow** na branch `main`. Se o envio já disparou uma execução antes de habilitar Pages, execute novamente.
5. Aguarde as tarefas `build` e `deploy` ficarem verdes. O endereço aparece em **Settings → Pages** e no ambiente **github-pages**.
6. Abra esse endereço, navegue até um festival e atualize a página. Exporte e restaure um backup de teste e confira o uso offline antes de importar a base pessoal.

O workflow já instala dependências, verifica TypeScript, testa regras e persistência, constrói os arquivos estáticos, confere caminhos e executa testes de interface e offline. A publicação só acontece depois dessas etapas. Pull requests são validados sem publicar. Não é necessário colocar token ou segredo no frontend.

Se Actions estiver desabilitado na conta/organização, habilite-o nas configurações do repositório. Se uma política da organização bloquear uma action, consulte a mensagem da execução e adapte a política com o administrador. Não altere o aplicativo para guardar credenciais.

### Preservar o histórico Git entregue

O arquivo `Circuito_historico.bundle`, entregue separado do código compactado, contém a branch `main` e seus commits. Com Git instalado:

```bash
git clone Circuito_historico.bundle circuito
cd circuito
git remote remove origin
git remote add origin https://github.com/SEU-USUARIO/circuito.git
git push -u origin main
```

Crie antes o repositório vazio no GitHub. O Git solicitará a autenticação de forma normal. Em seguida, habilite Pages com **GitHub Actions**, como descrito acima. Não acrescente backups à pasta de código.

### Atualizar e fazer rollback

Uma alteração enviada ou mesclada em `main` executa os testes e publica uma versão nova. Aguarde Actions ficar verde antes de considerar a atualização publicada. Os dados do navegador não fazem parte desse processo.

Para voltar a uma versão, prefira **reverter o commit**: abra o pull request correspondente e use **Revert**, ou execute `git revert ID_DO_COMMIT` e envie para `main`. Isso cria um commit novo e mantém o histórico. O workflow publica a versão revertida. **Rollback de código não é restauração de dados**; dados são recuperados pelo backup JSON. Uma versão antiga do aplicativo pode não entender um schema mais novo: mantenha as migrações compatíveis e exporte antes de mudar versões.

## Manutenção local

Instale Node.js **22.12 ou posterior** e Git. O projeto usa React, TypeScript, Vite e CSS normal; IndexedDB, routing e service worker usam APIs do navegador.

```bash
npm ci
npm run dev
```

`npm ci` reproduz as versões do lockfile; `npm install` também instala dependências e pode atualizar esse arquivo. O comando `dev` mostra o endereço local, normalmente `http://localhost:5173/circuito/`. Dados de localhost são separados dos dados de GitHub Pages.

```bash
npm run typecheck
npm test
npm run build
npm run check:dist
npx playwright install chromium
npm run test:ui
npm run preview
```

`build` gera `dist/`, manifest e service worker. `preview` serve esse build apenas para conferência local. Os testes de interface usam um servidor estático estrito, sem fallback para caminhos inexistentes, para verificar o comportamento das rotas em hospedagem estática. Em Linux, se faltarem bibliotecas do navegador, use `npx playwright install --with-deps chromium`.

### Caminhos e rotas

O padrão de build é **`/circuito/`**. No GitHub Actions o caminho é calculado a partir do nome real do repositório. Um repositório `SEU-USUARIO.github.io` usa `/`. Para outro caminho local:

```bash
VITE_BASE_PATH=/outro-nome/ npm run build
VITE_BASE_PATH=/outro-nome/ npm run check:dist
VITE_BASE_PATH=/outro-nome/ npm run test:ui
```

As rotas usam hash, por exemplo **`/circuito/#/festivais/festival-001`**. O servidor recebe somente `/circuito/`; assim, abrir diretamente ou atualizar uma tela interna não exige regras de redirecionamento nem um backend. `/circuito/festivais/...` sem hash não é uma rota do aplicativo. Os links, manifest, assets e escopo da PWA acompanham o mesmo caminho de build.

### Organização do código

| Caminho                          | Responsabilidade                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `src/types.ts`                   | Schema e estados possíveis                                                            |
| `src/db/repository.ts`           | Acesso a IndexedDB, índices e transações                                              |
| `src/migrations/`                | Leitura, validação, migração e mesclagem de backups                                   |
| `src/store.tsx`                  | Estado, fila de gravação, atualização do catálogo e comunicação entre abas            |
| `src/pages/`                     | Dashboard, festivais, detalhes, filmes, inscrições, calendário, dados e configurações |
| `src/components/`                | Formulários e elementos compartilhados                                                |
| `src/utils/`                     | Datas, filtros, elegibilidade, validação, exportação e duplicação                     |
| `src/data/catalog.json`          | Catálogo público separado dos dados pessoais                                          |
| `src/styles/` e `src/styles.css` | Tokens de cor e estilos                                                               |
| `public/`                        | Ícones da PWA                                                                         |
| `scripts/`                       | Geração e validação da PWA e servidor estático de testes                              |
| `tests/`                         | Testes de regras, migrações, banco e interface                                        |
| `.github/workflows/deploy.yml`   | Validação e publicação em Pages                                                       |
| `docs/`                          | Arquitetura, schema, pesquisa e resultados de validação                               |

### Schema e migrações

O schema atual é **3**. Festival possui edições; cada edição possui chamadas. Uma inscrição liga um filme, um festival, uma edição e uma chamada coerentes entre si. Duração, anos, territórios, taxas e etapas de prazo são estruturados. Campos desconhecidos usam estados explícitos, listas vazias ou `null`, conforme o tipo.

A versão física do IndexedDB é **2**; ela é diferente de `schemaVersion`. Alterar uma exige revisar a criação de stores/índices; alterar a outra exige um caminho de migração em `src/migrations/index.ts`. Ao acrescentar um schema, mantenha os importadores anteriores, preserve campos sem correspondência, valide antes da transação e adicione testes de ida e volta. Nunca use “apagar e recriar o banco” como migração.

Leia [o schema e a migração](docs/schema-e-migracao.md), [a arquitetura](docs/arquitetura.md), [o relatório de pesquisa](docs/pesquisa-festivais.md) e [a validação](docs/validacao.md).

### Atualizar o catálogo público

Pesquise manualmente em sites oficiais, regulamentos, instituições organizadoras e plataformas. Registre fonte, data, confiança e campos respaldados. Não transforme ausência de informação em negativa, não renove datas antigas automaticamente e não una categorias com regras diferentes. Mantenha IDs estáveis e acrescente edições novas.

Edite apenas `src/data/catalog.json`, execute as validações e atualize `settings.catalogVersion` para uma versão nova. Na instalação existente, novos registros são adicionados; alterações locais em IDs já existentes têm precedência. Isso protege a pesquisa pessoal, mas significa que correções públicas de registros existentes devem ser conferidas e incorporadas conscientemente pelo usuário.

Não inclua filmes, inscrições, favoritos, prioridades, notas privadas, links de screener ou o arquivo bruto importado no catálogo. O teste de catálogo verifica essa separação. O relatório documenta 15 identidades cujo acesso atual precisa de nova confirmação, duas referências históricas, nomes ambíguos e a cobertura de regras.

## Licença

O código é distribuído sob [MIT](LICENSE). Nomes, fatos e links do catálogo são referências documentais; os regulamentos, marcas e materiais dos festivais pertencem a seus titulares. O repositório não redistribui regulamentos completos nem logotipos dos festivais.
