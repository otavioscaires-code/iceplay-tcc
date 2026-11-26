# Figuras da integração física de bancada

Material preparado em 25/11/2026 a partir dos ensaios reais do firmware principal. O [relatório técnico](../../etapa-integracao-fisica-2026-11-25.md) identifica versões, condições e limites. Não representa instalação em geladeira nem execução no ambiente da apresentação.

| Arquivo | Legenda e procedência |
| --- | --- |
| `casos-de-uso-bancada.png` / `.svg` | Mesmo modelo UC01–UC08 de24/11; rodapé atualizado em25/11 para reconhecer envio físico em bancada e manter geladeira pendente. |
| `historico-bancada-18-23.png` / `.svg` | Quadro organizado originalmente em24/11; rodapé revisto em25/11 o identifica como histórico e aponta para os resultados posteriores. Não modifica linhas de logs ou fotografias. |
| `arquitetura-bancada.png` / `.svg` | Modelo atualizado da arquitetura. Percurso ESP32 → HTTPS → API → SQLite exercitado em bancada; iPhone tem confirmação manual anterior do pareamento. É um diagrama elaborado agora, não screenshot de execução. |
| `temperatura-bancada.png` / `.svg` | Gráfico das 89 aquisições físicas persistidas entre 23:04:57 e 23:19:26 UTC. Pontos preservam dados da sonda; limite de ensaio 28°C e duração do episódio térmico são explícitos. Horário local São Paulo = UTC−3h. Não representa calibração. |
| `serial-principal-transcricao.png` / `.svg` | Transcrição identificada das quatro amostras e quatro HTTP201 da captura final do principal, 22:50–22:51 UTC; IDs58–61 conferidos na API/SQLite. Não é screenshot do monitor serial ao vivo. |
| `temperaturas-bancada-230453-231928-utc.csv` | Exportação somente leitura do trecho do SQLite usado no gráfico, com IDs, valores e timestamps; sem segredos ou banco completo. |
| `manifesto.json` | Hashes, intervalo exato, origem, episódio e método. Não houve lacuna superior a15s nesse trecho exportado; isso não é uma garantia geral de disponibilidade. |

O episódio térmico2 abriu às23:05:28 UTC e encerrou às23:15:47,0317152 UTC por `CondicaoNormalizada`. Os limites permaneceram0–28°C durante o ciclo. O coletor de resfriamento posterior confirmou três amostras normais, sem apagar a janela inicial de180s ainda fora da faixa.

Capturas nativas preservadas de [Alertas/Configurações](../../evidencias/2026-11-25-firmware-principal/interface-alertas-configuracoes-real/) mostram a execução real de bancada. A captura de Alertas é anterior à normalização térmica: temperatura ainda aberta e porta já encerrada. A configuração mostra0–28°C/10s/45s/Hardware ativo. Capturas do [painel e histórico](../../evidencias/2026-11-25-firmware-principal/interface-desktop-real/) pertencem a momentos anteriores do mesmo ensaio; contagens/valores são retratos desses instantes.

Os JPEGs foram copiados sem alterar bytes. Recortes de layout no Word devem ser identificados como detalhes e conservar a imagem completa incorporada. Fotografias do aluno e monografia preenchida permanecem privadas. A IA organizou os dados e desenhou as figuras; manipulações físicas foram realizadas e relatadas pelo aluno.
