# Montagem prevista do protótipo

Estado em 12/11/2026: preparação de software e conexões **previstas**. Não houve posse/montagem confirmada nesta etapa. Fotos de anúncios não substituem a identificação da peça recebida.

Atualização de **16/11/2026**: fotos reais identificaram placa ESP32 DEVKITV1 com CP2102; após instalação autorizada do driver, o Windows reconheceu COM3 com status OK. As ligações dos sensores abaixo continuam previstas, sem ensaio. Ver [primeiro reconhecimento USB](../etapa-usb-2026-11-16.md).

Em **18/11/2026**, o esptool confirmou comunicação com ESP32-D0WD-V3/revisão 3.1 e flash 4 MB pela COM3. O usuário informou somente a placa conectada. Sensores/pinagem e montagem continuam pendentes; não houve gravação. Ver [consulta serial](../etapa-serial-2026-11-18.md).

Atualização posterior: o usuário identificou o contato como Giltar SP-1006 e informou que o resistor de 4k7 ainda não está em mãos. O [diagnóstico GPIO27](../etapa-diagnostico-porta-2026-11-18.md) foi compilado, gravado com autorização e iniciou sem sensores; a resposta ao ímã ainda precisa ser ensaiada. A ligação de contato passivo GPIO27/GND abaixo serve ao diagnóstico isolado; manter a sonda desconectada nesta etapa.

## Componentes para uma geladeira

| Componente | Quantidade necessária | Conferência |
| --- | --- | --- |
| ESP32 DevKit com módulo ESP WROOM 32 clássico | 1 | Alvo preparado `esp32dev`; conferir modelo/conector recebidos. |
| Sonda DS18B20 de três fios | 1 | Identificar VDD, DQ e GND pela documentação do fornecedor, sem presumir apenas as cores. |
| Contato magnético passivo reed com ímã | 1 par | Dois fios de contato seco, sem saída alimentada. Kit com cinco pares é excedente, não necessário. |
| Resistor **4,7 kΩ / 4k7 / 4700 Ω**, 1/4 W, 5% | 1 | Pull-up de dados. **47R é 47 Ω e não é o valor deste circuito.** Reservas são opcionais. |
| Protoboard | 1 | Conferir espaço para a largura da placa; jumpers macho/fêmea permitem posicioná-la ao lado. |
| Jumpers macho/macho e macho/fêmea | 1 pequeno conjunto de cada | O conjunto precisa permitir as conexões abaixo; não depende de comprar centenas. |
| Cabo USB com dados | 1 | Micro USB se for o conector da placa escolhida; confirmar ao receber. |
| Alimentação USB | 1 | O computador pode alimentar na bancada; fonte própria somente conforme a necessidade da montagem. |
| Fixação removível e isolamento das conexões | Conforme montagem | Organizar fios sem comprimir/ferir a vedação da porta. Caixa definitiva após conferir dimensões. |

Não usar a indicação “12 V” de um anúncio como autorização para aplicar 12 V no ESP32. Primeiro confirmar se o sensor é contato seco passivo. Sensor eletrônico com LED/saída alimentada precisa de outro circuito e não faz parte desta ligação. ESP32 e sensores usam referência comum de GND; a linha de dados recebe pull-up para **3,3 V**.

## Ligações lógicas

Os nomes são **GPIOs**, não posições numeradas do conector da placa:

```text
ESP32 3V3 ────────┬──────────────── DS18B20 VDD
                 │
               [4,7 kΩ]
                 │
ESP32 GPIO4 ─────┴──────────────── DS18B20 DQ
ESP32 GND ──────────────────────── DS18B20 GND

ESP32 GPIO27 ─── contato reed ───── ESP32 GND
                    ⇅
                 ímã na porta (sem fio)
```

O resistor fica entre **DQ e 3V3**, não em série com VDD. O contato fecha/abre o caminho entre GPIO27 e GND. O pull-up interno mantém nível alto quando o contato está aberto. O firmware padrão interpreta contato fechado como porta fechada; confirmar a polaridade com ímã/multímetro antes de usar. Se for a polaridade oposta, gerar a configuração com `-InverterPorta` e repetir o teste.

Com tudo sem alimentação, conferir pinagem e continuidade. Depois, validar primeiro o USB/porta serial, depois a temperatura, depois o reed e só então rede/API. Não realizar ligação na rede elétrica da geladeira. Placa, protoboard e conexões ficam fora da área fria/úmida; apenas sonda e parte apropriada do sensor de porta ficam na posição de medição. Registrar a posição real, pois uma leitura da sonda não representa automaticamente todo o volume interno.

A montagem deve seguir a [documentação do ESP32](https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf), a [do DS18B20](https://www.analog.com/media/en/technical-documentation/data-sheets/ds18b20.pdf) e a especificação da sonda/contato efetivamente recebidos. O esquema é lógico, não desenho de PCB ou fotografia de execução.
