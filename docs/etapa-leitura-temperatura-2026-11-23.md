# Primeira aquisição física de temperatura — noite de 23/11/2026

## Escopo e montagem informada

Após a [compilação e conferência da pinagem](etapa-diagnostico-sensores-2026-11-23.md), o aluno confirmou a execução dos passos de montagem da sonda DS18B20 e do resistor nominal de 4,7 kΩ. Não houve medição por multímetro ou conferência visual final de todos os jumpers. A ligação abaixo é a orientação confirmada verbalmente pelo aluno, não uma certificação elétrica:

| Ligação | Posição na protoboard |
| --- | --- |
| Sonda: vermelho / VCC | b30 |
| Sonda: preto / GND | b32 |
| Sonda: amarelo / DQ | b34 |
| Resistor 4k7 entre VCC e DQ | c30–c34 |
| ESP32 3V3 | a30 |
| ESP32 GPIO4 / D4 | a34 |
| Derivação do GND existente | c20–a32 |
| Contato preservado | D27→a10, GND→a20, contato b10/b20, sem ponte paralela |

A identificação dos fios veio da [descrição do fornecedor conferida](evidencias/2026-11-23-diagnostico-sensores/20261124T003635Z-pinagem-fornecedor/pinagem.json), além do trecho enviado pelo aluno. As faixas do resistor indicam seu nominal; não foi verificada sua resistência real. Alterações de ligação devem ser feitas com USB desligado.

## Gravação autorizada e executada

O aluno respondeu **“autorizo”** à solicitação específica de substituir o diagnóstico de porta pelo diagnóstico de temperatura e porta, sem Wi-Fi/API. A autorização da gravação anterior de GPIO27 não foi reutilizada para essa nova escrita.

```powershell
& '.tools/platformio-venv/Scripts/python.exe' -m platformio run -d firmware/diagnostico-sensores -e esp32dev -t upload --upload-port COM3
```

A gravação ocorreu em **24/11/2026 às 01:03:17–01:03:33 UTC**, correspondente a **23/11 às 22:03 em São Paulo**. O comando terminou com saída 0, verificação de hash da escrita e reset registrados. O binário permaneceu igual ao compilado anteriormente. A etapa de upload, por si só, ainda não observava boot ou temperatura; esses campos falsos foram preservados no seu registro, e a aquisição posterior está separada.

- [Resultado da gravação](evidencias/2026-11-23-diagnostico-sensores/20261124T010317Z-gravacao/gravacao.json).
- [Log de upload sanitizado](evidencias/2026-11-23-diagnostico-sensores/20261124T010317Z-gravacao/gravacao-sanitizada.log), com MAC removido.

**A placa passou a executar `firmware/diagnostico-sensores/`.** O firmware principal de ingestão em `firmware/esp32/` continua preservado e não foi gravado. O diagnóstico usa GPIO4 para temperatura e GPIO27 para o contato; não usa rede, credencial, UTC de medição, API ou simulação.

## Primeira leitura real pela USB

Após a gravação, foi executada uma captura de 16 segundos na COM3, a 115200 baud, com reinício da placa. Os critérios foram definidos antes: observar o banner esperado, pelo menos três temperaturas finitas na faixa de −55 a 125 °C, pelo menos três registros GPIO27 e nenhuma mensagem de erro de temperatura. Isso verifica aquisição pelo diagnóstico, não a exatidão do sensor.

Captura em **24/11 às 01:04:49–01:05:05 UTC**, equivalente a **23/11 às 22:04:49–22:05:05 em São Paulo**:

| Verificação | Resultado observado |
| --- | --- |
| Banner do diagnóstico de sensores | Presente |
| Temperaturas válidas recebidas | 8 registros |
| Mínimo / máximo | 24,4375 / 24,4375 °C |
| Registros GPIO27 | 16, todos HIGH |
| Mensagens de erro de temperatura | Nenhuma na captura |
| Exceção de captura | Nenhuma |
| Serial fechada ao final | Sim |
| Critérios da captura inicial | Aprovados |

As amostras foram recebidas nos uptimes 972, 2859, 4861, 6863, 8865, 10867, 12869 e 14871 ms. A leitura exibida com duas casas seria **24,44 °C**. As quatro casas do log são formato/resolução de saída, não uma afirmação de precisão experimental. A posição do ímã não foi definida como condição de ensaio nesta captura; os 16 HIGH não substituem o [teste anterior do contato](etapa-sensor-porta-2026-11-23.md).

- [Resultado completo, critérios e instantes de recebimento](evidencias/2026-11-23-diagnostico-sensores/20261124T010449Z-serial-inicial/serial.json).
- [Linhas seriais sanitizadas](evidencias/2026-11-23-diagnostico-sensores/20261124T010449Z-serial-inicial/serial-sanitizada.log).

`receivedAtUtc` foi registrado no computador no recebimento. `uptimeMs` vem do ESP32 e representa tempo desde o boot; nenhum deles foi apresentado como `medidoEmUtc` da API. Não foi enviada ou inserida leitura no banco de uso.

## Rastreabilidade e limites

Código da gravação e captura: commit **`36633d8463b4094312ce111c7ef1d73d5c7aaa2b`**. Os arquivos do programa não foram alterados nesta etapa:

| Artefato | SHA-256 |
| --- | --- |
| Fonte `diagnostico-sensores/src/main.cpp` | `9728d47caac2bf857aa4cdcbad34fba6d220ca3bec1d745a8a4b75c907e0e69b` |
| `diagnostico-sensores/platformio.ini` | `0a7f3966cf32c1f2572bc4564a77615d16169316a9bb663275764d55be6c6bde` |
| Binário privado gravado | `191f4647b426432f8f7e595e995cf3d442a2da359b119ab41c7f79bccfce0c34` |

A compilação anterior teve dois avisos OneWire já documentados; não se afirma build sem avisos do diagnóstico. Logs integrais, coletores e binário ficam privados em `.tools`. Evidências públicas não incluem MAC/ROM exclusivo, credenciais ou configuração privada. O aluno realizou as ligações; a assistência de IA executou ferramentas autorizadas e organizou os resultados reais, sem fabricar leituras ou autoria manual.

[Conferência dos registros e da documentação](evidencias/2026-11-23-diagnostico-sensores/20261124T012114Z-verificacao-registros/verificacao.json): hashes de fonte/configuração/binário correspondem à compilação e gravação; contagens e valores do JSON coincidem com o log; horários de recebimento pertencem ao intervalo capturado; fontes protegidas sem alteração; 122 links locais existentes e varredura das novas evidências sem MAC, chave privada ou Bearer. Essa conferência documental não foi uma nova captura física ou repetição da suíte de software.

**F01 e F02 permanecem parciais** no [protocolo físico](hardware/protocolo-ensaio.md): gravação/boot do diagnóstico e aquisição USB foram demonstrados, mas faltam o firmware principal, resposta à variação térmica, ensaio de desconexão e envio autenticado com persistência. F03 permanece parcial para instalação e estado nas leituras do principal/API. Calibração, latência, ensaio na geladeira e integração ponta a ponta não foram demonstrados por essa coleta.

Próxima ação solicitada ao aluno: segurar apenas a ponta metálica da sonda para observar uma possível subida em nova captura, sem mexer nas conexões. Esse ensaio depende da confirmação física do aluno e ainda não foi registrado como executado. Depois, planejar a desconexão com USB desligado e a integração de rede/UTC/API em etapa própria. Nenhum teste novo de backend/interface foi alegado: esses códigos, banco e migrations não foram alterados.
