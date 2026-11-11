# Configurações persistidas por geladeira — fechamento em 11/11/2026

Incremento iniciado em 09/11 e concluído em 11/11. As evidências preservam a data real de cada execução; não houve simulação de histórico ou ensaio físico. A arquitetura continua ASP.NET Core/EF Core/SQLite e HTML/CSS/JavaScript no mesmo projeto, sem novos pacotes.

## Entrega

Foram criados GET/PUT `/api/geladeiras/{id}/configuracao` e o formulário na página Configurações. Persistem mínima/máxima, tolerância de porta aberta, prazo sem leituras, origem e habilitação planejada, com início e atualização UTC do servidor. Não há valores padrão ou configuração automática para cadastros existentes.

O [contrato completo](contrato-configuracoes.md) registra validação, respostas, instantes, relacionamento e diagrama. O PUT utiliza transação curta para criar/atualizar sem corrida de chave. A configuração dependente é removida com cadastro sem leituras; equipamentos com histórico continuam protegidos por 409. O cliente bloqueia edições durante operações, descarta respostas atrasadas e exige nova consulta se uma gravação não puder ser confirmada.

**Não foi implementado motor de regras nem geração de alertas.** A habilitação é um parâmetro para a etapa seguinte, explicitamente identificada na interface. O indicador visual de recência do painel continua separado. A origem Hardware permanece declarada, sem autenticação de sensor ou medição física.

## Arquivos e preservação

- `Models/ConfiguracaoGeladeira.cs`, `Contracts/SalvarConfiguracaoRequest.cs`, `ConfiguracaoGeladeiraResponse.cs` e `Controllers/ConfiguracoesController.cs`: entidade, contratos e GET/PUT.
- `Data/IceplayDbContext.cs`, migration `20261109233935_AddConfiguracoesGeladeiras` e snapshot: tabela dependente 1:0..1, CHECKs e FK. Caminhos acima relativos a `src/Iceplay.Api`.
- `wwwroot/configuracoes.html`, `configuracoes.js`, `configuracoes-estado.mjs`, regras escopadas em `styles.css` e texto de `sobre.html`: formulário e apresentação do estado confirmado.
- `scripts/verify-configuracoes.ps1`, `verify-configuracoes.py`, `configuracoes.test.mjs`: novos testes HTTP/SQLite e cliente com DOM/fetch controlados.
- Verificadores de leituras/painel/móvel/páginas/histórico: expectativas da terceira migration, proteção das rotas novas e snapshots incluindo a configuração. Os cenários anteriores e o upgrade desde InitialCreate foram mantidos.
- README, CONTEXTO, AGENTS, plano vigente, contrato, UML, guia visual e uso de IA: estado atual e limitações. `docs/sql/iceplay-criacao-2026-11-09.sql` é o SQL completo novo; o arquivo histórico de duas migrations permanece intacto.

As duas migrations anteriores não foram alteradas. Foram feitos backups consistentes via `sqlite3.Connection.backup` em `.tools/backups`, ignorada pelo Git, antes de iniciar a versão atualizada. Não se apagou, recriou ou substituiu o banco de uso.

## Testes efetivamente executados

| Data | Verificação | Resultado | Evidência |
| --- | --- | --- | --- |
| 09 e 11/11 | Build | Zero avisos/erros | `2026-11-09-configuracoes/build-inicial.log`; `2026-11-11-configuracoes/configuracoes/build.log` |
| 11/11 | Modelo versus migrations | Sem mudanças pendentes | `2026-11-11-configuracoes/modelo-migrations.log` |
| 09 e 11/11 | API/configuração/upgrade/concorrência/reinício | 153 asserções aprovadas, 67 requisições registradas e mais dois PUTs concorrentes, com status 200/201 | `2026-11-11-configuracoes/configuracoes/configuracoes-api.json` e primeira execução preservada na pasta de 09/11 |
| 09/11 | Base | 13 verificações aprovadas | `2026-11-09-configuracoes/base/smoke-latest.json` |
| 09/11 | CRUD | 807 asserções/177 requisições | `2026-11-09-configuracoes/cadastro/crud-api.json` |
| 09/11 | Leituras | 339 asserções/75 requisições | `2026-11-09-configuracoes/leituras/leituras-api.json` |
| 09/11 | Histórico | 145 asserções/68 requisições | `2026-11-09-configuracoes/historico/historico-api.json` |
| 09/11 | Painel | 70 asserções/29 requisições e simulador | `2026-11-09-configuracoes/painel/monitoramento-api.json` |
| 09/11 | HTTPS/acesso/CSRF, configuração e reinício | 114 asserções/80 requisições | `2026-11-09-configuracoes/mobile/mobile-api.json` |
| 11/11 | Páginas/assets/links/404/reinício | 198 asserções/42 requisições | `2026-11-11-configuracoes/paginas/pages-api.json` |
| 11/11 | JavaScript | 85 testes aprovados, zero falhas/ignorados: 22 configurações, 18 acesso, 25 histórico, 12 painel, oito menu | `2026-11-11-configuracoes/javascript.log` |
| 09/11 | SQL completo em SQLite novo isolado | Três migrations, tabelas vazias, integridade e FK válidas | `2026-11-09-configuracoes/sql-isolado.json` |
| 11/11 | Verificador independente SQLite | 12 verificações aprovadas | `2026-11-11-configuracoes/database.json` |
| 11/11 | Banco de uso e execução normal | Cadastro/leituras preservados, nova tabela vazia, HTTP/HTTPS respondendo | `2026-11-11-configuracoes/banco-antes.json`, `banco-depois.json` |

Os caminhos da última coluna são relativos a `docs/evidencias`. Os totais não representam percentual de cobertura. Os testes HTTP usam bancos isolados; os testes Node usam ambiente controlado. Dados rotulados Hardware nas fixtures não constituem sensor físico.

A checagem de sintaxe JavaScript/PowerShell/Python e a auditoria limitada de 130 textos publicáveis também passaram em 11/11; ver `sintaxe.log` e `auditoria-final.json`. A comparação com 20 valores de credenciais locais não encontrou ocorrências, marcadores de chave privada, fontes com NUL ou links Markdown locais ausentes. Isso não é uma garantia universal de ausência de segredos.

A API foi exercitada com entradas ausentes/nulas/malformadas, números em texto, faixas iguais/invertidas/não finitas, tempos inválidos, origem inválida, IDs inexistentes, isolamento por equipamento, timestamps não controláveis pelo cliente, ativar/editar/trocar origem/pausar/reativar, GET sem escrita, concorrência, CHECKs, CASCADE e RESTRICT. O teste de upgrade começou com o SQL histórico e registros inseridos pela API em Production; em Development a migration nova real foi aplicada e os campos anteriores permaneceram iguais.

## Comandos

Executados da raiz, com PowerShell 7 e SDK local; as saídas foram capturadas nas pastas acima. Para reproduzir, use **outro** `-EvidenceDirectory` e encerre a instância normal antes de compilar.

```powershell
. .\scripts\common.ps1
& $script:IceplayDotnet build Iceplay.slnx --no-restore
& $script:IceplayDotnet ef migrations add AddConfiguracoesGeladeiras --project src/Iceplay.Api/Iceplay.Api.csproj --no-build --no-color
& $script:IceplayDotnet ef migrations script --project src/Iceplay.Api/Iceplay.Api.csproj --no-build --output docs/sql/iceplay-criacao-2026-11-09.sql --no-color
& $script:IceplayDotnet ef migrations has-pending-model-changes --project src/Iceplay.Api/Iceplay.Api.csproj --no-build --no-color
```

`migrations add` e a geração SQL registram comandos de desenvolvimento já executados: **não repetir a criação da migration existente**. Para verificar a versão atual:

```powershell
.\scripts\verify-configuracoes.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/configuracoes
.\scripts\verify.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/base
.\scripts\verify-geladeiras.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/cadastro
.\scripts\verify-leituras.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/leituras
.\scripts\verify-historico.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/historico
.\scripts\verify-monitoramento.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/painel
.\scripts\verify-pages.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/paginas
.\scripts\verify-mobile.ps1 -EnderecoIp 192.168.1.123 -EvidenceDirectory docs/evidencias/nova-revisao/mobile
node --test scripts/acesso.test.mjs scripts/historico-estado.test.mjs scripts/monitoramento-estado.test.mjs scripts/shell.test.mjs scripts/configuracoes.test.mjs
```

Também foram executadas inspeções de arquivos/Git/processos, comparação de registros SQLite em modo somente leitura, backup consistente, execução do SQL em banco novo isolado e `verify-database.py` no banco isolado criado pelo verificador da base. O SDK/EF permanece nas versões fixadas. O modo móvel normal foi iniciado por `Start-Process -WindowStyle Hidden` com `scripts/run-mobile.ps1`; logs locais permanecem em `.tools/mobile`.

## Banco de uso e limitações

Antes de iniciar a versão atualizada havia uma geladeira e três leituras Simulacao, com duas migrations. Após a atualização há os mesmos registros e três migrations; `ConfiguracoesGeladeiras` está vazia. O hash lógico apenas de Geladeiras/Leituras permaneceu `82f5d65eb54d9b466a6f7c4a0ea803d4b6d2647abcc03b23c9e719083c52bfb5`. SQLite íntegro e sem violações de FK. Nenhum limite foi criado no banco de uso. GET local da configuração do ID 2 retornou `{geladeiraId:2, configuracao:null}`; pela rede, a página HTTPS respondeu 200 e a API sem sessão 401, com validação da CA local.

Durante o desenvolvimento, cinco arquivos em trabalho foram encontrados com bytes NUL. A causa não foi determinada. Os quatro verificadores foram recuperados do HEAD e tiveram os ajustes reaplicados; o controller novo foi recuperado com o contrato definido. Os fontes foram conferidos sem NUL antes do build e das verificações aprovadas. Uma revisão também detectou colisão de nome de variável no verificador móvel; foi corrigida antes do resultado aprovado de 114/80. Não houve reposição de dados nem commit de fontes corrompidos.

Em 11/11, a ferramenta informou `Local browser use is disabled in Work settings`. Não houve renderização automatizada, screenshot novo ou contorno do bloqueio. A foto anterior do iPhone não valida a nova tela: testar seleção, preenchimento, salvar, recarregar, teclado/zoom e troca de sessão no aparelho continua pendente. A sessão deve ser refeita após reinício.

Não existem alertas reais, autenticação do ESP32 ou firmware. O usuário está selecionando ESP32/DS18B20/resistor por imagens de anúncios; isso não prova aquisição ou montagem. A próxima entrega é avaliar regras e persistir episódios de alerta, com critérios para lacunas/atraso/recuperação e ausência sem novos POSTs. Documentação acadêmica e ensaio físico continuam necessários.

Na conferência Git, `git fetch origin` encontrou uma referência interna inválida em `refs/codex/turn-diffs/checkpoints/...`. Não foram apagadas referências, branches ou objetos para contornar isso. A consulta direta `git ls-remote` confirmou que a branch remota ainda apontava ao mesmo HEAD local anterior à entrega (`7bd4541`); consultar o Git para o resultado efetivo de commit/push. O erro de referência interna não representa falha de build ou de SQLite.
