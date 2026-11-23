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
