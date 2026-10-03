# Schema, backup e migração

## Versões

- `schemaVersion: 3`: estrutura atual do conteúdo e do backup.
- IndexedDB `circuito-personal`, versão física `2`: stores e índices.
- `settings.catalogVersion`: versão editorial do catálogo público, independente das duas anteriores.

## Conteúdo do backup

| Campo                                | Conteúdo                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `app`, `schemaVersion`, `exportedAt` | Identificação e instante ISO de exportação                                        |
| `festivals`                          | Identidade, aliases, país/região/cidade, perfis, fontes e preferências pessoais   |
| `editions`                           | Festival associado, ano, número, datas, regulamento, confiança e fontes           |
| `calls`                              | Edição associada, categorias, formatos, regras, prazos, taxas e fontes            |
| `films`                              | Ficha técnica, território, duração, premiere, materiais e links privados          |
| `submissions`                        | Quatro vínculos, plataforma, datas, pagamento, código, estado, resultado e prêmio |
| `settings`                           | Nome, fuso, preferências, revisão de fontes, catálogo e última exportação         |
| `archive`                            | Originais, registros excluídos da lista e relatórios de importação                |

`src/types.ts` é a definição completa dos campos. O JSON é legível, com indentação de dois espaços. O limite de importação pela interface é 50 MB.

## Estados e campos desconhecidos

Duração, ano e valores monetários sem confirmação usam `null`. Datas desconhecidas usam string vazia. Países/gêneros vazios não significam uma proibição. `genresConfirmed` e `territoriesConfirmed` distinguem regras verificadas do perfil editorial. PF/PJ usa `sim`, `não`, `não confirmado` ou `não se aplica`. Online permite `permitido`, `proibido`, `restrito` e `não confirmado`. Premiere e reinscrição também têm estados explícitos.

Fontes possuem URL, tipo, data de consulta, confiança, nota e campos respaldados. Uma fonte confirmar identidade não confirma duração, taxa ou data. Etapas de prazo guardam tipo, data, hora, fuso e confirmação. Taxas guardam valor, moeda, etapa, gratuidade, desconto, waiver e notas. Status temporal é calculado e não armazenado como “aberto”.

## Importação e restauração

`readImport` reconhece o formato legado schema 1 sem array de edições, migra schema 2 para 3 e valida schema 3. Versão futura é recusada; não se tenta reinterpretá-la como antiga. O validador verifica IDs únicos, referências, consistência dos quatro vínculos da inscrição, datas reais, intervalos, enums, valores e configurações.

A interface primeiro lê e mostra o relatório. Nenhuma gravação acontece nesse passo. Mesclar preserva os registros exclusivos das duas bases. Em coincidências, o importado tem precedência para restauração pela interface; a atualização automática do catálogo usa precedência da base local. Identidade é comparada por ID, nome/país, URL completa relevante ou alias; o caminho de uma página de plataforma faz parte da chave, evitando unir festivais distintos só porque usam FilmFreeway.

A substituição baixa um backup da base atual e grava a base importada em uma transação. O catálogo não repovoa automaticamente registros que tenham sido excluídos por essa restauração. Um arquivo inválido ou um erro da transação mantém o banco existente.

## Migração do arquivo recebido

Auditoria do arquivo anterior: **78 festivais**, **78 edições embutidas**, **0 filmes**, **0 inscrições**. A transformação mantém **74 festivais** na lista ativa e preserva os **4 eventos exclusivamente de animação** no arquivo de importação. Nenhuma duplicata foi encontrada entre os 78 registros. Há **123 apontamentos de campos ambíguos**, **6 grupos de conversões** e **0 erros de leitura**. Apontamentos não são 123 festivais diferentes: um registro pode ter várias dúvidas.

Os IDs dos 74 registros são conservados. Uma edição embutida vira `Edition`; seu conjunto de regras vira `Call`. Datas ISO válidas são preservadas, mas prazos anteriores não recebem confirmação atual. Janelas textuais, limites como “consultar edital”, gratuidade condicionada, PF/PJ desconhecido e regras que não cabem em um valor simples continuam como texto original. Não se transforma uma janela em dia exato nem uma informação ausente em “não”.

Cada entidade migrada guarda `legacy` quando necessário. `archive.legacyRoot` guarda o arquivo anterior completo, inclusive estrutura original, configurações e os quatro eventos removidos da listagem. Mesclar originais diferentes guarda o anterior em `archive.legacyHistory`. Exclusões e relatórios acompanham toda nova exportação. O relatório detalhado e o backup migrado são arquivos pessoais entregues separadamente, fora do repositório.

O backup migrado entregue inclui o catálogo expandido e mantém os originais dos 78 registros. Não substitui o arquivo original; guarde ambos. Filme e inscrição existentes em um backup futuro são preservados; os testes usam dados sintéticos para confirmar códigos, links privados e todos os vínculos.

## Acrescentar uma migração

1. Acrescente a nova definição de schema e uma transformação explícita da versão anterior.
2. Preserve campos desconhecidos ou sem equivalente, com relatório. Não remova importadores antigos.
3. Valide o resultado completo antes de qualquer transação.
4. Se mudar stores ou índices, aumente a versão física e crie-os em `onupgradeneeded`, sem limpar os dados.
5. Teste ida e volta de backup, falha sem alteração da base, referências e preservação dos originais.
6. Documente compatibilidade e recuperação. Um downgrade de código não deve ser tratado como downgrade automático de dados.
