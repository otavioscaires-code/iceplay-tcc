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

Atualização de 11/11/2026: configurações persistidas estão implementadas e verificadas; ver `docs/contrato-configuracoes.md` e `docs/etapa-configuracoes-2026-11-11.md`. Há três migrations, sendo a nova `20261109233935_AddConfiguracoesGeladeiras`, aditiva e sem seed. Não modificar as duas anteriores. A configuração tem GET/PUT e formulário, mas ainda não avalia regras/gera alertas. A próxima tarefa são regras e episódios de alertas; não recriar a configuração. Banco de uso preservado com uma geladeira, três leituras Simulacao e zero configurações. Interface nova ainda sem conferência no iPhone. O usuário está escolhendo peças por fotos, sem confirmação de aquisição ou ensaio físico.

Atualização incremental de 12/11: backend de alertas implementado com a quarta migration `20261112192436_AddAlertas`, aditiva. O contrato está em `docs/contrato-alertas.md`; testes executáveis em `tests/Iceplay.Verification` e `scripts/verify-alertas.ps1`. O relógio controlado só existe no programa de verificação, não na API. O próximo incremento integra a interface; em seguida vêm credenciais de dispositivo, firmware e documentação consolidada. Preservar todas as migrations e distinguir software, simulação e ensaio físico. Navegador local indisponível nesta conversa na tentativa de 12/11; não atribuir renderização aos testes HTTP/DOM.

Segundo incremento de 12/11: página Alertas, resumo do painel e textos de ativação integrados, com 101 testes Node e 205 verificações de páginas; ver `docs/etapa-interface-alertas-2026-11-12.md`. Não recriar esses módulos. As próximas tarefas são comunicação autenticada do dispositivo e firmware. Validação visual dos novos elementos no iPhone continua separada.

Terceiro incremento de 12/11: credenciais e ingestão idempotente implementadas; ver `docs/contrato-dispositivos.md` e `docs/etapa-dispositivos-2026-11-12.md`. São cinco migrations, incluindo `20261112194714_AddDispositivos`. Preservar campos antigos/IDs e novas colunas anuláveis ao verificar upgrades; não presumir a ordem física das colunas reconstruídas pelo SQLite. Site tem emissão/revogação explícita em Configurações; nunca registrar token em logs/evidências/Git. 112 testes Node e verificações de API/rede passaram. Próximo incremento: firmware compilado e documentação de montagem/ensaio. Sem comprovação física.

Quarto incremento, fechado em 13/11: firmware escrito e compilado em 12/11 para `esp32dev`, com exemplo desabilitado e configuração sintética habilitada em cópia isolada. Ver `firmware/README.md` e `docs/etapa-firmware-2026-11-13.md`. Ferramentas apenas em `.tools`; configuração privada `firmware/esp32/include/config.local.h` ignorada. Não sobrescrever configuração existente nem publicar binário com segredos. Montagem/protocolo em `docs/hardware/`, ainda sem resultado físico. Não instalar driver, gravar placa, alterar confiança/firewall ou afirmar funcionamento elétrico antecipadamente.
