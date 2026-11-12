# Interface de alertas — 12/11/2026

A página `/alertas` consulta o backend já validado, com filtros por equipamento/origem/tipo/gravidade/situação, período de abertura convertido de hora local para UTC e paginação. A URL conserva filtros/página; alterações de filtros cancelam a consulta anterior. Erros limpam dados antigos. Conteúdo vindo da API usa nós de texto, inclusive nomes de geladeiras, sem injetar HTML. As ocorrências mostram parâmetros/evidências/motivos e link para o histórico.

A Visão geral consulta resumo real na origem selecionada e mostra até cinco ocorrências. O contador não confirma normalidade se o avaliador não tiver sucesso recente. Equipamentos sem configuração ativa são explicitados. Configurações agora explica a avaliação efetiva, a necessidade de novas amostras para temperatura/porta após editar e a distinção entre desativar e normalizar. Navegação e tema foram mantidos.

## Resultados executados

- `node --test scripts/acesso.test.mjs scripts/historico-estado.test.mjs scripts/monitoramento-estado.test.mjs scripts/shell.test.mjs scripts/configuracoes.test.mjs scripts/alertas.test.mjs`: **101 passaram, zero falhas**. Inclui 16 novos testes de contrato e cliente com DOM/fetch controlados: filtros, paginação, conteúdo seguro, falhas, resposta atrasada e resumo sem monitoramento/avaliador.
- `./scripts/verify-pages.ps1 -EvidenceDirectory docs/evidencias/2026-11-12-pre-hardware/alertas-interface-01/paginas`: **205 verificações / 46 requisições**, rotas diretas, recarga, navegação, assets, 404 e persistência com reinício. O build desse verificador passou sem avisos/erros.
- Logs: `evidencias/2026-11-12-pre-hardware/alertas-interface-01`.

O CSS usa colunas flexíveis e adapta filtros/cards em 1000/700 px, controles de 16 px e alvos de navegação de 44 px no celular. Isso é inspeção do código e teste de estados/menu; **não houve renderização nem screenshot nesta entrega**. O acesso ao navegador local está indisponível na ferramenta. A conferência visual no Safari, teclado e orientações permanecem pendentes. Não foram inseridos dados de preenchimento no banco de uso.
