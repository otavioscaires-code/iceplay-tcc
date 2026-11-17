# Requisitos e rastreabilidade do MVP

Consolidado em 13/11/2026. Mantém RF01–RF13 do planejamento inicial e explicita extensões posteriores. As datas antigas em `planejamento.md` são planejamento histórico, não comprovação de conclusão retroativa.

Atualização de 17/11/2026: o [complemento editável](tcc/materiais-modelagem-2026-11-17/README.md) detalha os 16 RF e 12 RNF, critérios de aceitação, oito casos de uso, regras, classes e 18 cenários. A [nova rodada de verificação](evidencias/2026-11-17-modelagem-validacao/rodada.json) aprovou o build, 149 testes JavaScript e os dez verificadores existentes. As contagens e os limites estão no [relatório da entrega](etapa-documentacao-modelagem-2026-11-17.md). Os identificadores abaixo foram preservados.

| ID | Requisito atual | Implementação e verificação | Situação |
| --- | --- | --- | --- |
| RF01 | Saúde real API/SQLite | HealthController; `verify.ps1`, falha 503 e banco real consultado | Software verificado |
| RF02 | Tela inicial, navegação e páginas próprias | Sete HTMLs/rotas, shell; `verify-pages.ps1`, `shell.test.mjs` | HTTP/DOM verificados; novos visuais no iPhone pendentes |
| RF03 | CRUD de geladeiras, validação e persistência | GeladeirasController; `verify-geladeiras.ps1`, reinício e 400/404/409 | Software verificado |
| RF04 | Receber temperatura/estado da porta | LeiturasController; `verify-leituras.ps1` | Software verificado; sensores pendentes |
| RF05 | Separar medição/recebimento UTC | DTO, entidade e CHECKs; verificador de leituras | Software verificado |
| RF06 | Identificar origem sem misturar simulação | OrigemLeitura, filtro obrigatório no histórico/painel; verificadores | Software verificado |
| RF07 | Histórico por equipamento/origem/período, paginado | GET leituras, historico.js; `verify-historico.ps1`, testes Node | Software verificado |
| RF08 | Painel responsivo com contexto/estado sem dados | monitoramento.js e CSS; testes Node/HTTP | Dados verificados; conferência visual nova pendente |
| RF09 | Temperatura fora da faixa e porta por duração | AvaliadorAlertas, configuração ativa; relógio controlado/HTTP | Software verificado |
| RF10 | Ausência sem depender de novo envio | Worker a cada segundo, idade da medição/início; `verify-alertas.ps1` | Software verificado |
| RF11 | Persistir/consultar episódios e encerramento | AlertasController, índice único, página/filtros/resumo | Software verificado |
| RF12 | Simulador pela mesma API, identificado | tools/simulator; verificadores de leitura/painel/móvel | Executado como Simulacao |
| RF13 | Contrato e integração ESP32/DS18B20/reed | Firmware compilado, contrato, montagem/protocolo; CP2102 reconhecido em COM3 em 16/11 | Reconhecimento USB parcial; gravação e sensores pendentes |
| RF14 | Configurar parâmetros por geladeira | GET/PUT e formulário, sem defaults automáticos; verificador de configurações | Software verificado |
| RF15 | Credencial por equipamento e reenvio idempotente | Dispositivos/Leituras, SHA-256 de segredo aleatório e UUID; testes de dispositivo/TLS | Software verificado |
| RF16 | Acesso móvel local protegido | HTTPS, sub-rede, sessão/CSRF, código/QR de 120 s e uso único; verificador móvel | TLS/HTTP/scripts verificados; câmera real do iPhone pendente |

RF10 usa **instante de medição**, ajustando a formulação inicial baseada em recebimento: envio atrasado não deve parecer comunicação/medição recente. Essa decisão foi registrada antes do motor em `contrato-alertas.md`. A referência visual de 60 s continua independente e não é configuração de alerta.

## Requisitos não funcionais

| IDs originais | Critério e situação atual |
| --- | --- |
| RNF01, RNF05, RNF08 | Execução/código/dependências documentados e build reproduzido; pacotes/API fixados e ferramentas firmware locais. |
| RNF02, RNF04 | Persistência e UTC verificados com upgrade/reinício; backups do banco de uso com mesmo hash dos campos anteriores. |
| RNF03 | Entradas/IDs/falhas com 400/404/409/503; autenticação/escopo com 401/403. |
| RNF06, RNF12 | Evidências preservam execução real e uso de IA; nenhuma precisão ou medição física inventada. Revisão/defesa pelo aluno ainda necessária. |
| RNF07 | Navegação/estados/teclado em DOM e HTTP aprovados. Novas telas precisam de conferência visual no Safari/desktop; sem alegação de certificação integral de acessibilidade. |
| RNF09, RNF10 | Instância/rede local, HTTPS, sessão/CSRF e credencial limitada; sem promessa de implantação pública, usuários individuais ou alta disponibilidade. |
| RNF11 | Histórico/alertas paginados, índices e testes de filtros. Benchmark com volume representativo e desempenho físico não foram executados. |

## Regras de negócio que devem ser defendidas

Nome/localização possuem limites; IDs/datas de criação e recebimento pertencem ao servidor. Medição exige UTC válido e não futuro; zero/false são valores. Equipamento com leituras/alertas não é excluído. Limites/tempos/origem precisam ser explícitos. Episódio aberto é único por tipo/equipamento/origem; encerramento tem motivo. Porta depende de sequência observada e lacuna interrompe a contagem. Ausência funciona sem POST. Credencial de um equipamento não autoriza outro; repetir UUID/conteúdo retorna o mesmo registro, trocar conteúdo retorna conflito.

As evidências históricas de 12–16/11 foram preservadas. A rodada mais recente de software está em `evidencias/2026-11-17-modelagem-validacao/`. Os números de asserções não são quantidade de funcionalidades nem porcentagem de cobertura. O aceite físico deve usar `hardware/protocolo-ensaio.md`, ainda pendente; USB reconhecido não equivale a sensoriamento validado.
