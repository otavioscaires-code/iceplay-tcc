# Diagnóstico isolado da entrada de porta

Preparado em 18/11/2026 para adiantar a bancada enquanto o resistor de 4,7 kΩ do DS18B20 ainda não foi retirado. O firmware principal em `../esp32/` foi preservado: ele só forma leituras para a API com uma temperatura válida. Este programa temporário permite conferir a entrada GPIO27 pela serial, sem temperatura, rede, credenciais ou banco.

**Estado de 18/11/2026:** compilação/gravação autorizadas, boot observado, oito registros `HIGH` sem conexões, oito `LOW` com ponte b10–b20 e oito `HIGH` após retirar somente a ponte, conforme montagem informada pelo usuário. São capturas separadas após reinícios. Ver [relatório e evidências](../../docs/etapa-diagnostico-porta-2026-11-18.md). Entrada verificada nos dois estados; sensor/ímã ainda pendentes. F01 permanece parcial porque o firmware principal de ingestão ainda não foi gravado; F03 permanece pendente.

## Ferramentas existentes

Mesmo alvo `esp32dev`, plataforma fixa `espressif32@6.12.0` e framework Arduino do firmware principal. Não requer biblioteca adicional. Build em `.tools/firmware-build-diagnostico-porta`, ignorado. Não possui `config.local.h` nem requer os segredos do projeto.

Na raiz, em PowerShell 7.5+:

```powershell
. .\scripts\common-firmware.ps1
& $script:FirmwarePython -m platformio run -d firmware/diagnostico-porta -e esp32dev
```

O comando abaixo **substitui o programa da placa**. Só executar após autorização do responsável e conferência da COM/montagem. Inicialmente, manter sensores e jumpers desconectados dos GPIOs:

```powershell
& $script:FirmwarePython -m platformio run -d firmware/diagnostico-porta -e esp32dev -t upload --upload-port COM3
& $script:FirmwarePython -m platformio device monitor -p COM3 -b 115200
```

COM3 é a porta confirmada nesta máquina, não uma garantia para outro computador. Saídas de gravação podem conter MAC; guardar integralmente apenas em pasta privada ignorada e publicar somente evidência sanitizada. Este roteiro não autoriza antecipadamente a gravação.

## Como interpretar o diagnóstico

O GPIO27 é entrada com pull-up interno, como no firmware principal. O programa informa `uptime_ms` (tempo desde inicialização, **não horário UTC**), `GPIO27=HIGH entrada_liberada` ou `GPIO27=LOW entrada_em_GND`. Após mudança, exige 50 ms estáveis e também imprime uma linha a cada segundo. Esses textos descrevem o sinal elétrico: não afirmam que uma porta real está aberta/fechada ou que um sensor está íntegro.

Primeiro observar a entrada sem conexões. Depois, com a pinagem conferida e fazendo as ligações sempre sem alimentação, pode-se testar um jumper entre GPIO27 e GND. Esse teste verifica a entrada; **não é ensaio do sensor magnético**. O jumper só deve ser aplicado a GPIO27 configurado como entrada, não a uma saída ou alimentação. Conferir a montagem antes de energizar.

O usuário identificou **Giltar SP-1006**. O [fabricante confirma código SP1006, sensor de sobrepor preto, contato NA](https://giltar.com.br/produto/sensor-de-sobrepor-preto-giltar/); a polaridade e a resposta da peça recebida ainda não foram medidas. Para o contato passivo de dois fios, usar um fio no GPIO27 e outro no GND, sem polaridade entre eles, mantendo a sonda desconectada. O ímã não possui ligação elétrica. Fazer a montagem sem USB e conferir antes de energizar; não aplicar 12 V por causa do campo de um anúncio. Aproximar/afastar o ímã e anotar sinal, posição, distância observada, repetição e falhas. Sem temperatura, este diagnóstico não cria leitura nem alerta na API.

Registrar separadamente: inicialização do programa de diagnóstico, resposta ao jumper e resposta ao ímã. Nenhum desses passos isolados encerra a integração completa sensor → API → SQLite → interface. Depois dos ensaios, o firmware principal precisará ser configurado/gravado e testado com os dois sensores.

Referência: [GPIO/INPUT_PULLUP da Espressif](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/gpio.html), fonte do firmware principal e [montagem do projeto](../../docs/hardware/montagem.md). A preparação teve assistência de IA; montagem e resultados físicos só devem ser registrados quando executados.
