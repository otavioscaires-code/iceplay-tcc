# Instruções para continuidade do ICEPLAY

Este repositório é o TCC ICEPLAY, um sistema IoT para monitoramento de geladeiras comerciais. Antes de qualquer alteração, leia `CONTEXTO_ICEPLAY.md`, o `README.md` e os arquivos diretamente relacionados à tarefa.

## Regras de continuidade

- Não reescreva o projeto, não troque tecnologias e não remova funcionalidades sem uma justificativa técnica registrada e aprovação explícita do responsável pelo TCC.
- Preserve a arquitetura atual: ASP.NET Core Web API, Entity Framework Core, SQLite e interface estática em HTML, CSS e JavaScript no mesmo projeto.
- Analise o código, migrations, contratos e testes existentes antes de modificar arquivos.
- Faça alterações pequenas e incrementais. Não agrupe painel, histórico, alertas, notificações e documentação em uma única mudança grande.
- Não crie dados de demonstração automaticamente no banco de uso. Dados do simulador devem ser identificados como `Simulacao`.
- Preserve migrations, scripts de verificação, evidências históricas e o banco de uso. Nunca apague ou recrie o banco para “corrigir” uma migration.
- Teste as alterações realizadas com os scripts apropriados e registre somente resultados realmente executados. Diferencie testes de software, simulação e validação física.
- Priorize a conclusão do MVP do TCC: persistência, API, interface, histórico, regras/alertas e evidências verificáveis, nessa ordem definida pela necessidade da etapa.
- Mantenha a interface responsiva e otimizada para celular, mas preserve o acesso desktop.
- Não trate a origem `Hardware` como prova de sensor físico: ela é declarada pelo emissor até existir autenticação e ensaio com hardware real.
- Não faça commits, push, publicação, alteração de firewall, instalação de certificados ou mudança de configurações do computador sem autorização explícita do usuário.
- Registre a assistência de IA de forma transparente; não invente autoria, referências científicas, ensaios físicos ou resultados.

## Verificação mínima

Após alterar backend, execute o build e os verificadores afetados, usando uma nova pasta em `-EvidenceDirectory` para não sobrescrever evidências anteriores. Para mudanças de interface, execute também os testes JavaScript correspondentes quando aplicáveis. Consulte `README.md` e `CONTEXTO_ICEPLAY.md` para os comandos existentes e suas limitações.

## Autorização vigente e plano

Em 30/10/2026, o usuário autorizou commits e pushes rotineiros de alterações concluídas e validadas. Essa autorização atende à regra acima; não é necessário solicitá-la novamente a cada etapa. Preserve bancos, segredos e evidências e não use operações destrutivas. O plano atualizado está em `docs/plano-continuidade-2026-10-30.md`. O usuário confirmou que ainda não possui hardware e ainda não validou o iPhone.

Atualização de 09/11/2026: o usuário confirmou teste parcial no iPhone (acesso, saúde, cadastro/edição, navegação, histórico vazio e atualização de página). Foram enviadas depois três leituras explicitamente Simulacao para o cadastro de teste ID 2; uma foto posterior mostrou tabela/gráfico dessas leituras no aparelho. Consulte `docs/evidencias/2026-11-09-iphone/validacao-manual.md`. Isso não comprova hardware físico. A verificação de persistência após reinício no computador e a conferência visual do novo refinamento no iPhone são verificações distintas.

O plano vigente de sequência é `docs/plano-ate-hardware-2026-11-09.md` (seis entregas de software). O usuário aprovou retirar notificação por voz do MVP em 09/11; registrar somente como trabalho futuro. A foto posterior do iPhone confirma a apresentação das três leituras de simulação na tabela/gráfico; os próximos registros devem distinguir essa evidência das verificações automatizadas e do ensaio de sensores ainda pendente.

O fechamento de software das páginas foi validado em 09/11, conforme `docs/etapa-paginas-2026-11-09.md` e as novas evidências. O reinício do servidor preservou uma geladeira, três leituras Simulacao e duas migrations. O próximo incremento funcional são configurações persistidas por geladeira; não recriar histórico ou navegação já existentes. Conferir `git log/status` para publicação e manter separada a conferência visual dos últimos refinamentos no iPhone.
