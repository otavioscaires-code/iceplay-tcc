# ICEPLAY — cronograma oficial e plano de execução

Atualizado em **19/10/2026**, a partir do cronograma fornecido pelo aluno nesta conversa. Período: **22/09 a 01/12/2026**, terças-feiras, **11 encontros**. A versão funcional completa deve estar pronta em **24/11**; **01/12** é apresentação e validação.

Este documento substitui a proposta de datas da seção 9 do planejamento de 13/10. Registra metas de execução; não atribui aprovação do professor, atividades ou commits a datas passadas.

## Cronograma do professor e aplicação ao ICEPLAY

| Data | Etapa oficial | Entrega demonstrável do ICEPLAY / situação em 19/10 |
| --- | --- | --- |
| 22/09 | Planejamento da implementação | Escopo, prioridades e arquitetura registrados posteriormente na base de 13/10. Falta confirmar com o professor a forma de validação IoT sem hardware e fechar as regras de alerta. |
| 29/09 | Preparação do ambiente | Ambiente, estrutura e Git local existem. **Primeiro commit e GitHub continuam pendentes**; nenhum commit/publicação foi autorizado. |
| 06/10 | Banco de dados | Modelo de geladeiras e leituras, PK/FK, migrations e SQL de criação disponíveis atualmente. O SQL foi gerado e executado em banco isolado em 19/10. Não é evidência de entrega em 06/10. |
| 13/10 | Estrutura do sistema | Tela inicial, navegação, rotas, backend e conexão possuem evidências da base. |
| 20/10 | Funcionalidade principal I | Demonstrar cadastro pela interface, consulta, edição, exclusão quando permitida, validação e persistência após reiniciar. Levar README, modelo/SQL, evidências e pendências de Git/hardware. Cadastro tem testes aprovados; aceite é do professor. |
| 27/10 | Funcionalidade principal II | Meta: ingestão/simulador já verificados, histórico consultável e regras essenciais de alerta implementadas com parâmetros explícitos. Demonstrar temperatura, porta, origem, dois timestamps e proteção do histórico. |
| 03/11 | Integração | Fluxo completo visível: cadastrar → emitir simulação → persistir → visualizar temperatura/porta/histórico → gerar e consultar alerta. Verificar erros e integração entre UI, API e SQLite. |
| 10/11 | Testes | Executar matriz funcional e de falhas, corrigir erros e registrar resultados. Incluir entrada inválida, indisponibilidade, reinício, atraso, origem e ausência de dados. Evitar iniciar funcionalidades centrais nesta semana. |
| 17/11 | Refinamento | Melhorar interface, teclado/acessibilidade, mensagens, segurança da implantação e desempenho medido. Corrigir regressões e ensaiar demonstração. |
| 24/11 | Versão final | Sistema completo no escopo aceito, banco, código, UML atual, instruções, evidências organizadas e documentação acadêmica conforme as exigências da instituição. Congelar o escopo. |
| 01/12 | Apresentação/validação | Demonstrar a versão final, explicar decisões/tecnologias, resultados e limitações. Não planejar a conclusão da implementação para esse dia. |

## Prioridades imediatas

1. **20/10: alinhar escopo e validação com o professor.** O aluno informou em 19/10 que ainda não conversou sobre o uso de simulador. Confirmar se a validação final exige ESP32/sensores ou aceita o protótipo com simulação declarada. Se hardware for obrigatório, organizar sua disponibilidade imediatamente e integrar/testar antes da semana de refinamento.
2. **Regularizar Git e demonstrar a funcionalidade I.** Preparar revisão do primeiro commit com os arquivos reais e evidências, obter a autorização explícita do aluno e definir remoto/publicação. Não fabricar commits ou datas anteriores. Não enviar SDK, bancos, caches ou arquivos pessoais.
3. **Validar o acesso móvel e avançar no histórico.** O painel de últimas leituras já apresenta temperatura, porta, origem e horários; o modo móvel HTTPS foi verificado em software, mas falta executar o roteiro no iPhone físico. Depois, implementar histórico com filtros por geladeira, período e origem, paginação e visualização na página. Consulte os relatórios do painel e da etapa móvel de 19/10.
4. **Fechar e implementar as regras de alerta.** Definir limites de temperatura, duração de porta aberta, ausência de leituras, início do monitoramento e resolução/deduplicação. Parâmetros de protótipo precisam ser identificados; não atribuir validade sanitária a números sem fundamento.
5. **Escrever em paralelo.** Nesta pasta não foram encontrados arquivos formais do TCC ou artigo na auditoria de 19/10. Localizar material existente ou iniciar a consolidação, sem esperar o software terminar.

## Plano interno até 03/11 — proposta, não promessa de execução

| Período | Trabalho prioritário | Critério de conclusão |
| --- | --- | --- |
| 19–20/10 | Fechar demonstração de cadastro, evidências, pendências documentais e decisões do orientador | Aluno consegue executar, reproduzir e explicar o cadastro; decisões de hardware e Git registradas. |
| 21–22/10 | API de histórico | Filtros validados, paginação limitada, ordem temporal definida, origem preservada e testes reais. |
| 23–24/10 | Interface de monitoramento | Temperatura, porta, origem e horários vindos da API; estados sem dados, atraso e erro apresentados corretamente. |
| 25–26/10 | Regras e registro de alertas | Cenários de temperatura, porta e ausência verificados; sem amostras inventadas ou alertas duplicados. |
| 27/10 | Demonstração da funcionalidade II | Evidência das funcionalidades essenciais e lista honesta de correções. Se a meta não estiver viável, renegociar o recorte antes dessa aula. |
| 28/10–02/11 | Integração e ajustes do fluxo completo | Reproduzir cenário de ponta a ponta e corrigir os problemas encontrados antes de 03/11. |

Esses intervalos dependem da disponibilidade do aluno, do aceite do escopo e das regras de alerta. Datas passadas sem evidência não são retroativamente consideradas entregues. O avanço deve ser revisto a cada terça-feira.

## Documentação e evidências semanais

Cada entrega deve conter objetivo, comportamento executável, comandos, resultado observado, evidência datada e limitações. Uma captura isolada ou contagem de asserções não comprova o sistema inteiro.

Até 20/10: problema, objetivos, escopo e requisitos. Até 27/10: arquitetura, banco, contratos e UML. Até 03/11: implementação e metodologia de verificação. Em 10/11: resultados reais e falhas/correções. Em 17/11: discussão, limitações, artigo e revisão. Em 24/11: documentos consolidados conforme orientação institucional.

## Limite do que foi comprovado

Os testes atuais comprovam software e persistência local. O rótulo `Hardware` de uma fixture não comprova equipamento físico. O simulador não foi aprovado pelo professor como substituto do hardware até esta atualização. Voz e notificações externas permanecem opcionais, fora do trabalho prioritário.
