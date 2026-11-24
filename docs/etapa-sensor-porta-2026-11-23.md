# Sensor de porta — condições de bancada em 23/11/2026

## Montagem informada e alcance

O usuário informou que desencapou as pontas do contato Giltar SP-1006 e enviou foto da protoboard. Depois confirmou explicitamente **D27 → a10** e **GND → a20** no ESP32. A orientação foi colocar um fio do contato em b10 e outro em b20, sem a ponte de jumper em paralelo, mantendo o DS18B20 desconectado. A foto mostra as conexões na protoboard, mas não os pinos do ESP32; o vínculo à placa foi confirmado pelo relato, não por inspeção visual desses pinos.

Foi solicitado deixar o ímã (peça sem fios) afastado aproximadamente um palmo e conectar o USB. O usuário respondeu que o LED acendeu. A distância não foi medida pela ferramenta; a condição é a solicitada nessa sequência, sem afirmar observação direta da manipulação física.

## Captura realmente executada

O Windows apresentou `Silicon Labs CP210x USB to UART Bridge (COM3)`, status OK. Usou-se PySerial já existente no ambiente PlatformIO, sem instalação ou nova gravação da placa. DTR permaneceu liberado; um pulso RTS/EN reiniciou o diagnóstico já gravado. A captura foi limitada a oito segundos e a porta foi fechada ao final.

Critério definido **antes da captura**: banner do diagnóstico GPIO27, pelo menos três amostras, todas HIGH, sem erro serial. Resultado entre **23:52:18 e 23:52:26 UTC de 23/11/2026**: banner reconhecido e **oito HIGH**, com uptime de 26 a 7027 ms. Critério aprovado, sem erro. Uptime é tempo desde o boot, não horário UTC da medição.

- [Resultado estruturado](evidencias/2026-11-23-sensor-porta/20261123T235218Z-ima-afastado/serial.json).
- [Linhas seriais sanitizadas](evidencias/2026-11-23-sensor-porta/20261123T235218Z-ima-afastado/serial-sanitizada.log).
- Fonte do diagnóstico: SHA-256 `4a64f317ff3792c6eb7b5e8c9478ecad87c20e5e267ac1f7f047cd6be0932672`, igual à fonte dos ensaios de jumper de 18/11.
- Referência Git anterior à coleta: `e7223719a6f8f7f94ac6829cdbbe516854f0e1fd`.

Comandos executados, a partir da raiz:

```powershell
Get-CimInstance Win32_SerialPort | Select-Object DeviceID,Name,Status
& '.tools/platformio-venv/Scripts/python.exe' '.tools/hardware-tools/monitor_porta_2026_11_23.py' --condition ima-afastado --expected HIGH
```

O coletor privado adapta o auxiliar anterior para a data e condição atuais, exige condição/nível esperado antes de abrir a serial e cria pastas novas. O log integral e os critérios prévios ficam em `.tools/hardware/20261123T235218Z-ima-afastado/`, ignorado. Somente o banner previsto e linhas de nível permitidas são publicados, sem identificadores exclusivos. A foto enviada não foi copiada para o Git nesta etapa.

## Situação após a primeira captura

HIGH é compatível com a entrada liberada pelo contato aberto. **Esse resultado isolado também poderia ocorrer com mau contato ou fio desconectado**; não comprova o funcionamento do sensor magnético. Ainda é necessário aproximar o ímã, capturar a resposta, afastar novamente e repetir para verificar a correspondência física. F03 continua pendente; não houve ciclo de ímã capturado nem medição de latência/debounce.

Próxima ação do usuário: manter fios e USB como estão, aproximar a peça sem fios da lateral da peça com fios e avisar quando estiver encostada ou muito próxima. O próximo nível esperado será definido antes da nova captura, sem presumir o resultado. Não mudar as ligações enquanto alimentado.

A placa permanece com o diagnóstico temporário, não o firmware principal de ingestão. Não houve temperatura, API, SQLite, alerta físico, nova compilação ou upload de firmware; banco de uso e migrations preservados. Não se executou build de backend porque seu código não mudou. A assistência de IA abrangeu orientação, consulta da porta, captura e registro; o usuário realizou as ações físicas. Publicação rotineira autorizada, sem operações destrutivas.

## Segundo incremento: peças juntas

Depois da primeira captura, o usuário mostrou a peça que segurava e recebeu orientação para usar a peça sem fios ao lado da peça ligada à protoboard, com as duas alinhadas. Respondeu **“Juntei”**. O posicionamento foi informado pelo usuário, sem medição de distância/alinhamento pela ferramenta.

COM3 continuou com status OK. **Antes da nova captura**, definiu-se LOW como esperado, exigindo banner e pelo menos três amostras do mesmo nível. Entre **23:56:34 e 23:56:43 UTC de 23/11**, a leitura por oito segundos após pulso RTS/EN registrou o banner e **oito LOW**, de uptime 26 a 7027 ms; resultado aprovado, sem erro e com serial fechada.

- [Resultado com ímã próximo](evidencias/2026-11-23-sensor-porta/20261123T235634Z-ima-proximo/serial.json).
- [Linhas sanitizadas](evidencias/2026-11-23-sensor-porta/20261123T235634Z-ima-proximo/serial-sanitizada.log).
- Comando efetivamente executado: `& '.tools/platformio-venv/Scripts/python.exe' '.tools/hardware-tools/monitor_porta_2026_11_23.py' --condition ima-proximo --expected LOW`.
- Fonte do diagnóstico com mesmo hash; referência Git da captura `941dfe4b76af89cd1edbe80882234a9ab3d2c583`. Auxiliar privado ajustado para registrar corretamente a confirmação “Juntei” e não repetir a descrição anterior de afastamento. Evidência anterior preservada.

As duas condições informadas produziram sinais distintos: oito HIGH após orientação de afastamento e oito LOW após o usuário juntar as peças. Isso é compatível com resposta do contato ao ímã. **São capturas separadas após reinícios**, não uma transição contínua, medida de alcance, latência ou teste do debounce.

Próxima ação: afastar novamente a peça sem fios aproximadamente um palmo, manter fios/USB como estão e avisar para capturar o retorno esperado a HIGH; depois repetir aproximação/afastamento. F03 permanece incompleto: além da bancada, seu critério inclui o estado da porta em leituras posteriores do firmware principal/API. Nenhuma temperatura ou leitura de API foi criada nesta etapa e não houve nova gravação.

## Terceiro incremento: retorno após afastar

O usuário informou **“afastei”** após a orientação de separar a peça sem fios aproximadamente um palmo. COM3 permaneceu OK. Antes da captura, definiu-se HIGH como esperado, exigindo banner, pelo menos três amostras e ausência de erro. O coletor privado passou a aceitar `--confirmation` para registrar esse relato de retorno sem reutilizar a descrição da conexão inicial do USB; os arquivos anteriores não foram alterados.

Entre **00:00:12 e 00:00:20 UTC de 24/11/2026**, foram observados o banner e **oito HIGH**, de uptime 27 a 7027 ms. Isso ocorreu na noite de **23/11, às 21:00 no horário de São Paulo (UTC−03:00)**; a pasta da etapa usa a data local e o identificador da captura usa UTC. Critério aprovado, sem erro, serial fechada ao final. Fonte do diagnóstico com mesmo SHA-256; referência Git `f5095880715b6b40a78a9a0faf8b639123522715`.

- [Resultado do retorno](evidencias/2026-11-23-sensor-porta/20261124T000012Z-ima-afastado/serial.json).
- [Linhas sanitizadas](evidencias/2026-11-23-sensor-porta/20261124T000012Z-ima-afastado/serial-sanitizada.log).
- Comando executado: `& '.tools/platformio-venv/Scripts/python.exe' '.tools/hardware-tools/monitor_porta_2026_11_23.py' --condition ima-afastado --expected HIGH --confirmation 'Usuario informou afastei apos a captura com pecas juntas; distancia nao medida pela ferramenta.'`.

| Condição solicitada/informada pelo usuário | Sinal observado | Quantidade |
| --- | --- | --- |
| Ímã afastado inicialmente | HIGH | 8 |
| Peças juntas, confirmação “Juntei” | LOW | 8 |
| Afastamento novamente, confirmação “afastei” | HIGH | 8 |

A resposta nas três posições informadas é compatível com o contato abrindo/fechando pela aproximação do ímã. **As capturas são separadas por reinícios**: não demonstram uma transição contínua, latência, alcance ou eficácia do debounce. O campo `sensorMagnetCycleValidated: false` de cada JSON descreve o alcance daquela captura isolada. A sequência acima consolida somente os estados observados; a repetição e o fluxo físico com firmware principal/API ainda estão pendentes, portanto F03 segue parcial/incompleto.

Próxima ação: repetir uma aproximação e um afastamento com novas capturas, preservando os fios e o diagnóstico. Não houve nova gravação, temperatura, rede/API ou banco; não são leituras do sistema de ingestão. Logs integrais permanecem privados em `.tools/hardware/20261124T000012Z-ima-afastado/`, e somente linhas permitidas foram publicadas. Nenhum ensaio anterior foi sobrescrito.

## Quarto incremento: repetição com peças juntas

O usuário informou **“Juntos!”** após a orientação de repetir a aproximação, mantendo conexões e USB. COM3 continuou OK. Antes de abrir a serial, foi definido LOW como esperado, com banner e pelo menos três amostras, sem exigir exatamente oito registros. A captura limitada a oito segundos ocorreu de **24/11 às 00:03:52 a 00:04:00 UTC**, equivalente a **23/11 às 21:03:52 a 21:04:00 em São Paulo**.

Foram observados o banner e **sete registros LOW**, uptime de 27 a 7027 ms; critério aprovado, sem exceção de captura, serial fechada ao final. Os registros capturados não incluem uma linha de uptime 2027 ms, inclusive no log integral privado consultado. A causa dessa lacuna não foi determinada; não se transforma esse resultado em prova de cadência, ausência de perdas, latência ou qualidade da comunicação. Não foi repetida a captura apenas para obter oito linhas.

- [Resultado da aproximação repetida](evidencias/2026-11-23-sensor-porta/20261124T000352Z-ima-proximo/serial.json).
- [Linhas sanitizadas](evidencias/2026-11-23-sensor-porta/20261124T000352Z-ima-proximo/serial-sanitizada.log).
- Comando executado: `& '.tools/platformio-venv/Scripts/python.exe' '.tools/hardware-tools/monitor_porta_2026_11_23.py' --condition ima-proximo --expected LOW --confirmation 'Usuario informou Juntos! ao repetir a aproximacao; distancia e alinhamento nao medidos pela ferramenta.'`.
- Fonte com mesmo SHA-256; referência Git da captura `dad0d03b99a6f421e3ccfb249ffdd78932f7de4f`. Logs integrais privados em `.tools/hardware/20261124T000352Z-ima-proximo/`.

A sequência de condições informadas é agora HIGH/LOW/HIGH/LOW, com 8/8/8/7 registros aceitos, em capturas separadas após reinícios. A aproximação apresentou novamente LOW; falta repetir o afastamento. Próxima ação: separar a peça sem fios aproximadamente um palmo, preservar fios/USB e avisar para a última conferência de retorno dessa repetição. F03 continua parcial por esse retorno e pelo estado em leituras posteriores do firmware principal/API. Sem nova gravação, temperatura, API, banco ou alteração do firmware.

## Quinto incremento e fechamento da bancada básica

O usuário informou novamente **“afastei”**. COM3 continuou OK. Antes da captura, definiu-se HIGH como esperado, com banner e mínimo de três amostras. Entre **24/11 às 00:07:40 e 00:07:48 UTC** (**23/11 às 21:07:40–21:07:48 de São Paulo**), foram observados o banner e **oito HIGH**, uptime 27 a 7027 ms. Critério aprovado, sem erro; serial fechada ao final.

- [Resultado do afastamento repetido](evidencias/2026-11-23-sensor-porta/20261124T000740Z-ima-afastado/serial.json).
- [Log sanitizado](evidencias/2026-11-23-sensor-porta/20261124T000740Z-ima-afastado/serial-sanitizada.log).
- [Consolidação verificável das cinco condições](evidencias/2026-11-23-sensor-porta/20261124T000740Z-ima-afastado/resumo-bancada.json).
- Comando executado: `& '.tools/platformio-venv/Scripts/python.exe' '.tools/hardware-tools/monitor_porta_2026_11_23.py' --condition ima-afastado --expected HIGH --confirmation 'Usuario informou afastei ao repetir o afastamento final da bancada; distancia nao medida pela ferramenta.'`.
- Fonte com mesmo SHA-256; referência Git `037269bec7ff6f5a493f9ad722434a5aac3cb1b3`. Log integral privado em `.tools/hardware/20261124T000740Z-ima-afastado/`.

| Condição, em ordem | Sinal | Registros aceitos |
| --- | --- | --- |
| Afastado inicialmente | HIGH | 8 |
| Junto | LOW | 8 |
| Afastado | HIGH | 8 |
| Junto novamente | LOW | 7 |
| Afastado novamente | HIGH | 8 |

As duas aproximações e os dois retornos produziram o nível esperado nas posições informadas. **A resposta elétrica básica do contato/ímã em bancada foi verificada nesse alcance.** São 39 registros em cinco capturas separadas após reinícios, não 39 ensaios independentes ou uma gravação contínua de transições. A lacuna já registrada na quarta captura permanece sem causa determinada. Não foram medidos alcance, cadência sem perdas, latência ou eficácia do debounce.

F03 segue **parcial**: ainda requer a correspondência da porta instalada e seu estado nas leituras do firmware principal/API. Encerrada a repetição básica prevista, sem necessidade de repetir novamente apenas para aumentar contagens. Placa permanece com o diagnóstico de porta, sem temperatura, rede/API ou novo upload.

Na sequência, o usuário confirmou **“Tenho a sonda e o resistor 4k7”**. Isso registra disponibilidade informada, não conferência visual do valor, pinagem ou montagem da sonda. A próxima etapa é conferir essas peças com o USB desconectado e preparar o diagnóstico de temperatura; ver [preparação dos dois sensores](etapa-diagnostico-sensores-2026-11-23.md).
