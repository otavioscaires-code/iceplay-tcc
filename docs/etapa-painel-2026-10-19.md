# Painel de últimas leituras — 19/10/2026

## Escopo e diagnóstico

A base inspecionada já tinha ASP.NET Core/EF Core/SQLite, cadastro completo de geladeiras, saúde real do banco, ingestão/consulta individual de leituras, simulador PowerShell e verificadores. Faltava uma consulta agregada e uma apresentação das últimas medições na interface. A evolução foi limitada a esse painel, conforme a orientação de entregar incrementos pequenos.

A arquitetura, as configurações, as entidades, as duas migrations e os testes anteriores foram preservados. Não houve pacote novo, migração, seed ou alteração automática dos registros do banco de uso. O Node.js foi usado somente para testes sem bibliotecas externas, não como backend.

## Contrato acrescentado

`GET /api/monitoramento?origem=Simulacao` ou `GET /api/monitoramento?origem=Hardware`.

- **200**: objeto com `consultadoEmUtc`, `origem` e `geladeiras`.
- Cada geladeira tem `id`, `nome`, `localizacao` e `ultimaLeitura`: nula ou os sete campos já definidos no [contrato de leituras](contrato-leituras.md).
- Todas as geladeiras aparecem, ordenadas por ID; banco vazio devolve `geladeiras: []`.
- A última leitura é a de maior **horário de medição**, na origem selecionada; empate usa o maior ID. Receber uma leitura atrasada não a torna a mais recente.
- Origem obrigatória, exatamente `Simulacao` ou `Hardware`; ausência ou valor inválido recebe **400 ValidationProblemDetails**. Falhas reconhecidas do banco recebem **503 ProblemDetails** genérico pelo tratamento existente.

A consulta EF foi conferida no SQL dos logs: uma consulta com `LEFT JOIN` e subconsulta ordenada com `LIMIT 1`. Ela preserva equipamentos sem amostras e não carrega todo o histórico nem faz uma consulta por cartão. O índice existente de leituras foi mantido. A lista de equipamentos ainda não é paginada.

## Interface e significado dos estados

O menu **Painel** abre `/#monitoramento`. Os cartões mostram nome/localização, temperatura, porta **na medição**, horários de medição e recebimento, idade e origem. Ausência de leitura aparece como `—` e **Sem dados**, preservando a distinção entre ausência, temperatura zero e porta fechada (`false`).

As origens são selecionadas separadamente e a tela inicia em **Simulação**. Hardware é apresentado como **Hardware declarado**: a etiqueta vem do emissor e não comprova sensor físico ou autenticação de dispositivo.

O usuário escolheu **60 segundos sem medição recente** como referência visual. Idade maior que 60 segundos marca **Leitura desatualizada**; exatamente 60 segundos ainda é recente. A tela também permite 5 minutos ou somente idade, em ajuste temporário da sessão, sem persistir configuração. Recência não classifica a temperatura como adequada, não afirma desconexão física e não cria alertas.

O horário `consultadoEmUtc` ancora a idade no servidor; o navegador acompanha o tempo transcorrido com `performance.now()`. A API é consultada a cada 15 segundos enquanto a página está visível, ao voltar à página, após alteração de cadastro ou pelo botão manual. Mudança de origem cancela/descarta respostas anteriores. Há timeout de 8 segundos e remoção dos valores quando a consulta falha. A apresentação da saúde volta a consultar a rota real, inclusive após falha do painel.

O CSS começa com uma coluna, usa duas a partir de 700 px e três a partir de 1000 px. A inspeção real confirmou uma coluna em 375 px, três em 1280 px, ausência de excesso horizontal e seletor com 46 px de altura. Isso verifica viewports de navegador, não um aparelho físico. O servidor continua em localhost; acesso por outro celular e notificações em segundo plano não fazem parte desta entrega.

## Arquivos desta etapa

| Arquivo | Finalidade |
| --- | --- |
| `src/Iceplay.Api/Controllers/MonitoramentoController.cs` | Nova consulta agregada com origem validada |
| `src/Iceplay.Api/Contracts/MonitoramentoResponse.cs` | Contratos de saída do painel |
| `src/Iceplay.Api/wwwroot/monitoramento.js` | Consulta, atualização e renderização dos cartões |
| `src/Iceplay.Api/wwwroot/monitoramento-estado.mjs` | Validação de resposta, recência e formatação de idade, testáveis sem DOM |
| `src/Iceplay.Api/wwwroot/index.html` | Menu, seção do painel e versões das URLs dos assets |
| `src/Iceplay.Api/wwwroot/styles.css` | Layout responsivo dos cartões e controles |
| `src/Iceplay.Api/wwwroot/app.js` | Reconsulta da saúde após consulta do painel |
| `scripts/verify-monitoramento.ps1` | Integração HTTP, persistência, falha de banco e simulador em banco isolado |
| `scripts/monitoramento-estado.test.mjs` | Testes de contrato e estados visuais com `node:test` |
| `README.md` e `docs/contrato-leituras.md` | Instruções e situação atual do recurso |
| `docs/contexto-para-revisao-externa.md` | Nota de que o resumo/ZIP anteriores são históricos, anteriores ao painel |
| `docs/uso-de-ia.md` e este documento | Registro responsável da assistência e da entrega |
| `docs/evidencias/2026-10-19-painel/` | Resultados reais, logs e capturas desta rodada |

## Comandos e resultados executados

Os comandos de verificação foram executados com a aplicação normal parada. Cada verificador HTTP iniciou/encerrou suas instâncias em portas livres e bancos isolados. Os logs e timestamps identificam esta execução; as asserções não são cenários independentes nem experimentos físicos.

```powershell
# Compilação local, também executada pelos verificadores:
. .\scripts\common.ps1
& $script:IceplayDotnet build Iceplay.slnx --no-restore
.\scripts\verify-monitoramento.ps1 -EvidenceDirectory docs/evidencias/2026-10-19-painel
node --test scripts/monitoramento-estado.test.mjs
.\scripts\verify.ps1 -EvidenceDirectory docs/evidencias/2026-10-19-painel/base
.\scripts\verify-geladeiras.ps1 -EvidenceDirectory docs/evidencias/2026-10-19-painel/cadastro
.\scripts\verify-leituras.ps1 -EvidenceDirectory docs/evidencias/2026-10-19-painel/leituras
```

| Verificação efetivamente realizada | Resultado e evidência |
| --- | --- |
| Compilação | 0 avisos, 0 erros — [build.log](evidencias/2026-10-19-painel/build.log) |
| API do painel | 70 asserções, 29 requisições registradas e um POST adicional pelo simulador — [monitoramento-api.json](evidencias/2026-10-19-painel/monitoramento-api.json) |
| Módulo de estado JavaScript | 12 testes aprovados, 0 falhas — [monitoramento-estado.log](evidencias/2026-10-19-painel/monitoramento-estado.log) |
| Regressão da base | 13 verificações aprovadas — [smoke-latest.json](evidencias/2026-10-19-painel/base/smoke-latest.json) |
| Regressão do cadastro | 807 asserções, 177 requisições — [crud-api.json](evidencias/2026-10-19-painel/cadastro/crud-api.json) |
| Regressão da ingestão | 339 asserções, 75 requisições — [leituras-api.json](evidencias/2026-10-19-painel/leituras/leituras-api.json) |
| Navegador real | 17 verificações registradas — [browser.json](evidencias/2026-10-19-painel/browser.json) |
| Preservação | SHA-256 de 119 arquivos protegidos sem diferenças — [preservacao.json](evidencias/2026-10-19-painel/preservacao.json) |
| Execução normal restaurada | Saúde e consultas das duas origens em HTTP 200, uma geladeira e nenhuma leitura; conteúdo lógico do banco preservado — [execucao-normal.json](evidencias/2026-10-19-painel/execucao-normal.json) |

O teste HTTP cobre origens inválidas, banco vazio, equipamento sem leitura, ordenação por medição, desempate, separação de origens, zero/false, simulador real, mudança de cadastro, exclusão de equipamento vazio, reinício preservando amostras, MIME dos módulos e banco sem esquema respondendo 503 genérico. A inspeção final SQLite confere integridade, chaves estrangeiras e as duas migrations.

O banco isolado desse teste terminou com duas geladeiras e sete leituras fixture. Para o navegador foi feita uma **cópia SQLite consistente**, separada tanto desse resultado quanto do banco de uso. A cópia terminou com três geladeiras e dez leituras fixture após cadastro pela interface e três envios reais do simulador. Valores e rótulos Hardware nessas fixtures são apenas dados de teste.

No navegador foram conferidos valores vindos da API, atualização automática, origem, ausência de dados, porta aberta/fechada, ajuste de referência, layouts e interrupção/reinício reais da API. As capturas finais são [desktop](evidencias/2026-10-19-painel/painel-desktop.jpg) e [mobile](evidencias/2026-10-19-painel/painel-mobile.jpg), ambas de simulação em banco isolado.

O primeiro carregamento recuperou CSS/JS antigos do cache, percebido na conferência visual. Foram acrescentadas versões às URLs dos assets e repetidas as verificações do CSS, layouts e queda/retorno da API com a versão final. A captura inicial foi preservada como `painel-css-anterior.jpg`; ela não é apresentada como prova do layout final. A verificação da base foi repetida após esse ajuste. Os 17 registros incluem verificações repetidas após a correção, não 17 cenários independentes.

Também foram executadas comparações SHA-256, leitura dos relatórios e inspeção sintática/diff dos arquivos. Para a conferência final foram usados `node --check` nos arquivos JavaScript, o parser do PowerShell no novo verificador e `git diff --check`. As evidências históricas anteriores foram preservadas. Não houve commit, remoto ou publicação.

## Reproduzir e seguir

Para uma nova rodada, use outra pasta em `-EvidenceDirectory` para preservar esses resultados. As capturas do navegador foram obtidas por interação real; não são geradas pelo script HTTP.

Para usar o sistema normalmente, execute `./scripts/run.ps1` e abra `http://localhost:5080/#monitoramento`. Cadastre uma geladeira, use seu ID no comando abaixo em outro PowerShell e mantenha **Simulação** selecionada:

```powershell
.\tools\simulator\enviar-leituras.ps1 -GeladeiraId 1 -Quantidade 3 -IntervaloSegundos 1 -TemperaturaC 4.25 -PortaAberta
```

Substitua `1` pelo ID cadastrado. Esse comando grava dados de simulação por ação explícita; iniciar a aplicação não os cria. O estado do banco de uso após a restauração da execução normal está em `evidencias/2026-10-19-painel/execucao-normal.json`.

A instância de teste da interface foi encerrada e `./scripts/run.ps1` foi executado sem sobrescrever a conexão. As rotas de saúde e monitoramento das duas origens retornaram 200 no banco normal: uma geladeira, nenhuma leitura e duas migrations. Uma inspeção Python/SQLite em modo somente leitura, antes e depois da inicialização/consultas, confirmou integridade e ausência de violações de chave estrangeira; o SHA-256 das linhas de cadastro, leituras e migrations permaneceu igual. O navegador foi recarregado nesse banco e mostrou o cadastro existente sem inventar temperatura ou estado da porta. Não foi enviado simulador ao banco de uso.

Próxima etapa proposta: histórico com filtros de equipamento/origem/período e paginação, primeiro API e depois interface. Limites persistidos, regras e registro de alertas vêm em incrementos posteriores, após definir os critérios com o orientador. Notificações, acesso externo, autenticação, firmware e comprovação física continuam pendentes. Não foram implementados nesta mudança nem se afirma que o painel sozinho atende a versão final de 24/11.
