# Protocolo de validação física

**Preparado em 12/11/2026. Nenhum resultado físico foi preenchido.** O objetivo é verificar o caminho sensor → ESP32 → HTTPS/API → SQLite → interface/alertas. Compilar, executar um simulador ou declarar origem Hardware não substitui estes ensaios.

## Identificação antes de iniciar

Registrar data, responsável, versão/commit do software, versão do firmware, modelo e identificação da placa/sonda/reed, cabo/fonte, GPIOs, polaridade da porta, posição da sonda/ímã, geladeira utilizada e condições de uso. Registrar parâmetros ativos e intervalo de aquisição. O cadastro deve permitir separar o ensaio das três leituras Simulacao já existentes.

Usar horário UTC nos registros técnicos e hora local identificada nas anotações. Fotografar a montagem sem credenciais, senha WiFi, código de acesso ou dados pessoais. Salvar logs, consultas e backup consistente. Definir com o orientador uma duração de observação que permita discutir estabilização, aberturas e recuperação; registrar a duração efetivamente realizada, não uma duração presumida.

## Casos de ensaio

| Caso | Procedimento previsto | Critério observável | Situação |
| --- | --- | --- | --- |
| F01 USB e firmware | Identificar a COM, compilar, gravar e abrir serial | Gravação confirmada e inicialização sem segredo no log | Pendente |
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
