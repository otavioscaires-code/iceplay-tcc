# ICEPLAY — seis etapas de software até a integração física

**Fechamento em 13/11/2026:** o código das seis entregas de preparação está implementado, com verificações automatizadas nos escopos documentados. Páginas/configurações foram preservadas; regras, interface de alertas, credenciais/UUID e firmware compilado foram concluídos em incrementos separados. Os aceites de conferência visual complementar no iPhone e os 12 ensaios físicos continuam pendentes. Este fechamento não declara o TCC completo nem substitui montagem/ensaio. Ver `../CONTEXTO_ICEPLAY.md`, `etapa-firmware-2026-11-13.md`, `requisitos-rastreabilidade.md` e `roteiro-demonstracao.md`.

As seções de partida/progresso de 09 e 11/11 abaixo são históricas. A implementação atual e seus limites estão no contexto consolidado, nos contratos e nas evidências de 12–13/11. A escrita acadêmica tem minutas em `tcc/`, com resultados físicos e revisão/formatação final ainda necessários.

Atualizado em 09/11/2026, conforme o código e os testes do projeto. Esta contagem organiza entregas por dependência, não estima dias nem substitui os marcos do professor: versão final em 24/11 e apresentação em 01/12. Cada etapa pode conter incrementos menores.

## Situação de partida

Existem ASP.NET Core/EF Core/SQLite, CRUD, ingestão, simulador, API e interface de histórico, painel e páginas HTML independentes no diretório de trabalho. Em 09/11, o usuário confirmou cadastro/edição/navegação no iPhone e enviou foto mostrando tabela/gráfico com três leituras Simulacao. A revisão das páginas e sua publicação são a etapa 1 abaixo. Alertas e Configurações têm páginas com disponibilidade explicitada, mas seus backends ainda não existem. Não há firmware nem autenticação de sensores.

## Entregas e critérios objetivos

Progresso em 11/11: páginas publicadas em `7bd4541`; configurações persistidas implementadas e verificadas em etapa própria (`etapa-configuracoes-2026-11-11.md`). Após a validação/publicação desse incremento, restam quatro entregas de software: regras/registro, interface de alertas, autenticação do dispositivo e firmware. Os ajustes visuais novos ainda exigem conferência no aparelho; o ensaio físico continua separado.

| Etapa | Trabalho | Aceite antes de seguir |
| --- | --- | --- |
| 1. Encerrar a versão de páginas | Concluir regressões, ajustar gráfico móvel/acesso, verificar reinício/persistência, atualizar documentação e publicar o código | Rotas diretas/reload/404 e menu corretos; CRUD/leituras/histórico/painel/móvel aprovados; dados de uso preservados; commit/push confirmado. Conferência visual dos ajustes no aparelho permanece separada dos testes DOM/HTTP. |
| 2. Configurações persistidas | Modelo/migration aditiva, API e formulário por geladeira: temperatura mínima/máxima, tolerância de porta aberta, ausência e início/ativação do monitoramento | Entrada inválida rejeitada; mínimo menor que máximo; unidades explícitas; reinício preserva valores; configuração não é confundida com a referência visual de 60 segundos. Nenhum valor sanitário inventado. |
| 3. Regras e registro de alertas | Temperatura fora da faixa, porta aberta por duração e ausência de leituras; persistência de episódios abertos/resolvidos e deduplicação | Cenários de limiar, recuperação, ausência sem POST, reinício, amostra atrasada e separação de origens testados com relógio controlado. Definir tratamento de lacunas entre medições antes de afirmar duração contínua. |
| 4. Interface de alertas | Lista/filtros, tipo/gravidade/data/situação e resumo real na Visão geral | API e telas mostram os mesmos eventos; estados vazio/erro claros; evidência móvel do fluxo configurar → emitir teste → registrar → consultar/resolver. |
| 5. API para dispositivo | Identidade e credencial vinculadas à geladeira, autorização da ingestão, revogação e política de timestamps/repetição | Emissor autenticado envia pela mesma rota de ingestão; credencial inválida ou de outro equipamento é rejeitada; sessão/CSRF do navegador preservados; segredos fora do Git; política de relógio, falha de sensor e repetição documentada/testada. |
| 6. Firmware preparado e ensaio de software | Código ESP32 para DS18B20/contato magnético, sincronização UTC, tratamento de erro/repique/reconexão e HTTPS; compilação para o modelo de placa escolhido | Firmware compila sem segredos no repositório; testes do contrato com emissor de teste autenticado, instruções/pinagem e roteiro de montagem disponíveis. Compilação não comprova leitura física nem funcionamento elétrico. |

As decisões das regras serão registradas antes de implementá-las. Limites devem ser configuráveis e acordados com o aluno/orientador conforme o uso da geladeira. Ainda falta definir o modelo exato de placa e a montagem real para compilar/preparar o firmware correto.

## O que depende das peças

Depois dessas seis entregas, ainda será necessário montar e conferir eletricamente o circuito, gravar/configurar a placa, verificar DS18B20/porta/rede/relógio e fazer ensaio na geladeira. Ajustes de pinagem, precisão, alimentação, proteção e comportamento da rede só podem ser validados com o conjunto real. Portanto, "preparado para hardware" significa software testado e firmware compilado, não garantia de apenas conectar as peças e considerar tudo concluído.

O ensaio físico deve registrar equipamentos usados, montagem, condições, horários, dados enviados/recebidos, abertura/fechamento, falha de comunicação, alertas e limitações. Uma referência térmica disponível pode apoiar comparação; não atribuir calibração ou precisão que não tenham sido medidas.

## Escopo protegido

Em 09/11 o usuário concordou em retirar **notificação por voz** do MVP e deixá-la como trabalho futuro. Voz não será implementada nesta entrega. Notificações externas e funcionalidades secundárias também ficam após o núcleo. Não há funcionalidade de voz a remover do código atual.

Documentação, UML, texto do TCC, artigo e evidências são trabalho contínuo durante essas etapas; continuam necessários mesmo quando o software estiver pronto para receber hardware. A disponibilidade das peças deve ser organizada em paralelo para reservar tempo ao ensaio físico antes de 24/11.

O cronograma original em `cronograma-oficial.md` e o plano de 30/10 permanecem como histórico. Este documento atualiza a ordem de trabalho e a contagem, sem atribuir aprovação do professor ou cumprimento retroativo a datas passadas.
