# Três figuras com descrições atualizadas

Atualização documental preparada na noite de **24/11/2026**, a partir dos modelos e registros existentes. As três primeiras imagens enviadas pelo aluno correspondem às Figuras **1, 3 e 10** da monografia. As duas imagens seguintes são partes da Tabela 4 e foram usadas para conferir a coerência dos resultados. A tabela já reconhecia os ensaios parciais; seu conteúdo foi preservado.

| Figura no TCC | Arquivos PNG e SVG | Conteúdo atualizado |
| --- | --- | --- |
| 1 — Diagrama de casos de uso do ICEPLAY | [PNG](figuras/casos-de-uso.png), [SVG](figuras/casos-de-uso.svg) | Mantém os oito casos e os dois atores; o rodapé reconhece a bancada USB parcial e o envio físico à API pendente. |
| 3 — Arquitetura e fluxo de dados do ICEPLAY | [PNG](figuras/arquitetura.png), [SVG](figuras/arquitetura.svg) | Separa o simulador exercitado do ESP32 com diagnóstico USB parcial. A ligação física à API permanece tracejada e não demonstrada. |
| 10 — Síntese dos ensaios parciais de bancada | [PNG](figuras/validacao-parcial-bancada.png), [SVG](figuras/validacao-parcial-bancada.svg) | Reúne GPIO27/jumper de 18/11, contato/ímã e DS18B20 de 23/11, incluindo as duas tentativas posteriores sem temperatura válida. |

Os dois diagramas são **modelos atualizados**, e a terceira figura é **um quadro documental produzido a partir dos logs**. Não são novas capturas de execução, fotografia de instalação ou ensaios feitos em 24/11. As fontes anteriores continuam preservadas em suas pastas históricas. [Hashes e procedência](procedencia.json).

O quadro distingue a leitura inicial de oito temperaturas de 24,4375 °C da falha posterior, com zero temperaturas válidas e oito erros em cada tentativa. As contagens são registros em capturas separadas, não testes independentes. A repetição anormal de linhas GPIO nas tentativas com falha tem causa não determinada e não foi convertida em contagem de ensaios.

Continuam pendentes fixação/reteste da sonda, gravação e inicialização do firmware principal, envio de medições físicas à API, conferência do fluxo no SQLite/interface e operação na geladeira. A figura não determina defeito da sonda nem valida precisão, resposta térmica, estabilidade, latência ou debounce.

[Legendas prontas para copiar](legendas.txt). A numeração 1, 3 e 10 corresponde à cópia atual do TCC; conferir se o grupo inserir ou remover outras figuras. A nova cópia Word/PDF fica em `.tools/revisao-tcc-2026-11-24/entrega-figuras/`, privada, com a versão anterior preservada. [Relatório de conferência](../../etapa-figuras-atualizadas-2026-11-24.md).
