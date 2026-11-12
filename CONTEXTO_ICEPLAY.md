# CONTEXTO_ICEPLAY

## Atualização incremental de 12/11/2026 — alertas e interface

Terceiro incremento concluído: credenciais por geladeira, revogação, escopo de POST e UUID idempotente na mesma API; formulário de gerenciamento em Configurações. Quinta migration `20261112194714_AddDispositivos`; os registros antigos têm metadados de dispositivo nulos. Ver `docs/contrato-dispositivos.md` e `docs/etapa-dispositivos-2026-11-12.md`. Firmware e ensaio continuam pendentes neste ponto; as referências a autenticação pendente abaixo são o estado anterior.

O usuário autorizou concluir progressivamente as pendências de software/documentação antes da chegada das peças. O primeiro incremento adiciona `Alertas`, `EstadosMonitoramento`, migration `20261112192436_AddAlertas`, `AvaliadorAlertas`/worker periódico e consultas GET de lista/detalhe/resumo. O segundo integra página com filtros/paginação, ocorrências recentes no painel e ativação efetiva em Configurações. Ver `docs/contrato-alertas.md` e `docs/etapa-interface-alertas-2026-11-12.md`. Os textos abaixo datados de 11/11 descrevem a situação anterior. Nenhum equipamento de uso foi ativado ou recebeu parâmetros automaticamente. Foram executados testes de regras/HTTP/regressão em bancos isolados e 101 testes Node; isso não substitui conferência visual no iPhone. Autenticação de dispositivo, firmware e ensaios continuam pendentes neste ponto.

Documento de transferência de contexto do projeto, inicialmente elaborado em 30/10/2026 e atualizado em **11/11/2026**. As seções de situação atual descrevem o código de trabalho; as seções datadas preservam resultados e decisões anteriores. Este documento não substitui a leitura do código nem a consulta aos relatórios reais em `docs/evidencias/` e não declara uma nova execução de testes somente por atualizar a documentação.

Em 30/10, a base foi novamente executada e validada, Git/GitHub regularizados com autorização do usuário e a API do histórico implementada em incremento separado. O estado de 09/11 sucede esse diagnóstico: existem páginas HTML independentes e interface de histórico; o usuário confirmou parte do uso no iPhone e enviou foto da consulta das três leituras simuladas. O plano vigente é `docs/plano-ate-hardware-2026-11-09.md`; `docs/retomada-2026-10-30.md` e `docs/plano-continuidade-2026-10-30.md` permanecem como histórico. A conclusão das regressões/publicação deve ser verificada nos relatórios e no Git, sem inferir push a partir deste texto.

## 1. Objetivo e escopo do TCC

ICEPLAY é um TCC de Ciência da Computação para monitoramento IoT de geladeiras comerciais. O núcleo proposto é cadastrar equipamentos, receber temperatura e estado da porta, registrar tanto o instante informado pelo emissor quanto o instante de recebimento pela API, persistir os dados, apresentá-los no navegador e evoluir para alertas de condições anormais e ausência de leituras.

O prazo informado para versão completa é 24/11/2026, com apresentação/validação em 01/12/2026. O professor exige demonstração funcional e evidências concretas, não somente código.

Atualização de 11/11: estão implementados cadastro, saúde real, ingestão/simulador, painel, histórico, páginas independentes, acesso móvel e configurações persistidas por geladeira. Configurações tem modelo/migration, GET/PUT e formulário para limites, tempos, origem e habilitação planejada, sem valores presumidos. Ainda faltam avaliação das regras, geração/consulta de alertas, autenticação do ESP32, firmware e ensaio físico. A página Alertas informa a ausência do backend. O usuário está escolhendo peças; fotos de anúncios não comprovam compra ou posse. Voz foi excluída do MVP em 09/11; notificações externas ficam após o núcleo.

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
| `src/Iceplay.Api/Models/` | Entidades `Geladeira`, `Leitura`, `ConfiguracaoGeladeira` e enumeração `OrigemLeitura`. |
| `src/Iceplay.Api/Data/` | `IceplayDbContext`, restrições/mapeamentos e tratamento de exceções do banco. |
| `src/Iceplay.Api/Migrations/` | Migrations EF: criação inicial e inclusão de leituras. |
| `src/Iceplay.Api/Mobile/` | Limitação de rede, HTTPS local, cookie, CSRF e login por código no modo móvel. |
| `src/Iceplay.Api/wwwroot/` | Interface, navegação, saúde, CRUD, painel e scripts JavaScript. |
| `src/Iceplay.Api/wwwroot/index.html`, `geladeiras.html`, `historico.html`, `alertas.html`, `configuracoes.html`, `acesso.html`, `sobre.html` | Sete documentos independentes servidos pelo mesmo backend. |
| `src/Iceplay.Api/wwwroot/shell.js`, `acesso.js` | Menu responsivo compartilhado e estado/sessão de acesso. |
| `src/Iceplay.Api/wwwroot/historico.js`, `historico-estado.mjs` | Cliente de consulta, filtros, validação, tabela, gráfico e paginação do histórico. |
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
- Persistência SQLite por EF Core, com três migrations e aplicação automática apenas em Development.
- Configurações por equipamento com validação, origem explícita, habilitação/início UTC e persistência, sem geração de alertas nesta etapa.
- Ingestão de temperatura, porta, origem e timestamp de medição; timestamp de recebimento é produzido pelo servidor.
- Consulta de uma leitura por geladeira para uma origem selecionada, usando maior `medidoEmUtc` e maior ID no empate.
- API de histórico `GET /api/leituras`, filtrada por geladeira/origem/período UTC, com paginação de até 100 itens e ordenação por medição/ID decrescentes.
- Interface de histórico com seleção de equipamento/origem/período, conversão de hora local para UTC, filtros/página na URL, tabela com os dois timestamps e gráfico somente das amostras da página consultada. Alterar filtros limpa a consulta anterior; falhas não mantêm dados como se estivessem confirmados.
- Páginas próprias `/dashboard`, `/geladeiras`, `/historico`, `/alertas`, `/configuracoes`, `/acesso` e `/sobre`; a raiz também entrega a Visão geral. Menu lateral fixo no desktop e recolhível no celular. Não há fallback SPA nem alternância de blocos para substituir a navegação real.
- Painel responsivo para desktop/celular, filtro de origem Simulação/Hardware declarado, atualização automática a cada 15 segundos quando visível e referência visual de leitura desatualizada após mais de 60 segundos.
- Interface para cadastro, edição e exclusão de geladeiras integrada à API, e apresentação de saúde real da API/banco.
- Simulador PowerShell que envia para a mesma API do hardware planejado e não acessa SQLite diretamente.
- Modo móvel local opcional: HTTPS no IP privado configurado, certificado local, acesso com código, cookie Secure/HttpOnly/SameSite Strict, CSRF, limite de oito tentativas por minuto e restrição à sub-rede configurada.

Evidências de 19/10 registram build sem avisos/erros, verificadores de API, persistência em reinício, simulador e testes JavaScript; são resultados históricos. O uso no iPhone teve confirmação parcial em 09/11 e foto posterior mostrando tabela/gráfico com três leituras de simulação. Essas evidências não provam funcionamento com sensores físicos nem validam antecipadamente os refinamentos posteriores do gráfico/acesso.

## 5. Funcionalidades parcialmente implementadas ou não validadas

- Interface móvel: além dos testes históricos de viewport/TCP/TLS/HTTP, houve acesso, saúde, cadastro/edição, navegação, atualização e consulta das leituras simuladas no iPhone em 09/11. Permanecem sem confirmação integral no aparelho logout/reconexão, exclusão de fixture sem leituras, reinício, orientações/zoom/teclado e os ajustes posteriores do gráfico/acesso. Modelo/iOS não foram informados.
- Origem `Hardware`: contrato e rótulo existem, mas não há ESP32, autenticação de dispositivo ou ensaio físico. Ela é somente uma declaração do emissor.
- Monitoramento: mostra a última leitura por origem; o histórico fica em página separada. Não decide se a temperatura é adequada. A referência de 60 segundos é exclusivamente visual, ajustável na sessão, e não gera alerta.
- Configurações persiste parâmetros; o motor que os avaliará ainda não existe. Alertas continua como página de indisponibilidade. A nova tela de Configurações precisa de conferência manual no iPhone.
- Documentação UML existe em `docs/uml.md`, mas as fontes PlantUML ainda não foram renderizadas segundo o README.

## 6. Funcionalidades pendentes

1. Conferir no iPhone os refinamentos do gráfico e a nova tela de Configurações; manter a validação visual separada dos testes HTTP/DOM.
2. Definir com o aluno/orientador os parâmetros adequados à geladeira real; o armazenamento/API/formulário já existem, sem defaults sanitários.
3. Implementar regras e episódios de alertas abertos/resolvidos, evitando duplicação e tratando amostras atrasadas, lacunas e separação de origens.
4. Integrar consulta de alertas e resumo real à interface, mantendo estados vazio/erro explícitos.
5. Preparar autenticação/autorização da ingestão do ESP32 e definir políticas de relógio, falhas e repetição.
6. Preparar e compilar firmware para a placa escolhida, instruções de montagem e testes do contrato; depois realizar integração e ensaios com ESP32, DS18B20 e sensor magnético reais.
7. Completar a validação móvel restante, UML renderizado, trabalho escrito, artigo, manual e evidências, em paralelo às etapas apropriadas.

O detalhamento e os critérios das seis entregas de software estão em `docs/plano-ate-hardware-2026-11-09.md`. Notificação por voz está fora do MVP; notificações externas são futuras. Não há aprovação documentada do professor que substitua a exigência de validação física.

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
| `GET /api/geladeiras/{id}/configuracao` | 200 | `{geladeiraId, configuracao}`; configuração nula se ainda não cadastrada; geladeira inexistente: 404. |
| `PUT /api/geladeiras/{id}/configuracao` | 201/200 | Cria/atualiza os seis parâmetros obrigatórios; primeira gravação tem Location; inválidos: 400; inexistente: 404; banco: 503. Ver `docs/contrato-configuracoes.md`. |
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

Há índice em `(GeladeiraId, MedidoEmUtc, Id)` para a busca da última leitura. As migrations são `20261013172101_InitialCreate`, `20261018023456_AddLeituras` e `20261109233935_AddConfiguracoesGeladeiras`. O SQL atualizado para banco novo está em `docs/sql/iceplay-criacao-2026-11-09.sql`; o SQL anterior foi preservado. Não execute scripts de criação sobre banco existente. Em conexões SQLite externas, ative `PRAGMA foreign_keys=ON`.

### `ConfiguracoesGeladeiras`

PK/FK `GeladeiraId`, relação 1:0..1 com Geladeiras e CASCADE da configuração ao excluir cadastro sem leituras. Armazena `TemperaturaMinimaC`, `TemperaturaMaximaC`, `ToleranciaPortaAbertaSegundos`, `AusenciaLeiturasSegundos`, `OrigemMonitorada`, `MonitoramentoAtivo`, `InicioMonitoramentoEmUtc` anulável e `AtualizadoEmUtc`. CHECKs impõem finitude/ordem das temperaturas, inteiros positivos, enum, booleano e coerência dos instantes. Leituras mantém RESTRICT e proteção 409. GET não cria parâmetros. PUT usa transação curta, gera timestamps e preserva o início ao editar limites; ativar/mudar origem ativa inicia outro acompanhamento. Contrato detalhado em `docs/contrato-configuracoes.md`.

## 9. Configuração e execução

Pré-requisitos da cópia nova: Windows x64, PowerShell 7.5+, internet durante instalação/restauração e permissão de escrita. Não são necessários Node, Python, servidor SQLite ou Visual Studio para executar a aplicação; Node/Python são opcionais para parte das verificações.

```powershell
Set-Location 'C:\Users\otavi\Downloads\iceplay'
.\scripts\install-dotnet.ps1  # somente se SDK local ainda não existir
.\scripts\setup.ps1
.\scripts\run.ps1
```

`setup.ps1` restaura pacotes/ferramentas e compila. `run.ps1` inicia em Development, aplica migrations pendentes e mantém o processo no terminal. Acesse `http://localhost:5080`; encerre com Ctrl+C. A API e a interface são entregues pelo mesmo processo.

A raiz e `/dashboard` abrem Visão geral; o menu leva a `/geladeiras`, `/historico`, `/alertas` e `/configuracoes`. `/acesso` contém a sessão móvel e `/sobre` preserva base técnica/próximos passos. O `Program.cs` mapeia cada URL para seu HTML próprio; acessar diretamente ou atualizar usa esse documento. Rotas desconhecidas permanecem 404. Antigas âncoras de geladeiras/acesso/base técnica/próximas etapas são encaminhadas pelo `shell.js` para as novas páginas.

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

4. No iPhone na mesma rede, abrir `http://SEU_IP_PRIVADO:5081`, baixar o certificado público, instalá-lo e habilitar confiança; depois abrir `https://SEU_IP_PRIVADO:5443/acesso` e informar o código de `.tools/mobile/codigo-acesso.txt`.

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
- Separar a interface em documentos HTML reais, com navegação por URL e assets compartilhados; preservar API, arquitetura, funções anteriores e mensagens honestas para backends pendentes.
- O gráfico é uma representação das amostras da página, sem interpolação medida nem limites de alerta. A tabela preserva o contexto completo da leitura.
- Notificação por voz foi excluída do MVP por decisão do usuário em 09/11/2026 e permanece somente como possibilidade futura.

## 12. Problemas conhecidos e limitações

- Há validação parcial do iPhone relatada pelo usuário em 09/11 (ver seção 18). O roteiro completo e o hardware ESP32/DS18B20/sensor magnético continuam sem validação integral registrada.
- Não há autenticação de ESP32, usuário individual, controle de perfis, implantação pública, HTTPS público ou acesso externo.
- Histórico e Configurações têm API e interface; Alertas permanece informativa. Parâmetros estão persistidos, mas não há avaliação/geração/consulta de alertas, notificações, resumo de alertas reais ou exclusão de leituras.
- Não há faixa física aceita de temperatura; apenas rejeição de números não finitos. Limites devem ser definidos com o orientador.
- A lista do painel não é paginada e traz uma única última leitura por equipamento/origem.
- Cookies/sessão móvel são deliberadamente efêmeros e expiram em até 8 horas; reiniciar a API invalida sessão.
- O IP local pode mudar, exigindo nova preparação de modo móvel. Não se deve ignorar aviso de certificado.
- Há autorização para commits/pushes rotineiros validados desde 30/10 e repositório remoto configurado. Preservar segredos e o banco local, e revisar o estado antes de cada commit.

## 13. Testes e evidências existentes

Os scripts principais são `verify.ps1`, `verify-geladeiras.ps1`, `verify-leituras.ps1`, `verify-monitoramento.ps1`, `verify-historico.ps1`, `verify-pages.ps1` e `verify-mobile.ps1`. Eles criam bancos/instâncias isoladas e têm opção `-EvidenceDirectory`; use diretório novo a cada rodada importante. Há testes Node sem dependências em `scripts/monitoramento-estado.test.mjs`, `scripts/acesso.test.mjs`, `scripts/historico-estado.test.mjs` e `scripts/shell.test.mjs`. O README contém os comandos. HTTP e DOM/fetch controlados não equivalem à renderização no navegador/aparelho.

Os relatórios de 19/10 registram, entre outros, build sem avisos/erros, 807 asserções/177 requisições do CRUD, 339/75 para leituras, 70/29 para painel, 82/61 para acesso móvel e testes JavaScript aprovados. Esses números estão nos arquivos de evidência e representam verificações históricas, não uma nova execução nesta transferência. As evidências também registram persistência após reinício e que o banco de uso ficou com uma geladeira e nenhuma leitura naquela execução. O estado atual do banco não foi inferido nesta documentação.

## 14. Próximas tarefas por prioridade

1. **Validação móvel complementar:** conferir os ajustes visuais e a nova tela de Configurações. Páginas e histórico foram publicados no commit `7bd4541`.
2. **Parâmetros reais:** acordar limites/tempos conforme o uso; modelo/migration, API e formulário já implementados. Ver seção 20.
3. **Regras/registro de alertas:** avaliar temperatura, duração da porta e ausência de leituras; testar limiares, recuperação, relógio, reinício e origem.
4. **Interface de alertas:** apresentar ocorrências/filtros/situação e resumo real na Visão geral.
5. **API para dispositivo:** autenticar o emissor e autorizar somente a geladeira vinculada, com política de relógio/falha/repetição documentada.
6. **Firmware e preparação do ensaio:** compilar para a placa escolhida, documentar montagem e testar o contrato; com as peças, executar e registrar a integração física na geladeira.

Seguir `docs/plano-ate-hardware-2026-11-09.md`. UML, manual, texto/artigo e evidências são trabalho contínuo até a versão final de 24/11 e a apresentação em 01/12.

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

## 17. Identidade visual Black & Ice Blue — 30/10

O usuário solicitou identidade premium preta/azul-gelo com flocos geométricos. Uma proposta SVG foi apresentada antes da implementação; o tema foi aplicado em index.html/styles.css, com tokens novos em `wwwroot/theme.css` e símbolo local `wwwroot/assets/iceplay-mark.svg`. O guia está em `docs/design/black-ice-blue.md`. Visão geral, Painel, Geladeiras e acesso móvel usam o tema; Histórico/Alertas/Configurações ainda aguardam implementação de tela e devem reutilizá-lo. Não houve mudança de JS funcional/API/banco/migrations.

Build 0 avisos/erros; base 13, painel 70 asserções/29 requisições, móvel 89/66 e Node 20 testes aprovados. HTTP dos assets e inspeção estática de 66 IDs/referências/contraste passaram; bordas de controle/perigo foram corrigidas após o primeiro cálculo. Evidências em `docs/evidencias/2026-10-30-visual`, relatório em `docs/etapa-visual-2026-10-30.md`. O navegador permaneceu desativado em Work nas consultas realizadas, apesar de o aluno informar que iria habilitar; a renderização responsiva em navegador e no iPhone físico segue pendente. Não tratar o estudo SVG como captura de execução.

A leitura final do SQLite naquela etapa visual encontrou zero geladeiras e zero leituras, duas migrations e integridade ok. Esse era o estado observado em 30/10; a seção 16 registra uma execução anterior, com uma geladeira, e a seção 18 registra o cadastro/leituras posteriores. Uma comparação com o hash anterior divergiu; sem snapshot do começo daquela etapa, não se atribui a divergência à mudança visual. O banco foi preservado sem reposição de registros.

## 18. Teste parcial no iPhone — 09/11/2026

O aluno mostrou foto da página HTTP de preparação aberta no iPhone e depois confirmou a sequência de acesso e o roteiro de saúde, cadastro, edição, histórico vazio, navegação e atualização de página. A confirmação "sim, tudo perfeito" foi relatada pelo usuário, sem inspeção automatizada das telas. A consulta real ao backend retornou healthy/connected e o cadastro ID 2, `TESTE IPHONE EDITADO`, salvo no banco.

Na sequência foram enviados explicitamente pelo simulador três POSTs para esse cadastro de teste: todos receberam 201, com origem Simulacao, temperatura de teste 4,25 °C, porta fechada e IDs de leitura 1/2/3. GET do histórico confirmou três itens. No primeiro registro a visualização no iPhone ainda aguardava confirmação; uma segunda foto enviada depois na conversa mostrou tabela com as três leituras e gráfico de temperatura no aparelho, confirmando essa consulta. A foto não foi copiada para o repositório. Logout/reconexão, exclusão de cadastro sem leituras e persistência após reiniciar acompanhado no aparelho continuam sem confirmação. Versão do iOS e modelo do aparelho não foram informados. Nenhuma medição física foi realizada.

Evidências em `docs/evidencias/2026-11-09-iphone/`. Na elaboração inicial desse registro, a reorganização em documentos HTML próprios ainda aguardava fechamento de regressões/documentação e commit de código; o último código publicado naquele momento era `21f9e4b`. A revisão de fechamento ocorre em etapa própria: consultar relatórios e `git log/status` para saber o que efetivamente foi validado/publicado, sem interpretar esta atualização documental como prova de push.

## 19. Continuidade e fechamento de páginas — 09/11/2026

O código de trabalho possui os sete documentos e o histórico descritos nas seções atuais. Alertas e Configurações são páginas navegáveis de indisponibilidade, sem backends ou regras fictícias. O tema Black & Ice Blue é compartilhado. O refinamento do gráfico e do indicador de acesso é posterior à foto do iPhone e requer conferência própria no aparelho; testes automatizados não substituem essa confirmação.

O relatório `docs/etapa-paginas-2026-11-09.md` registra a execução de software desta revisão: build com zero avisos/erros, base 13 verificações, CRUD 807 asserções/177 requisições, leituras 339/75, histórico 145/68, painel 70/29, móvel 103/73, páginas 195/40 e 63 testes JavaScript aprovados. As evidências estão em `docs/evidencias/2026-11-09-fechamento-paginas/`. São asserções/testes de software, não percentuais de cobertura ou ensaios físicos.

O reinício real do servidor no computador preservou o conteúdo lógico do banco de uso: uma geladeira ID 2, três leituras Simulacao e duas migrations, com integridade e chaves estrangeiras válidas. O arquivo `reinicio-banco-uso.json` compara os snapshots e registra as consultas HTTP/HTTPS. Isso confirma persistência no servidor, sem afirmar que o aluno já acompanhou reconexão/reinício no iPhone. A sessão móvel é invalidada ao reiniciar e exige novo acesso.

O usuário aprovou retirar voz do MVP e informou anteriormente não possuir hardware; não há evidência posterior de aquisição, firmware ou ensaio com sensores reais. O plano `docs/plano-ate-hardware-2026-11-09.md` organiza seis entregas de software até a preparação da integração física. A primeira fecha páginas/testes/documentação/publicação; a próxima funcionalidade é a configuração persistida das regras por geladeira. A execução de software e os futuros resultados físicos devem permanecer registrados separadamente.

## 20. Configurações por geladeira — 09 a 11/11/2026

Foram acrescentados `ConfiguracaoGeladeira`, contratos, `ConfiguracoesController`, migration aditiva `20261109233935_AddConfiguracoesGeladeiras`, formulário e módulos/testes de Configurações. GET/PUT, validação e instantes estão no `docs/contrato-configuracoes.md`. A tabela nova não recebe seed; habilitação prepara regras futuras, sem avaliar/gerar alertas. O próximo incremento são episódios de alertas; parâmetros reais ainda devem ser acordados conforme o uso.

O relatório `docs/etapa-configuracoes-2026-11-11.md` separa as execuções: API/configurações 153 asserções/67 requisições registradas mais dois PUTs concorrentes; móvel 114/80; páginas 198/42; 85 testes JavaScript (22 novos de configurações), build sem avisos/erros, modelo sem divergência das migrations e regressões anteriores aprovadas. Evidências nas pastas `docs/evidencias/2026-11-09-configuracoes` e `2026-11-11-configuracoes`, com datas reais. O verificador independente SQLite passou em 12 verificações; o SQL completo novo foi executado em banco isolado sem seed.

Em 11/11 houve backup consistente antes de iniciar a versão atualizada. O banco de uso manteve uma geladeira e três leituras Simulacao com o mesmo hash lógico dos registros; recebeu apenas a terceira migration e a tabela vazia. Nenhuma configuração foi inserida no banco de uso. A ferramenta de navegador continuou bloqueada; testes HTTP/Node não validam Safari ou a nova tela no iPhone. O servidor foi iniciado novamente em modo móvel, exigindo nova sessão no aparelho.

O usuário mostrou anúncios de ESP32 DevKit V1/WROOM-32, sonda DS18B20 e resistor 4,7 kΩ. Foi avaliada a compatibilidade do modelo, sem comprovar especificações do vendedor, compra, posse, firmware ou montagem. Após as configurações restam quatro entregas de software do plano vigente, mais os ensaios físicos e a documentação acadêmica.
