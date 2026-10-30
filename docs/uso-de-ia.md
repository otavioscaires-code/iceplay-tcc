# Registro de assistência por IA

## Sessão de 13/10/2026

Foi utilizado Codex como assistente de desenvolvimento, com agentes auxiliares para proposta de planejamento, backend mínimo e frontend. A assistência incluiu inspeção do ambiente, consulta à documentação técnica oficial, geração e revisão de arquivos, execução de comandos e verificações da base.

O aluno deve estudar o código, reproduzir a execução, validar as decisões com o orientador e seguir as regras de declaração de IA da instituição. Este registro não atribui ao aluno um histórico de implementação manual que não ocorreu. Não foram inventadas referências científicas, autoria humana, leituras físicas nem ensaios em geladeira real.

As evidências de HTTP, compilação e banco comprovam somente a execução do software nas condições registradas. Quando o simulador existir, seus resultados deverão ser identificados como simulação. O relatório técnico e o TCC deverão distinguir assistência de ferramenta, decisões compreendidas pelo aluno, verificações de software e experimentos físicos.

Nenhum commit ou publicação está autorizado nesta sessão. O repositório local pode ser inicializado e os arquivos preparados; os commits dependem de autorização explícita.

## Sessão de 15/10/2026

Foi utilizado Codex como assistente na evolução do cadastro de geladeiras, com agentes auxiliares para backend, interface, verificação HTTP e documentação. A assistência incluiu inspeção da base existente, implementação das operações de cadastro/listagem/consulta/edição/exclusão, contratos de entrada e saída, tratamento de falhas de banco, interface e atualização das instruções.

Foram executados restauração/compilação, checagem de alterações pendentes do modelo EF, verificações sintáticas JavaScript e PowerShell, repetição dos testes anteriores, inspeção SQLite e integração HTTP do CRUD. O resultado final do CRUD foi 807 asserções em 177 requisições; são verificações estruturais e de estado, não 807 cenários independentes. A base passou novamente em 13 verificações, o SQLite em 12 e o navegador em 14. A inspeção do navegador usou fixture em banco isolado, exercitou cadastro, consulta, edição e exclusão com cancelamentos, indisponibilidade real da API, reinício e apresentação móvel; ao terminar, a fixture foi excluída e a saúde confirmou zero registros. A comparação SHA-256 confirmou a preservação dos 23 arquivos protegidos, incluindo as evidências originais de 13/10. Os resultados e limites estão em `etapa-2026-10-15.md` e nos arquivos reais em `evidencias/2026-10-15`.

A primeira tentativa do verificador HTTP falhou ao interpretar bytes de ProblemDetails como string. O teste foi corrigido para decodificar UTF-8, a tentativa inicial foi preservada e a suíte foi executada novamente com sucesso. Esse histórico é registrado como correção real da ferramenta de teste, sem inventar execução aprovada na primeira tentativa.

Não houve nova dependência nem migration nesta etapa. Fixtures de teste não são cadastros de uma instalação comercial e não representam medições. Não foram executados ensaios com ESP32, DS18B20 ou sensor de porta. O simulador e a ingestão continuam planejados.

Este registro descreve assistência de IA e execução verificada, sem atribuir ao aluno uma implementação manual fictícia. Cabe ao aluno revisar o código e os resultados, reproduzir a execução, compreender contratos, validação, persistência e limitações, e declarar esse apoio conforme as regras da instituição. Não houve commits, criação de remotos ou publicação; essas ações continuam dependendo de autorização explícita.

## Sessão de 17/10/2026

Foi utilizado Codex com agentes auxiliares para revisão crítica dos arquivos existentes, ajuste limitado da mensagem de cancelar edição, parametrização da pasta de evidências do verificador CRUD, execução de verificações e documentação. O cadastro já implementado em 15/10 foi reutilizado; não foi inventada uma nova implementação ou autoria manual nesta sessão.

Foram executados setup/build, nova verificação da base e integração HTTP CRUD com bancos isolados. Os relatórios próprios desta sessão estão em `evidencias/2026-10-17`; os timestamps UTC são preservados, mesmo quando a data UTC já é 18/10 e a data local de São Paulo ainda é 17/10. A compilação registrada teve zero avisos e zero erros; a base passou em 13 verificações e o CRUD em 807 asserções, distribuídas em 177 requisições. Asserções não são cenários independentes nem experimentos físicos.

A pasta de evidências passou a ser escolhida explicitamente para a nova rodada. A inspeção SQLite passou em 12 verificações e a interface em 15, incluindo cadastro, consulta, cancelamentos, edição, indisponibilidade real da API, reinício, persistência de nome/localização e viewport móvel de 375 pixels. O relatório do navegador registra uma asserção prematura logo após reload, repetida após aguardar a consulta assíncrona; a observação final confirmou persistência, sem defeito de produto identificado. A fixture foi excluída e a saúde voltou à contagem zero. As comparações confirmaram a preservação de 23 arquivos protegidos e dos 23 arquivos de evidências de 15/10. Os resultados completos estão em `etapa-2026-10-17.md`.

Fixtures identificadas como teste não são dados de instalação comercial ou medições de sensores. Os resultados anteriores foram preservados como históricos; não foram renomeados ou atribuídos à data desta sessão. Não foram acrescentadas dependências, migrations, ingestão, simulador ou integração física nesta revisão.

Também foi iniciado o sistema pelo script normal `run.ps1`, com consultas reais de saúde e lista na porta 5080: HTTP 200, SQLite conectado e banco de uso vazio, sem inserir fixtures. O diff foi conferido sem erros; o repositório permanece com zero commits e sem remotos. Não houve commit ou publicação.

O aluno deve revisar e reproduzir o que utilizar na defesa, compreender os contratos e a persistência, e declarar a assistência conforme as normas institucionais. Commits e publicação continuam dependendo de autorização explícita.

## Implementação de leituras iniciada em 17/10 e verificada em 19/10/2026

Foi utilizado Codex na implementação de ingestão de temperatura/porta, origem e dois timestamps, consulta por ID, migração aditiva, restrição de exclusão com histórico e simulador PowerShell pela mesma API. Houve agentes auxiliares na sessão iniciada em 17/10; a verificação específica de leituras foi concluída em 19/10. A existência dos arquivos antes disso não foi tratada como teste aprovado.

Em 19/10, foram executados o verificador de leituras, a inspeção SQLite, a geração e execução de SQL em banco novo isolado, backup e execução normal. O resultado de leituras foi 339 asserções aprovadas em 75 requisições registradas, com quatro leituras fixture preservadas somente no banco isolado. Duas foram enviadas realmente pelo simulador; a origem Hardware de uma fixture testa o contrato, sem comprovar um sensor físico. A inspeção SQLite passou em 12 verificações. Não houve seed de dados no banco de uso.

O aluno forneceu o cronograma oficial e informou que ainda não alinhou o uso do simulador com o professor. Foram atualizados o plano de entregas, as pendências de Git/hardware, a documentação da etapa e o limite entre software comprovado e funcionalidades futuras. Não foram encontrados arquivos formais de TCC/artigo nesta pasta; isso não afirma inexistência de material fora dela.

A inspeção visual nova foi bloqueada pela política de acesso do navegador. Não houve contorno ou alegação de teste visual aprovado; o novo aviso de exclusão 409 permanece pendente de conferência visual. Relatórios, comandos e limites estão em `etapa-2026-10-19.md`. Não houve novas dependências, commits, remoto ou publicação, nem criação de histórico retroativo.

## Painel de últimas leituras — 19/10/2026

Foi utilizado Codex para inspecionar e evoluir a base com uma consulta agregada de últimas leituras e uma seção responsiva na interface existente. O escopo foi limitado ao painel, conforme pedido do aluno; histórico, limites, alertas e notificações não foram implementados juntos. O aluno escolheu 60 segundos como referência visual de leitura desatualizada, sem equipará-la a desconexão ou temperatura inadequada. Não houve nova dependência, migration ou seed.

Foram executadas compilação (zero avisos/erros), integração do painel (70 asserções, 29 requisições registradas e um POST pelo simulador), 12 testes do módulo JavaScript e regressões da base (13), cadastro (807 asserções/177 requisições) e leituras (339/75). A conferência no navegador passou em 17 registros, incluindo repetição após correção de cache dos assets, viewports de 375/1280 pixels, queda/reinício reais e estado real de saúde. A comparação SHA-256 de 119 arquivos protegidos não encontrou diferenças. Detalhes e evidências estão em `etapa-painel-2026-10-19.md`.

Os testes HTTP usaram banco isolado; a interface usou uma cópia consistente desse banco, sem inserir fixtures no banco de uso. Leituras enviadas realmente pelo simulador continuam sendo simulação. A origem Hardware nas fixtures é uma declaração de teste, não ensaio físico. A verificação do navegador desta nova etapa foi possível em uma nova aba HTTP autorizada; isso não altera o registro histórico do bloqueio anterior. A primeira inspeção visual revelou assets antigos em cache; a correção foi verificada e a captura anterior preservada. As verificações são de software e viewports, sem comprovar uso em aparelho físico, sensores ou eficácia de alertas.

Esta sessão não atribui ao aluno autoria manual fictícia nem ensaios que não ocorreram. Cabe ao aluno estudar, reproduzir, revisar e declarar a assistência conforme as regras da instituição. Não houve commits, remotos ou publicação.

## Acesso móvel local — 19/10/2026

O aluno pediu avançar no uso pelo celular e confirmou iPhone na mesma rede. Codex inspecionou código/rede e implementou modo opcional HTTPS, código compartilhado de operador, cookies, CSRF, restrição de sub-rede, scripts de preparação/execução/firewall e melhorias de toque/navegação, preservando a arquitetura e o banco. Não houve nova dependência ou migration. A assistência incluiu consulta à documentação oficial Microsoft/Apple, escrita/revisão, execução de testes e documentação; não se atribui ao aluno uma implementação manual fictícia.

A integração móvel passou em 82 asserções/61 requisições registradas e um envio do simulador; cliente de acesso em 8 testes com DOM/fetch controlados; estado do painel em 12. Regressões: base 13, cadastro 807/177 requisições, leituras 339/75 e painel 70/29 mais simulador. A UI teve 9 verificações em navegador real com cópia SQLite isolada, incluindo criação/edição/exclusão de fixture e viewports de 320/390/844/1280 px. Isso não é execução no Safari/iPhone ou login TLS em navegador real. Foram preservadas as tentativas com falha de certificado e de codificação do coletor, corrigidas e repetidas; a preparação idempotente também foi corrigida e verificada.

A sessão não é administradora: a regra de firewall não foi aplicada, e instalar/confiar no certificado e validar no iPhone são ações pendentes do aluno. Não houve instalação automática de confiança, liberação pública, dados de sensores físicos, commits ou publicação. Os detalhes e limites estão em `etapa-mobile-2026-10-19.md` e no roteiro do iPhone. O aluno deve revisar, compreender, reproduzir e declarar a assistência conforme as regras institucionais.

## Atualização semanal

Registrar data, ferramenta/modelo quando conhecido, objetivo da assistência, arquivos afetados, decisões revisadas pelo aluno, comandos/testes reproduzidos e limitações. Não preencher retroativamente atividades que não tenham ocorrido.
