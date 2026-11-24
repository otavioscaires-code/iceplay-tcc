# Preparação da bancada de temperatura — noite de 23/11/2026

## Necessidade e escopo

Após o [fechamento da resposta básica do contato](etapa-sensor-porta-2026-11-23.md), o usuário confirmou possuir a sonda DS18B20 e o resistor correto de 4k7. Sua disponibilidade foi informada; pinagem da sonda, valor visual do resistor e montagem ainda precisam de conferência, com alimentação desligada.

O diagnóstico atualmente gravado só lê GPIO27. O firmware principal valida configuração privada e aguarda UTC antes de formar amostras. Para testar a sonda pela USB sem antecipar rede, credencial ou envio, foi preparado **`firmware/diagnostico-sensores/`**, isolado dos outros dois programas. Não houve mudança de arquitetura ou do contrato da API. `firmware/esp32/` e `firmware/diagnostico-porta/` permaneceram intactos.

O novo programa usa DS18B20 no GPIO4, resistor externo previsto entre DQ e 3V3, e contato no GPIO27/GND. Mantém os critérios de família/CRC, uma sonda de três fios, conversão não bloqueante de 800 ms e erros sem temperatura substituta. A saída numérica só ocorre após conversão válida. O registro da porta permanece elétrico HIGH/LOW, com debounce programado de 50 ms; uptime não é UTC. Não há WiFi, API, banco, segredos ou simulação. A fonte não imprime MAC ou ROM exclusivo da sonda.

## Compilação realmente executada

```powershell
. .\scripts\common-firmware.ps1
& $script:FirmwarePython -m platformio run -d firmware/diagnostico-sensores -e esp32dev
```

Execução registrada entre **24/11 às 00:12:41 e 00:13:39 UTC**, ainda **23/11 às 21:12:41–21:13:39 em São Paulo**. Resultado: **saída 0, compilação aprovada**. PlatformIO informou sucesso em 50,07 s; o intervalo externo inclui inicialização e fechamento da ferramenta.

| Item | Resultado |
| --- | --- |
| Alvo/plataforma | esp32dev / espressif32 6.12.0 / Arduino ESP32 2.0.17 |
| Bibliotecas de projeto | OneWire 2.3.8 e DallasTemperature 4.0.5, mesmas versões do principal |
| RAM estática, estimativa do compilador | 21.544 bytes |
| Aplicação flash, estimativa do compilador | 275.297 bytes |
| Avisos | Dois `extra tokens at end of #undef directive`, em OneWire.cpp linhas 599/600 |
| Gravação na placa | Não executada |
| Leitura de temperatura | Não executada |

O PlatformIO instalou cópias dessas duas bibliotecas no diretório privado de dependências do diagnóstico; não foi acrescentado outro tipo de biblioteca. Os dois avisos da versão OneWire já estavam registrados na compilação do firmware principal. Não foram alterados arquivos do fornecedor para ocultá-los. As estimativas não são medidas de consumo dinâmico ou comprovação elétrica.

- [Resultado e hashes](evidencias/2026-11-23-diagnostico-sensores/20261124T001240Z-compilacao/compilacao.json).
- [Log integral de compilação](evidencias/2026-11-23-diagnostico-sensores/20261124T001240Z-compilacao/compilacao.log).
- [Conferência dos hashes, preservação das fontes e links](evidencias/2026-11-23-diagnostico-sensores/20261124T001240Z-compilacao/verificacao-preparo.json): aprovada, com fonte/configuração/binário correspondentes, 30 links locais conferidos e compilação separada de gravação/ensaio físico.
- [Fonte do diagnóstico](../firmware/diagnostico-sensores/src/main.cpp), [configuração](../firmware/diagnostico-sensores/platformio.ini) e [instruções](../firmware/diagnostico-sensores/README.md).

Fonte: SHA-256 `9728d47caac2bf857aa4cdcbad34fba6d220ca3bec1d745a8a4b75c907e0e69b`. Configuração: `0a7f3966cf32c1f2572bc4564a77615d16169316a9bb663275764d55be6c6bde`. Binário privado: `191f4647b426432f8f7e595e995cf3d442a2da359b119ab41c7f79bccfce0c34`. A referência Git anterior à inclusão dos arquivos é `037269bec7ff6f5a493f9ad722434a5aac3cb1b3`; os hashes registram os arquivos compilados ainda não commitados naquele momento.

## Estado e próxima ação

**A placa continua com `diagnostico-porta`.** Não houve upload do novo diagnóstico, nem leitura da sonda, temperatura/API/banco, alteração de firewall/certificados ou execução de sensores pelo programa principal. F02 continua pendente e F03 parcial. Não se repetiram build/testes de backend, que não foi alterado; a verificação desta preparação é compilação para o alvo real, distinta da execução física ainda necessária.

Próximos passos: desligar o USB, conferir foto/identificação da sonda e do resistor, confirmar VDD/DQ/GND pelo fornecedor, orientar a ligação e só então obter autorização explícita para substituir o diagnóstico da placa pelo novo programa. Não pressupor pinagem apenas pelas cores e não reutilizar a autorização limitada à gravação anterior de GPIO27 como autorização desta nova escrita.

Ferramentas, builds e auxiliares em `.tools`, ignorados pelo Git. Nenhum segredo ou binário foi publicado. Preparação e registro tiveram assistência de IA, sem agentes auxiliares; ações físicas são realizadas pelo usuário. O projeto principal, banco de uso, migrations e evidências anteriores foram preservados. Não se apresenta compilação como ensaio de temperatura.

## Conferência posterior das peças e da pinagem

O usuário forneceu uma foto aproximada do resistor. As faixas significativas amarelo/violeta/vermelho, lidas no sentido indicado na foto, identificam nominal de 4,7 kΩ; não houve medição por multímetro. Depois informou fios preto, vermelho e amarelo e forneceu o link do anúncio da sonda.

A ferramenta de busca não conseguiu abrir o anúncio; a consulta pelo navegador IAB funcionou. Na descrição visível do item **MLB7020060110**, vendedor **WFMNEGOCIOS**, a seção dos fios identifica vermelho como VCC, preto como GND e amarelo como DQ, recomendando pull-up de 4,7 kΩ. O usuário também colou esse mesmo trecho. Essa é a base documental da ligação, em vez de presumir função somente pelas cores. A alimentação escolhida no projeto é 3V3, dentro dos 3,0–5,5 V informados pelo fornecedor; o resistor fica entre dados e 3V3.

[Registro documental](evidencias/2026-11-23-diagnostico-sensores/20261124T003635Z-pinagem-fornecedor/pinagem.json), criado em 24/11 às 00:36 UTC, ainda noite de 23/11 em São Paulo. Foram guardados somente fatos relevantes e fonte, sem página inteira, dados pessoais, imagens da conversa ou alteração de bytes das fotos originais. O SHA-256 da foto do resistor identifica a fonte privada, sem publicá-la.

O próximo passo orientado é, com USB desligado, posicionar vermelho em b30, preto em b32 e amarelo em b34, na metade a–e, mantendo a porta como está. A [alocação completa planejada](hardware/montagem.md) separa esse passo das ligações seguintes do resistor e dos jumpers. **Montagem térmica ainda não confirmada, novo diagnóstico não gravado e nenhuma temperatura lida.** A especificação comercial de precisão não é resultado experimental do ICEPLAY. Firmware, API, banco e configurações do computador permaneceram intactos nesta conferência; não houve novo build/teste físico, pois foram alteradas somente instruções e registros documentais.
