# Atualização das três figuras da monografia — 24/11/2026

O aluno enviou cinco imagens e solicitou as três primeiras com descrições atualizadas. Elas correspondem às Figuras 1, 3 e 10; as duas últimas são trechos da Tabela 4. A revisão anterior já descrevia os ensaios parciais no texto e na tabela, mas as imagens embutidas ainda continham afirmações antigas de sensores sem ensaio.

## Entrega

Foram preparados [três PNGs e suas fontes SVG, com legendas](tcc/figuras-atualizadas-2026-11-24/README.md). O diagrama de casos de uso mantém os oito casos/atores. O diagrama de arquitetura separa o simulador do ESP32, reconhece o diagnóstico USB parcial e reserva o tracejado para o envio físico à API, ainda não demonstrado. O quadro de bancada reúne registros anteriores de 18 e 23/11, incluindo a falha posterior da sonda, com datas locais e sem contar registros como testes independentes.

A nova cópia Word/PDF, privada em `.tools/revisao-tcc-2026-11-24/entrega-figuras/`, parte da entrega-v3. Foram substituídas somente as três partes de imagem selecionadas e ajustados os parágrafos de apresentação, a legenda da Figura 10 e as fontes das três figuras. Os dados das tabelas de resultados e pendências foram preservados. O Word do grupo, a entrega-v3, as demais fotografias/capturas e os modelos históricos permanecem intactos.

As figuras foram produzidas com assistência de IA e rasterização vetorial, não por geração de falsas fotografias ou screenshots. O quadro é uma síntese documental preparada em 24/11, não uma coleta física nova. [Procedência e hashes das fontes](tcc/figuras-atualizadas-2026-11-24/procedencia.json).

## Conferência executada

O renderizador fornecido pela habilidade de documentos foi tentado, mas não encontrou `soffice.exe` no PATH. Foi utilizado o processamento de arquivos pelo Microsoft Word já instalado, sem controle de navegador ou instalação de ferramenta. Campos, sumário e listas foram atualizados e o PDF foi exportado. As 37 páginas foram rasterizadas por pypdfium2 para inspeção; visão geral e páginas 7, 20, 23 e 30 ampliadas conferidas.

| Conferência | Resultado observado |
| --- | --- |
| Documento Word/PDF | 37 páginas; sem mensagem de erro de campo no PDF |
| Índices e campos | Um sumário, duas listas, 121 campos; sentidos/contagens preservados |
| Numeração | 12 campos de figura e cinco de tabela; Figura 10 atualizada na lista e no corpo |
| Imagens | 13 formas inline; exatamente três imagens substituídas; demais bytes preservados |
| Tabelas | Conteúdo das células preservado em relação à entrega-v3 |
| Originais | Hash do Word original e da entrega-v3 conferidos; fontes históricas preservadas |
| Figuras finais | Três PNGs em alta resolução e três SVGs; sem sobreposição observada |

O Word converteu campos simples em complexos e regenerou identificadores internos de marcadores do sumário. A conferência comparou o significado e a quantidade dos campos, preservando os SEQ e suas contagens, em vez de exigir identificadores automáticos idênticos. O relatório desta entrega está em uma [nova pasta de evidência documental](evidencias/2026-11-24-figuras-atualizadas/conferencia-documental.json). Os horários UTC de 25/11 da geração das figuras e exportação correspondem à noite de 24/11 em São Paulo.

Não houve nova suíte de software, gravação, captura serial, ensaio físico ou alteração da aplicação/banco/migrations. O estado físico vigente continua sendo diagnóstico USB parcial, falha posterior da sonda, USB desligado e fixação/reteste pendentes. Não se certifica conformidade ABNT nem aprovação do orientador. A divergência do nome do orientador permanece pendente; os dados do Word foram preservados.
