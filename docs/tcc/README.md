# Escrita acadêmica do ICEPLAY

**Revisão vigente em25/11/2026:** monografia do grupo recebida em24/11 e preservada; revisão privada incorpora principal físico, alertas, ausência/recuperação, persistência, instalação removível doméstica e painel real no iPhone. [Resultados do ensaio](../etapa-integracao-fisica-2026-11-25.md) e [figuras atuais](observacao-geladeira-2026-11-25/README.md). Primeira janela com geladeira desligada e abertura relatada de cerca de10s constam com correções explícitas. Os materiais de18/11 e as minutas abaixo conservam seus estados históricos; não substituem o Word/PDF privado atual. Nome do orientador da capa continua pendente de confirmação.

[Revisão técnica solicitada pelo professor, 18/11/2026](revisao-orientador-2026-11-18/README.md): complemento Word de 15 páginas, DER com chaves/cardinalidades, imagens preservadas, comparação documental Sitrad Pro/testo Saveris 2, conclusão e minutas revisadas. Sumário e listas automáticas do complemento atualizados e páginas conferidas. O Word exato enviado ao professor pelo amigo do aluno ainda precisa ser recebido para a integração e revisão final de paginação/citações. [Nova rodada de software e relatório](../etapa-revisao-orientador-2026-11-18.md): build sem avisos/erros, 149 testes JavaScript e dez verificadores aprovados, sem novo ensaio físico.

[Mapa de evidências das 11 aulas, conferido em 18/11/2026](mapa-evidencias-cronograma-2026-11-18.md): relaciona datas previstas, registros reais e lacunas; inclui a distinção entre a validação parcial do iPhone em 09/11 e o leitor QR posterior ainda pendente de ensaio no aparelho.

[Versão PDF do mapa](../../output/pdf/ICEPLAY_Mapa_Evidencias_Cronograma_2026-11-18.pdf): cinco páginas conferidas visualmente, com as 11 etapas e links para as fontes na revisão Git do mapa. A conversão preservou a fonte textual e suas ressalvas; não executou novos testes da aplicação. [Verificação de conteúdo e procedência](../../output/pdf/ICEPLAY_Mapa_Evidencias_Cronograma_2026-11-18.verificacao.json).

Complemento de **18/11/2026**: [imagens da evolução do projeto](evolucao-visual-2026-11-18/README.md), com 15 imagens separadas, legendas/fontes, caderno PDF de 11 páginas e cópias das fontes. Distingue capturas preservadas das figuras de código/quadros gerados agora e as datas dos relatórios do primeiro commit disponível. Usar nas seções de desenvolvimento/evolução, ajustando a numeração e revisando com o orientador.

Preparação em 13/11/2026 com o estado real do código. `monografia.md` e `artigo.md` são **minutas textuais**, para o aluno revisar, compreender e discutir com Sérgio Mazini. Não são trabalho aprovado, versão Word normalizada ou resultados físicos. O RA é inserido somente na cópia privada em `.tools/documentacao-iceplay`.

Complemento de **17/11/2026**: [material de requisitos, modelagem e validação](materiais-modelagem-2026-11-17/README.md), com Word editável de 22 páginas, figuras PNG/SVG, tabelas CSV, casos de uso detalhados e resultados verificáveis de software. O Word foi preparado a partir de uma cópia do modelo institucional, preservando o original e conferindo as páginas renderizadas. É um complemento para inserir nos capítulos de Projeto/Desenvolvimento, sujeito à revisão acadêmica e ajuste da numeração; não substitui a monografia final nem os ensaios físicos.

O modelo Word enviado pelo aluno foi analisado anteriormente: capa/folhas iniciais, resumo/abstract, listas, sumário, Introdução, Fundamentação, Projeto, Desenvolvimento, Conclusão e Referências. Seu exemplo tratava de plataforma educacional, com tecnologias Java/PostgreSQL, datas e autores de demonstração. Esses conteúdos não pertencem ao ICEPLAY. O original não foi alterado; preservar sua organização institucional e substituir somente pelo conteúdo real deste projeto. Ano de entrega: 2026; campus informado: Araçatuba.

## O que já pode ser usado

- Introdução/problema/objetivos/delimitação, fundamentação de apoio e justificativa técnica.
- Requisitos, regras, arquitetura, entidades, API, software implementado e resultados dos verificadores.
- Fontes bibliográficas existentes e verificadas, com escopo de leitura em [fontes consultadas](revisao-orientador-2026-11-18/fontes-consultadas.md) e entradas externas em `referencias.md`.
- Montagem/protocolo preparados e lista dos campos que precisam de resultado físico.
- Modelo de artigo com metodologia/resultado de software e conclusão parcial.

## Fechar após os ensaios

Preencher equipamentos/montagem reais, duração/condições, observações, falhas/retestes, dados e evidências. Revisar discussão/conclusão e então resumo/abstract. Confirmar com o orientador o formato/tamanho do artigo, folhas de aprovação, exigências do curso e entrega. Não preencher aprovação, assinatura, titulação acadêmica do orientador ou ficha catalográfica por suposição. Elementos pessoais opcionais, como dedicatória/agradecimentos, devem ser escritos pelo autor se desejados.

Aplicar os estilos/títulos e sumário automático no Word, incluir as figuras atuais com fonte, conferir paginação/listas/referências e revisar cada página renderizada antes da entrega. O [guia oficial UNIP de 2025](https://unip.br/servicos/biblioteca/assets/download/manual_de_normalizacao_abnt.pdf) orienta a normalização; instruções específicas do professor prevalecem. As cópias geradas são fontes Markdown para edição; a normalização e a conferência de páginas pertencem ao fechamento acadêmico.

`scripts/prepare-tcc.py` agora copia as figuras públicas para cada nova pasta privada de minutas, conferindo seus hashes e resolvendo os links locais. Essa geração foi executada e verificada em 18/11: três minutas e nove imagens. Preservar `.tools/documentacao-iceplay`; o script não cria a monografia final em Word nem publica dados pessoais.

`../requisitos-rastreabilidade.md`, `../modelagem-atual.md`, os contratos, `../hardware/protocolo-ensaio.md` e os relatórios de etapa são os apêndices técnicos de referência. `../uso-de-ia.md` registra a assistência; o aluno permanece responsável por revisão, reprodução e defesa.
