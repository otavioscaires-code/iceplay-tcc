# Material de modelagem e validação do ICEPLAY

Revisão de **17/11/2026**, conferida contra o código `98dabcc7888239de896db8410ee44b2ddfde831e`. Complemento técnico para inserir e revisar no TCC; não é a monografia final aprovada. Não altera a aplicação, o banco ou as migrations.

## Arquivos para usar

| Arquivo ou pasta | Conteúdo e finalidade |
| --- | --- |
| [ICEPLAY_Modelagem_Validacao.docx](ICEPLAY_Modelagem_Validacao.docx) | Word editável, 22 páginas, com texto, figuras, tabelas e resultados. Preparado em cópia do modelo UNIP fornecido, com páginas renderizadas e conferidas. |
| [modelagem-validacao.md](modelagem-validacao.md) | Fonte textual equivalente para revisão e reaproveitamento. |
| [figuras/casos-de-uso.png](figuras/casos-de-uso.png) | Diagrama dos oito casos de uso e dos atores externos. |
| [figuras/classes.png](figuras/classes.png) | Seis classes, 49 atributos públicos, nulabilidade e sete associações do EF Core. |
| [figuras/arquitetura.png](figuras/arquitetura.png) | Comunicação entre navegador, emissor, aplicação e SQLite. |
| `figuras/*.svg` | Figuras vetoriais para manter a qualidade ao ampliar ou exportar. São modelos; não são capturas da aplicação. |
| [casos-de-uso.puml](figuras/casos-de-uso.puml), [classes.puml](figuras/classes.puml) | Fontes PlantUML editáveis do mesmo modelo. Não foi executado renderizador PlantUML nesta entrega. As imagens foram desenhadas em SVG e rasterizadas localmente. |
| `tabelas/*.csv` | Nove tabelas editáveis: RF, RNF, regras, casos de uso, atributos, relacionamentos, cenários, resultados e rastreabilidade. UTF-8 com BOM e separador ponto e vírgula. |
| [dados-material.json](dados-material.json), [modelo-classes.json](modelo-classes.json) | Dados estruturados para conferir os identificadores, atributos, tipos e relacionamentos. |

Os requisitos preservam os IDs existentes: **16 funcionais e 12 não funcionais**. Há **12 regras**, **oito casos de uso detalhados** e **18 cenários de validação**. Os cenários incluem pendências; não são 18 testes físicos aprovados.

## Como inserir na monografia

1. No capítulo **Projeto**, inserir finalidade/escopo, tabelas de requisitos funcionais e não funcionais, regras de negócio, diagrama de casos de uso, especificações UC01–UC08 e diagrama de classes. O dicionário de atributos pode ficar em apêndice se o orientador preferir.
2. No capítulo **Desenvolvimento ou Resultados**, inserir arquitetura, método de verificação, tabela dos resultados, cenários e matriz de rastreabilidade. Manter os caminhos dos logs para reprodução.
3. Usar o conteúdo após a capa técnica deste complemento; a monografia mantém sua própria capa e folhas iniciais. Ajustar títulos, numeração das figuras/tabelas, listas, sumário e referências à sequência do trabalho completo.
4. Ao importar CSV, selecionar UTF-8 e separador `;`. Preservar critérios e situação; uma pendência não deve ser convertida em resultado aprovado.
5. Acrescentar posteriormente capturas reais da aplicação e fotos da montagem, com data, versão, legenda e origem dos dados. Dados de simulador devem aparecer como `Simulacao`. Este pacote não fabrica essas capturas nem fotos de sensores em execução.
6. Após os ensaios físicos, atualizar resultados, discussão, conclusão, resumo/abstract e artigo. Revisar com o orientador antes de considerar o TCC final.

As margens A4 e os cabeçalhos institucionais foram preservados em uma cópia do modelo fornecido. A numeração deste complemento começa em 1 no corpo, após a página técnica inicial; deve ser adaptada à monografia. O documento não inclui RA, assinatura, aprovação de banca ou titulação presumida. A assistência de IA está declarada.

## Evidências reais e limites

A [rodada de software](../../evidencias/2026-11-17-modelagem-validacao/rodada.json) executou setup/build sem avisos ou erros, **149 testes JavaScript** e os **dez verificadores existentes**, todos aprovados. Os resultados incluem **31 asserções do avaliador** com relógio controlado e **13 de convites**. As contagens não medem cobertura percentual ou precisão térmica. Logs e JSONs estão em `docs/evidencias/2026-11-17-modelagem-validacao/`; os caminhos dos CSVs são relativos a essa pasta.

TV01–TV15 descrevem cenários dos conjuntos executados em software. TV16 referencia o reconhecimento USB de **16/11**, parcial e não repetido nesta tarefa; TV17 (sensores/geladeira) e TV18 (apresentação em outro computador) **não foram executados**. F01 continua parcial e F02–F12 pendentes no [protocolo físico](../../hardware/protocolo-ensaio.md).

O teste de acesso móvel usa cliente HTTP/TLS e DOM/câmera controlados. Não comprova uso da câmera real no Safari. A origem `Hardware` é declarada pelo cliente e não é prova de aquisição física. O perfil público, o pacote de execução no computador da apresentação e o ensaio com hotspot continuam pendentes.

Ver [relatório e comandos da entrega](../../etapa-documentacao-modelagem-2026-11-17.md), [requisitos consolidados](../../requisitos-rastreabilidade.md), [modelagem](../../modelagem-atual.md) e [registro de IA](../../uso-de-ia.md).
