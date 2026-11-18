# Diagnóstico de bancada da entrada de porta — 18/11/2026

## Motivo e alcance

O usuário enviou fotos da sonda de três fios, protoboard e jumpers; informou que o resistor correto de 4,7 kΩ ainda não foi retirado e ficará para o dia seguinte. Também informou não possuir multímetro e identificou o sensor magnético recebido como **Giltar SP-1006**. A página primária do [fabricante](https://giltar.com.br/produto/sensor-de-sobrepor-preto-giltar/) confirma código SP1006 e contato NA para o sensor de sobrepor preto. Essa identificação documental não substitui o ensaio elétrico da peça recebida.

O firmware principal só forma leituras válidas com temperatura. Para adiantar a bancada da porta, foi criado um **diagnóstico isolado**, em `firmware/diagnostico-porta/`, que lê GPIO27 com INPUT_PULLUP, debounce de 50 ms e serial a 115200 baud. Não utiliza rede, configuração privada, credencial ou API. Nenhum valor de temperatura foi fabricado. O projeto principal, API, banco e migrations foram preservados; não foram trocadas tecnologias.

O programa imprime tempo desde o boot e sinal elétrico HIGH/LOW. Não chama esses estados de porta aberta/fechada antes de conferir a correspondência física. O desenho das ligações segue o GPIO27/GND já previsto no projeto; o [pull-up interno](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/gpio.html) permite esse ensaio com contato seco sem o resistor externo reservado à sonda.

## Resultados realmente executados

| Etapa | Resultado | Evidência |
| --- | --- | --- |
| Compilação do diagnóstico | Aprovada, saída 0; plataforma espressif32 6.12.0 e alvo esp32dev | [compilacao.json](evidencias/2026-11-18-diagnostico-porta/20261118T042152Z/compilacao.json) e [log](evidencias/2026-11-18-diagnostico-porta/20261118T042152Z/compilacao.log) |
| Gravação autorizada | Aprovada, saída 0; escrita/verificação de hash do esptool e reinício via RTS | [gravacao.json](evidencias/2026-11-18-diagnostico-porta/20261118T042512Z/gravacao.json) e [log sanitizado](evidencias/2026-11-18-diagnostico-porta/20261118T042512Z/gravacao-sanitizada.log) |
| Inicialização e entrada sem conexões | Aprovada: banner do diagnóstico e oito amostras HIGH em captura de 8 s | [serial.json](evidencias/2026-11-18-diagnostico-porta/20261118T042615Z/serial.json) e [linhas sanitizadas](evidencias/2026-11-18-diagnostico-porta/20261118T042615Z/serial-sanitizada.log) |
| Jumper GPIO27/GND | Aprovado posteriormente: oito registros LOW com a ponte b10–b20, conforme montagem informada pelo usuário | [serial.json da ponte](evidencias/2026-11-18-diagnostico-porta/20261118T045620Z-ponte/serial.json) e [log sanitizado](evidencias/2026-11-18-diagnostico-porta/20261118T045620Z-ponte/serial-sanitizada.log) |
| Retirada da ponte | Aprovada: oito registros HIGH, preservando GND→a20 e D27→a10 segundo o usuário | [serial.json do retorno](evidencias/2026-11-18-diagnostico-porta/20261118T050453Z-retorno-high/serial.json) e [log sanitizado](evidencias/2026-11-18-diagnostico-porta/20261118T050453Z-retorno-high/serial-sanitizada.log) |
| Sensor e ímã | Não executado | F03 permanece pendente |
| Temperatura, ingestão, alertas físicos e geladeira | Não executados nesta etapa | Protocolo principal pendente |

A compilação indicou 21.472 bytes de RAM estática e 269.861 bytes de aplicação flash; são estimativas do compilador, não medições dinâmicas. Não foram adicionadas bibliotecas ao ambiente existente. O binário fica em `.tools/firmware-build-diagnostico-porta/`, ignorado. Seu SHA-256 e os hashes do código/configuração compilados constam no JSON de gravação; o commit de base era `8ba8baa80503d0c1f29d688754f951e09bf3adaf`, anterior à inclusão destes novos arquivos.

## Autorização e método

Antes da escrita, foi explicado que o diagnóstico substituiria o programa da placa. O usuário respondeu **“Autorizo; conectei somente o ESP32”**, sem sensores ou jumpers. A COM3 estava presente com status OK. Não foi gravado o firmware principal de ingestão; a placa permanece com o diagnóstico temporário.

Comandos executados a partir da raiz, usando o ambiente local existente:

```powershell
. .\scripts\common-firmware.ps1
& $script:FirmwarePython -m platformio run -d firmware/diagnostico-porta -e esp32dev
& $script:FirmwarePython -m platformio run -d firmware/diagnostico-porta -e esp32dev -t upload --upload-port COM3
```

O upload ocorreu entre **04:25:12 e 04:25:31 UTC**. A captura posterior, de **04:26:15 a 04:26:24 UTC**, utilizou PySerial já instalado no ambiente do PlatformIO: COM3/115200, DTR liberado, pulso RTS/EN para reiniciar o programa e leitura limitada a 8 s. O banner foi observado; os registros tinham uptime de 26 a 7027 ms e todos indicaram HIGH. Uptime não é timestamp UTC de medição. A serial foi fechada ao final, sem deixar monitor ocupando a porta.

Logs integrais da gravação e bytes seriais ficam privados em `.tools/hardware/`. O upload apresenta MAC, que foi substituído por marcador na cópia pública. Para a captura serial, somente linhas previstas do diagnóstico foram publicadas. Não publicar os arquivos integrais, segredos ou identificadores exclusivos. As fotos da conversa não foram copiadas para o Git nesta etapa.

## Situação após a etapa

**A placa está executando o diagnóstico GPIO27.** A escrita e sua inicialização foram comprovadas. A ponte com jumper também foi testada, conforme o incremento abaixo. Isso não comprova sensor, temperatura ou integração HTTP/SQLite. F01 permanece parcial para o firmware principal; F03 está pendente; F02 e F04–F12 também não foram concluídos. Não houve build/teste novo de backend, pois seu código não mudou.

Próximo passo: desligar USB, selecionar somente um par SP1006/ímã, ligar os dois fios do contato entre **GPIO27 (D27) e GND**, conferir a montagem antes de energizar e observar aproximação/afastamento do ímã. Não atribuir polo positivo/negativo a esse contato; não ligá-lo a VIN/12 V. Manter a sonda desconectada enquanto falta o resistor correto. O sensor deve ser ensaiado antes de marcar F03 como aprovado.

Houve assistência de IA na preparação do diagnóstico, pesquisa primária, compilação, gravação autorizada, captura e documentação. O usuário realizou a conexão física e forneceu a identificação das peças. Não foram inventados dados, montagem concluída ou resultados do sensor.

## Incremento posterior: ponte entre as fileiras 10 e 20

O usuário informou GND em a20 e D27 em a10. Foi orientado a inserir um jumper macho-macho entre b10 e b20, com USB desligado; depois declarou que conectou para o teste. A montagem não foi certificada apenas por fotografia: a leitura física seguinte foi usada para verificar o resultado esperado da entrada.

Entre **04:56:20 e 04:56:28 UTC**, foi aberta a COM3 a 115200 baud, dado um pulso RTS/EN e capturada a saída por 8 s, sem gravar firmware novamente. O critério foi definido antes da leitura: banner do diagnóstico e pelo menos três registros, todos `LOW`. Foram observados **oito registros LOW**, com uptime entre 27 e 7027 ms; o teste passou. Fonte C++ com mesmo SHA-256 da gravação anterior, commit de referência `9fdd613df52932a48ae5a45ecb1df814583b52a0`.

O resultado é compatível com a ligação de GPIO27 a GND pela ponte, em contraste com os oito HIGH da captura anterior sem conexões. São capturas separadas, após reinícios; não representam uma transição contínua filmada nem um ensaio de sensor. A serial foi fechada ao final. Não houve API, banco, temperatura ou firmware principal nesta verificação.

O usuário informou que os dois fios do sensor ainda estão encapados e que possui apenas alicate comum ou tesoura. A retirada da ponte foi verificada no incremento seguinte. A preparação das pontas e o teste do SP1006/ímã continuam pendentes; não inserir isolamento plástico como se fosse contato elétrico nem manter a ponte em paralelo ao sensor, o que impediria observar a abertura do contato.

## Incremento posterior: retorno a HIGH após retirar a ponte

Após a orientação de desligar USB e retirar apenas o jumper macho-macho b10–b20, o usuário informou que retirou e reconectou. A COM3 estava presente com status OK. Antes da captura, o critério foi definido como banner e pelo menos três registros, todos `HIGH`.

Entre **05:04:53 e 05:05:01 UTC de 18/11/2026**, uma nova captura de 8 s após pulso RTS/EN registrou o banner e **oito HIGH**, de uptime 27 a 7027 ms. Resultado aprovado, sem erro de captura. O hash da fonte corresponde ao mesmo programa gravado anteriormente; commit de referência `c238d9a1d51f6f978658e3fbbec20ec9fd3a8c36`. A serial foi fechada ao final e não houve nova gravação, API ou banco.

Foram comprovadas as duas condições da entrada usando jumper: ligação ao GND produz LOW e retirada produz HIGH, coerente com INPUT_PULLUP. As três capturas HIGH inicial/LOW com ponte/HIGH após retirada ocorreram em reinícios distintos; não são registro contínuo de transição, medida de latência, teste de debounce ou resposta de um sensor magnético. F03 e os ensaios térmicos/integração continuam pendentes.

Próximo passo: USB desligado, conferir as pontas dos dois fios do SP1006 e a ferramenta disponível, preparar somente os terminais necessários e só então ligar o contato entre as fileiras 10 e 20, preservando os dois jumpers do ESP32. A ponte macho-macho já foi retirada e não deve ser recolocada em paralelo ao sensor.
