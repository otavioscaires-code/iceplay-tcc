# ICEPLAY — contexto completo para revisão externa

**Data do retrato: 19/10/2026.** Este documento foi conferido com o código, as configurações, o Git local e os relatórios existentes. Na preparação deste material foram feitas leituras e conferências; as execuções de teste citadas são as registradas nas respectivas datas, sem alegar uma nova execução de todas as suítes.

**Registro histórico anterior à implementação do painel.** A evolução posterior nesta mesma data está em `docs/etapa-painel-2026-10-19.md` e no README atual. O ZIP de revisão exportado anteriormente continua sendo um retrato daquele momento; não foi reempacotado nesta etapa.

## 1. Projeto, objetivo e restrições

O ICEPLAY é um Trabalho de Conclusão de Curso de Ciência da Computação. Sua proposta é monitorar geladeiras comerciais: temperatura, abertura da porta, persistência das leituras, painel web, histórico e alertas para condições anormais.

A versão funcional completa deve ser entregue em **24/11/2026** e apresentada/validada em **01/12/2026**. A cada terça-feira o professor exige evolução concreta, executável e acompanhada de evidência. Código sem execução não basta.

O aluno ainda não dispõe de **ESP32, DS18B20 ou sensor magnético de porta**. Esses são os componentes previstos para a integração física futura. O professor ainda **não foi consultado sobre a aceitação do simulador como forma de validação da parte IoT**. Não houve ensaio físico, calibração, medição em geladeira ou avaliação de conservação de produtos.

O desenvolvimento contou com assistência do Codex; houve agentes auxiliares nas sessões anteriores. Essa assistência está registrada em `docs/uso-de-ia.md`. Não se atribui ao aluno uma implementação manual fictícia. O aluno precisa compreender, revisar, reproduzir e defender o que utilizar.

Restrições de desenvolvimento acordadas:

- Inspecionar a base antes de alterar e preservar o trabalho existente.
- Manter uma arquitetura coerente e justificar alterações importantes antes de implementá-las.
- Desenvolver incrementalmente e executar verificações reais.
- Não apresentar simulação como medição física nem inserir dados de exemplo automaticamente no banco de uso.
- Não inventar testes, referências científicas, resultados ou histórico de autoria.
- Instalar somente dependências necessárias.
- Fazer commits ou publicações somente após autorização explícita do aluno.
- Controle por voz e notificações externas são opcionais e não entram no trabalho prioritário.

## 2. Estado atual em uma frase

**Existe um protótipo local funcional com cadastro de geladeiras, recebimento persistente de leituras e simulador por terminal; falta a experiência completa de monitoramento, principalmente histórico/painel e alertas.**

| Componente | Situação atual |
| --- | --- |
| Ambiente, backend e conexão SQLite | Implementados e executados |
| Cadastro de geladeiras pela interface | Implementado e testado |
| API de ingestão e consulta de leitura por ID | Implementada e testada |
| Simulador pela mesma API | Implementado e executado nos testes |
| Temperatura/porta exibidas no painel | Não implementadas |
| Histórico com filtros e paginação | Não implementado |
| Regras, armazenamento e consulta de alertas | Não implementados |
| Detecção de ausência de leituras | Não implementada |
| Hardware/firmware | Não implementados nem ensaiados |
| Login/autenticação de dispositivos | Não implementados |
| Publicação/hospedagem/CI | Não configuradas |
| Git local | Inicializado, zero commits e nenhum remoto na conferência |
| TCC/artigo formais | Não encontrados nesta pasta; pode existir material fora dela |

## 3. Histórico do trabalho realizado

| Data | Trabalho e evidências |
| --- | --- |
| 13/10 | Inspeção do ambiente e base inicial: aplicação, SQLite, entidade Geladeira, migration inicial, página navegável, saúde real, scripts de instalação/execução/verificação, planejamento, fontes UML e registro de IA. |
| 15/10 | CRUD de geladeiras na API e interface, validação, tratamento de erros, testes HTTP/persistência, evidências e README. |
| 17/10 | Nova revisão e execução do CRUD; parametrização da pasta de evidências e correção da mensagem de cancelar edição. Início da implementação de leituras/simulador e geração da migration aditiva. |
| 19/10 | Verificação específica da ingestão/simulador, atualização de banco com dados anteriores, proteção do histórico, SQL de criação executado em banco isolado, backup e migração do banco normal, auditoria e adequação ao cronograma oficial recebido. |

O cronograma escolar começou em setembro, mas os registros locais acima não comprovam entregas em setembro. Não existem commits retroativos nem aprovação do professor registrada para essas entregas.

## 4. Arquitetura e ferramentas

Uma única aplicação **ASP.NET Core Web API** hospeda os controllers e os arquivos estáticos de **HTML, CSS e JavaScript**. O navegador usa HTTP no mesmo endereço. Controllers utilizam o `IceplayDbContext`; o EF Core persiste no arquivo SQLite. O simulador faz requisições HTTP à API, sem acesso direto ao banco.

```text
Navegador (HTML/CSS/JavaScript) ──HTTP──> ASP.NET Core
Simulador PowerShell ───────────HTTP──> ASP.NET Core ──EF Core──> SQLite
ESP32 futuro ──────────────────HTTP──> mesma API (ainda não integrado)
```

Não há microserviços, broker MQTT, frontend com framework, ORM adicional ou camadas de serviço vazias. O processamento de alertas ainda não existe.

Versões fixadas/testadas:

| Ferramenta | Versão/finalidade |
| --- | --- |
| Sistema de desenvolvimento | Windows 10 x64 |
| PowerShell | 7.6.5 testado; scripts de verificação exigem 7.5+ |
| SDK .NET | 10.0.401, instalado localmente em `.tools/dotnet` |
| Framework alvo | `net10.0` |
| EF Core SQLite e Design | 10.0.12, os dois únicos pacotes NuGet diretos |
| Ferramenta local dotnet-ef | 10.0.12 |
| Python | 3.14.3 testado; biblioteca padrão sqlite3 nos verificadores |
| SQLite do Python | 3.50.4 registrada nos testes; não assumir que identifica a biblioteca nativa do provedor .NET |
| Node.js | 24.14.0 utilizado para checagens sintáticas JavaScript; não é dependência da aplicação |
| Git | 2.53.0.windows.1 registrado no ambiente |

`global.json`, manifesto de ferramentas e `packages.lock.json` fixam as versões. O instalador do SDK confere SHA-512 do arquivo baixado. O projeto não precisa de Node/Python para funcionar; a suíte de leituras e a inspeção independente SQLite utilizam Python. A interface não usa bibliotecas externas.

A URL local é `http://localhost:5080`. O uso configurado é localhost, HTTP e instância única. Isso não constitui uma implantação pública protegida.

## 5. Estrutura dos arquivos principais

```text
iceplay/
  Iceplay.slnx
  global.json
  NuGet.Config
  README.md
  .config/dotnet-tools.json
  src/Iceplay.Api/
    Iceplay.Api.csproj
    packages.lock.json
    Program.cs
    appsettings.json
    Properties/launchSettings.json
    Controllers/
      HealthController.cs
      GeladeirasController.cs
      LeiturasController.cs
    Contracts/
      SalvarGeladeiraRequest.cs
      GeladeiraResponse.cs
      CriarLeituraRequest.cs
      LeituraResponse.cs
    Models/
      Geladeira.cs
      Leitura.cs
      OrigemLeitura.cs
    Data/
      IceplayDbContext.cs
      DatabaseExceptionHandler.cs
    Migrations/
      20261013172101_InitialCreate.cs (+ designer)
      20261018023456_AddLeituras.cs (+ designer)
      IceplayDbContextModelSnapshot.cs
    wwwroot/
      index.html
      styles.css
      app.js
      geladeiras.js
  scripts/
    common.ps1
    install-dotnet.ps1
    setup.ps1
    run.ps1
    verify.ps1
    verify-geladeiras.ps1
    verify-leituras.ps1
    verify-database.py
  tools/simulator/enviar-leituras.ps1
  docs/
    ambiente.md
    planejamento.md
    cronograma-oficial.md
    uml.md
    contrato-leituras.md
    entrega-2026-10-13.md
    etapa-2026-10-15.md
    etapa-2026-10-17.md
    etapa-2026-10-19.md
    uso-de-ia.md
    sql/iceplay-criacao.sql
    evidencias/...
```

O arquivo de uso é `src/Iceplay.Api/data/iceplay.db`. SDK, bancos, backups, caches e binários são artefatos locais ignorados pelo Git. Não integram o pacote de revisão.

## 6. Modelo de dados implementado

### Geladeira

| Campo | Tipo C# | Regra |
| --- | --- | --- |
| Id | int | PK gerada pelo servidor |
| Nome | string | Obrigatório; até 100 unidades UTF-16 na API |
| Localizacao | string? | Opcional; até 200 unidades UTF-16 na API |
| CriadoEmUtc | DateTime | Criação gerada pelo servidor em UTC |

Nomes repetidos são aceitos. Os limites de tamanho são verificados antes do trim. Nome composto apenas de espaços é recusado; localização vazia/branca vira null. PUT substitui os campos editáveis; omitir localização a remove. ID/criação extras na requisição não alteram os valores do servidor.

### Leitura

| Campo | Tipo C# | Regra |
| --- | --- | --- |
| Id | int | PK gerada pelo servidor |
| GeladeiraId | int | FK obrigatória para geladeira existente |
| TemperaturaC | double | Número finito em graus Celsius |
| PortaAberta | bool | true: aberta; false: fechada |
| MedidoEmUtc | DateTime | Informado pelo emissor, validado como UTC |
| RecebidoEmUtc | DateTime | Gerado pela API no início da ação do controller |
| Origem | OrigemLeitura | Simulacao ou Hardware, armazenado como TEXT |

Uma geladeira tem zero ou muitas leituras. A FK usa `DeleteBehavior.Restrict`; não existe exclusão em cascata. Geladeira com qualquer leitura, inclusive de simulação, não pode ser excluída: a API retorna 409. A desativação de equipamentos e a política de retenção ainda não foram definidas. Não há rota para editar/excluir leituras.

Há índice `(GeladeiraId, MedidoEmUtc, Id)` e constraints de nulabilidade, origem, porta, identidade positiva, instantes e finitude técnica da temperatura. As constraints de Geladeira também limitam texto no SQLite. O contexto recompõe `DateTimeKind.Utc` ao ler timestamps persistidos. Diferenças entre contagem de texto do SQLite e do .NET devem ser consideradas em uma revisão.

Não existe entidade/tabela Alerta implementada.

## 7. Migrations e preservação

`20261013172101_InitialCreate` cria Geladeiras. `20261018023456_AddLeituras` acrescenta Leituras, FK, constraints e índice, sem recriar ou alterar Geladeiras. O snapshot foi atualizado; a migration inicial foi preservada.

A aplicação aplica migrations automaticamente somente em Development, no cenário local de uma instância. Não usa EnsureCreated. Em outros ambientes, o esquema precisa ser aplicado explicitamente.

Foi feito teste de atualização com uma geladeira inserida no banco da migration inicial antes de iniciar a aplicação atual; o cadastro permaneceu após upgrade/reinício. Antes da migração do banco normal em 19/10 foi criado backup SQLite consistente. Não houve seed automático.

`docs/sql/iceplay-criacao.sql` foi gerado pelo EF e executado em banco novo isolado, com integridade OK, duas migrations e tabelas de negócio vazias. O SQL de criação não deve ser executado em um banco existente com dados/tabelas; no uso normal o caminho é migrations. Conexões SQLite manuais devem habilitar `PRAGMA foreign_keys=ON`.

## 8. Endpoints existentes

| Método | Rota | Comportamento |
| --- | --- | --- |
| GET | /api/health | 200: saúde/contagem/UTC; 503 quando a consulta falha |
| GET | /api/geladeiras | 200: array completo ordenado por ID, sem paginação |
| GET | /api/geladeiras/{id} | 200: recurso; 404: ausente |
| POST | /api/geladeiras | 201: recurso criado e Location |
| PUT | /api/geladeiras/{id} | 200: recurso atualizado; 404: ausente |
| DELETE | /api/geladeiras/{id} | 204: excluído; 404: ausente; 409: possui leituras |
| POST | /api/leituras | 201: leitura e Location; 404: geladeira ausente |
| GET | /api/leituras/{id} | 200: leitura; 404: ausente |

Entradas inválidas/JSON malformado recebem 400; falhas reconhecidas de persistência recebem 503 genérico. Erros de validação usam ValidationProblemDetails e erros de recurso/conflito usam ProblemDetails. O health preserva seu JSON próprio. Detalhes internos são registrados em log, não enviados como SQL/caminho/exceção ao cliente.

**Limite da saúde atual:** faz COUNT(*) em Geladeiras. Comprova conexão e essa tabela, mas não é uma verificação completa de todas as tabelas, sensores ou funcionalidades.

Não existem rotas de coleção/histórico de leituras, última leitura por geladeira, alertas, autenticação, configuração de limites ou gestão de dispositivos.

## 9. Contratos e validações

Exemplo de entrada de cadastro, meramente ilustrativo:

```json
{"nome":"Geladeira principal","localizacao":"Área de vendas"}
```

A resposta contém id, nome, localizacao e criadoEmUtc.

Exemplo de entrada de leitura, meramente ilustrativo:

```json
{
  "geladeiraId": 1,
  "temperaturaC": 4.25,
  "portaAberta": false,
  "medidoEmUtc": "2026-10-19T12:00:00Z",
  "origem": "Simulacao"
}
```

Os cinco campos de leitura são obrigatórios; tipos anuláveis no DTO distinguem ausência de zero/false. Número JSON é obrigatório para ID/temperatura, sem aceitar números entre aspas. Porta precisa ser booleano. Temperatura precisa ser finita; **não existe faixa física ou limite de alerta definido**.

MedidoEmUtc aceita ISO 8601 com segundos, fração opcional de 1 a 7 casas e sufixo Z. Rejeita hora sem fuso, outros offsets, datas inválidas e medição posterior ao recebimento. A comparação com o relógio do servidor não tem tolerância configurada. Leituras atrasadas são aceitas.

ID e recebidoEmUtc são controlados pelo servidor; propriedades extras para alterá-los são ignoradas. A resposta tem sete campos: id, geladeiraId, temperaturaC, portaAberta, medidoEmUtc, recebidoEmUtc e origem. Datas de resposta são UTC.

Origem exige exatamente Simulacao ou Hardware, com essa capitalização. **Hardware é uma declaração do cliente, sem autenticação e sem comprovar sensor físico.** Há fixture de software com esse rótulo para testar o contrato; ela não representa medição real.

Há tratamento defensivo para desaparecimento concorrente da geladeira e violações de FK. Isso não equivale a uma avaliação de carga/concorrência representativa nem a garantia de ausência de todas as corridas.

## 10. Interface atual

É uma página com navegação por seções, apresentação do projeto, estado real da API/SQLite e área de geladeiras. O cadastro oferece formulário, lista, detalhes, edição, cancelamento e confirmação de exclusão. Os textos informam o que está disponível e o que permanece futuro.

Os dados são consultados da API. O JavaScript apresenta carregamento, lista vazia, validação e falhas; evita mutações simultâneas pela tela e avisa sobre resultado incerto após timeout. A saúde é consultada novamente depois de alterações, sem calcular uma contagem fictícia a partir dos cartões. Conteúdo de cadastros é inserido com textContent.

O layout foi inspecionado em desktop e viewport de 375px em 17/10. Isso não é homologação universal. O novo aviso de DELETE 409 está no código e a API foi testada; sua conferência visual de 19/10 ficou pendente por bloqueio da política de acesso do navegador.

**Lacuna principal do produto:** a página ainda não exibe temperatura, porta, evolução temporal, filtros, última leitura, origem por amostra ou alertas. Sua aparência atual é de apresentação/cadastro. O fluxo de monitoramento ainda precisa ficar acessível ao usuário.

## 11. Simulador implementado

Arquivo: `tools/simulator/enviar-leituras.ps1`.

```powershell
.\tools\simulator\enviar-leituras.ps1 -GeladeiraId 1 -Quantidade 3 -IntervaloSegundos 1 -TemperaturaC 4.25
```

É necessário cadastrar a geladeira antes e usar seu ID. O script aceita ApiUrl, GeladeiraId obrigatório, Quantidade de 1 a 1000, IntervaloSegundos de 0 a 3600, TemperaturaC finita e o switch PortaAberta. Padrões: uma leitura, intervalo de um segundo, 4 graus Celsius e porta fechada.

Envia valores constantes configurados, marca sempre Simulacao e produz o horário UTC a cada envio. Não há geração automática de cenários, variação térmica, aleatoriedade, falha de sensor, porta prolongada ou interrupção programada implementadas.

Usa POST /api/leituras e retorna indice, statusHttp, location e leitura. O timeout é 10 segundos; rede/erro interrompe o script sem retry automático, pois a resposta pode ter sido perdida após gravação. Não há chave de idempotência, buffer offline, deduplicação ou reconciliação automática de envios.

Não acessa SQLite diretamente, não cria geladeiras e não permite selecionar Hardware como origem. Os valores são testes de software.

## 12. Verificações realmente registradas

Os verificadores são scripts PowerShell de integração HTTP e Python/sqlite3. Não há projeto de testes xUnit/NUnit/MSTest, cobertura percentual ou pipeline CI configurados.

| Verificação | Resultado registrado | Local |
| --- | --- | --- |
| Build da suíte de leituras, 19/10 | Zero avisos e erros | docs/evidencias/2026-10-19/build.log |
| Base, última rodada registrada em 17/10 local | 13 verificações aprovadas | docs/evidencias/2026-10-17-leituras/base/smoke-latest.json |
| Cadastro com migrations atuais, 17/10 local | 807 asserções, 177 requisições registradas, passed | docs/evidencias/2026-10-17-leituras/cadastro/crud-api.json |
| Leituras/simulador, 19/10 | 339 asserções, 75 requisições registradas, passed | docs/evidencias/2026-10-19/leituras-api.json |
| SQLite independente, 19/10 | 12 verificações aprovadas | docs/evidencias/2026-10-19/database.json |
| Navegador, 17/10 | 15 verificações aprovadas | docs/evidencias/2026-10-17/browser.json |
| SQL de criação, 19/10 | Script aplicado em banco isolado, integridade OK e duas migrations | docs/evidencias/2026-10-19/sql-creation.json |

807/339 são asserções de campos, cabeçalhos e estado, não quantidades de cenários independentes, funcionalidades ou experimentos físicos. Os relatórios guardam timestamps UTC; pastas de 17/10 podem conter UTC de 18/10 por diferença de fuso.

Os cenários incluem CRUD, 400 para entradas inválidas, 404 para IDs ausentes, 409 ao excluir com histórico, 503 por falha controlada, identidade/timestamps do servidor, zero/false válidos, origem/tipo estritos, leitura atrasada, rejeição de futuro, upgrade preservando cadastro, integridade/FK e persistência após encerrar/reiniciar processos reais. O simulador foi executado e suas leituras consultadas pela API.

O banco isolado da suíte de leituras termina com uma geladeira fixture e quatro leituras fixture, duas enviadas pelo simulador. As fixtures foram preservadas como evidência, sem inserir no banco normal. Outros scripts removem suas próprias fixtures conforme o relatório.

Na comparação de preservação foram conferidos 71 arquivos do conjunto selecionado: 69 idênticos e dois testes com atualização prevista para reconhecer a nova migration; zero mudanças inesperadas nesse conjunto. Isso não é uma auditoria de todos os arquivos possíveis da máquina.

Houve problemas reais na preparação dos testes: a primeira tentativa do CRUD interpretou byte[] de ProblemDetails incorretamente e foi corrigida com decodificação UTF-8; seu relatório failed foi preservado. Uma asserção de navegador ocorreu antes de concluir o carregamento assíncrono e foi repetida após aguardar o elemento correto. A inspeção visual nova de 19/10 foi bloqueada e não foi declarada aprovada.

## 13. Executar e reproduzir

Na pasta do projeto, PowerShell 7:

```powershell
# Somente em uma cópia sem o SDK local:
.\scripts\install-dotnet.ps1
# Preparar e iniciar:
.\scripts\setup.ps1
.\scripts\run.ps1
```

Abra `http://localhost:5080`. Mantenha o terminal aberto; Ctrl+C encerra. O banco persiste após reinício. Para conferir saúde: GET `http://localhost:5080/api/health`.

Encerre a aplicação antes de recompilar/testar, porque o Windows pode bloquear o executável em uso. Use uma pasta de evidências nova para não sobrescrever os registros anteriores. Os comandos abaixo são instruções para uma nova execução, não afirmação de que essa pasta já contém resultados:

```powershell
.\scripts\verify.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/base
.\scripts\verify-geladeiras.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/cadastro
.\scripts\verify-leituras.ps1 -EvidenceDirectory docs/evidencias/nova-revisao/leituras

$base = Get-Content docs/evidencias/nova-revisao/base/smoke-latest.json -Raw | ConvertFrom-Json -DateKind String
python scripts/verify-database.py $base.isolatedDatabase
```

Os scripts usam suas próprias portas/processos e bancos em `.tools/verification`. Em uma cópia nova do projeto é necessário setup antes dos verificadores que compilam com --no-restore. A suíte de leituras depende também de Python disponível no comando python.

## 14. Cronograma oficial e metas internas

| Data | Etapa do professor |
| --- | --- |
| 22/09 | Planejamento: escopo, funcionalidades, tecnologias e organização |
| 29/09 | Ambiente: projeto, estrutura, Git/GitHub e primeiro commit |
| 06/10 | Banco: modelo, tabelas, PK/FK, relacionamentos e SQL |
| 13/10 | Estrutura: tela inicial, navegação, rotas, backend e conexão |
| 20/10 | Funcionalidade I: primeira função essencial, persistência e validação |
| 27/10 | Funcionalidade II: demais prioridades, CRUD/regras/validações |
| 03/11 | Integração: fluxo completo UI/backend/banco |
| 10/11 | Testes: cenários válidos/inválidos, falhas, correções e evidências |
| 17/11 | Refinamento: interface, usabilidade, desempenho e segurança |
| 24/11 | Versão completa, documentação, instruções e evidências |
| 01/12 | Apresentação e validação final |

Meta interna atual: demonstrar cadastro em 20/10; histórico/interface de dados e regras essenciais de alerta até 27/10; fluxo completo integrado até 03/11. Reservar 10/11 para testes/correções e 17/11 para refinamento. São metas a revisar conforme disponibilidade e aceite do escopo, não garantia de prazo/aprovação.

O plano antigo, elaborado antes de receber o cronograma, previa alertas em 10/11. Essa distribuição foi substituída porque consumiria a semana destinada aos testes. `docs/cronograma-oficial.md` é a referência atual; `docs/planejamento.md` conserva a análise original com aviso de atualização.

## 15. Documentação acadêmica e pendências

Há README, ambiente, requisitos/modelo planejado, cronograma, fontes UML, contrato de leituras, SQL, relatórios de etapas, evidências e declaração de IA. Os diagramas Mermaid/PlantUML são fontes; não foi executado renderizador PlantUML nem alegada renderização completa de todas as fontes. Os diagramas históricos de 13/10 não devem ser confundidos com componentes implementados; o contrato atual contém classes/sequência de ingestão.

Ainda é necessário consolidar os diagramas finais, requisitos rastreados a testes, metodologia, resultados/limitações e documentos formais do TCC/artigo. Não foram encontradas versões formais DOCX/PDF/TEX nesta pasta. Não há revisão bibliográfica científica concluída comprovada; referências técnicas existentes não devem ser tratadas como bibliografia científica suficiente.

Pendências prioritárias:

1. Confirmar com o professor como validar a IoT sem hardware e o que será obrigatório na apresentação.
2. Preparar o primeiro commit real e GitHub quando houver autorização, sem retroagir datas/autoria.
3. Implementar histórico com filtros, paginação e ordem temporal, seguido de monitoramento na interface.
4. Definir limites de temperatura e tolerâncias de porta/ausência com justificativa e identificação de parâmetros de protótipo.
5. Implementar persistência/consulta de alertas, deduplicação e resolução, incluindo início esperado do monitoramento e tratamento de origem.
6. Planejar autenticação/HTTPS antes de exposição externa ou comunicação física pela rede; avaliar confiabilidade de origem, retry e relógios.
7. Evoluir testes de fluxo completo, recuperação/falhas e avaliação de desempenho com volume identificado como teste.
8. Escrever, revisar e preparar a defesa em paralelo ao software.

Não foi implementado envio de e-mail/WhatsApp, controle por voz, relatórios avançados, cadastro de usuários, firmware, MQTT, hospedagem ou funções preditivas.

## 16. Pedido para a IA revisora

Analise este retrato e, se disponível, o pacote com código/evidências. Quero uma avaliação crítica para melhorar um TCC viável até as datas informadas. Aponte fatos confirmados, inferências e informações que faltam. Não trate funções planejadas como existentes e não alegue ter executado testes sem executá-los.

Peço que a resposta cubra:

1. Qualidade e limitações reais do protótipo atual, com exemplos concretos no código quando possível.
2. MVP adequado de monitoramento de geladeiras, com critérios de aceite claros e prioridades obrigatórias/desejáveis/opcionais.
3. Evolução do histórico, filtros, paginação, última leitura e identificação de dados antigos/sem dados, mantendo simulação explícita.
4. Regras e modelo de alertas para temperatura, porta e ausência; resolução/deduplicação e comportamento com atraso, reordenação e origens diferentes.
5. Melhorias de interface que mostrem o valor do monitoramento, com fluxo de uso e estados honestos, sem dados físicos inventados.
6. Revisão de UTC, medição futura, confiança na origem, finitude versus plausibilidade de temperatura, FK/exclusão e retenção.
7. Riscos de falta de idempotência, indisponibilidade, relógios, concorrência e exposição de rede; indicar o que é necessário agora e o que pode esperar.
8. Lacunas dos testes existentes e próximos testes de maior valor; não inferir cobertura apenas da contagem de asserções.
9. Plano semanal realista até 24/11 e roteiro de apresentação para 01/12, com dependências e pontos para renegociar com o professor.
10. Como estruturar metodologia, evidências, UML, trabalho escrito e artigo sem fabricar experimentos, referências ou autoria.

Preserve a stack atual como ponto de partida. Justifique qualquer mudança importante de tecnologia/camada/dependência por necessidade concreta, custo e impacto no prazo. Para cada melhoria prioritária, informe problema resolvido, benefício, esforço relativo, dependências, critério verificável e momento recomendado. Priorize uma análise antes de propor uma reescrita ou gerar todo o sistema.

## 17. Conteúdo e limites do pacote de revisão

O ZIP acompanha código-fonte, configurações do projeto, scripts, documentação e evidências existentes. Há uma cópia deste contexto na raiz como LEIA-ME-REVISAO.md e manifesto de arquivos com SHA-256.

Foram omitidos SDK/cache, binários, bancos/backups, metadados .git e arquivos pessoais sem relação com ICEPLAY presentes na raiz do workspace. O pacote foi criado localmente; não foi enviado automaticamente a outra IA ou serviço. Relatórios e logs históricos podem conter caminhos do computador e fixtures identificadas. Os documentos datados mais antigos continuam sendo registros históricos, não um segundo estado atual concorrente.

O texto é um retrato para revisão, não aprovação do orientador, auditoria de segurança ou comprovação de sensores físicos. O código e as evidências anexos permitem conferir suas afirmações e propor melhorias com esse limite.
