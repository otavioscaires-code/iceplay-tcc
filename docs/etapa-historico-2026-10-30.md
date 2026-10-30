# API do histórico de leituras — 30/10/2026

## Incremento concluído

Foi acrescentado `GET /api/leituras` ao controller existente, usando EF Core/SQLite e o índice já disponível. Não houve alteração de entidade, migration, pacote ou interface. O contrato de ingestão e a consulta individual permanecem os mesmos.

`geladeiraId` e `origem` são obrigatórios; a origem aceita exatamente Simulacao/Hardware. Filtros opcionais `inicioUtc` e `fimUtc` incluem seus limites e usam o instante de medição em UTC estrito com Z e até sete casas decimais. `pagina` começa em 1; `tamanhoPagina` aceita 1..100 e tem padrão 50. Parâmetro vazio presente é inválido. O deslocamento é calculado em long e validado antes de converter para o int exigido por Skip.

Resposta: `{geladeiraId, origem, inicioUtc, fimUtc, pagina, tamanhoPagina, totalItens, totalPaginas, itens}`. Os itens mantêm os sete campos da leitura, ordenados por MedidoEmUtc DESC/Id DESC. Equipamento ausente retorna 404; existente sem leituras retorna 200 com totais zero; página além da última retorna array vazio com os totais do filtro. Entradas inválidas recebem 400 ValidationProblemDetails; falha reconhecida de banco recebe 503 genérico.

Uma transação SQLite de leitura diferida mantém existência, contagem e página consistentes dentro da resposta. A decisão usa a [API oficial BeginTransaction](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlite.sqliteconnection.begintransaction?view=msdata-sqlite-10.0.0). A consulta só materializa até 100 leituras. Entre requisições, inserções podem deslocar as páginas por posição; não foi implementado snapshot entre páginas ou cursor.

## Arquivos

- `src/Iceplay.Api/Contracts/ConsultarHistoricoRequest.cs`: filtros, UTC e validações.
- `src/Iceplay.Api/Contracts/HistoricoLeiturasResponse.cs`: metadados de paginação e itens.
- `src/Iceplay.Api/Controllers/LeiturasController.cs`: novo GET na mesma rota de coleção.
- `scripts/verify-historico.ps1`: verificação HTTP/SQLite/reinício em banco isolado.
- `scripts/verify-mobile.py`: cenários acrescentados para histórico sem sessão, autenticado e após reinício.
- README, contexto, contrato de leituras, plano e registro de IA: estado e instruções atualizados.

## Comandos executados e evidências

```powershell
# Primeira versão do teste, antes de acrescentar parâmetros vazios:
.\scripts\verify-historico.ps1 -EvidenceDirectory docs/evidencias/2026-10-30-historico
# Rodada final:
.\scripts\verify-historico.ps1 -EvidenceDirectory docs/evidencias/2026-10-30-historico/final
# Primeira regressão interrompida por bloqueio do arquivo de evidência:
.\scripts\verify-leituras.ps1 -EvidenceDirectory docs/evidencias/2026-10-30-historico/regressao-leituras
# Repetição em pasta nova, aprovada:
.\scripts\verify-leituras.ps1 -EvidenceDirectory docs/evidencias/2026-10-30-historico/regressao-leituras-tentativa-2
.\scripts\verify-mobile.ps1 -EnderecoIp 192.168.1.123 -EvidenceDirectory docs/evidencias/2026-10-30-historico/regressao-mobile
git diff --check -- . ':!docs/evidencias/**'
```

| Verificação | Resultado real | Evidência em `evidencias/2026-10-30-historico/` |
| --- | --- | --- |
| Build da rodada final | 0 avisos, 0 erros | `final/build.log` |
| Histórico inicial | 137 asserções / 64 requisições aprovadas | `historico-api.json` |
| Histórico final | 145 asserções / 68 requisições aprovadas | `final/historico-api.json` |
| Regressão de leituras, tentativa 1 | Interrompida após 168 asserções / 33 requisições por erro ao gravar evidência | `regressao-leituras/leituras-api.json` |
| Regressão de leituras, tentativa 2 | 339 asserções / 75 requisições aprovadas | `regressao-leituras-tentativa-2/leituras-api.json` |
| Móvel com histórico | 89 asserções / 66 requisições aprovadas | `regressao-mobile/mobile-api.json` |
| Banco de uso | Mesmo hash lógico antes/depois, uma geladeira, zero leituras, integridade ok | `preservacao-banco-uso.json` |

O erro da primeira regressão foi `The process cannot access ... leituras-count-latest.json because it is being used by another process`. O arquivo era um artefato do teste; não foi determinado qual processo o bloqueou. A repetição em pasta nova passou sem alteração da aplicação ou do verificador. A evidência com falha foi preservada; não se afirma que a primeira execução passou nem que a causa do bloqueio foi corrigida.

O novo teste verifica geladeira existente sem leituras, paginação completa e além do fim, limites/overflow, filtros temporais inclusivos, UTC de zero a sete casas, parâmetros inválidos/vazios, origem, equipamentos distintos, empates, recebimento atrasado, zero/false, preservação dos dois timestamps, GET individual anterior, reinício e 503 por banco sem esquema. Hashes do banco isolado confirmam que os GETs não mudaram linhas ou migrations. A rodada final termina com três geladeiras e sete leituras fixture somente nesse banco isolado; Hardware é apenas rótulo de teste.

A regressão móvel usa TCP/TLS/HTTP com certificado validado e sessão real em banco isolado. Não é ensaio de Safari/iPhone físico. A verificação do banco de uso foi por conexão SQLite somente leitura, comparando linhas de Geladeiras/Leituras/migrations antes/depois. Não houve envio do simulador ao banco normal.

## Continuidade

A próxima etapa é a tela responsiva do histórico consumindo esse contrato, com filtros, navegação paginada e estados de erro/vazio. Limites e alertas são incrementos posteriores. A base foi registrada no commit `a788f2b` e enviada a `origin/codex/retomada-historico`; este incremento será registrado em commit próprio após a revisão final. Consultar Git para os hashes atuais. O aluno ainda não possui hardware e ainda não validou o iPhone, portanto a integração física continua pendente.
