# Firmware ICEPLAY para ESP32

Estado de 12/11/2026: programa escrito e compilado para **ESP32 clássico ESP WROOM 32**, alvo `esp32dev`. Não foi gravado em uma placa nem ensaiado com sensores. O modelo físico, a porta USB/driver e as ligações devem ser conferidos quando as peças chegarem. O hardware usa a mesma API já utilizada pelo simulador; credencial não comprova medição física.

## Ferramentas e dependências

- PlatformIO Core 6.1.18 em ambiente Python local `.tools/platformio-venv`.
- Plataforma `platformio/espressif32@6.12.0`, framework Arduino; o pacote resolvido usa Arduino ESP32 2.0.17.
- OneWire 2.3.8 e DallasTemperature 4.0.5. São as duas bibliotecas necessárias ao DS18B20; WiFi, TLS e HTTP pertencem ao framework. A API não ganhou dependências.
- Código em `esp32/src/main.cpp`; configuração pública de formato em `esp32/include/config.example.h`. Configuração privada em `config.local.h`, ignorada pelo Git.

Neste computador as ferramentas já estão em `.tools`. Para instalar em uma cópia nova, use Python **3.12** (testado 3.12.14) e PowerShell 7.5 ou posterior, na raiz:

```powershell
.\scripts\install-firmware-tools.ps1 -Python 'C:\caminho\Python312\python.exe'
.\scripts\verify-firmware.ps1 -EvidenceDirectory docs/evidencias/sua-nova-rodada/firmware
```

O instalador não altera o PATH permanente. A primeira compilação baixa o compilador, o framework e as bibliotecas para `.tools`; as próximas reaproveitam o cache. O verificador compila um perfil sem configuração privada e uma cópia isolada com credenciais/rede sintéticas, além de testar o gerador de configuração. Não faz upload nem envia leituras. Os artefatos `.bin` ficam ignorados, inclusive os que contenham configuração local.

## Comportamento do programa

O programa lê um DS18B20 alimentado em três fios no GPIO4 e o contato passivo de porta no GPIO27 com `INPUT_PULLUP`. Uma conversão a 12 bits tem espera não bloqueante de 800 ms. A amostragem nominal é de 10 segundos, com tentativa antecipada quando muda o estado debounced da porta (50 ms). O estado registrado é o observado na coleta; isso não promete registrar todo pulso curto de abertura.

O relógio é sincronizado por SNTP (`pool.ntp.org` e `time.google.com`); a rede precisa permitir esse acesso. Sem UTC, não há envio. O timestamp usa segundos completos UTC. A API preserva a rejeição de medições futuras; conferir o relógio do computador/placa se ocorrer 400. O programa não ignora a validação de certificado, não segue redirecionamentos e usa somente HTTPS com a CA pública preparada para o IP local.

Cada amostra ganha UUID v4 e corpo imutável para reenvio. Existe **uma** amostra pendente em RAM por até 30 segundos; falhas de rede/timeout/503 usam espera progressiva de 2 a 30 segundos. 200/201 confirmam armazenamento; 401/403/409 bloqueiam envios até revisão/reconfiguração. Outros 4xx, exceto 408/429, descartam o pedido recusado, sem repeti-lo. Não há armazenamento offline completo; queda/reinício da placa perde esse buffer. O servidor preserva os dados que já recebeu.

Sensor ausente, família/CRC inválidos, modo parasita, conversão incompleta e valores fora da representação física do DS18B20 não são enviados como temperaturas fictícias. Nova descoberta ocorre nas próximas coletas. Não se substitui falha por zero, valor anterior ou valor de demonstração. Se não chegarem medições válidas, o servidor pode gerar ausência conforme os parâmetros ativos.

WiFi/TLS/HTTP usam operações com limites de espera. Durante uma requisição de rede bloqueante, a consulta do GPIO pode atrasar; abertura muito curta pode não ser registrada. Consumo dinâmico de memória, resposta elétrica, interferência, precisão, reconexão real e comportamento na geladeira **ainda dependem do ensaio físico**. Os percentuais de RAM/flash do compilador são estimativas estáticas, não medições do hardware.

## Preparar quando houver a placa

1. Confira os componentes e as [ligações lógicas](../docs/hardware/montagem.md), com a alimentação desconectada.
2. Inicie o modo móvel já preparado: `scripts/run-mobile.ps1`. O IP precisa ser o configurado no certificado; não usar `localhost` na placa.
3. Em **Configurações → Conectar ESP32**, escolha o equipamento, dê nome e confirme a emissão. Guarde a credencial exibida uma vez. Nenhuma foi emitida automaticamente no banco de uso.
4. Na raiz, execute `scripts/prepare-firmware.ps1 -GeladeiraId <ID real>`. O script pede SSID/senha e credencial sem exibi-las, incorpora somente o certificado público existente e cria `config.local.h`. Não sobrescreve arquivo privado. O padrão considera contato fechado quando o ímã está junto; `-InverterPorta` é para a polaridade oposta confirmada em bancada.
5. Compile com `scripts/run-firmware.ps1 -Acao Compilar`.
6. Confira no Gerenciador de Dispositivos a COM da placa. Execute pessoalmente, com o conjunto conectado, `scripts/run-firmware.ps1 -Acao Gravar -Porta COM3`, substituindo COM3. Não houve gravação nesta etapa.
7. `scripts/run-firmware.ps1 -Acao Monitorar -Porta COM3` abre o log a 115200 baud. O log não imprime senha/credencial; registre apenas evidências sem segredos.
8. Configure os limites/tempos reais com o orientador e selecione **Hardware** com monitoramento ativo. Escolha prazo de ausência compatível com amostragem/rede; não foi definido limite sanitário automático.
9. Execute o [protocolo de ensaio](../docs/hardware/protocolo-ensaio.md). Verificar compilação não encerra essa etapa.

Use cabo micro USB **com dados** se a placa recebida tiver esse conector. O cabo precisa enumerar a placa e permitir gravação, não apenas acender um LED. Driver depende do conversor USB da peça real; não foi instalado antecipadamente. Mantenha placa/protoboard/alimentação fora da geladeira. Não altere compressor, rede elétrica ou circuito interno do eletrodoméstico.

## Fontes técnicas consultadas

- [Alvo esp32dev no PlatformIO](https://docs.platformio.org/en/latest/boards/espressif32/esp32dev.html) e [plataforma 6.12.0](https://github.com/platformio/platform-espressif32/releases/tag/v6.12.0).
- [DS18B20, documentação do fabricante](https://www.analog.com/media/en/technical-documentation/data-sheets/ds18b20.pdf).
- [OneWire 2.3.8](https://github.com/PaulStoffregen/OneWire/releases/tag/v2.3.8) e [DallasTemperature 4.0.5](https://github.com/milesburton/Arduino-Temperature-Control-Library/releases/tag/v4.0.5).
- [WiFi Arduino ESP32](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/wifi.html).
