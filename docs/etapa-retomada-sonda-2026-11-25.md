# Recuperação e ensaios USB da sonda — 25/11/2026

A montagem foi recuperada e o diagnóstico já gravado voltou a ler a DS18B20. Quatro capturas reais verificaram aquisição, aumento qualitativo ao segurar a ponta metálica, ausência de temperatura ao interromper somente DQ e recuperação depois de reconectar DQ. **Ainda não houve gravação do firmware principal ou envio físico à API nesta etapa.** As [falhas de 23/11](etapa-leitura-temperatura-2026-11-23.md) continuam preservadas; este reteste não determina sua causa exclusiva nem comprova calibração ou operação em geladeira.

## Montagem e condições

O aluno informou ter colocado cada fio da sonda em uma extensão jumper macho–fêmea separada e confirmou fixação firme e as ligações abaixo com USB desligado. Não houve soldagem, medição com multímetro ou nova fotografia final. A pinagem do fornecedor já está documentada no relatório anterior.

| Conexão | Posição na metade a–e da protoboard |
| --- | --- |
| Vermelho/VDD da sonda, pela extensão | b30 |
| Preto/GND da sonda, pela extensão | b32 |
| Amarelo/DQ da sonda, pela extensão | b34 |
| 3V3 do ESP32 | a30 |
| D4/GPIO4 do ESP32 | a34 |
| Resistor nominal 4,7 kΩ | c30–c34 |
| GND do ESP32 e derivação | a20; jumper c20–a32 |
| Porta, mantida da bancada anterior | D27→a10, contato b10/b20, GND→a20 |

Fileira 34 não significa GPIO34. A posição do ímã não foi condição controlada nestas capturas de temperatura; os níveis HIGH não comprovam uma porta instalada.

Programa utilizado: `firmware/diagnostico-sensores`, fonte SHA-256 `9728d47caac2bf857aa4cdcbad34fba6d220ca3bec1d745a8a4b75c907e0e69b`. Referência do repositório: `10e0627cdf863fcdb9951756e04f61e31869e7a3`. Sem alteração ou nova gravação desse programa. COM3, 115200 baud; somente USB, sem rede/API ou leituras simuladas.

## Resultados observados

Cada critério foi registrado antes da captura. Horários de início no computador: em São Paulo, UTC−3, correspondem a 01:13, 01:17, 01:21 e 01:28 de 25/11. `uptime_ms` é tempo desde o boot, não horário UTC da medição.

| Captura | Condição confirmada pelo aluno | Resultado observado | Interpretação |
| --- | --- | --- | --- |
| [04:13:12 UTC, 16 s](evidencias/2026-11-25-diagnostico-sensores/20261125T041312Z-retomada-sonda/serial.json) | Ligações conferidas, USB reconectado; sonda parada | Banner; oito temperaturas de 26,6875 a 26,7500 °C, oito uptimes distintos; nenhum erro de temperatura | Aquisição USB recuperada |
| [04:17:35 UTC, 30 s](evidencias/2026-11-25-diagnostico-sensores/20261125T041735Z-aquecimento-mao/serial.json) | Segurando somente a ponta metálica | Quinze temperaturas de 27,4375 a 28,0000 °C, quinze uptimes distintos; nenhum erro | Aumento qualitativo observado |
| [04:21:53 UTC, 12 s](evidencias/2026-11-25-diagnostico-sensores/20261125T042153Z-dq-desconectado/serial.json) | USB desligado para retirar somente o macho em b34; depois reconectado | Banner; seis mensagens de sonda não pronta e nenhuma linha de temperatura após o banner | Interrupção de DQ reconhecida sem temperatura substituta |
| [04:28:25 UTC, 16 s](evidencias/2026-11-25-diagnostico-sensores/20261125T042825Z-recuperacao-dq/serial.json) | USB desligado para recolocar b34; depois reconectado | Banner; oito temperaturas de 25,6875 °C, oito uptimes distintos; nenhum erro | Aquisição recuperada após reconexão de DQ |

Aquisição inicial e recuperação exigiam banner, ao menos três temperaturas com uptimes distintos e ausência de erro. O aquecimento usou como referência o máximo anterior, 26,75 °C: exigia ao menos três registros distintos de 27,00 °C ou mais, incremento mínimo de 0,25 °C, sem erro. As quinze temperaturas atenderam ao critério. Essa captura não enviou pulso de reset nem exigia banner.

A interrupção exigia banner, mensagens de sensor não pronto e zero temperaturas. VDD e GND permaneceram ligados: trata-se de interrupção de DQ, não remoção completa da sonda. Não apareceram valores substitutos zero/−127 como temperatura válida. Todas as conexões foram alteradas sem alimentação, conforme confirmações do aluno. Serial fechada ao final de cada captura, sem exceção de coleta. Ao terminar, b34 estava restaurado, USB conectado e LED aceso conforme relato.

## Contagem e anomalia preservada

Há linhas GPIO repetidas em prefixos anteriores ao banner nas capturas com reinício. Os arquivos brutos e as transcrições não foram deduplicados para ocultá-las. Causa desconhecida.

| Captura | Linhas GPIO brutas | Uptimes GPIO distintos no arquivo | Linhas distintas depois do novo banner |
| --- | --- | --- | --- |
| Retomada | 2.000 | 17 | 16 |
| Mão, sem reset | 30 | 30 | Não aplicável; sem banner nesta captura |
| DQ interrompido | 2.005 | 13 | 12 |
| DQ restaurado | 1.958 | 16 | 16 |

Temperaturas têm uptimes distintos nas aquisições aprovadas. Linhas GPIO repetidas não são testes ou amostras independentes nem medição de cadência. Capturas separadas, com manipulação e reinícios, não constituem ensaio contínuo ou medida de latência térmica.

[Resumo derivado e hashes das capturas](evidencias/2026-11-25-diagnostico-sensores/resumo-usb.json). Cada diretório contém JSON e transcrição sanitizada; log integral, critérios prévios e cópia do coletor ficam privados em `.tools/hardware/`, sem publicar identificadores exclusivos.

[Conferência documental executada](evidencias/2026-11-25-diagnostico-sensores/20261125T044703Z-verificacao/verificacao.json): temperaturas dos quatro JSONs coincidem com as transcrições, hashes conferidos, fontes protegidas e banco original preservados, links locais existentes. API local saudável; banco do pacote com um cadastro de bancada e zero leituras/dispositivos naquele instante. A conferência não acrescenta ensaio físico.

## Alcance e próximo passo

F02 permanece **parcial** no [protocolo físico](hardware/protocolo-ensaio.md): aquisição, variação qualitativa e interrupção/recuperação de DQ observadas pela USB; resposta autenticada da API pendente. F01 e F03 continuam parciais para programa principal, porta instalada e leituras integradas.

Próximo incremento: preparar configuração privada de rede/credencial, compilar o programa principal e, após autorização específica, gravar e conferir medições reais em HTTPS/API/SQLite/interface. Faltam observação em geladeira e condições do notebook/rede da apresentação. Sem medição de exatidão ou estabilidade prolongada. A confirmação do leitor QR no iPhone é um [ensaio manual separado](etapa-acesso-pacote-2026-11-25.md).

Nenhuma fonte da API/interface ou migration alterada. O SHA-256 do banco original `src/Iceplay.Api/data/iceplay.db` permaneceu `e8ecae14a84243a292d3e21f953a14eea7d950c2c3fe929d43a4a68dd5ba9317`. Verificações de software de 25/11 não foram repetidas por estes ensaios USB. A assistência de IA executou ferramentas e organizou registros; o aluno realizou as manipulações físicas descritas.

Após as capturas USB, a preparação do próximo incremento criou explicitamente o cadastro **“Prototipo ICEPLAY - bancada real”**, ID 1, no banco separado do pacote `app/data/iceplay.db`, com localização indicando ausência de instalação na geladeira. Backup consistente anterior preservado em `.tools/backups`. A preparação ainda aguarda a configuração privada; não inseriu leituras ou emitiu credencial nessa tentativa. Esse cadastro é preparação para medições reais, não evidência de ingestão física ou dados de demonstração.
