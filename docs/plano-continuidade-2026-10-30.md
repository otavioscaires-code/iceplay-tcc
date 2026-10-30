# Retomada e plano até a validação física — 30/10/2026

Este plano deriva do código, `AGENTS.md`, `CONTEXTO_ICEPLAY.md`, migrations, banco local e cronograma oficial. As datas abaixo são metas de trabalho, não aprovações do professor nem resultados de execução.

## Diagnóstico da retomada

- Arquitetura mantida: ASP.NET Core .NET 10, EF Core 10.0.12, SQLite e HTML/CSS/JavaScript no mesmo servidor.
- Existem saúde, CRUD de geladeiras, ingestão/consulta individual, simulador, últimas leituras por origem e modo HTTPS móvel local com sessão/CSRF.
- Inspeção SQLite somente leitura: integridade `ok`, sem violações de FK, uma geladeira, zero leituras e duas migrations (`InitialCreate`, `AddLeituras`). SHA-256 lógico de Geladeiras/Leituras/migrations antes do trabalho: `860564af84e6563e4c9dd3acaab3038bf2bceb1762a4536ce0edcd48971d2c5e`.
- A base local não tinha commits nem remoto. Foi localizado o repositório vazio `otavioscaires-code/iceplay-tcc` na conta GitHub conectada. O usuário autorizou commits e pushes rotineiros nesta retomada.
- O usuário confirmou: ainda não possui ESP32/sensores e ainda não validou o iPhone. Não considerar essas etapas realizadas.
- Não existem limites persistidos, alertas ou firmware. A recência visual de 60 segundos não implementa a detecção persistida de ausência.

## Dependências e critérios de aceite

| Ordem | Incremento | Dependência | Critério objetivo |
| --- | --- | --- | --- |
| 1 | Revalidar base e registrar Git | Ambiente e banco preservados | Build, verificadores existentes, testes JS e inspeção SQLite aprovados, evidências datadas e primeiro commit/push real. |
| 2 | API do histórico | Ingestão existente | GET paginado, filtros validados de geladeira/origem/período, ordem temporal estável no empate, 400/404/503 testados, reinício e banco normal preservado. |
| 3 | Histórico na interface | Contrato GET validado | Buscar/filtrar e navegar páginas no celular, estados vazio/erro e dois timestamps/origem; verificação do fluxo UI/API. |
| 4 | Configurações por geladeira | Decisão de parâmetros | Migration aditiva e API/UI para mínimo/máximo, duração da porta, prazo sem leitura e ativação do monitoramento; validações e preservação de dados testadas. Sem valores sanitários presumidos. |
| 5 | Regras e registro de alertas | Configurações e política temporal | Temperatura fora da faixa, porta aberta por duração e ausência; resolver/deduplicar episódios, separar origens e testar amostras atrasadas, reinício e relógio controlado. Ausência requer avaliação periódica mesmo sem novos POSTs. |
| 6 | Consulta de alertas e integração | Regras persistidas | Exibir alertas reais da API no celular, incluindo abertos/resolvidos e origem, com cenário completo demonstrável. |
| Paralelo | Validar Safari no iPhone | Usuário, rede, certificado e firewall | Executar roteiro `acesso-iphone.md` no aparelho, documentar login, consulta, CRUD e reconexão após reinício. Viewport desktop não vale como ensaio de iPhone. |
| 7 | Identidade/autenticação do emissor | API/regras estáveis | Credencial por dispositivo ligada à geladeira; POST autenticado por máquina sem desproteger sessão/CSRF do navegador. Testar rejeição, isolamento de equipamento, segredo fora do Git e revogação. |
| 8 | Firmware ESP32 e sensores | Hardware em mãos, contrato e rede | Ler DS18B20 e reed, tratar erro de sensor/repique/relógio UTC/rede; enviar para a API e confirmar persistência e apresentação. Não enviar erro de sensor como temperatura válida. |
| 9 | Ensaio na geladeira | Bancada funcional e acesso autorizado | Executar roteiro físico de temperatura/porta/rede/ausência, confrontar sensor com referência disponível, registrar montagem, horários, respostas, alertas e limitações observadas. |
| Contínuo | Documentação e GitHub | Cada incremento validado | Commit/push real, manual/contratos/UML coerentes, evidências e uso de IA registrados; escrita acadêmica revisada pelo aluno. |

Cada linha pode exigir mais de um incremento. Não iniciar notificações, voz ou reformulação tecnológica enquanto o núcleo estiver pendente.

## Replanejamento das terças-feiras

| Marco | Meta revisada | Risco e evidência necessária |
| --- | --- | --- |
| 03/11 — integração | Base revalidada, GitHub regularizado, histórico API/interface e começo das configurações | As metas de histórico/alertas de 27/10 não foram concluídas; relatar o recorte real ao professor. Não afirmar fluxo com alertas antes de testar. |
| 10/11 — testes | Configurações/regras/alertas integrados e testes de falhas; iPhone validado | É necessário fechar as regras e obter hardware com antecedência. Executar testes por incremento, sem esperar esta data. |
| 17/11 — refinamento | Hardware integrado e ensaios de bancada/geladeira concluídos; correções | Se hardware continuar indisponível, comunicar imediatamente o impacto ao orientador. Simulação não encerra a validação física. |
| 24/11 — versão final | Escopo funcional validado, documentação, artigo e evidências consolidados | Congelar escopo e ensaiar demonstração; reservar tempo para correções. |
| 01/12 — apresentação | Demonstrar versão final, tecnologias, execução e resultados reais | Não usar esta data como prazo de implementação. |

## Decisões a fechar antes das respectivas implementações

O aluno/orientador precisam definir a faixa de temperatura adequada ao uso da geladeira e o significado dos alertas. Implementar primeiro parâmetros configuráveis e documentar parâmetros de teste sem atribuir validade sanitária. Definir também o instante de início do monitoramento, duração de porta aberta, prazo sem leitura, critério de resolução e política para leituras atrasadas. O firmware depende do modelo da placa ESP32 e dos sensores realmente adquiridos, pinagem/eletricidade conferidas e sincronização UTC. Esses detalhes não serão inventados a partir de fixtures.

## Riscos técnicos já identificados

- O middleware remoto exige sessão/CSRF de navegador; autenticação do ESP32 será uma adição específica, preservando a proteção web.
- A API rejeita timestamps futuros sem tolerância. O relógio do ESP32 e o do servidor precisam ser tratados na fase de integração.
- O health check consulta somente Geladeiras; ingestão e esquema de Leituras precisam de testes próprios.
- Verificadores de leituras/painel contêm expectativas de duas migrations; atualizar ao acrescentar configurações/alertas, mantendo testes de upgrade e preservação.
- Alguns verificadores antigos herdam `ICEPLAY_MOBILE_CONFIG`; executar no ambiente comum ou limpar a variável do filho. Novos verificadores devem isolá-la explicitamente.
- Não existe reconciliação/idempotência para envios com resposta perdida; decidir com o firmware a política de repetição sem duplicação de amostras/alertas.

## Primeiro incremento de desenvolvimento

API `GET /api/leituras` com filtros obrigatórios de geladeira e origem, período UTC opcional e paginação limitada. O banco já suporta a consulta: não é necessária migration nem dependência nova. A interface do histórico será o incremento seguinte, após validar este contrato. Resultados executados e comandos serão registrados em relatório próprio, sem tratar este plano como evidência de sucesso.
