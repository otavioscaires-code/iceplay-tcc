# Integração física do ICEPLAY em bancada — 25/11/2026

O ESP32 executou o firmware principal e enviou temperaturas reais da DS18B20 e estados do contato magnético à API por HTTPS, com credencial vinculada. Leituras foram correlacionadas com o SQLite e observadas no painel/histórico desktop. O contato passou por fechado → aberto → fechado; o aquecimento e o resfriamento da sonda também foram observados. Os episódios de porta e temperatura encerraram por normalização. **Esta etapa ainda não comprova instalação em geladeira ou apresentação em outro computador.**

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

Ausência/recuperação, instalação na geladeira, nova conferência móvel com leituras físicas e notebook/rede da apresentação exigem evidências próprias. O aluno confirmou possuir carregador USB ou powerbank; a placa poderá operar alimentada por ele, mantendo API e computador ligados e a mesma rede Wi-Fi acessível. Isso ainda não equivale a um ensaio nessa alimentação.

O banco do pacote `app/data/iceplay.db` contém esta bancada. O banco original de `src/Iceplay.Api/data/iceplay.db`, suas leituras Simulacao e as cinco migrations permanecem separados e preservados. Credencial, senha, configurações, binários e logs integrais ficam privados em `.tools`. A assistência de IA executou ferramentas/organizou registros; o aluno realizou as manipulações físicas relatadas.
