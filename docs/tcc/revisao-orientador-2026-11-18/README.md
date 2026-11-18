# Revisão técnica solicitada pelo orientador

Material preparado em **18/11/2026** para incorporar as observações do professor ao TCC. O [complemento Word editável](ICEPLAY_Revisao_Tecnica_Orientador.docx) tem 15 páginas, seis figuras, um quadro comparativo, uma tabela de resultados, sumário automático e listas preenchidas de figuras e tabela. Todas as páginas exportadas pelo Word foram conferidas visualmente.

A monografia que o professor recebeu **não foi localizada**. O aluno informou que um amigo a encaminhou e não soube indicar o arquivo. Este complemento e as minutas atualizadas não substituem aquela versão: é necessário obter o Word exato antes de aplicar os ajustes finais de paginação e preservar as alterações do grupo.

## Atendimento das observações

| Solicitação | O que foi preparado e o que ainda falta |
| --- | --- |
| Requisitos, casos de uso e classes | O [material de 17/11](../materiais-modelagem-2026-11-17/README.md) já contém 16 RF, 12 RNF, oito casos e seis classes. A [minuta da monografia](../monografia.md) agora incorpora chamadas e figuras de casos de uso, arquitetura e classes. |
| Modelo de dados e DER | Novo [DER de chaves e cardinalidades](figuras/der-chaves-cardinalidades.png), também em [SVG](figuras/der-chaves-cardinalidades.svg), conferido com o SQL das cinco migrations em SQLite somente em memória. O [dicionário completo](esquema-relacional.json) registra seis tabelas de domínio, 49 colunas e sete FKs. `UltimaLeituraId` é marcador, sem FK. |
| Figuras numeradas e chamadas no texto | A minuta contém nove figuras com fontes e datas. O Word deste complemento tem seis figuras, campos SEQ e chamadas REF. A numeração deve ser adaptada ao inserir na monografia completa. |
| Prints do software e do iPhone | Usadas capturas reais preservadas, com a origem dos dados e datas nas legendas. A [foto do histórico no iPhone](figuras/foto-iphone-historico-09-11-2026.jpg) foi copiada sem alteração de bytes; sua [procedência](foto-iphone-procedencia.json) distingue a data do registro da ausência de data EXIF. Não é teste do leitor QR posterior ou de sensores. |
| Sumário e listas | Sumário e duas listas automáticas foram atualizados no Microsoft Word existente. Não há listas opcionais vazias neste complemento. O sumário da monografia enviada ao professor continua pendente de acesso ao arquivo. |
| Referências e citações | [Referências externas](../referencias.md) normalizadas e separadas dos apêndices. O contrato de alertas foi deslocado para o Apêndice A da minuta; a consulta e o escopo de leitura estão em [fontes consultadas](fontes-consultadas.md). Conferir também as citações do Word original. |
| Repetições e siglas | Limitações físicas concentradas na validação e conclusão, mantendo a informação necessária no resumo/metodologia. DOM acrescentado e explicado; OAuth não consta na lista de siglas do sistema. A expressão permanece no título original da RFC bibliográfica. |
| Título no fim da página | Estilos do complemento usam “Manter com o próximo”; paginação conferida. O subtítulo “3.4 MODELO DE DADOS” citado pelo professor não corresponde à numeração da minuta disponível e precisa ser corrigido no Word original. |
| Revisão da norma ABNT | Conferência assistida por IA com o guia oficial UNIP de 2025 e a página da biblioteca. A4, margens, fontes, espaçamentos, títulos, legendas, campos e páginas do complemento conferidos. Isso não é certificação ABNT nem aceite do orientador. |
| Comparação com mercado ou novidade | Seção 2.5 da minuta e Quadro 1 do complemento com análise documental de Sitrad Pro e testo Saveris 2. Sem teste dos produtos, preços, superioridade comercial ou alegação de ineditismo. A contribuição é a integração acadêmica inspecionável e verificável. |
| Implementar, executar e testar | Nova [rodada real de software](../../evidencias/20261118T220205Z-revisao-orientador/rodada.json): build sem avisos/erros, 149 testes JavaScript e dez verificadores aprovados. Os registros incluem HTTP, SQLite isolado, persistência após reinício e regras temporais. Sensores e ensaio na geladeira permanecem pendentes. |
| Conclusão | [Texto revisado](conclusao-revisada.md) e capítulo 5 da minuta. Reconhece o teste elétrico GPIO27 com jumper, distingue firmware compilado do diagnóstico gravado e mantém a integração física como objetivo a concluir neste TCC. |

## Como incorporar ao Word do grupo

1. Obter com o amigo a versão exata enviada ao professor e trabalhar em uma cópia, preservando o original.
2. Revisar o texto com o aluno/orientador e inserir as figuras junto de sua discussão. Manter fonte, data e identificação de simulação. Os diagramas são modelos preparados nas datas indicadas, não screenshots antigos.
3. Usar estilos de títulos vinculados à numeração multinível. Em **Parágrafo → Quebras de linha e de página**, manter subtítulos com o próximo parágrafo; não resolver com linhas em branco.
4. Inserir legendas pelo Word e usar referência cruzada nas chamadas. Atualizar a numeração global após inserir no documento do grupo.
5. Atualizar sumário e listas pelo menu **Referências**. No Word para Windows, `Ctrl+A` e `F9` atualizam campos do corpo; conferir também cada sumário/lista e os campos de cabeçalhos. Remover listas opcionais que continuarem sem entradas.
6. Exportar a versão completa para PDF e conferir todas as páginas, referências, citações, listas, margens, tabelas e imagens. O guia institucional e a orientação do professor prevalecem; não atribuir ao complemento a revisão de páginas que não foram recebidas.

## Evidências e limites

O [relatório da etapa](../../etapa-revisao-orientador-2026-11-18.md) contém comandos e resultados. O [resumo de software](../../evidencias/20261118T220205Z-revisao-orientador/resumo-software.json) liga cada contagem ao JSON correspondente. A [verificação documental](verificacao-documental.json) registra estrutura, hashes e conferência do Word. Os resultados não medem cobertura total, precisão térmica, disponibilidade ou redução de perdas.

A API também foi iniciada com SQLite isolado vazio, recebeu explicitamente uma geladeira e seis leituras `Simulacao`, gerou episódio por regra configurada e foi consultada nas rotas reais. O Chrome mostrou a página por acessibilidade. A captura gráfica nativa falhou por timeout; **não foi produzida nova screenshot** dessa execução. O [registro HTTP da interface](../../evidencias/20261118T220205Z-revisao-orientador/interface/estado-api.json) é evidência de execução, distinta das imagens históricas.

Não houve novo ensaio físico, consulta serial, gravação da placa, instalação de dependências ou mudança de firewall/certificados. O banco de uso e as migrations foram preservados. A assistência de IA está registrada em [uso de IA](../../uso-de-ia.md). A próxima revisão da conclusão deve incorporar os resultados reais do DS18B20, contato magnético e teste de ponta a ponta na geladeira.
