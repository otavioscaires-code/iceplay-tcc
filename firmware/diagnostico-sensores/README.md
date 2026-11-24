# Diagnóstico isolado dos sensores

**Estado posterior ao teste com a mão:** duas capturas sem temperatura válida, ambas com oito mensagens de sonda não pronta. Usuário confirmou USB desligado e relatou todos os fios da sonda soltos; recuperação da montagem e reteste pendentes. Programa da placa preservado, sem nova gravação. As oito temperaturas iniciais continuam documentadas, mas a resposta térmica não foi validada. [Resultados e fixação proposta](../../docs/etapa-leitura-temperatura-2026-11-23.md#tentativa-de-aquecimento-com-falha-e-conexões-soltas).

Programa usado na bancada de temperatura, após o ensaio básico do contato magnético na noite de 23/11/2026. Com autorização específica do usuário, foi gravado na COM3 às 01:03 UTC de 24/11 (22:03 de 23/11 em São Paulo). A captura posterior confirmou boot e oito leituras de 24,4375 °C sem mensagens de erro. **Este é o programa atual da placa**, sem Wi-Fi/API; variação térmica e desconexão ainda não foram ensaiadas. Ver [gravação, aquisição e limites](../../docs/etapa-leitura-temperatura-2026-11-23.md). Usa os mesmos GPIOs e versões de bibliotecas do firmware principal, preservando `../esp32/` e `../diagnostico-porta/`.

**Compilação executada e aprovada**, saída 0: [resultado de 24/11 às 00:12 UTC, ainda noite de 23/11 em São Paulo](../../docs/evidencias/2026-11-23-diagnostico-sensores/20261124T001240Z-compilacao/compilacao.json). Dois avisos na OneWire 2.3.8; estimativas de 21.544 bytes de RAM estática e 275.297 bytes de aplicação flash. Naquele momento ainda não havia gravação ou leitura; os resultados posteriores estão no relatório acima. Ver [relatório da preparação](../../docs/etapa-diagnostico-sensores-2026-11-23.md).

O diagnóstico anterior só lê GPIO27. O programa principal só inicia os sensores com configuração privada válida e forma amostras após sincronização UTC. Este diagnóstico separado permite verificar a sonda pela USB antes de configurar rede/credencial, sem enfraquecer aquelas regras. Não possui WiFi, API, configuração privada, banco ou simulação; não imprime MAC ou o identificador ROM exclusivo da sonda.

**Compilação, gravação e leitura são etapas distintas, com evidências próprias.** A gravação deste diagnóstico foi autorizada e executada na noite de 23/11. Para reproduzir a montagem, confirmar VDD/DQ/GND pela identificação do fornecedor e conferir as conexões antes de alimentar, sem assumir apenas as cores.

## Ligações e interpretação

- DS18B20 em três fios: VDD → 3V3, GND → GND, DQ → GPIO4/D4.
- Resistor de 4,7 kΩ entre DQ e 3V3, conforme [montagem prevista](../../docs/hardware/montagem.md). Não é em série com VDD.
- Contato passivo entre GPIO27/D27 e GND, com pull-up interno e debounce programado de 50 ms.
- Fazer alterações com o USB desconectado. A leitura elétrica da porta permanece HIGH/LOW; associação à porta real depende da instalação.

Há tentativa nominal de temperatura a cada dois segundos, com conversão não bloqueante de 800 ms a 12 bits. Exige uma sonda, família DS18B20, CRC de ROM válido e alimentação em três fios. A biblioteca valida scratchpad/CRC ao obter temperatura. Ausência/falha, conversão incompleta, valor não finito, desconexão e representação fora de −55 a 125 °C geram mensagem de erro, sem publicar temperatura substituta.

Somente depois de conversão válida é emitido `uptime_ms=... TEMPERATURA_C=...`. As quatro casas são formato de saída, não exatidão experimental. `uptime_ms` é tempo desde inicialização, não timestamp UTC. O GPIO é informado a cada segundo e nas mudanças estabilizadas. A configuração do debounce não comprova tempo de resposta medido.

## Compilar

Na raiz do repositório, com o ambiente PlatformIO já preparado:

```powershell
. .\scripts\common-firmware.ps1
& $script:FirmwarePython -m platformio run -d firmware/diagnostico-sensores -e esp32dev
```

Build em `.tools/firmware-build-diagnostico-sensores`; dependências de projeto em `.tools/firmware-libdeps-diagnostico-sensores`. São OneWire 2.3.8 e DallasTemperature 4.0.5, já adotadas no principal; nenhuma biblioteca nova é necessária.

## Gravar e ensaiar depois da conferência

O comando abaixo substitui o programa da placa. **Só executar depois de autorização explícita e da conferência da montagem/COM.** Não é parte do comando de compilação.

```powershell
& $script:FirmwarePython -m platformio run -d firmware/diagnostico-sensores -e esp32dev -t upload --upload-port COM3
& $script:FirmwarePython -m platformio device monitor -p COM3 -b 115200
```

Guardar logs integrais de upload apenas em `.tools`, porque esptool pode revelar MAC. Registrar boot, reconhecimento da sonda, amostras válidas repetidas, resposta à mudança térmica segura e falha ao desconectar a sonda com alimentação desligada. Não confundir esse diagnóstico com ingestão, precisão/calibração térmica, teste na geladeira ou conclusão de F02/F03 do [protocolo físico](../../docs/hardware/protocolo-ensaio.md).

O desenvolvimento teve assistência de IA; compilação, gravação e leitura física devem ser registradas separadamente, com resultados realmente executados.
