# Preparação do firmware e montagem

Relatório fechado em 13/11/2026. As compilações ocorreram em 12/11, conforme timestamps dos relatórios. **Não houve gravação, leitura física ou envio de uma placa.**

O firmware em `firmware/esp32` usa o alvo `esp32dev` para ESP32 clássico, DS18B20 de três fios no GPIO4 e contato reed passivo no GPIO27. Implementa conversão assíncrona, validação de sensor/CRC, debounce, WiFi/SNTP, HTTPS com CA, credencial por geladeira, UUID imutável no reenvio e buffer RAM limitado. A API/arquitetura foram preservadas. Parâmetros não foram criados automaticamente no banco de uso.

As ferramentas de compilação foram instaladas em `.tools`, sem PATH permanente ou driver. PlatformIO 6.1.18, plataforma 6.12.0, pacote Arduino ESP32 `3.20017.241212+sha.dcc1105b` (core 2.0.17), toolchain `8.4.0+2021r2-patch5`, OneWire 2.3.8 e DallasTemperature 4.0.5. São dependências do firmware; a API e o frontend não receberam pacotes adicionais.

## Comandos e resultados reais

`scripts/install-firmware-tools.ps1` foi executado com Python 3.12.14 do runtime disponível, após instalação local de `platformio==6.1.18`. A repetição do instalador preservou o ambiente e executou o CLI. Os cinco scripts PowerShell passaram na análise sintática.

`scripts/verify-firmware.ps1 -EvidenceDirectory docs/evidencias/2026-11-12-pre-hardware/firmware-aceite` passou em duas compilações:

| Perfil | Resultado | Uso estático informado pelo compilador |
| --- | --- | --- |
| `verificacao`, sem configuração privada | Sucesso; binário 680176 bytes | RAM 40804 / 327680; aplicação flash 678657 / 1310720 |
| `esp32dev`, cópia isolada com rede/credencial sintéticas habilitadas | Sucesso; binário 936048 bytes | RAM 47708 / 327680; aplicação flash 929469 / 1310720 |

A segunda compilação confirma também o código/link que poderia ser eliminado na configuração desabilitada. O verificador não copia `config.local.h` de uso. O gerador foi exercitado com aspas/barra no SSID e certificado público efêmero; recusou sobrescrever o arquivo, credencial inválida e destino fora das pastas privadas. O hash da fonte verificada é `B93526F8D1A5948E0678FB93C2E519E43E2A2C4829E119C8D5F0BCFA962AAB10`.

Houve dois avisos na biblioteca OneWire 2.3.8, linhas 599/600, por tokens adicionais em `#undef`; a compilação terminou com sucesso. Não se declara compilação de firmware sem avisos. Não foram alteradas fontes de terceiros. Uma tentativa intermediária encontrou quebra de linha inválida antes de `-or` no gerador PowerShell; foi corrigida e o fluxo completo repetido. Rodadas e logs anteriores foram preservados.

## Materiais preparados e pendências

`firmware/README.md` contém instalação, configuração privada, compilação, gravação e serial. `hardware/montagem.md` define componentes/quantidades, ligações e conferência da peça recebida. `hardware/protocolo-ensaio.md` contém 12 casos físicos ainda marcados pendentes.

Ainda é necessário conferir placa/conversor USB/cabo com dados, polaridade do contato e fios da sonda, montar, gravar e testar na geladeira. RAM dinâmica/TLS, latência, perdas por polling/buffer, alimentação, precisão térmica e reconexão real não foram medidas. A compilação e os testes de software não substituem essas verificações.
