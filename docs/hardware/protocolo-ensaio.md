# Protocolo de validação física

**Preparado em 12/11/2026; primeira verificação USB parcial em 16/11/2026.** O objetivo é verificar o caminho sensor → ESP32 → HTTPS/API → SQLite → interface/alertas. Compilar, executar um simulador ou declarar origem Hardware não substitui estes ensaios. O [reconhecimento USB na COM3](../etapa-usb-2026-11-16.md) não encerra F01 nem comprova comunicação do firmware com sensores/API.

Em **18/11/2026**, a [consulta serial ao ROM](../etapa-serial-2026-11-18.md) passou: ESP32-D0WD-V3/revisão 3.1 e flash 4 MB. Não houve gravação ou boot do firmware ICEPLAY. O teste é evidência física de comunicação serial, com alcance limitado; mantém F01 parcial.

Posteriormente no mesmo dia, o [diagnóstico isolado GPIO27](../etapa-diagnostico-porta-2026-11-18.md) foi gravado com autorização e iniciou: oito amostras HIGH sem conexões. O ímã/contato ainda não foi testado. Esse resultado não encerra F01 para o firmware principal nem F03 para o sensor.

Às 04:56 UTC, a ponte de jumper b10–b20, com GND→a20 e GPIO27→a10 informados pelo usuário, produziu oito LOW. Às 05:04 UTC, após retirar somente a ponte e reconectar, foram capturados oito HIGH. Entrada aprovada nas duas condições, em capturas separadas após reinícios. O sensor/ímã não foi conectado e F03 segue pendente. Os registros estão no relatório de diagnóstico, sem alterar evidências anteriores ou atribuir teste contínuo/debounce a essas capturas.

## Identificação antes de iniciar

Atualização de **23/11/2026**: contato SP1006 ligado conforme foto/relato do usuário, com D27→a10 e GND→a20. O [ensaio do diagnóstico](../etapa-sensor-porta-2026-11-23.md) registrou oito HIGH após orientação de manter o ímã afastado e oito LOW após o usuário confirmar as peças juntas. São capturas separadas após reinícios. F03 continua incompleto: retorno ao afastar novamente, repetição e correspondência nas leituras do firmware principal/API ainda pendentes. Não houve nova gravação, aquisição de temperatura ou envio físico.

Registrar data, responsável, versão/commit do software, versão do firmware, modelo e identificação da placa/sonda/reed, cabo/fonte, GPIOs, polaridade da porta, posição da sonda/ímã, geladeira utilizada e condições de uso. Registrar parâmetros ativos e intervalo de aquisição. O cadastro deve permitir separar o ensaio das três leituras Simulacao já existentes.

Usar horário UTC nos registros técnicos e hora local identificada nas anotações. Fotografar a montagem sem credenciais, senha WiFi, código de acesso ou dados pessoais. Salvar logs, consultas e backup consistente. Definir com o orientador uma duração de observação que permita discutir estabilização, aberturas e recuperação; registrar a duração efetivamente realizada, não uma duração presumida.

## Casos de ensaio

| Caso | Procedimento previsto | Critério observável | Situação |
| --- | --- | --- | --- |
| F01 USB e firmware | Identificar a COM, compilar, gravar e abrir serial | Gravação confirmada e inicialização sem segredo no log | Parcial: USB/ROM e gravação/boot de diagnóstico GPIO27 aprovados; firmware principal de ingestão ainda pendente |
| F02 Temperatura em bancada | Conferir três fios, resistor e conversão | Valor válido repetível pelo dispositivo e resposta 201 na API; desconectar sonda não gera zero/-127 como leitura válida | Pendente |
| F03 Porta | Aproximar/afastar ímã; conferir polaridade | Estado debounced corresponde à posição observada e aparece em leituras posteriores; anotar latência/limitações | Pendente |
| F04 Rede e UTC | Conectar WiFi de 2,4 GHz, sincronizar e enviar por HTTPS | Certificado validado, dois timestamps coerentes, dispositivo vinculado; sem ignorar TLS ou fabricar UTC | Pendente |
| F05 Ponta a ponta | Consultar última leitura e histórico no iPhone | Mesmos IDs, temperatura, porta e origem da leitura persistida; foto e resposta HTTP correspondentes | Pendente |
| F06 Temperatura e faixa | Observar variação real da sonda ou usar faixa de ensaio explicitamente identificada | Abre um episódio fora da faixa, não duplica em amostras sucessivas, encerra com amostra dentro da faixa; não confundir ajuste de faixa com falha térmica real | Pendente |
| F07 Porta por duração | Manter porta/ímã aberto durante tolerância e coletar novas amostras | Episódio após sequência observada; fechamento confirma normalização. Não prolongar aberturas incompatíveis com o uso do equipamento | Pendente |
| F08 Ausência | Interromper alimentação/comunicação do ESP32, mantendo API ligada | Depois do prazo configurado, worker registra ausência sem novo POST; tela atualiza no próximo ciclo. Temperatura/porta anteriores não permanecem como situação confirmada | Pendente |
| F09 Recuperação | Restabelecer comunicação | Nova amostra recente encerra ausência; reenvio com mesmo UUID mantém um registro; buffer limitado tem perdas explicitadas | Pendente |
| F10 Reinício da API | Reiniciar com cópia/backup preservado | Cadastros, leituras, credenciais e episódios permanecem; iPhone reconecta sessão; placa continua com credencial persistida | Pendente |
| F11 Revogação | Revogar credencial e tentar novo envio | 401 na ingestão; nova emissão/configuração necessária, sem perda das leituras anteriores | Pendente |
| F12 Observação na geladeira | Instalar de modo removível e acompanhar pelo período acordado | Série real identificada, posição/condições e lacunas registradas; sem prometer precisão não medida | Pendente |

A resposta visual inclui aquisição nominal de 10 s, avaliação de regras a cada 1 s e atualização do painel a cada 15 s, além de rede/conversão. Não é uma garantia de tempo real estrito. Porta é amostrada e operações HTTP podem atrasar o polling; registrar aberturas curtas que o conjunto não detectar.

## Comparação térmica e análise

Se houver termômetro de referência, registrar modelo, identificação, resolução, estado de calibração conhecido, posição relativa e método de comparação. Calcular diferenças usando pares de observações efetivamente coletados e explicitar sincronização/estabilização. Sem referência apropriada, relatar funcionamento do registro e tendência observada; não declarar calibração, erro máximo experimental ou exatidão obtida. A especificação do fabricante não é resultado medido pelo TCC.

Para cada caso, preencher resultado esperado, observado, evidência vinculada, passou/falhou/não executado e correção/reteste quando necessário. Não usar “100% aprovado” sem definir o conjunto executado. Análise de disponibilidade depende do período real e das perdas registradas, inclusive buffer RAM limitado e tempo em que o servidor ficou desligado.

## Evidências de entrega

Criar nova pasta em `docs/evidencias/<data>-hardware/` para relatório, fotos sem segredos, capturas do iPhone, respostas HTTP e dados exportados. Banco/backup e configuração da placa continuam privados e ignorados pelo Git. Referenciar o commit efetivamente utilizado; não fabricar commits retroativos. Preencher conclusão do TCC/artigo apenas depois de revisar esses resultados com o orientador.
