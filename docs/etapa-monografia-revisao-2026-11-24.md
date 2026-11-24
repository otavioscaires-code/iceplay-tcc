# Revisão da monografia recebida — 24/11/2026

## Resultado e versão de origem

O aluno forneceu o arquivo **Doc_TCC 23-11.docx**, permitindo revisar uma cópia da monografia do grupo. O arquivo recebido e suas imagens foram preservados, com SHA-256 do original `3bc39c3ad7afc6a765fb7ef199f83a88e637a168470152129d51e47dbd0b55ba`. Isso resolve a indisponibilidade de uma monografia para esta revisão; não comprova que essa cópia seja idêntica à versão encaminhada anteriormente ao professor.

Foram entregues Word editável e PDF de **37 páginas**, com **12 figuras**, **cinco tabelas numeradas**, sumário e duas listas automáticas atualizados no Microsoft Word existente. As cópias preenchidas e fotografias do aluno permanecem privadas em `.tools/revisao-tcc-2026-11-24/entrega-v3/` e nas fontes preservadas da mesma pasta, porque contêm metadados do grupo. Não foram publicadas no Git. O original não foi substituído. A revisão não representa certificação ABNT ou aprovação do orientador/banca.

Referência de código utilizada: `4d07dc9aaaf744ad737cba384bfe5b41ea4bdff7`. [Conferência documental e hashes](evidencias/20261124T055906Z-revisao-monografia/conferencia-documental.json).

## Alterações realizadas

- Resumo/abstract, objetivos, firmware, resultados, limitações e conclusão agora distinguem o firmware principal de ingestão dos diagnósticos USB realmente gravados. Os objetivos mantêm a integração física como parte do trabalho atual.
- A bancada do contato/ímã e as oito temperaturas iniciais de 24,4375 °C foram incorporadas com seus limites. A tentativa posterior sem temperatura válida e o relato de fios soltos não foram omitidos. O resultado continua parcial, sem calibração ou estabilidade demonstradas.
- A nova Tabela 5 relaciona seis itens: firmware principal, DS18B20, contato reed, medições físicas na API, fluxo completo e geladeira real. Explicita o observado e o critério que falta demonstrar em cada item.
- Duas capturas reais de navegador desktop mostram Configurações e Alertas em execução com **Simulacao**, em SQLite separado. A configuração possui faixa de ensaio de 2–8 °C, porta 20 s e ausência 120 s. Não são parâmetros sanitários recomendados. O episódio térmico foi encerrado por ausência de dados recentes; não houve confirmação de normalização.
- Fotografias originais da placa/jumpers e dos fios da sonda na protoboard foram incluídas como **etapas parciais e momentos distintos**, sem apresentá-las como fotografia do circuito completo ou de instalação na geladeira.
- A Figura 12 é uma **transcrição automática identificada** das oito linhas reais de temperatura do log preservado, preparada em 24/11. Não é screenshot original de monitor serial, leitura ao vivo ou nova coleta física.
- A numeração e as chamadas de figuras foram conferidas. Os capítulos e a seção 3.4 iniciam em página nova; títulos acompanham o texto; a tabela de validação foi mantida inteira. Espaçadores vazios do corpo foram removidos sem reconstruir a capa do grupo. O recorte da imagem de Configurações é de layout do Word: o PNG completo permanece embutido, sem alteração de seus bytes.
- A grafia de Washizaki foi corrigida na citação e referência; a referência de Rescorla, já citada no texto, foi acrescentada com a data real da consulta. O hyperlink DOI com sufixo indevido foi corrigido. Foram consultadas a [página oficial do SWEBOK](https://www.computer.org/education/bodies-of-knowledge/software-engineering/resources/) e a [referência histórica RFC 8446](https://www.rfc-editor.org/rfc/rfc8446). Não se apresenta esta última como a versão normativa mais recente.
- Uma seção de rastreabilidade e assistência de IA registra a participação das ferramentas e a responsabilidade do aluno por revisão, compreensão e reprodução.

## Execução observada e conferência

O auxiliar privado iniciou a API existente apenas em loopback, com banco novo em `.tools/revisao-tcc-2026-11-24/captura-api/`. A saúde inicial registrou zero geladeiras. Foram criados um cadastro explicitamente de teste e **seis leituras Simulacao**. Após configurar o monitoramento, a API persistiu os episódios mostrados na interface. A consulta final confirmou dois episódios, um de temperatura encerrado por `SemDadosRecentes` e um de ausência aberto. [Respostas e identificação da execução isolada](evidencias/20261124T055906Z-revisao-monografia/execucao-simulacao.json).

O navegador controlado não estava disponível pelo conector; a captura foi possível na janela nativa do Chrome. Configurações e Alertas foram observados por acessibilidade e screenshots reais, salvos antes de a ferramenta interromper a tentativa adicional de abrir o log local: ela não conseguiu determinar com segurança a URL atual no Windows. O bloqueio não foi contornado por outro mecanismo de controle do navegador. Foi usado o arquivo de log preservado para produzir a transcrição documental explicitamente identificada.

O Word atualizou os campos, o sumário e as listas e exportou o PDF. As 37 páginas foram renderizadas em PNG por pypdfium2 e conferidas em visão geral; páginas 28, 32 e 33 também foram inspecionadas ampliadas. A verificação confirmou:

| Conferência | Resultado |
| --- | --- |
| Original e imagens anteriores | Hash original igual; todas as imagens originais preservadas no Word |
| Novas fotografias | Bytes originais preservados nos arquivos privados e nas partes de imagem do Word |
| Word/PDF | 37 páginas, sem mensagens de erro de campo no PDF |
| Figuras | Sequência 1–12; páginas da lista correspondem às legendas do corpo |
| Índices | Um sumário e duas listas automáticas |
| Dados da demonstração | Seis leituras, todas Simulacao; dois episódios consultados na API |
| Encerramento | Somente a API isolada desta captura foi encerrada, após conferir PID e comando |
| Código protegido | Sem alterações em backend, interface, scripts, testes ou fontes dos firmwares |

Não houve novo build, repetição da suíte de software, gravação da placa ou ensaio físico nesta revisão. As contagens de 149 testes e dez verificadores continuam atribuídas à rodada real de 18/11. Banco de uso, migrations, configuração privada da placa, evidências históricas e arquitetura foram preservados.

## Conferências ainda necessárias

O orientador indicado na monografia diverge do nome informado anteriormente na conversa. Foi solicitada confirmação ao aluno; os dados do arquivo foram preservados enquanto a resposta não chega. Dados institucionais e campos da banca devem ser conferidos pelo grupo, sem preencher aprovação ou nomes não fornecidos.

Na parte física, continuam necessários fixação e reteste da sonda, programa principal na placa, envio autenticado de medições reais, conferência no SQLite/interface e operação documentada na geladeira. Ainda faltam uma fotografia final conferida de todo o circuito e a imagem da instalação real. Essas lacunas não foram preenchidas com imagens geradas ou resultados de simulação. O estado físico vigente continua descrito em [leitura de temperatura e falha posterior](etapa-leitura-temperatura-2026-11-23.md).
