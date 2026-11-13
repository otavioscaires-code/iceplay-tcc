# ICEPLAY Sistema IoT para monitoramento de geladeiras comerciais

Universidade Paulista UNIP

Curso de Ciência da Computação

Autor {{AUTOR}}

RA {{RA_PRIVADO}}

Orientador {{ORIENTADOR}}

Campus {{CAMPUS}}

{{ANO}}

**Minuta para revisão acadêmica.** Este texto registra software executado e firmware compilado. Resultados físicos e conclusão definitiva serão preenchidos após os ensaios. Não representa aprovação da banca ou conformidade de paginação Word.

## Resumo provisório

Este trabalho apresenta o desenvolvimento do ICEPLAY, um protótipo de monitoramento de geladeiras comerciais com interface web responsiva. O sistema registra temperatura e estado da porta, identifica a origem das amostras e armazena separadamente os instantes de medição e recebimento. A solução emprega ASP.NET Core, Entity Framework Core, SQLite e frontend em HTML, CSS e JavaScript, reunidos em uma aplicação local. Foram implementados cadastro de equipamentos, histórico paginado, painel, configurações por geladeira, episódios de alertas e credenciais para ingestão de dispositivos. O desenvolvimento utiliza verificação incremental de contratos HTTP, restrições de persistência, reinício e regras temporais. Um simulador envia amostras identificadas à mesma API destinada ao equipamento físico. O firmware para ESP32, DS18B20 e contato magnético foi compilado, mas a montagem e a aquisição física ainda aguardam ensaio. Os resultados disponíveis demonstram os comportamentos de software exercitados pelos verificadores e preservação dos registros existentes. Não permitem concluir precisão térmica, disponibilidade em campo ou redução de perdas. A etapa física possui protocolo próprio para registrar condições, falhas e evidências antes da conclusão final.

Palavras chave Internet das Coisas; monitoramento; refrigeração; API; sistemas embarcados.

## Abstract provisional version

This work presents ICEPLAY, a prototype for monitoring commercial refrigerators through a responsive web interface. The system records temperature and door state, identifies sample provenance, and stores measurement and reception timestamps separately. The implementation uses ASP.NET Core, Entity Framework Core, SQLite, and a static HTML, CSS, and JavaScript frontend within a local application. Implemented features include equipment management, paginated history, a dashboard, per refrigerator settings, alert episodes, and device credentials. Development follows incremental verification of HTTP contracts, persistence constraints, restarts, and time dependent rules. A simulator submits explicitly labelled samples to the same API intended for the physical device. Firmware targeting an ESP32, a DS18B20 probe, and a magnetic contact has been compiled; assembly and physical acquisition still require testing. Available results demonstrate the software behaviours exercised by the verification programs and preservation of existing records. They do not establish thermal accuracy, field availability, or reduction of losses. A separate physical test protocol defines the conditions, failures, and evidence to record before the final conclusions are completed.

Keywords Internet of Things; monitoring; refrigeration; API; embedded systems.

## 1 Introdução

O acompanhamento de uma geladeira exige interpretar valores de temperatura em conjunto com o momento de aquisição, a posição da sonda e o estado observado da porta. Um valor isolado pode permanecer na tela mesmo quando o emissor deixa de transmitir. A apresentação precisa distinguir informação recente, amostra atrasada e ausência de dados, para apoiar a consulta sem atribuir ao sistema observações que não foram realizadas.

O ICEPLAY foi definido como um protótipo acadêmico que reúne aquisição prevista por sensores, comunicação HTTP, persistência e consulta pelo celular. O cenário de implantação considera um computador executando a aplicação e dispositivos na mesma rede local. O projeto não parte de uma pesquisa realizada em estabelecimento específico nem de uma medição demonstrada de perdas comerciais. Seu resultado inicial é um artefato de software verificável, seguido de validação física documentada.

### 1.1 Problema de pesquisa e desenvolvimento

Como implementar e verificar um sistema de monitoramento de geladeiras que preserve a origem e os instantes das leituras, permita consulta pelo celular e registre ocorrências de temperatura, porta e ausência, mantendo a distinção entre simulação, emissor autenticado e sensor fisicamente validado?

Essa pergunta exige mais que receber um número. A aplicação precisa validar entradas, manter relacionamentos, sobreviver a reinícios, limitar o acesso do dispositivo e evitar que repetições ou atrasos criem uma situação operacional fictícia. A validação física também deve examinar o percurso completo, e não apenas observar um LED ou uma resposta serial.

### 1.2 Objetivos

O objetivo geral é desenvolver e validar o protótipo ICEPLAY para monitoramento de temperatura e estado da porta de uma geladeira, com persistência e interface web acessível pelo celular.

Os objetivos específicos são:

1. Cadastrar equipamentos e manter registros persistentes com integridade referencial.
2. Definir e verificar contrato de ingestão com origem e dois instantes UTC.
3. Disponibilizar painel e histórico com filtros, tabela, gráfico e paginação.
4. Persistir parâmetros por equipamento e avaliar regras/episódios de alerta sem duplicação.
5. Autorizar o emissor vinculado e permitir repetição segura de uma medição identificada.
6. Preparar firmware, montagem e ensaio real com ESP32, DS18B20 e contato magnético.
7. Registrar testes, decisões, limitações e assistência de IA de forma rastreável.

### 1.3 Justificativa e delimitação

O projeto integra conteúdos de desenvolvimento web, bancos de dados, sistemas embarcados, comunicação e testes. A escolha de um serviço local e frontend estático permite concentrar a implementação no fluxo dos dados e nas regras. O acesso pelo Safari atende à consulta no iPhone sem exigir aplicativo nativo.

O escopo é monitoramento e gestão de parâmetros. Não inclui acionamento elétrico do compressor, diagnóstico de segurança alimentar, notificações externas, nuvem pública ou aplicação multiusuário. Voz foi retirada do MVP por decisão de escopo. Os limites operacionais serão definidos conforme a geladeira e o uso, com o orientador; valores de teste não são recomendações sanitárias.

### 1.4 Método e organização

O trabalho utiliza desenvolvimento aplicado de protótipo, com leitura bibliográfica de apoio, especificação, modelagem e validação incremental. Cada incremento acrescenta um conjunto delimitado, executa verificadores e registra resultados no Git, sem fabricar histórico anterior. Ensaios de software usam bancos isolados. A simulação é explicitamente identificada. A etapa física segue protocolo próprio e permanece pendente nesta minuta.

As seções seguintes apresentam fundamentos, projeto, implementação e resultados disponíveis. A conclusão é parcial até a execução física. As entregas institucionais informadas são versão completa em 24/11/2026 e apresentação em 01/12/2026.

## 2 Fundamentação e trabalhos relacionados

### 2.1 Sensoriamento conectado

Gubbi et al. (2013) discutem a ligação entre sensores conectados e compartilhamento de informação em IoT. No ICEPLAY, isso é organizado em aquisição, transporte, persistência e apresentação. A arquitetura local escolhida não reproduz a infraestrutura de nuvem discutida naquele trabalho; atende ao alcance definido para o protótipo.

Badia-Melis et al. (2018) apresentam tecnologias e limitações de monitoramento em cadeias frias, destacando que sua adequação depende da aplicação. O ICEPLAY recorta esse contexto para uma geladeira e dois sinais, sem afirmar cobertura de toda uma cadeia logística ou representar a temperatura de todos os produtos armazenados.

Esses textos servem de fundamentação inicial, não de comparação experimental entre produtos. A seleção, os metadados e o escopo de leitura consultado estão registrados nas referências. A revisão bibliográfica deve ser discutida com o orientador antes da versão final.

### 2.2 Dado medido e contexto temporal

Um instante de aquisição informado pelo emissor e um instante de chegada produzido pela API possuem responsabilidades diferentes. Separá-los permite observar atraso de transmissão. A API não corrige silenciosamente uma medição futura: recusa o pedido e preserva a necessidade de verificar os relógios.

Também é necessário distinguir ausência de dados de uma condição normal. Uma porta registrada como fechada anteriormente não garante que continua fechada durante uma interrupção. Por isso, a interface apresenta idade/origem, e o motor interrompe a sequência de porta diante de uma lacuna definida. Essa decisão é parte da interpretação do protótipo, cuja resolução temporal deve ser discutida no ensaio físico.

### 2.3 Persistência e comunicação

As entidades representam os registros do domínio; os contratos HTTP limitam o que o cliente pode determinar. Chaves estrangeiras preservam vínculos e impedem remover histórico por exclusão de equipamento. Migrations registram a evolução do esquema, permitindo verificar preservação por comparação de campos e identificadores.

HTTP é utilizado para operações de cadastro, ingestão e consulta. Códigos diferentes permitem distinguir entrada inválida, recurso inexistente, conflito e indisponibilidade. A idempotência da medição autenticada é uma regra explícita: o UUID identifica o evento de aquisição e seu reenvio não deve criar outro evento.

### 2.4 Segurança e limites da identidade

No modo móvel, o operador usa HTTPS, sessão e proteção CSRF. O dispositivo usa outro mecanismo, com segredo aleatório vinculado a uma geladeira e escopo de envio. O banco mantém somente hash desse segredo, e a emissão o exibe uma única vez. A RFC 6750 fundamenta os cuidados de transporte de uma credencial por posse; o protótipo não implementa servidor OAuth.

Autenticar o emissor não confirma que ele leu um sensor real nem que a medição é exata. A evidência física exige identificar montagem, condições e resultado observado. A configuração da placa contém segredo e pertence ao ambiente privado, assim como o banco de uso e os backups.

## 3 Projeto do sistema

### 3.1 Requisitos e regras

Os requisitos RF01–RF13 preservam a organização inicial: saúde, interface, equipamentos, ingestão, timestamps, origem, histórico, painel, regras, ausência, episódios, simulador e integração física. Configurações, credencial/idempotência e acesso móvel foram explicitados como RF14–RF16. A matriz de rastreabilidade associa implementação, verificador e situação, inclusive itens que continuam sem validação física/visual.

As regras centrais incluem temperatura fora de limites inclusivos, duração de porta confirmada por medições e ausência avaliada periodicamente. A idade da medição foi escolhida para ausência, evitando que upload antigo renove a informação. Limites/tempos são obrigatórios em configuração e não são presumidos. A origem monitorada é única por equipamento nesta versão.

Um episódio permanece aberto durante evidências da mesma condição. Recuperação permite novo episódio posterior. Encerramentos por normalização, ausência de dados, alteração de configuração e desativação são distintos. Assim, desativar não equivale a demonstrar uma temperatura normal. A gravidade é classificação de software do protótipo, sem validade sanitária presumida.

### 3.2 Arquitetura

Uma aplicação ASP.NET Core hospeda API e arquivos estáticos. Controllers recebem contratos validados; o DbContext acessa o SQLite. O avaliador de alertas roda no mesmo processo, a cada segundo. O navegador consulta a API e não acessa o arquivo de banco. Simulador e firmware compartilham a rota de ingestão, com origens e autorização apropriadas.

Essa organização evita serviços externos desnecessários ao MVP e torna a execução local reproduzível. Existe uma instância e um banco de arquivo. Migrations automáticas são limitadas a Development; outro ambiente exige aplicação explícita. O desenho não promete implantação distribuída ou alta disponibilidade.

### 3.3 Modelo de dados

| Entidade | Responsabilidade |
| --- | --- |
| Geladeira | Identidade, nome, localização e criação |
| Leitura | Temperatura, porta, origem, dois instantes e vínculo opcional de emissor/UUID |
| ConfiguracaoGeladeira | Faixa, tempos, origem, ativação e instantes de acompanhamento |
| Alerta | Episódio, gravidade, evidências, encerramento/motivo e cópia dos parâmetros |
| EstadoMonitoramento | Checkpoint e sequência de porta persistidos |
| Dispositivo | Vínculo, nome, hash da credencial, criação e revogação |

O registro de leituras e alertas restringe a exclusão do equipamento. A configuração é única por geladeira. Índices únicos parciais protegem episódio aberto, dispositivo ativo e medição identificada. Campos novos de emissor são anuláveis para preservar registros anteriores. As cinco migrations e o SQL para banco novo estão versionados; não se recria o banco para corrigir uma atualização.

### 3.4 Contratos e interface

As famílias de rotas abrangem saúde, geladeiras, configuração, leituras, monitoramento, alertas, dispositivos e acesso. Os contratos documentam JSON, regras, instantes e respostas. O dispositivo recebe apenas permissão de POST de sua geladeira; não utiliza a sessão do operador.

Visão geral, Geladeiras, Histórico, Alertas e Configurações possuem HTML/URL próprios. Acesso e Sobre são páginas auxiliares. O menu adapta-se ao celular e a identidade Black & Ice Blue é compartilhada. O gráfico usa somente os pontos da página; a tabela mantém valores e horários. Erros não deixam uma lista anterior como se fosse consulta atual confirmada.

### 3.5 Modelagem e critérios de aceite

Casos de uso, classes/cardinalidades, componentes, sequência e estados estão em `docs/modelagem-atual.md`, acompanhados de figuras e fontes. Critérios de software são rastreados aos verificadores. A integração física só será aceita após o percurso completo sensor/API/banco/interface ser documentado; não basta compilar a placa.

## 4 Desenvolvimento e resultados disponíveis

### 4.1 Implementação incremental

O repositório preserva etapas documentadas de base, cadastro, leituras, painel, histórico, páginas, configurações, alertas, autenticação e firmware. O histórico Git foi iniciado efetivamente em 30/10; não foram criados commits retroativos para atividades anteriores. Em 12/11, os incrementos de alertas, interface e dispositivo foram testados/publicados separadamente; o firmware foi compilado e seu relatório fechado em 13/11.

O build usa SDK .NET 10.0.401 e pacotes EF Core 10.0.12 fixados. As verificações HTTP criam SQLite isolado e exercitam entradas válidas/inválidas, inexistência, restrições, falha de banco e persistência. Regras temporais possuem programa C# com relógio controlado; a API não expõe rota para mudar o tempo. Os testes Node executam lógica e clientes com DOM/fetch controlados, sem serem apresentados como Safari.

### 4.2 Resultados de software

| Conjunto executado em 12–13/11 | Resultado registrado |
| --- | --- |
| Build .NET | Sucesso, zero avisos e erros |
| CRUD | 807 verificações e 177 requisições registradas |
| Leituras | 339 e 75 |
| Histórico | 145 e 68 |
| Painel | 70 e 29, além do simulador |
| Configurações | 153 e 67, além de dois PUTs concorrentes |
| Alertas | 31 verificações com relógio controlado; HTTP 91 e 67 na rodada final de 13/11 |
| Dispositivo | 84 e 55, incluindo configuração, ingestão autenticada e consulta de alerta/painel |
| Rede móvel | 139 e 102, com TLS e cliente de dispositivo sem cookie |
| Páginas | 207 e 47 |
| JavaScript | 112 testes passaram, zero falhas |

Essas contagens são verificações dos programas e não porcentagem de cobertura ou quantidade de funcionalidades independentes. Rodadas interrompidas foram preservadas e corrigidas/repetidas; os relatórios explicam diferenças de esquema, ajustes do coletor e limites. Os caminhos completos de evidência estão nos relatórios de etapa do repositório.

No banco de uso, a atualização para cinco migrations preservou uma geladeira e três leituras Simulacao, com hash dos campos históricos igual nos backups anteriores/posteriores. Não foram inseridos parâmetros, credenciais ou medições físicas automaticamente. A aplicação foi executada com consulta real de saúde e rotas, mantendo HTTPS e exigência de sessão na rede.

### 4.3 Firmware preparado

O firmware usa ESP32 clássico, DS18B20 e contato magnético, com GPIOs lógicos documentados. A amostragem nominal é 10 segundos, há debounce e conversão não bloqueante. A conexão utiliza WiFi, SNTP, validação de CA e UUID no reenvio. O buffer conserva uma amostra em RAM por até 30 segundos; não promete histórico offline completo.

Foram compilados o exemplo desabilitado e uma cópia isolada com configuração sintética habilitada. O perfil configurado apresentou 47708 bytes de RAM estática e 929469 bytes de aplicação flash segundo o compilador. Houve dois avisos na biblioteca OneWire, sem falha de compilação. Não houve medição de consumo dinâmico, gravação, aquisição de sensor ou comunicação de uma placa real.

### 4.4 Acesso pelo iPhone

Em 09/11, o aluno confirmou uso parcial no iPhone, e foto posterior mostrou tabela/gráfico com três leituras de simulação. Essa confirmação é distinta dos testes HTTP e das novas telas. Alertas, configuração, credenciais, orientações/teclado e refinamentos posteriores ainda precisam de conferência visual. A ferramenta de navegador esteve indisponível nesta continuação; não foi criada captura fictícia.

### 4.5 Ensaio físico e discussão a completar

**Pendente de execução real.** Registrar identificação das peças, montagem, polaridade, posição da sonda, geladeira, parâmetros, período, série adquirida, interrupções e recuperação. O protocolo F01–F12 cobre USB, sensores, TLS/UTC, ponta a ponta, regras, ausência, reinício e revogação. Para cada caso, anexar observado, evidência e resultado, incluindo falhas/retestes.

Se houver comparação térmica, identificar o instrumento e seu estado de calibração conhecido, sincronização e condições. Sem referência apropriada não declarar calibração nem erro máximo experimental. Discussão deve considerar amostragem, polling atrasado durante HTTP, buffer limitado, falhas de energia/rede e período em que a API não estava executando. Não extrapolar observações de uma geladeira para uso comercial geral.

### 4.6 Assistência de IA e rastreabilidade

Ferramentas de IA auxiliaram análise, implementação, testes e redação, conforme registro em `docs/uso-de-ia.md`. Não se atribui ao aluno histórico de escrita manual inexistente. Cabe ao autor revisar código/texto, reproduzir os comandos, verificar as referências e explicar decisões/limitações na defesa. Logs de teste e simulação não serão apresentados como medições de sensores.

## 5 Conclusão parcial

Os verificadores executados sustentam o funcionamento dos fluxos de software descritos: persistência, contratos, navegação, regras e comunicação autenticada. A preparação inclui firmware compilado e protocolo para a etapa física. O objetivo geral permanece dependente da integração e validação com o conjunto real, da conferência móvel complementar e da análise dos resultados.

A conclusão final deve indicar o que os ensaios efetivamente demonstraram, quais casos falharam e quais limitações permaneceram. Não há base nesta minuta para afirmar precisão térmica obtida, disponibilidade contínua ou redução de perdas. Trabalhos futuros podem abordar fila offline persistente, múltiplos operadores e notificações externas; voz não integra o MVP entregue.

## Referências e apêndices

As referências verificadas estão em `referencias.md`; aplicar sua padronização final no documento de entrega. Apêndices técnicos: matriz de requisitos, modelagem, contratos, scripts de verificação, montagem/protocolo e relatórios. Acrescentar somente imagens/dados realmente obtidos e conferir o sumário/listas/paginação no Word antes de submeter.
