# Montagem prevista do protótipo

**Retomada em 25/11/2026:** usuário informou ter somente sonda, jumpers e protoboard. Não confirmou ferro/estanho/isolamento nem adaptador com bornes; não há recuperação da fixação demonstrada. Preparar três terminações firmes e isoladas antes de reenergizar. Uma opção é soldar cada fio a uma extensão/pino e isolar cada emenda; outra é um adaptador com terminais de parafuso independentes e identificação VCC/GND/DQ. Não soldar na protoboard branca. Manter USB desligado; leituras anteriores e falha posterior continuam com seus resultados e datas.

**Atualização posterior na noite de 23/11:** após duas capturas sem temperatura válida, o aluno confirmou USB desligado e informou que todos os fios da sonda saíram. **As posições informadas abaixo descrevem a ligação anterior; a montagem da sonda agora precisa ser restabelecida com terminações firmes.** Foi discutida soldagem de extensões/pinos com isolamento individual, ainda não realizada. Manter USB desligado até conferência. [Falha e plano de retomada](../etapa-leitura-temperatura-2026-11-23.md#tentativa-de-aquecimento-com-falha-e-conexões-soltas).

**Estado atual na noite de 23/11/2026:** aluno confirmou os passos de montagem da sonda/4k7 conforme a tabela abaixo. Com autorização específica, o diagnóstico dos sensores foi gravado e iniciou; captura USB recebeu oito temperaturas reais de 24,4375 °C, sem mensagens de erro. [Relatório, ligações informadas e limites](../etapa-leitura-temperatura-2026-11-23.md). **Placa com `diagnostico-sensores`, sem Wi-Fi/API.** Não houve foto final ou medição por multímetro de todos os pontos. Resposta térmica/desconexão e ensaio na geladeira pendentes. Os registros datados abaixo descrevem a preparação anterior, não o estado atual da placa.

**Pinagem conferida na noite de 23/11/2026:** o [anúncio da sonda WFMNEGOCIOS, item MLB7020060110](https://www.mercadolivre.com.br/sensor-de-temperatura-prova-dagua-ds18b20-cabo-1-metro/p/MLB2124686584?pdp_filters=item_id%3AMLB7020060110) foi lido no navegador, e o usuário forneceu o mesmo trecho: vermelho = VCC, preto = GND, amarelo = DQ, com pull-up de 4k7 recomendado. O resistor foi identificado visualmente pela foto como 4,7 kΩ; não foi medido. [Registro da conferência documental](../evidencias/2026-11-23-diagnostico-sensores/20261124T003635Z-pinagem-fornecedor/pinagem.json). Isso resolve a identificação do fornecedor, não comprova a montagem ou leitura da sonda. A placa ainda executa o diagnóstico de porta.

**Atualização na noite de 23/11/2026:** contato SP1006 com D27→a10/GND→a20 e fios em b10/b20 conforme foto/relato; resposta básica ao ímã repetida no [diagnóstico GPIO27](../etapa-sensor-porta-2026-11-23.md), ainda sem porta instalada/API. O usuário confirmou possuir sonda e resistor 4k7. O [novo diagnóstico dos sensores](../etapa-diagnostico-sensores-2026-11-23.md) foi compilado, não gravado. Conferência de VDD/DQ/GND da sonda, resistor e ligação térmica ainda pendentes. A placa mantém o diagnóstico de porta; desligar o USB antes das próximas ligações.

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

### Posições da protoboard confirmadas verbalmente na noite de 23/11

Preservar os fios da porta em a10/b10 e a20/b20. Com USB desconectado, usar a área livre da metade a–e para a sonda:

| Fio identificado pelo fornecedor | Função | Posição informada |
| --- | --- | --- |
| Vermelho | VCC, alimentação | b30 |
| Preto | GND, terra | b32 |
| Amarelo | DQ, dados | b34 |

Após esses três fios, o aluno confirmou os passos do resistor entre c30/c34, jumper de 3V3 para a30, jumper de GPIO4/D4 para a34 e derivação do GND existente de c20 para a32. A confirmação foi verbal, sem foto final de toda a ligação ou multímetro; a aquisição serial posterior está no relatório acima. Para reproduzir ou alterar a montagem, desligar o USB e conferir antes de energizar. O número da fileira 34 não significa usar GPIO34: o pino de dados continua sendo GPIO4/D4.

### Esquema elétrico

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
