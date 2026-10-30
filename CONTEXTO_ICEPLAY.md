# CONTEXTO_ICEPLAY

Documento de transferência de contexto do projeto, elaborado a partir dos arquivos presentes no repositório em 30/10/2026. Ele descreve implementação e evidências existentes, não substitui a leitura do código. Resultados registrados em `docs/evidencias/` são resultados históricos de execuções identificadas principalmente em 13, 15, 17 e 19/10/2026; não foram repetidos nesta tarefa de documentação.

Atualização de desenvolvimento em 30/10: a base foi novamente executada e validada, Git/GitHub regularizados com autorização do usuário, e a API do histórico foi implementada em incremento separado. Ver seções abaixo, `docs/retomada-2026-10-30.md` e `docs/plano-continuidade-2026-10-30.md`; o parágrafo anterior descreve a elaboração documental inicial.

## 1. Objetivo e escopo do TCC

ICEPLAY é um TCC de Ciência da Computação para monitoramento IoT de geladeiras comerciais. O núcleo proposto é cadastrar equipamentos, receber temperatura e estado da porta, registrar tanto o instante informado pelo emissor quanto o instante de recebimento pela API, persistir os dados, apresentá-los no navegador e evoluir para alertas de condições anormais e ausência de leituras.

O prazo informado para versão completa é 24/11/2026, com apresentação/validação em 01/12/2026. O professor exige demonstração funcional e evidências concretas, não somente código.

Escopo atualmente implementado: cadastro de geladeiras, saúde real do banco, ingestão de leituras, simulador, consulta da última leitura por origem, painel responsivo, API de histórico paginado e modo de acesso local por iPhone. Escopo futuro: tela do histórico, limites configuráveis, alertas, ausência de leituras, firmware e ensaio físico. Controle por voz e notificações externas não são prioridade.

## 2. Arquitetura e tecnologias

Uma única aplicação ASP.NET Core Web API em .NET 10 serve simultaneamente API e interface estática. A persistência usa Entity Framework Core 10.0.12 com SQLite. A interface está em HTML, CSS e JavaScript puro, sem framework ou dependência npm. O simulador também usa a API, por PowerShell, e identifica as leituras com origem `Simulacao`.

```
Navegador desktop / Safari do iPhone
             │ HTTP local ou HTTPS local no modo móvel
ASP.NET Core Web API + arquivos estáticos (src/Iceplay.Api)
             │ Entity Framework Core
           SQLite (data/iceplay.db)
             ▲
Simulador PowerShell hoje / ESP32 futuramente
```

Pacotes NuGet diretos: `Microsoft.EntityFrameworkCore.Sqlite` e `Microsoft.EntityFrameworkCore.Design`, ambos 10.0.12. A ferramenta local `dotnet-ef` também está fixada em 10.0.12. `global.json` fixa SDK .NET 10.0.401. O ambiente foi preparado para Windows x64 e PowerShell 7.5+, com SDK local em `.tools/dotnet` quando necessário.

## 3. Estrutura de pastas e arquivos relevantes

| Caminho | Papel |
| --- | --- |
| `src/Iceplay.Api/Program.cs` | Inicialização, configuração SQLite, migrations em Development, middlewares e arquivos estáticos. |
| `src/Iceplay.Api/Controllers/` | Endpoints de saúde, geladeiras, leituras, monitoramento e acesso móvel. |
| `src/Iceplay.Api/Contracts/` | DTOs de entrada validados e DTOs de resposta. |
| `src/Iceplay.Api/Models/` | Entidades `Geladeira`, `Leitura` e enumeração `OrigemLeitura`. |
| `src/Iceplay.Api/Data/` | `IceplayDbContext`, restrições/mapeamentos e tratamento de exceções do banco. |
| `src/Iceplay.Api/Migrations/` | Migrations EF: criação inicial e inclusão de leituras. |
| `src/Iceplay.Api/Mobile/` | Limitação de rede, HTTPS local, cookie, CSRF e login por código no modo móvel. |
| `src/Iceplay.Api/wwwroot/` | Interface, navegação, saúde, CRUD, painel e scripts JavaScript. |
| `scripts/` | Instalação, execução, preparação móvel e verificações automatizadas. |
| `tools/simulator/enviar-leituras.ps1` | Emissor de leituras simuladas para `POST /api/leituras`. |
| `docs/` | Planejamento, cronograma, contrato, UML, instruções, uso de IA, SQL e relatórios de etapa. |
| `docs/evidencias/` | Logs, respostas HTTP, capturas e relatórios históricos de verificações. |
| `.tools/` | SDK, caches, bancos e segredos/artefatos móveis locais; ignorados pelo Git. |
| `README.md` | Instruções de execução, API, simulador, verificações e limitações. |

Na elaboração inicial deste contexto, não havia commits/remoto. Na retomada de 30/10 o usuário autorizou commits/pushes rotineiros e foi configurado `origin` para `https://github.com/otavioscaires-code/iceplay-tcc.git`. O primeiro commit real, `a788f2b`, registra a base revalidada; foi enviado na branch `codex/retomada-historico`. Não houve criação de histórico retroativo. Consultar `git log/status` para os commits posteriores.

## 4. Funcionalidades implementadas

- Health check: consulta de verdade `Geladeiras` no SQLite e resposta `200` ou `503` sem expor exceções internas.
- CRUD de geladeiras: listar, consultar por ID, criar, atualizar e excluir; exclusão retorna `409` se há leituras vinculadas.
- Validação HTTP de entradas, JSON, campos e IDs inexistentes com respostas 400/404/409/503 adequadas.
- Persistência SQLite por EF Core, com duas migrations e execução de migrations automática apenas em Development.
- Ingestão de temperatura, porta, origem e timestamp de medição; timestamp de recebimento é produzido pelo servidor.
- Consulta de uma leitura por geladeira para uma origem selecionada, usando maior `medidoEmUtc` e maior ID no empate.
- API de histórico `GET /api/leituras`, filtrada por geladeira/origem/período UTC, com paginação de até 100 itens e ordenação por medição/ID decrescentes; a tela ainda está pendente.
- Painel responsivo para desktop/celular, filtro de origem Simulação/Hardware declarado, atualização automática a cada 15 segundos quando visível e referência visual de leitura desatualizada após mais de 60 segundos.
- Interface para cadastro, edição e exclusão de geladeiras integrada à API, e apresentação de saúde real da API/banco.
- Simulador PowerShell que envia para a mesma API do hardware planejado e não acessa SQLite diretamente.
- Modo móvel local opcional: HTTPS no IP privado configurado, certificado local, acesso com código, cookie Secure/HttpOnly/SameSite Strict, CSRF, limite de oito tentativas por minuto e restrição à sub-rede configurada.

Evidências de 19/10 registram build sem avisos/erros, verificadores de API, persistência em reinício, simulador e testes JavaScript. As evidências não provam funcionamento em hardware físico e o login/uso no Safari do iPhone ainda está pendente de validação no aparelho.

## 5. Funcionalidades parcialmente implementadas ou não validadas

- Interface móvel: layout e integração foram exercitados em viewports de navegador e modo móvel foi testado por TCP/TLS/HTTP em banco isolado; falta validar o fluxo completo em Safari/iPhone real, incluindo instalação/confiança do certificado e firewall.
- Origem `Hardware`: contrato e rótulo existem, mas não há ESP32, autenticação de dispositivo ou ensaio físico. Ela é somente uma declaração do emissor.
- Monitoramento: mostra a última leitura por origem, mas não oferece histórico nem decide se a temperatura é adequada. A regra de 60 segundos é exclusivamente visual e não gera alerta.
- Documentação UML existe em `docs/uml.md`, mas as fontes PlantUML ainda não foram renderizadas segundo o README.

## 6. Funcionalidades pendentes

1. Validar acesso no iPhone físico na mesma rede, seguindo `docs/acesso-iphone.md`; aplicar regra de firewall somente com autorização/administração local.
2. Apresentar na interface a API de histórico já implementada, com filtros de equipamento, origem e período e navegação paginada.
3. Definir com o orientador limites de temperatura, tolerância/critério de porta aberta e política de ausência de leituras.
4. Criar configuração persistida de limites, regras de negócio, entidade/registro de alertas e tela de consulta, em incrementos separados.
5. Desenvolver firmware ESP32 e integração do DS18B20 e sensor magnético, preservando o contrato HTTP já existente ou versionando-o de modo compatível.
6. Definir autenticação/autorização do emissor de hardware antes de tratar dados declarados como hardware confiável.
7. Completar diagramas UML renderizados, trabalho escrito, artigo, manual e evidências de execução física.
8. Avaliar notificações externas somente após o núcleo acima estar funcional.

## 7. API e contratos

Todas as rotas são relativas ao host local (`http://localhost:5080` no modo comum). Em modo móvel, rotas remotas exigem HTTPS, sessão e CSRF para alterações.

| Método e rota | Sucesso | Contrato/resumo |
| --- | --- | --- |
| `GET /api/health` | 200 | `{ status, database, refrigeratorCount, checkedAtUtc }`; consulta real ao banco. Falha reconhecida: 503. |
| `GET /api/geladeiras` | 200 | Array de `{ id, nome, localizacao, criadoEmUtc }`, ordenado por ID. |
| `GET /api/geladeiras/{id}` | 200 | Uma geladeira. ID ausente: 404. |
| `POST /api/geladeiras` | 201 + Location | Cria geladeira. Corpo abaixo. |
| `PUT /api/geladeiras/{id}` | 200 | Substitui nome/localização editáveis. ID ausente: 404. |
| `DELETE /api/geladeiras/{id}` | 204 | Exclui geladeira sem leituras; ID ausente: 404; com leituras: 409. |
| `POST /api/leituras` | 201 + Location | Cria leitura vinculada a geladeira existente. Geladeira ausente: 404. |
| `GET /api/leituras?geladeiraId=1&origem=Simulacao` | 200 | Histórico; `inicioUtc`/`fimUtc` opcionais inclusivos UTC Z, `pagina=1`, `tamanhoPagina=50` (1..100). Resposta com filtros, totais e `itens`. Geladeira ausente: 404, entrada inválida: 400, banco indisponível: 503. |
| `GET /api/leituras/{id}` | 200 | Uma leitura; ID ausente: 404. |
| `GET /api/monitoramento?origem=Simulacao` | 200 | `{ consultadoEmUtc, origem, geladeiras }`; cada item inclui `ultimaLeitura` ou `null`. Também aceita `Hardware`. Origem inválida/ausente: 400. |
| `GET /api/acesso` | 200 | Estado do acesso móvel e token CSRF quando necessário. |
| `POST /api/acesso/entrar` | 204 | No modo móvel HTTPS, recebe código e inicia sessão. Código inválido: 401; modo desligado: 404. |
| `POST /api/acesso/sair` | 204 | Encerra a sessão móvel HTTPS; modo desligado: 404. |

### Geladeira: entrada e saída

`POST` e `PUT /api/geladeiras` recebem:

```json
{ "nome": "Geladeira principal", "localizacao": "Área de vendas" }
```

`nome` é obrigatório, não pode ser apenas espaços e aceita até 100 caracteres. `localizacao` é opcional e aceita até 200; ausência/vazio/espaços resulta em `null`. O servidor ignora ID/data enviados pelo cliente, gera `id` e `criadoEmUtc` UTC, e permite nomes repetidos.

### Leitura: entrada e saída

`POST /api/leituras` recebe todos os campos:

```json
{
  "geladeiraId": 1,
  "temperaturaC": 4.25,
  "portaAberta": false,
  "medidoEmUtc": "2026-10-17T12:00:00Z",
  "origem": "Simulacao"
}
```

`geladeiraId` é inteiro positivo existente; `temperaturaC` precisa ser número JSON finito; `portaAberta` é booleano; `origem` é exatamente `Simulacao` ou `Hardware`. `medidoEmUtc` exige ISO 8601 UTC com sufixo `Z`, segundos e até sete casas decimais, e não pode ser posterior ao recebimento. Leituras atrasadas são aceitas. A resposta inclui `id`, os campos recebidos, `recebidoEmUtc` UTC gerado pela API e `origem`. Campos extras de ID/recebimento são ignorados.

Entradas inválidas e JSON malformado retornam 400, normalmente `ValidationProblemDetails`; erros reconhecidos de persistência retornam 503 genérico. Existe `GET /api/leituras` de histórico, com `geladeiraId` e `origem` obrigatórios. A resposta é `{geladeiraId, origem, inicioUtc, fimUtc, pagina, tamanhoPagina, totalItens, totalPaginas, itens}`. A contagem e a página usam a mesma transação de leitura; novas inserções podem deslocar páginas entre requisições. Não existe `DELETE /api/leituras`.

## 8. Banco SQLite e entidades

Arquivo de uso: `src/Iceplay.Api/data/iceplay.db`, configurado em `src/Iceplay.Api/appsettings.json` com `Data Source=data/iceplay.db`. O diretório é resolvido a partir da raiz do conteúdo da aplicação.

### `Geladeiras`

| Coluna | Tipo lógico | Regras |
| --- | --- | --- |
| `Id` | inteiro | chave primária, gerada pelo banco. |
| `Nome` | texto | obrigatório; `trim` entre 1 e 100 caracteres. |
| `Localizacao` | texto/nulo | até 200 caracteres. |
| `CriadoEmUtc` | data/hora UTC | obrigatório, gerado pelo servidor. |

### `Leituras`

| Coluna | Tipo lógico | Regras |
| --- | --- | --- |
| `Id` | inteiro | chave primária, gerada pelo banco. |
| `GeladeiraId` | inteiro | FK para `Geladeiras.Id`, maior que zero, `RESTRICT` na exclusão. |
| `TemperaturaC` | double | obrigatório e finito; não há faixa física definida. |
| `PortaAberta` | booleano | obrigatório; SQLite restringe 0/1. |
| `MedidoEmUtc` | data/hora UTC | obrigatório e menor/igual ao recebimento. |
| `RecebidoEmUtc` | data/hora UTC | obrigatório, produzido pela API. |
| `Origem` | enum como texto | somente `Simulacao` ou `Hardware`. |

Há índice em `(GeladeiraId, MedidoEmUtc, Id)` para a busca da última leitura. As migrations são `20261013172101_InitialCreate` e `20261018023456_AddLeituras`. O SQL para criar um banco novo está em `docs/sql/iceplay-criacao.sql`; não deve ser executado sobre banco existente. Para conexões SQLite externas, ative `PRAGMA foreign_keys=ON`.

## 9. Configuração e execução

Pré-requisitos da cópia nova: Windows x64, PowerShell 7.5+, internet durante instalação/restauração e permissão de escrita. Não são necessários Node, Python, servidor SQLite ou Visual Studio para executar a aplicação; Node/Python são opcionais para parte das verificações.

```powershell
Set-Location 'C:\Users\otavi\Downloads\iceplay'
.\scripts\install-dotnet.ps1  # somente se SDK local ainda não existir
.\scripts\setup.ps1
.\scripts\run.ps1
```

`setup.ps1` restaura pacotes/ferramentas e compila. `run.ps1` inicia em Development, aplica migrations pendentes e mantém o processo no terminal. Acesse `http://localhost:5080`; encerre com Ctrl+C. A API e a interface são entregues pelo mesmo processo.

Para verificar banco/API com a aplicação em execução:

```powershell
$resposta = Invoke-WebRequest 'http://localhost:5080/api/health'
$resposta.StatusCode
$resposta.Content
```

O esperado é HTTP 200, `status: healthy` e `database: connected`; a contagem varia conforme cadastros reais. Em banco novo ela pode ser zero. Iniciar não insere geladeiras nem leituras fictícias.

## 10. Modo móvel local e integração planejada

O modo móvel não é aplicativo nativo/PWA: o iPhone abre a interface web no Safari. Ele existe para uso na mesma rede Wi-Fi do computador, não para internet pública.

1. Encerrar `run.ps1` se estiver aberto.
2. Identificar IPv4 privado atual do computador e preparar uma vez:

```powershell
.\scripts\prepare-mobile.ps1 -EnderecoIp SEU_IP_PRIVADO
.\scripts\run-mobile.ps1
```

3. Em outro PowerShell **como administrador**, somente mediante decisão do usuário, liberar as portas restritas à sub-rede:

```powershell
.\scripts\mobile-firewall.ps1 -Acao Ativar
```

4. No iPhone na mesma rede, abrir `http://SEU_IP_PRIVADO:5081`, baixar o certificado público, instalá-lo e habilitar confiança; depois abrir `https://SEU_IP_PRIVADO:5443/#acesso-movel` e informar o código de `.tools/mobile/codigo-acesso.txt`.

`docs/acesso-iphone.md` contém instruções e diagnóstico. Os arquivos privados/código ficam em `.tools/mobile` e não devem ser versionados ou copiados ao novo repositório. A instância comum atende somente loopback. No modo móvel, loopback continua em HTTP na porta 5080 e clientes remotos só podem usar HTTPS na porta 5443 após acesso.

### Hardware previsto

O hardware planejado é ESP32 + sensor de temperatura DS18B20 + sensor magnético para estado da porta. O firmware deverá medir, gerar `medidoEmUtc`, identificar o equipamento e enviar `POST /api/leituras` para o mesmo endpoint já usado pelo simulador. O painel consultará `GET /api/monitoramento?origem=Hardware` para não misturar dados físicos declarados e dados de simulação. Ainda não há firmware, ESP32, sensores, credenciais de dispositivo ou prova física de comunicação/precisão.

## 11. Decisões técnicas consolidadas

- Manter ASP.NET Core, EF Core, SQLite e frontend estático para reduzir complexidade e adequar o MVP acadêmico.
- Separar contratos HTTP das entidades persistidas para impedir controle de ID/data pelo cliente.
- Armazenar `medidoEmUtc` e `recebidoEmUtc` separadamente em UTC, pois medição e chegada podem ocorrer em instantes distintos.
- Não inserir seed automático; o simulador só age por comando explícito e declara `Simulacao`.
- Não excluir leituras em cascata; uma geladeira com histórico recebe 409 ao tentar exclusão.
- Painel seleciona uma origem por vez, mantendo o significado de simulação versus hardware declarado.
- Leitura mais recente é definida pelo instante de medição, não pelo instante de recebimento; empate usa maior ID.
- Recência acima de 60 segundos é estado visual, não alerta, desconexão ou diagnóstico térmico.
- Acesso móvel é limitado à rede privada com HTTPS/código/CSRF, sem expor a aplicação na internet ou afirmar identidade do dispositivo.
- Migrations automáticas são restritas a Development e instância local única.

## 12. Problemas conhecidos e limitações

- Não há validação física no iPhone/Safari, regra de firewall aplicada, certificado confiado no aparelho, ESP32, DS18B20 ou sensor magnético.
- Não há autenticação de ESP32, usuário individual, controle de perfis, implantação pública, HTTPS público ou acesso externo.
- Não há tela de histórico, alertas, regras persistidas, notificações, dashboard agregado de alertas ou exclusão de leituras. A API do histórico já existe.
- Não há faixa física aceita de temperatura; apenas rejeição de números não finitos. Limites devem ser definidos com o orientador.
- A lista do painel não é paginada e traz uma única última leitura por equipamento/origem.
- Cookies/sessão móvel são deliberadamente efêmeros e expiram em até 8 horas; reiniciar a API invalida sessão.
- O IP local pode mudar, exigindo nova preparação de modo móvel. Não se deve ignorar aviso de certificado.
- Há autorização para commits/pushes rotineiros validados desde 30/10 e repositório remoto configurado. Preservar segredos e o banco local, e revisar o estado antes de cada commit.

## 13. Testes e evidências existentes

Os scripts principais são `verify.ps1`, `verify-geladeiras.ps1`, `verify-leituras.ps1`, `verify-monitoramento.ps1` e `verify-mobile.ps1`. Eles criam bancos/instâncias isoladas e têm opção `-EvidenceDirectory`; use diretório novo a cada rodada importante. Há testes Node sem dependências em `scripts/monitoramento-estado.test.mjs` e `scripts/acesso.test.mjs`.

Os relatórios de 19/10 registram, entre outros, build sem avisos/erros, 807 asserções/177 requisições do CRUD, 339/75 para leituras, 70/29 para painel, 82/61 para acesso móvel e testes JavaScript aprovados. Esses números estão nos arquivos de evidência e representam verificações históricas, não uma nova execução nesta transferência. As evidências também registram persistência após reinício e que o banco de uso ficou com uma geladeira e nenhuma leitura naquela execução. O estado atual do banco não foi inferido nesta documentação.

## 14. Próximas tarefas por prioridade

1. **Validar o fluxo no iPhone físico:** mesma Wi-Fi, firewall restrito, certificado, login, consulta/painel e registro de evidência. Não inventar essa validação antes de executá-la.
2. **Histórico:** usar o contrato `GET` paginado já implementado e testado para construir a interface responsiva, com testes de fluxo e estados de erro/vazio.
3. **Regras e alertas:** definir critérios com o orientador; criar modelo/migration, avaliação de novas leituras e consulta de alertas, cada parte com testes.
4. **Hardware:** construir firmware ESP32/DS18B20/sensor magnético, definir identificação/autenticação e executar ensaios reais documentados.
5. **Refinamento e entrega:** renderizar UML, atualizar manual/README, organizar evidências, revisão de segurança/usabilidade e preparar demonstração de 01/12.

## 15. Referências internas indispensáveis

- `README.md`: instruções atualizadas de operação e contratos resumidos.
- `docs/contrato-leituras.md`: regras detalhadas de timestamps, origem e simulador.
- `docs/acesso-iphone.md`: roteiro do dispositivo real e solução de problemas.
- `docs/cronograma-oficial.md`: marcos fornecidos pelo professor.
- `docs/etapa-2026-10-19.md`, `docs/etapa-painel-2026-10-19.md` e `docs/etapa-mobile-2026-10-19.md`: decisões, comandos e resultados documentados das últimas etapas.
- `docs/uso-de-ia.md`: registro de uso responsável de IA.
- `AGENTS.md`: regras para a próxima sessão/agente.

## 16. Resultado da retomada de desenvolvimento de 30/10

A base foi revalidada de verdade: build 0 avisos/erros; base 13 verificações; cadastro 807 asserções/177 requisições; leituras 339/75; painel 70/29 e simulador; móvel 82/61; Node 20 testes; SQLite independente 12 verificações. Evidências em `docs/evidencias/2026-10-30-retomada`.

O primeiro incremento foi somente a API do histórico, sem migration/dependência nova. O verificador final passou com 145 asserções/68 requisições (`docs/evidencias/2026-10-30-historico/final/historico-api.json`); a regressão de leituras passou com 339/75 na segunda tentativa, e a móvel ampliada com 89/66. A primeira regressão de leituras foi interrompida por bloqueio de escrita de um JSON de evidência, foi preservada e não é registrada como aprovação. Não foi possível determinar o processo que bloqueou o arquivo. O banco normal manteve o mesmo hash lógico e conteúdo, comprovado em `preservacao-banco-uso.json` dessa rodada.

Arquivos novos: `Contracts/ConsultarHistoricoRequest.cs`, `Contracts/HistoricoLeiturasResponse.cs`, `scripts/verify-historico.ps1`; o GET foi adicionado a `LeiturasController`. O verificador móvel cobre também a proteção da nova rota. Ver `docs/etapa-historico-2026-10-30.md` para comandos e limitações. A próxima tarefa é a interface responsiva do histórico; depois configurações, regras e alertas. Hardware ainda não adquirido e iPhone ainda não validado conforme resposta do aluno nesta sessão.
