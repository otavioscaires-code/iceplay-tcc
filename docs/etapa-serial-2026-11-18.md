# Comunicação serial com o ESP32 — 18/11/2026

O usuário confirmou que conectou **somente o ESP32**, sem sensores, e que o LED acendeu. A primeira consulta do computador, antes dessa confirmação, não encontrou porta serial nem dispositivo CP210x presente. Após a conexão, o Windows apresentou **COM3**, `Silicon Labs CP210x USB to UART Bridge`, classe Ports e status **OK**.

## Teste efetivamente executado

Foi utilizado o **esptool.py 4.9.0**, já instalado nas ferramentas locais do PlatformIO. A consulta foi executada entre **04:09:41 e 04:09:42 UTC de 18/11/2026** (01:09 no horário de São Paulo), com código de saída **0**:

```powershell
. .\scripts\common-firmware.ps1
& $script:FirmwarePython '.tools/platformio/packages/tool-esptoolpy/esptool.py' --chip auto --port COM3 --baud 115200 --before default_reset --after hard_reset --no-stub --connect-attempts 3 flash_id
```

O comando acima identifica a operação executada. Nesta sessão, a saída integral foi redirecionada para um arquivo privado em `.tools/hardware/20261118T040941Z-serial/`, pois o esptool também apresenta MAC. Somente linhas selecionadas sem identificadores exclusivos foram copiadas para a evidência pública. Não publicar o log integral nem capturas que mostrem MAC/segredos.

| Informação consultada | Resultado real |
| --- | --- |
| Porta | COM3 |
| Processador | ESP32-D0WD-V3 |
| Revisão | v3.1 |
| Cristal informado | 40 MHz |
| Capacidade de flash detectada | 4 MB |
| esptool | 4.9.0 |
| Saída da operação | 0, consulta aprovada |

O esptool primeiro informou protocolo de detecção não suportado, alternou automaticamente e identificou o ESP32. A consulta seguinte da flash terminou com sucesso e reiniciou a placa via RTS. Esse fallback consta na saída sanitizada; não foi omitido como se a primeira tentativa tivesse identificado diretamente o processador.

A operação `flash_id` consulta a identificação da flash; `--no-stub` usa o carregador ROM sem enviar o programa auxiliar de gravação. Não foram executados `write_flash`, apagamento, modificação de eFuses ou upload de firmware. Referências: [comandos do esptool, Espressif](https://docs.espressif.com/projects/esptool/en/release-v4/esp32/esptool/basic-commands.html#read-spi-flash-id-flash-id) e ajuda `--help` da versão instalada, ambas consultadas. Não houve instalação de ferramentas/driver ou mudança de configurações de rede.

## Evidências e limites

- [Resumo estruturado](evidencias/2026-11-18-hardware-serial/20261118T040941Z/serial-resumo.json).
- [Saída sanitizada da consulta](evidencias/2026-11-18-hardware-serial/20261118T040941Z/serial-saida-sanitizada.log).
- Código de referência: `e38caf31a6243696c012de4dbbe7fc665278f31f`.

O resultado comprova comunicação serial com o processador, incluindo o caminho USB/cabo/CP2102/ROM, e a resposta da identificação de flash. Não é teste de toda a memória, estabilidade elétrica prolongada ou funcionamento dos sensores. O estado aceso do LED, isoladamente, não foi usado como critério de sucesso.

**F01 continua parcial:** gravação e inicialização do firmware ICEPLAY não foram executadas. F02–F12 continuam pendentes. Não houve leitura de temperatura/porta, credencial emitida, envio de origem Hardware ou alteração de banco de uso. A configuração privada do firmware ainda não existe. A API, as migrations e os scripts existentes foram preservados; não foi repetido build/teste de backend nesta tarefa documental/serial.

## Próxima ação

Conferir as peças e a identificação dos fios/pinos do DS18B20, resistor de **4,7 kΩ**, protoboard e jumpers antes de ligar os sensores. Fazer a montagem com USB desconectado e seguir [montagem](hardware/montagem.md) e [protocolo](hardware/protocolo-ensaio.md). Não presumir pinagem apenas pela cor dos fios. A etapa seguinte será bancada de temperatura; o contato de porta e a integração completa serão verificados progressivamente.

Houve assistência de IA na inspeção, execução da consulta, seleção de evidências e documentação. O usuário realizou a conexão física. Não foram atribuídas ao aluno montagem, gravação ou medições ainda não realizadas.
