# Integração física do ICEPLAY em bancada — 25/11/2026

O ESP32 executou o firmware principal e enviou temperaturas reais da DS18B20 e estados do contato magnético à API por HTTPS, com credencial vinculada. Leituras foram correlacionadas com o SQLite e observadas no painel/histórico desktop. O contato passou por fechado → aberto → fechado; o aquecimento e o resfriamento da sonda também foram observados. Os episódios de porta e temperatura encerraram por normalização. **O incremento posterior abaixo registra um ciclo funcional instalado em geladeira doméstica. Refrigeração ativa e ambiente da apresentação têm critérios próprios; a primeira janela térmica com o equipamento desligado foi preservada com essa correção.**

## Programa e comunicação

A gravação foi autorizada explicitamente pelo aluno. [Primeira gravação](evidencias/2026-11-25-firmware-principal/20261125T222758Z-gravacao/gravacao.json): saída 0 e quatro segmentos verificados. O primeiro ensaio confirmou boot/Wi-Fi/temperatura, mas falhou na validação X509: [dois valores de 27,25 °C, oito HTTP −1 e zero leituras na API](evidencias/2026-11-25-firmware-principal/20261125T222943Z-serial-inicial/serial.json). Essa falha permanece preservada.

A [correção de compatibilidade TLS](decisao-tls-esp32-2026-11-25.md) manteve certificado, CA, verificação de identidade e credencial. O nome lógico `localhost`, presente no certificado, é roteado explicitamente para o IP do computador no firmware; não representa loopback da placa. Não houve alteração de firewall/confiança ou bibliotecas.

O [reteste físico com controles TLS negativos](evidencias/2026-11-25-firmware-principal/20261125T224115Z-serial-tls/serial.json) confirmou rejeição de nome incorreto e CA distinta, cinco temperaturas de 27,125–27,1875 °C, seis respostas HTTP 201 e cinco correlações distintas serial/API/SQLite: IDs 3, 4, 5, 6 e 8, dispositivo/cadastro 1. Respostas HTTP não são contadas como amostras independentes. Os probes negativos não enviaram HTTP ou credencial.

Após a revisão do fallback DNS, a [compilação de uso](evidencias/2026-11-25-firmware-principal/20261125T224314Z-compilacao/compilacao.json), o [verificador final](evidencias/2026-11-25-firmware-principal/20261125T224434Z-verificacao-firmware-final/firmware-configurado.json) e a [gravação](evidencias/2026-11-25-firmware-principal/20261125T224920Z-gravacao/gravacao.json) passaram. Binário privado SHA-256 `6453fe9ee6eeb7c6c81761306de54317d4e88e0d35889e3bc9f433689221831b`, 936.800 bytes. A [confirmação dessa versão](evidencias/2026-11-25-firmware-principal/20261125T225044Z-serial-final/serial.json) registrou quatro temperaturas de 27,3125 °C, quatro HTTP 201 e quatro correlações, IDs 58–61. Nessa captura os probes negativos estavam desabilitados; a ausência do marcador (`negativeTlsControlsPassed=false`) significa não executados nessa inicialização, não reprovação dos controles anteriores.

Os percentuais de memória são estimativas estáticas. Zero avisos no build incremental de uso não elimina os dois avisos OneWire preservados nas compilações que reconstruíram essa biblioteca. Não se mede calibração, exatidão ou disponibilidade prolongada com essas capturas.

## Porta e episódio real

O aluno movimentou somente o ímã, mantendo a montagem e o programa principal ligados. Estes ensaios consultaram novas leituras pela API e conferiram os registros no SQLite, sem enviar valores por um simulador ou reiniciar a placa entre posições. Critérios foram definidos antes das capturas.

| Condição relatada | Resultado | Evidência |
| --- | --- | --- |
| Ímã junto, antes de ativar o monitoramento | Quatro leituras com `portaAberta=false`, IDs 77–80; API/SQLite coincidentes | [Fechada inicial](evidencias/2026-11-25-firmware-principal/20261125T225356Z-porta-fechada-inicial/porta.json) |
| Ímã afastado, mantido | Três novas leituras com `portaAberta=true`, IDs 99–101; um único episódio PortaAberta aberto | [Abertura e alerta](evidencias/2026-11-25-firmware-principal/20261125T225721Z-porta-aberta-alerta/porta.json) |
| Ímã junto novamente | Três novas leituras fechadas, IDs 121–123; mesmo episódio encerrado por `CondicaoNormalizada` | [Fechamento e encerramento](evidencias/2026-11-25-firmware-principal/20261125T230058Z-porta-fechada-encerra-alerta/porta.json) |

O episódio ID 1 tem início de condição em 22:56:18 UTC, abertura às 22:56:30,0265443 UTC e encerramento às 23:00:28,184947 UTC. A tolerância de ensaio foi 10 s; o intervalo entre início de condição registrado e abertura foi aproximadamente 12,03 s. Isso não mede latência do movimento físico nem comprova debounce de 50 ms ou alcance do contato. A distância solicitada ao aluno não foi medida pela ferramenta. Não houve instalação em porta de geladeira nesta etapa.

[Parâmetros explícitos de bancada](evidencias/2026-11-25-firmware-principal/20261125T225609Z-configuracao-ensaio/configuracao.json): faixa 0–40 °C, tolerância de porta 10 s, ausência 45 s, origem Hardware e monitoramento ativo. São valores de ensaio, sem recomendação sanitária. A preparação não inseriu leituras artificiais.

## Interface observada

O navegador desktop real mostrou a leitura de Hardware no painel e gráfico/tabela no histórico. A interface conserva a expressão “Hardware declarado”; a evidência de autenticação vem da gravação/serial e do vínculo de dispositivo no backend, não apenas dessa etiqueta.

- [Painel real](evidencias/2026-11-25-firmware-principal/interface-desktop-real/painel-hardware-bancada.jpg): leitura #32, 27,25 °C, recebimento/medição em 25/11 às 19:46:11 locais.
- [Histórico real](evidencias/2026-11-25-firmware-principal/interface-desktop-real/historico-hardware-completo.jpg): 35 registros no filtro naquele momento, 20 na página, gráfico e tabela. Contagem é um retrato daquele instante, não total final do ensaio.
- [Registro da observação](evidencias/2026-11-25-firmware-principal/interface-desktop-real/registro-ui.json) e [DOM salvo depois](evidencias/2026-11-25-firmware-principal/interface-desktop-real/painel-dom.txt). Consultas/capturas ocorreram em momentos diferentes durante atualização automática; não se atribui ao JPEG a leitura #45 do DOM posterior.

JPEGs são capturas nativas preservadas sem alteração de pixels, não montagens de telas ou fotografias da bancada. O pareamento do iPhone foi [confirmado manualmente em outra etapa](etapa-acesso-pacote-2026-11-25.md); uma nova conferência móvel com as leituras físicas continua separada.

## Temperatura e normalização

A [faixa térmica de ensaio 0–28 °C](evidencias/2026-11-25-firmware-principal/20261125T230453Z-faixa-termica-ensaio/criterios.json) foi preparada antes do aquecimento, mantendo tolerância 10 s/ausência 45 s/Hardware ativo. Os limites permaneceram exatamente iguais durante o aquecimento e o resfriamento; não se encerrou o episódio alargando a faixa.

| Condição relatada | Resultado observado | Evidência |
| --- | --- | --- |
| Mão somente na ponta metálica, cabo parado e ímã junto | Três novas temperaturas de 32,0625, 32,6875 e 33 °C, coincidentes na API e no SQLite; um episódio térmico aberto | [Aquecimento](evidencias/2026-11-25-firmware-principal/20261125T230556Z-temperatura-aquecimento/temperatura.json) |
| Ponta solta sobre a mesa, primeira janela de 180 s | Dezoito leituras decresceram de 33,0625 para 29,375 °C; continuaram acima de 28 °C e o alerta permaneceu corretamente aberto | [Resfriamento ainda fora da faixa](evidencias/2026-11-25-firmware-principal/20261125T230828Z-temperatura-resfriamento/temperatura.json) |
| Mesma condição, observação posterior | Três leituras de 27,75, 27,75 e 27,6875 °C, IDs 230–232, coincidentes na API/SQLite; mesmo episódio encerrado por `CondicaoNormalizada` | [Retorno à faixa](evidencias/2026-11-25-firmware-principal/20261125T231857Z-temperatura-resfriamento/temperatura.json) |

O episódio térmico ID 2 abriu às 23:05:28 UTC, com leitura de abertura de 29,9375 °C. A primeira janela de resfriamento ficou `incomplete` porque a temperatura ainda não havia normalizado dentro dos 180 s previstos; o arquivo foi preservado. A observação posterior passou com a mesma configuração e sem reinício da placa. São janelas distintas de consulta, não uma única captura instrumental contínua. O banco manteve a aquisição entre elas.

A manipulação física foi relatada pelo aluno; os valores, IDs, origem, vínculo de dispositivo, episódios e parâmetros foram consultados nas ferramentas. O resultado demonstra resposta qualitativa e funcionamento da regra de faixa em bancada, sem calibração, comparação com termômetro de referência ou medição de exatidão. Quatro casas decimais no registro não representam precisão experimental.

## Continuidade

### Ausência confirmada

O aluno confirmou retirar somente o USB e observar o LED apagado. O [ensaio F08](evidencias/2026-11-25-firmware-principal/20261126T005443Z-comunicacao-ausencia/comunicacao.json) passou: 70,04 s de observação, 35 consultas, zero novas aquisições e API/SQLite saudáveis em todas as consultas observadas, com configuração inalterada. A última aquisição foi ID802, às00:54:22 UTC de26/11, ainda25/11 às21:54:22 em São Paulo. O episódio AusenciaLeituras ID4 abriu às00:55:07,0266523 UTC, aproximadamente45,03 s após essa medição, sem novo POST.

A [captura nativa do alerta aberto](evidencias/2026-11-25-firmware-principal/interface-ausencia-real/ausencia-aberta.jpg) mostra também um episódio posterior de porta, ID3, encerrado por `SemDadosRecentes`. A posição do ímã anterior a esse episódio não foi controlada; ele não é apresentado como uma segunda normalização da porta. O episódio controlado ID1 permanece com o encerramento correto descrito acima. Timestamps UTC e datas locais permanecem distintos nos arquivos, sem retroagir registros.

### Reinício real do servidor

Com o ESP32 ainda desligado, foi criado um backup consistente privado do SQLite e registrada a condição anterior à parada. O processo do pacote foi conferido pelo caminho completo, encerrado e iniciado novamente com o mesmo perfil HTTPS. O [controle de persistência](evidencias/2026-11-25-firmware-principal/20261126T010805Z-reinicio-api/reinicio.json) passou: API saudável, 802 leituras, quatro episódios, um cadastro, uma configuração e um dispositivo; todas as linhas das tabelas, incluindo as migrations, mantiveram o SHA lógico `2b1b550cbf3e240883d6824bf87e4f56fb1d4bc6080acddf0bfd8224c48b0cf9`.

O episódio de ausência ID4 permaneceu aberto e o dispositivo ID1 continuou ativo. A captura anterior foi às01:08:05 UTC e a posterior às01:12:21 UTC de26/11, ainda noite de25/11 em São Paulo. Esses horários delimitam as consultas, não medem a duração da indisponibilidade. O controle não valida reconexão da sessão no iPhone, reenvio do buffer ou nova ingestão da placa. Não houve mudança de certificados, confiança ou firewall.

### Preparação da geladeira

O aluno confirmou disponibilidade de **geladeira doméstica**, carregador USB/powerbank e montagem apoiada fora do equipamento, ainda desligada. Confirmou somente a ponta metálica na prateleira do meio e fechamento sem esmagar o cabo. Encontrou o corpo com dois fios e o ímã do contato; a fixação externa e o alinhamento ainda aguardam confirmação. Esse preparo não comprova operação em refrigeração comercial.

### Recuperação com carregador USB

Após corrigir o apoio externo do ESP32 e aproximar o par de contato/ímã, o aluno confirmou **LED aceso e alimentação por carregador USB**, sem ligação ao computador. A [captura de recuperação](evidencias/2026-11-25-firmware-principal/20261126T013510Z-comunicacao-recuperacao/comunicacao.json) passou: 30,54 s, 16 consultas, três novas aquisições autenticadas de9,375°C, IDs804–806, coincidentes na API e no SQLite. A configuração permaneceu igual e os serviços estiveram saudáveis em todas as consultas observadas.

O mesmo episódio de ausência ID4 encerrou às01:35:09,5675883 UTC de26/11 por `CondicaoNormalizada`, após a primeira aquisição recuperada ID803. Em São Paulo, corresponde a25/11 às22:35:09. O dispositivo ID1 voltou a enviar depois do reinício do servidor, sem nova emissão de credencial. A captura não ensaiou reenvio físico do mesmo UUID ou buffer offline; a sessão do iPhone continua exigindo nova conexão.

A posição da sonda dentro de uma geladeira doméstica foi relatada pelo aluno. A [primeira janela de15min](evidencias/2026-11-25-firmware-principal/20261126T013801Z-geladeira-domestica/geladeira.json) registrou91 aquisições distintas,885 s entre primeira e última medição e9,3125–11,875°C, com valores API/SQLite coincidentes, configuração igual e sem lacunas acima do critério. **Depois, o aluno esclareceu que a geladeira estava fora da tomada desde antes de colocar a sonda.** O [adendo de alimentação](evidencias/2026-11-25-firmware-principal/20261126T013801Z-geladeira-domestica/adendo-energia-geladeira.json) preserva o relatório bruto: seu `passed` atende aos critérios mecânicos declarados de aquisição/integridade e limiar de temperatura, mas não comprova refrigeração ativa. Essa informação deveria ter sido confirmada antes da coleta; não se reclassifica a janela como refrigerador funcionando.

A porta fisicamente fechada ainda apareceu como `portaAberta=true`. O ajuste com o ímã próximo ficou incompleto; depois, plásticos encostados produziram três leituras fechadas. O aluno esclareceu que a fita unia as peças e ambas estavam na parte fixa. Após movê-las para superfícies separadas, a posição final ainda não reconheceu fechamento estável. Esses controles de montagem não são apresentados como ciclo instalado aprovado.

O aluno posteriormente confirmou ligar a geladeira na tomada e fechar a porta. Foi iniciada uma nova janela própria de15min, com estado de alimentação registrado e critério prévio de queda de pelo menos1°C entre a média das primeiras e das últimas cinco aquisições, além de integridade/continuidade e configuração inalterada. A nova janela não substitui a anterior; sua conclusão ainda aguarda o resultado efetivo. Não há calibração ou medição elétrica do compressor.

Operação documentada na geladeira, nova conferência móvel com leituras físicas e notebook/rede da apresentação exigem seus resultados próprios. O carregador mantém a placa ligada; API e computador continuam ligados e acessíveis pela mesma rede Wi-Fi.

O banco do pacote `app/data/iceplay.db` contém esta bancada. O banco original de `src/Iceplay.Api/data/iceplay.db`, suas leituras Simulacao e as cinco migrations permanecem separados e preservados. Credencial, senha, configurações, binários e logs integrais ficam privados em `.tools`. A assistência de IA executou ferramentas/organizou registros; o aluno realizou as manipulações físicas relatadas.

### Ciclo instalado e correção da duração física

A primeira observação com geladeira ligada, [15 minutos](evidencias/2026-11-25-firmware-principal/20261126T020002Z-geladeira-ligada/geladeira.json), encontrou102 aquisições distintas em887s medidos,12,0625–12,125°C, API/SQLite coincidentes, configuração igual e sem lacunas acima do critério. A aquisição passou, mas a queda média mínima de1°C não ocorreu: resultado `incomplete` para resposta térmica. Esse resultado permanece preservado.

O aluno fixou dois ímãs sem fios juntos somente na porta móvel; o corpo com fios ficou na parte fixa. A [posição fechada](evidencias/2026-11-25-firmware-principal/20261126T021529Z-porta-instalada-fechada/porta-instalada.json) passou com três novas leituras fechadas. O [ciclo instalado](evidencias/2026-11-25-firmware-principal/20261126T021846Z-ciclo-porta-real/ciclo-porta.json) registrou14 aquisições; após uma oscilação inicial, três estados abertos consecutivos e três fechados consecutivos passaram. Exatamente um novo episódio de porta, ID10, iniciou condição às02:19:51UTC, abriu às02:20:02,5708785UTC e encerrou às02:20:21,5688906UTC por `CondicaoNormalizada`. Todos os valores conferidos coincidiram entre API e SQLite e a configuração permaneceu igual.

O procedimento previa abertura por cerca de30s. Após confirmar o ciclo, o aluno corrigiu: **abriu por cerca de10s e fechou, sem cronômetro**. O [relato manual](evidencias/2026-11-25-firmware-principal/20261126T021846Z-ciclo-porta-real/relato-manual.json) registra essa variação sem modificar JSON ou critérios originais. A sequência e o episódio demonstram funcionamento do contato instalado; os timestamps representam estados adquiridos pelo sistema e não validam30s de abertura física, latência ou debounce. Não se solicitou repetição apenas para aumentar contagens. Os episódios de ajuste anteriores e a oscilação inicial não são ensaios independentes de estabilidade prolongada.

Com a porta novamente fechada e alimentação por carregador mantida, uma janela própria de30min começou às02:22:59UTC. Critérios prévios: pelo menos120 aquisições,1680s medidos, nenhuma lacuna acima de30s, API/SQLite/configuração coincidentes e queda média de1°C entre primeiras e últimas cinco leituras. A conclusão térmica depende do resultado efetivo, sem alterar os limites de alertas de bancada ou presumir calibração.

### Aquisição física no iPhone

Após receber os links e a orientação de pareamento, o aluno enviou uma captura real do Safari mostrando a leitura#1171,13,69°C, portaFechada, Hardware declarado e indicação de leitura recente, medição/recebimento25/11 às23:33:10local. O [registro correlacionado](evidencias/2026-11-25-firmware-principal/iphone-hardware-real/registro.json) confirmou no SQLite13,6875°C, porta=false, origemHardware e dispositivo1, no mesmo instante UTC02:33:10 de26/11. A imagem original foi preservada privadamente para a monografia. O texto antigo do cadastro ainda descreve a bancada e não é tomado como localização atual. Essa captura comprova o painel móvel após o reinício da API; não comprova a manutenção da sessão anterior ou uma nova consulta ao histórico, nem o notebook/hotspot da apresentação.

### Resultado da janela ligada de30min

A [observação posterior](evidencias/2026-11-25-firmware-principal/20261126T022259Z-geladeira-ligada/geladeira.json), iniciada às02:22:59UTC de26/11 (23:22:59local25/11), terminou com 180 aquisições/1790s medidos, 13,2500–14,1250°C; queda entre médias de cinco amostras: 0,8500°C. Queda qualitativa mínima de1°C não atingida; resposta térmica incompleta. A configuração permaneceu igual, todas as aquisições conferidas coincidiram na API/SQLite, os serviços estiveram saudáveis em todas as consultas observadas e não houve lacunas acima de30s. As [aquisições emCSV](evidencias/2026-11-25-firmware-principal/20261126T022259Z-geladeira-ligada/leituras.csv) preservam os valores completos.

A janela começou após o ciclo de abertura/fechamento da porta; sua tendência não é comparação controlada de potência ou prova instrumental do compressor. Estado ligado e posição da sonda foram relatados pelo aluno. O ensaio documenta aquisição, tendência térmica observada e integração em geladeira doméstica, sem calibração, exatidão ou validação comercial/prolongada. A primeira janela desligada e a primeira ligada incompleta permanecem preservadas, sem concatená-las como uma única condição.

Depois de encerrar a coleta, o [cadastro1](evidencias/2026-11-25-firmware-principal/20261126T025304Z-cadastro-localizacao-atualizada/cadastro.json) recebeu nome/local compatíveis com o ensaio doméstico. ID, criação, configuração e dispositivos ficaram iguais. As capturas anteriores mantêm o texto histórico da bancada, sem alteração de pixels.

Os controles físicos de revogação e buffer/reenvio, o notebook e a rede da apresentação permanecem sem ensaio. Não se declara aprovação integral dos12 casos físicos ou aplicação comercial. A assistência de IA organizou/correlacionou registros e arquivos; o aluno realizou as ações físicas e forneceu as capturas móveis.

## Controles adicionais e fechamento em26/11

O [fechamento posterior](etapa-fechamento-final-2026-11-26.md) acrescenta retenção temporária durante13s sem API, recusa401 com credencial revogada somente em cópia privada e três aquisições após recuperar o banco original/reiniciar pelo carregador. A continuação térmica retrospectiva286/2851s teve queda média1,0375°C e permanece exploratória; não aprova o critério original30min/0,85°C. Orientador confirmado; outro notebook da apresentação ainda indisponível. Os resultados anteriores acima permanecem preservados e com seus limites próprios.
