# ICEPLAY

Projeto de TCC de Ciência da Computação: sistema IoT para monitoramento de geladeiras comerciais. Base iniciada em **13/10/2026**, com cadastro de geladeiras desenvolvido em **15/10/2026**, revisado em **17/10/2026** e ingestão/simulador verificados em **19/10/2026**. Pelo cronograma do professor, a versão completa deve ser entregue em **24/11/2026** e apresentada em **01/12/2026**.

Existem uma aplicação ASP.NET Core, SQLite com EF Core, cadastro completo de geladeiras, saúde real do banco, recebimento de leituras, simulador por linha de comando, painel responsivo de últimas leituras por origem e API de histórico paginado (30/10). A tela do histórico, configurações de limites, alertas e firmware continuam pendentes. Não há ensaio físico comprovado nem registros inseridos automaticamente ao iniciar. As leituras de teste são identificadas como simulação. A retomada e o plano até o hardware estão em [plano de continuidade](docs/plano-continuidade-2026-10-30.md).

## Executar neste computador

A interface usa **Black & Ice Blue**, com tokens em `wwwroot/theme.css` e floco SVG local. Veja o [guia visual](docs/design/black-ice-blue.md) e o [relatório de verificação](docs/etapa-visual-2026-10-30.md). A tela do histórico e os módulos de alertas/configurações continuam pendentes e utilizarão os mesmos componentes.

Abra **PowerShell 7** (`pwsh`, versão testada: **7.6.5**; a verificação exige 7.5 ou posterior). Os comandos abaixo partem da pasta do projeto:

```powershell
Set-Location 'C:\Users\otavi\Downloads\iceplay'
.\scripts\setup.ps1
.\scripts\run.ps1
```

O SDK local já foi instalado nesta pasta durante a preparação. `setup.ps1` restaura as versões fixadas dos pacotes e da ferramenta EF, e compila. `run.ps1` inicia em `Development`, aplica a migração pendente e mantém o servidor no terminal.

Abra [http://localhost:5080](http://localhost:5080). Para encerrar, pressione **Ctrl+C** no terminal. Encerre a aplicação antes de recompilar arquivos alterados: o Windows pode bloquear o executável em uso.

## Usar no iPhone na mesma rede

Foi acrescentado um modo móvel local com HTTPS e código de acesso, preservando a mesma aplicação, API e SQLite. A instalação do certificado, a liberação no firewall e o teste no iPhone ainda exigem ações no computador/aparelho; os testes de software não são apresentados como teste físico no Safari.

No computador desta execução, o IPv4 encontrado foi **192.168.1.123**, interface Ethernet, prefixo /24. Esse endereço pode mudar. Encerre a instância comum antes de iniciar a móvel. Em PowerShell 7:

```powershell
.\scripts\prepare-mobile.ps1 -EnderecoIp 192.168.1.123
.\scripts\run-mobile.ps1
```

O primeiro comando gera ou preserva certificados/código em `.tools/mobile`, ignorada pelo Git e com permissões da conta local. Nenhum certificado é instalado automaticamente no Windows ou no iPhone. O segundo inicia a aplicação com o banco de uso existente; iniciar não cria dados de simulação.

Uma vez, em outro **PowerShell 7 como administrador**, na pasta do projeto:

```powershell
.\scripts\mobile-firewall.ps1 -Acao Ativar
```

A regra libera somente TCP 5443 e 5081 no IP/interface configurados, para a sub-rede local. Não muda o perfil da rede nem desativa o firewall. Não foi aplicada automaticamente, pois a sessão de desenvolvimento não tem privilégios de administrador.

No Safari do iPhone, conectado ao mesmo roteador, abra **http://192.168.1.123:5081** para baixar somente o certificado público e seguir as instruções. Instale o perfil, confira o certificado no computador e habilite a confiança em Ajustes → Geral → Sobre → Certificados Confiáveis. Depois abra **https://192.168.1.123:5443/#acesso-movel** e use o código de `.tools/mobile/codigo-acesso.txt`. Não ignore avisos de certificado. Consulte o [roteiro completo para iPhone](docs/acesso-iphone.md), incluindo verificação, encerramento e solução de problemas.

O modo comum `run.ps1` continua restrito ao computador. No modo móvel, `localhost:5080` continua disponível ao operador local; o acesso pela rede exige sessão HTTPS. O código autoriza consultas e alterações, usa cookie Secure/HttpOnly/SameSite Strict, proteção CSRF e limite de tentativas. A sessão dura no máximo 8 horas e é invalidada ao reiniciar. Não é um cadastro multiusuário nem uma implantação pública.

## Instalar em uma cópia nova do projeto

Pré-requisitos: Windows x64, PowerShell 7.5 ou posterior, internet para baixar SDK/pacotes e permissão de escrita nesta pasta. Reserve cerca de 2 GB para SDK, pacotes e artefatos de build. Não é necessário instalar Node, Python, servidor SQLite ou Visual Studio para executar a aplicação.

Na pasta da cópia, execute:

```powershell
.\scripts\install-dotnet.ps1
.\scripts\setup.ps1
.\scripts\run.ps1
```

O instalador baixa o **SDK .NET 10.0.401** da Microsoft para `.tools/dotnet`, compara seu SHA-512 com o manifesto oficial e remove o ZIP após a extração. Não exige administrador nem muda o PATH permanentemente. Cada script configura o ambiente apenas para sua sessão. `global.json` fixa a versão do SDK; não execute `dotnet` global supondo que ele esteja instalado.

Se a política do PowerShell bloquear scripts, use uma sessão temporária:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-dotnet.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1
```

Essas opções se aplicam ao processo iniciado; não é necessário alterar a política permanente do computador.

## Verificar a API e o banco

Com o servidor em execução, abra outro terminal PowerShell:

```powershell
$resposta = Invoke-WebRequest 'http://localhost:5080/api/health'
$resposta.StatusCode
$resposta.Content
```

O sucesso é **HTTP 200**, `status` igual a `healthy`, `database` igual a `connected`, uma contagem real em `refrigeratorCount` e `checkedAtUtc` em UTC. O timestamp varia em cada requisição. A contagem começa em zero em um banco novo e muda conforme os cadastros salvos. A interface volta a consultar essa rota após as alterações.

A rota executa `COUNT(*)` na tabela `Geladeiras`. Isso verifica a conexão **e a existência da tabela**, não apenas se o processo está aberto. Uma falha de consulta retorna **HTTP 503**, `unhealthy` e `unavailable`, sem detalhes internos na resposta; a causa é registrada no terminal.

O arquivo de uso é `src/Iceplay.Api/data/iceplay.db`. O caminho relativo configurado em `appsettings.json` é resolvido a partir da pasta da aplicação, independentemente da pasta de onde o script foi chamado. A configuração atual espera um **caminho de arquivo**, não `:memory:` ou URI SQLite. Banco, WAL e arquivos gerados ficam fora do Git.

As migrations automáticas são limitadas a **Development**, com uma instância local. Em outro ambiente, o esquema deve ser aplicado explicitamente antes de iniciar. Não remova o banco para atualizar o modelo. Ao copiar um banco com dados relevantes, encerre a aplicação e preserve os arquivos auxiliares SQLite ou use um procedimento de backup consistente. O [SQL de criação](docs/sql/iceplay-criacao.sql) serve para banco novo; em conexões SQLite manuais, habilite `PRAGMA foreign_keys=ON` para aplicar as restrições de relacionamento.

## Usar o cadastro na interface

Na página inicial, acesse **Geladeiras**. Informe nome e, opcionalmente, localização e selecione **Cadastrar geladeira**. A lista vem da API e é recarregada após a gravação. Cada registro permite consultar seus detalhes, editar ou iniciar uma exclusão com confirmação explícita na página. Cancelar uma edição ou exclusão não altera o banco.

A tela apresenta erros de validação, falhas de conexão e estado sem cadastros. Em timeout de gravação, o resultado pode ser incerto: recarregue a lista antes de tentar outra alteração, para evitar repetir um cadastro já salvo. O painel de saúde continua consultando o banco real; ele não calcula a contagem a partir dos cartões da tela.

## Rotas da API

| Método e rota | Sucesso | Finalidade |
| --- | --- | --- |
| `GET /api/health` | `200` | Consulta o SQLite e devolve estado, contagem e horário UTC |
| `GET /api/geladeiras` | `200` | Array de geladeiras, ordenado por ID; `[]` quando vazio |
| `GET /api/geladeiras/{id}` | `200` | Objeto de uma geladeira |
| `POST /api/geladeiras` | `201` | Objeto criado e header `Location` para consultá-lo |
| `PUT /api/geladeiras/{id}` | `200` | Objeto atualizado, preservando ID e data de criação |
| `DELETE /api/geladeiras/{id}` | `204` | Exclusão concluída, sem corpo na resposta |
| `POST /api/leituras` | `201` | Persiste uma leitura e retorna `Location` para consultá-la |
| `GET /api/leituras?geladeiraId=1&origem=Simulacao` | `200` | Histórico filtrado por geladeira/origem, com período UTC opcional e paginação |
| `GET /api/leituras/{id}` | `200` | Consulta a leitura, sua origem e os dois timestamps |
| `GET /api/monitoramento?origem=Simulacao` | `200` | Todas as geladeiras e uma última leitura por equipamento na origem selecionada |
| `GET /api/acesso` | `200` | Estado de acesso deste dispositivo e token de formulário quando necessário |
| `POST /api/acesso/entrar` | `204` | No modo móvel HTTPS, recebe `{"codigo":"seu código local"}` e inicia sessão |
| `POST /api/acesso/sair` | `204` | Encerra a sessão deste navegador no modo móvel HTTPS |

Nas rotas de geladeiras, `POST` e `PUT` recebem `Content-Type: application/json` e o mesmo formato:

```json
{
  "nome": "Geladeira principal",
  "localizacao": "Área de vendas"
}
```

Os valores acima são exemplos de requisição; não são registros inseridos pelo sistema. Para não informar localização, omita a propriedade ou use `null`. Uma localização vazia ou composta de espaços é normalizada para `null`. `PUT` substitui os campos editáveis: omitir localização também a remove.

Regras: `nome` é obrigatório, não pode conter apenas espaços e aceita no máximo 100 caracteres; `localizacao` é opcional, com até 200. Os limites são verificados antes da remoção de espaços das extremidades. São aceitos nomes repetidos, pois não foi estabelecida regra de unicidade. Os limites de texto seguem a contagem de caracteres do .NET (unidades UTF-16).

As respostas de recurso têm `id`, `nome`, `localizacao` e `criadoEmUtc`. O servidor gera ID e data de criação em UTC. Campos adicionais enviados pelo cliente, como `id` e `criadoEmUtc`, são ignorados; não permitem modificar esses valores.

Entradas inválidas e JSON malformado retornam **400**, normalmente no formato `ValidationProblemDetails`, com erros em `errors` (por exemplo, chave `Nome`). Consultar, editar ou excluir ID inexistente retorna **404**. Identificadores não inteiros não correspondem à rota e também recebem 404. Falhas reconhecidas de banco nas rotas de cadastro retornam **503 ProblemDetails**, sem mensagens internas de exceção. A saúde preserva seu contrato próprio.

A exclusão de geladeira sem leituras é física. Se houver leituras vinculadas, a API responde **409** e preserva o cadastro e seus dados; a chave estrangeira SQLite também restringe a exclusão. A desativação de equipamentos permanece uma decisão futura. Não existe exclusão em cascata de leituras.

Para consultar pelo terminal com o servidor em execução:

```powershell
Invoke-RestMethod 'http://localhost:5080/api/geladeiras'
# Substitua 1 por um ID existente:
Invoke-RestMethod 'http://localhost:5080/api/geladeiras/1'
```

## Usar o painel de últimas leituras

Abra [Painel](http://localhost:5080/#monitoramento). Cada cartão apresenta identificação, última temperatura, porta na medição, horários de medição/recebimento e origem. Uma geladeira sem leitura mostra `—` e **Sem dados**; isso não significa temperatura zero ou condição normal.

A seleção de origem é explícita: **Simulação** ou **Hardware declarado**. O painel não mistura amostras de origens diferentes. A etiqueta Hardware é declarada pelo emissor e não comprova sensor autenticado ou medição física.

A API escolhe o maior horário de medição por geladeira/origem; em empate, escolhe o maior ID. Uma amostra atrasada, mesmo recebida depois, não substitui a medição mais recente. A consulta traz somente uma leitura por geladeira, sem carregar o histórico inteiro. Retorna `consultadoEmUtc`, `origem` e `geladeiras`, cujos itens têm `id`, `nome`, `localizacao` e `ultimaLeitura` (nula ou o contrato existente de leitura). `origem` é obrigatória, exatamente `Simulacao` ou `Hardware`; ausência/valor inválido retorna 400 e falha reconhecida de banco retorna 503.

A referência visual padrão, escolhida para este protótipo, é **60 segundos**: idade maior que 60 segundos desde a medição indica leitura desatualizada. Exatamente 60 segundos ainda conta como recente. É possível mudar essa referência na tela para 5 minutos ou somente mostrar a idade; o ajuste vale para a sessão e não configura alertas ou limites persistidos. Recência não classifica a temperatura como adequada nem afirma conexão com um dispositivo.

O horário da consulta no servidor ancora a idade apresentada; o painel acompanha o tempo transcorrido sem depender do relógio civil do navegador. Há atualização automática a cada 15 segundos com a página visível e botão manual. Falhas removem os valores anteriores e mostram erro; a saúde volta a consultar a API. Não há notificações em segundo plano ou com a página fechada.

O layout foi verificado em telas pequenas e desktop. `localhost` aberto em outro celular aponta para o próprio celular. Para acessar o computador pela rede, use o modo móvel HTTPS descrito acima; a validação no iPhone físico permanece pendente.

Para demonstrar com dados de teste, cadastre uma geladeira, use seu ID no simulador descrito abaixo e mantenha a origem **Simulação** selecionada. Os dados são realmente enviados, persistidos e consultados, mas continuam sendo simulação.

## Receber e consultar leituras

`POST /api/leituras` recebe os cinco campos obrigatórios abaixo. Este é um exemplo de contrato, não uma medição física nem um registro automático:

```json
{
  "geladeiraId": 1,
  "temperaturaC": 4.25,
  "portaAberta": false,
  "medidoEmUtc": "2026-10-17T12:00:00Z",
  "origem": "Simulacao"
}
```

Use o ID de uma geladeira existente. Temperatura deve ser um número JSON finito e porta deve ser booleano; zero e `false` são válidos. Números entre aspas são recusados. Não foi definida uma faixa física nem limites de alerta nesta etapa.

`medidoEmUtc` deve usar ISO 8601 com segundos, de zero a sete casas decimais e sufixo `Z`. Horários sem fuso, com outros offsets ou posteriores ao recebimento pela API são recusados com 400. Leituras atrasadas são aceitas. O relógio do servidor é a referência desta regra, sem tolerância de relógio configurada.

A API gera `id` e `recebidoEmUtc`. O horário de medição vem do emissor, enquanto o de recebimento registra quando a API processou a entrada; ambos são armazenados e retornados em UTC. Campos extras enviados para controlar ID ou recebimento são ignorados. O sucesso retorna 201, `Location` e os sete campos: `id`, `geladeiraId`, `temperaturaC`, `portaAberta`, `medidoEmUtc`, `recebidoEmUtc` e `origem`. Consulte o recurso com GET no endereço `Location`; leitura ou geladeira ausente recebe 404. Falhas reconhecidas de banco recebem 503 genérico.

A origem deve ser exatamente `Simulacao` ou `Hardware`. O valor `Hardware` é uma declaração do emissor: a API local ainda não autentica dispositivos e essa etiqueta, isoladamente, não comprova um ensaio físico. O [contrato de leituras e seus diagramas](docs/contrato-leituras.md) detalha as decisões.

## Executar o simulador

Inicie a API e cadastre uma geladeira pela interface. Em outro PowerShell, substitua `1` pelo ID cadastrado:

```powershell
.\tools\simulator\enviar-leituras.ps1 -GeladeiraId 1 -Quantidade 3 -IntervaloSegundos 1 -TemperaturaC 4.25
```

Cada envio usa a mesma rota `POST /api/leituras`, com origem fixa `Simulacao` e horário UTC produzido no momento do envio. O valor padrão é 4 °C, porta fechada, uma leitura; os valores são constantes configuradas para o teste, sem representar coleta física. Use `-PortaAberta` para enviar `true` e `-ApiUrl http://localhost:5080` para selecionar a API. O script aceita de 1 a 1000 envios, intervalo de 0 a 3600 segundos e temperatura finita.

O simulador não cria geladeiras nem acessa diretamente o SQLite. Retorna um objeto por confirmação com `indice`, `statusHttp`, `location` e `leitura`. Falha de rede ou timeout interrompe a execução sem repetição automática, pois uma resposta perdida pode corresponder a uma leitura já gravada. Existe consulta de histórico, mas ainda não há chave de idempotência nem reconciliação automática desse caso.

## Consultar o histórico pela API

Com a aplicação em execução, substitua `1` por um ID existente:

```powershell
Invoke-RestMethod 'http://localhost:5080/api/leituras?geladeiraId=1&origem=Simulacao&pagina=1&tamanhoPagina=50'
```

`geladeiraId` (inteiro positivo) e `origem` (exatamente `Simulacao` ou `Hardware`) são obrigatórios. `pagina` começa em 1 e `tamanhoPagina` aceita 1 a 100 (padrão 50). `inicioUtc` e `fimUtc` são opcionais, inclusivos, por horário de **medição**, em ISO 8601 com segundos, até sete casas decimais e `Z`. O início não pode ultrapassar o fim. Parâmetros presentes mas vazios são inválidos; omita os opcionais quando não usados. Um deslocamento maior que `int.MaxValue` também recebe 400.

Exemplo de período (formato de URL, sem inserir dados):

```text
/api/leituras?geladeiraId=1&origem=Simulacao&inicioUtc=2026-10-01T00:00:00Z&fimUtc=2026-10-31T23:59:59.9999999Z&pagina=1&tamanhoPagina=20
```

A resposta tem `geladeiraId`, `origem`, `inicioUtc`, `fimUtc`, `pagina`, `tamanhoPagina`, `totalItens`, `totalPaginas` e `itens` (array do contrato de leitura já existente, com origem e os dois timestamps). Ordena por `medidoEmUtc` decrescente e maior ID no empate. Um equipamento existente sem leituras retorna 200 com array vazio e totais zero; página além da última retorna array vazio e preserva os totais; equipamento inexistente retorna 404. Validação: 400; banco indisponível: 503 genérico.

A contagem e os itens compartilham uma transação de leitura na mesma resposta. Novos envios entre requisições podem deslocar as páginas por posição; essa API não fornece um snapshot fixo durante toda a navegação. A proteção HTTPS/sessão móvel também se aplica ao histórico. A tela de histórico ainda será implementada no próximo incremento.

## Reproduzir as verificações

Para o histórico (PowerShell 7.5+, Python disponível), use uma pasta nova de evidências:

```powershell
.\scripts\verify-historico.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/historico
```

O teste cria somente fixtures em banco isolado e verifica filtros, UTC, paginação, 400/404/503, preservação dos dados pelo GET e reinício. A rodada de retomada da base está em `docs/evidencias/2026-10-30-retomada` e a do histórico em `docs/evidencias/2026-10-30-historico`.

Encerre a aplicação antes de executar as verificações, pois os scripts compilam o projeto e iniciam suas próprias instâncias:

```powershell
.\scripts\verify.ps1 -EvidenceDirectory docs/evidencias/2026-10-17-leituras/base
.\scripts\verify-geladeiras.ps1 -EvidenceDirectory docs/evidencias/2026-10-17-leituras/cadastro
.\scripts\verify-leituras.ps1 -EvidenceDirectory docs/evidencias/2026-10-17-leituras
```

Para verificar especificamente o painel, com Python disponível para a inspeção do banco isolado e Node.js para os testes do módulo de estado:

```powershell
.\scripts\verify-monitoramento.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/painel
node --test scripts/monitoramento-estado.test.mjs
```

Para testar o modo móvel por TCP/TLS/HTTP no IP local, em banco isolado, com Python e PowerShell 7 disponíveis:

```powershell
.\scripts\verify-mobile.ps1 -EnderecoIp 192.168.1.123 -EvidenceDirectory docs/evidencias/nova-revisao/mobile
node --test scripts/acesso.test.mjs
```

A verificação TLS confia explicitamente na CA de teste e valida o hostname, sem ignorar erros de certificado. Os oito testes JavaScript de acesso usam DOM/fetch controlados, sem equivaler a uma execução no Safari. A rodada de 19/10 está em `docs/evidencias/2026-10-19-mobile`, com as tentativas que falharam preservadas e explicadas no relatório da etapa.

O primeiro verifica última medição, desempate por ID, separação de origens, ausência de leituras, simulador, alteração de cadastro, reinício e falha controlada. O segundo verifica os estados e a idade, inclusive zero/false e medição antiga recebida recentemente, com `node:test` sem pacotes adicionais. Node não é necessário para executar a aplicação. Resultados desta etapa estão em `docs/evidencias/2026-10-19-painel`; use outra pasta para preservar essa rodada.

O script `verify.ps1` preserva as verificações da base: HTTP 200/404/503, arquivos estáticos, migração e reinício. A opção `EvidenceDirectory`, disponível nos quatro verificadores HTTP, permite salvar os relatórios em uma pasta datada, mantendo as evidências anteriores. Escolha outra pasta para uma nova rodada se quiser preservar também esses relatórios. Sem a opção, o script da base mantém o caminho original `docs/evidencias/smoke-latest.json` e o script CRUD mantém `docs/evidencias/2026-10-15/crud-api.json` por compatibilidade.

O segundo testa o cadastro pela API: operações completas, erros de entrada, IDs inexistentes, campos gerados pelo servidor, contagem real e persistência após encerrar e reiniciar a aplicação no mesmo banco. Com o comando acima, seu relatório fica em `docs/evidencias/2026-10-17-leituras/cadastro/crud-api.json`, acompanhado de logs. As verificações de migrations reconhecem agora todas as evoluções do projeto, mantendo os cenários anteriores.

O terceiro verifica a atualização de um banco com cadastro já existente, a ingestão, entradas inválidas, origem, timestamps, reinício, proteção do histórico e execução real do simulador. Os scripts compilam, usam bancos isolados e portas livres, reportam falhas e encerram apenas os processos que criam. Não alteram o banco de uso. As fixtures de leituras permanecem identificadas somente no banco isolado dessa verificação, pois não foi criada uma rota de exclusão de leituras.

Para a verificação independente do armazenamento, **Python 3.9 ou posterior é opcional** (testado: 3.14.3), sem pacotes adicionais:

```powershell
$teste = Get-Content .\docs\evidencias\2026-10-17-leituras\base\smoke-latest.json -Raw | ConvertFrom-Json -DateKind String
python .\scripts\verify-database.py $teste.isolatedDatabase |
    Tee-Object -FilePath .\docs\evidencias\2026-10-17-leituras\database.json
```

Esse teste usa `sqlite3` da biblioteca padrão do Python. Confere integridade, esquema e histórico de migrations; insere uma fixture claramente identificada como teste, fecha/reabre a conexão para verificar persistência, testa restrições e remove somente sua fixture. Rejeita caminhos fora de `.tools/verification`. Não representa cadastro real nem medição de sensor.

## Organização

| Local | Responsabilidade |
| --- | --- |
| `src/Iceplay.Api/Program.cs` | Inicialização, logs no terminal, conexão e serviços HTTP |
| `Controllers/HealthController.cs` | Rota HTTP de saúde |
| `Controllers/GeladeirasController.cs` | Cadastro, listagem, consulta individual, atualização e exclusão |
| `Controllers/LeiturasController.cs` | Recebimento validado e consulta de leituras por ID |
| `Controllers/MonitoramentoController.cs` | Consulta de uma última leitura por geladeira/origem, incluindo equipamentos sem leitura |
| `Controllers/AcessoController.cs` e `Mobile/` | Sessão móvel, HTTPS local, limites de rede e proteção CSRF |
| `Contracts/` | Entrada validada e resposta dos recursos, separadas da entidade persistida |
| `Data/IceplayDbContext.cs` | Mapeamento de entidades e restrições SQLite |
| `Data/DatabaseExceptionHandler.cs` | Resposta genérica para falhas reconhecidas de persistência |
| `Models/Geladeira.cs` | Modelo inicial: Id, Nome, Localizacao e CriadoEmUtc |
| `Models/Leitura.cs` | Temperatura, porta, origem, vínculo à geladeira e dois timestamps |
| `Migrations/` | Evolução versionável do esquema, migration inicial e snapshot |
| `wwwroot/` | HTML, CSS, saúde real, cadastro e painel; módulo de estado testável sem DOM, sem bibliotecas externas |
| `scripts/` | Instalação local, restauração, execução e verificações |
| `tools/simulator/` | Emissor PowerShell que usa a API com origem fixa Simulacao |
| `docs/` | Planejamento, UML, ambiente, uso de IA e evidências |
| `.tools/` | SDK, caches e bancos de teste gerados; ignorados pelo Git |

Há somente dois pacotes NuGet diretos: `Microsoft.EntityFrameworkCore.Sqlite` e `Microsoft.EntityFrameworkCore.Design`, ambos **10.0.12**. O primeiro permite persistir no SQLite; o segundo e a ferramenta local `dotnet-ef` **10.0.12** permitem gerar migrations. O frontend não usa dependências externas. `packages.lock.json` fixa também as dependências transitivas.

## Documentação e situação atual

- [Planejamento](docs/planejamento.md): registro da análise e proposta originais de 13/10.
- [Cronograma oficial](docs/cronograma-oficial.md): datas recebidas do professor em 19/10, plano de entregas e pendências; versão completa em 24/11 e apresentação em 01/12.
- [UML](docs/uml.md): fontes dos diagramas da base e do sistema planejado; PlantUML ainda não foi renderizado.
- [Ambiente](docs/ambiente.md): ferramentas realmente encontradas e decisões de versões.
- [Entrega de 13/10](docs/entrega-2026-10-13.md): inventário, comandos, resultados, falhas resolvidas e pendências.
- [Etapa de 15/10](docs/etapa-2026-10-15.md): alterações do cadastro, execução dos testes e limitações desta etapa.
- [Revisão de 17/10](docs/etapa-2026-10-17.md): nova execução dos testes, ajuste de mensagem da interface e preservação das evidências anteriores.
- [Contrato de leituras](docs/contrato-leituras.md): protocolo de ingestão, origem, timestamps e modelagem atual.
- [Auditoria e verificação de leituras](docs/etapa-2026-10-19.md): situação comprovada, evolução do banco e testes da ingestão/simulador concluídos em 19/10.
- [Etapa do painel](docs/etapa-painel-2026-10-19.md): diagnóstico, contrato, mudanças pequenas, verificação real e limitações do painel de últimas leituras.
- [Acesso pelo iPhone](docs/acesso-iphone.md): preparação, certificado, firewall, sessão e roteiro de validação no aparelho.
- [Etapa móvel](docs/etapa-mobile-2026-10-19.md): mudanças, testes reais, correções e limites desta evolução.
- [SQL de criação](docs/sql/iceplay-criacao.sql): gerado das migrations e verificado em banco novo isolado; não executar em banco com dados/tabelas existentes. Na execução normal, use o fluxo de migrations descrito acima.
- [Uso de IA](docs/uso-de-ia.md): assistência utilizada e responsabilidade de revisão e reprodução pelo aluno.
- [Evidências](docs/evidencias/): build, respostas HTTP, SQLite e capturas reais da interface. Os arquivos se referem à execução identificada por seus timestamps.

Sem hardware, as verificações comprovam software, esquema e persistência local. Não comprovam leitura DS18B20, detecção física da porta, comunicação ESP32, precisão térmica ou eficácia de alertas. Limites de temperatura e tolerâncias ainda precisam ser definidos com o orientador.

A base usa uma instância, com modo comum HTTP em loopback e modo móvel HTTPS opcional na sub-rede local, protegido por código/sessão. Acesso pela internet, autenticação de sensores e implantação pública continuam pendentes. Ainda faltam tela do histórico, configurações de limites, alertas, firmware, texto final do TCC e artigo. O painel consulta todas as geladeiras, sem paginação de equipamentos. Próximo incremento: **apresentar o histórico na interface**, preservando a identificação de simulação. A validação no iPhone físico e a aquisição do hardware precisam ocorrer em paralelo. Notificações externas ficam após o núcleo funcional.

Em 30/10, o usuário autorizou commits/pushes rotineiros. A base revalidada foi commitada e enviada ao [GitHub ICEPLAY](https://github.com/otavioscaires-code/iceplay-tcc), na branch `codex/retomada-historico`. Bancos, SDK, caches e segredos móveis ficam fora do Git. Consulte `git log` e `git status` para o estado atual, sem atribuir commits a datas anteriores.
