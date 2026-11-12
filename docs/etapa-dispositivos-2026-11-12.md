# Credenciais e ingestão do dispositivo — 12/11/2026

## Entrega

Foi mantida a ingestão `POST /api/leituras`, acrescentando credencial opaca por geladeira e UUID de medição para reenvio idempotente. O navegador preserva sessão/CSRF; a credencial autoriza somente essa operação, origem Hardware e equipamento vinculado. Metadados/credenciais são gerenciados explicitamente em Configurações. O segredo aparece uma vez, não vai para localStorage/URL e é apagado da tela ao sair/recarregar/trocar o contexto. O banco armazena hash de segredo aleatório, não texto.

Migration `20261112194714_AddDispositivos`: quinta migration, com entidade Dispositivo e duas colunas anuláveis em Leituras. As quatro anteriores foram preservadas. SQLite reconstrói internamente Leituras para adicionar FK; foram testadas preservação de sete campos anteriores, IDs e episódio que referenciava uma leitura. Não há seed nem emissão automática.

Contrato: `contrato-dispositivos.md`; SQL para banco novo: `sql/iceplay-criacao-2026-11-12.sql`. Em Production, aplicar migrations antes de usar o novo código. O schema histórico usado em fixtures é preservado; o verificador agora semeia a amostra antiga por SQL isolado e confirma 503 antes do upgrade, pois o modelo atual precisa das novas colunas.

## Resultados reais

| Verificação | Resultado |
| --- | --- |
| `verify-dispositivos.ps1`, pasta `dispositivos-fluxo-final` | **84 verificações, 55 requisições**: upgrade, segredo/escopo, inválidos, revogação, repetição, concorrência, reinício e fluxo configurar → enviar autenticado → alerta/painel |
| Node, sete arquivos `*.test.mjs` nomeados abaixo | **112 testes passaram** (11 novos de dispositivos) |
| Base e CRUD, `dispositivos-regressoes` | 13; 807 / 177 requisições |
| Leituras, `dispositivos-regressoes-02` | 339 / 75 |
| Histórico | 145 / 68 |
| Painel | 70 / 29, além do simulador |
| Configurações | 153 / 67, além dos PUTs concorrentes |
| Alertas | 31 com relógio controlado; HTTP 88 / 64 |
| Páginas | 207 / 47 |
| Móvel, `dispositivos-mobile-final` | **139 / 102**, TLS com CA validada, emissor sem cookie/CSRF, limitação de escopo e revogação, além da sessão web preservada |
| Build e EF | Zero avisos/erros; nenhuma alteração de modelo pendente |

Evidências em `evidencias/2026-11-12-pre-hardware/`. As pastas são novas e os relatórios anteriores foram mantidos. Comandos de verificação usam `-EvidenceDirectory` com esses caminhos. Móvel usa `-EnderecoIp 192.168.1.123`. Node: `node --test scripts/acesso.test.mjs scripts/historico-estado.test.mjs scripts/monitoramento-estado.test.mjs scripts/shell.test.mjs scripts/configuracoes.test.mjs scripts/alertas.test.mjs scripts/dispositivos.test.mjs`. Build/EF usam SDK local configurado por `scripts/common.ps1`.

## Correções verificadas

A primeira comparação do upgrade presumiu a ordem física das colunas após a reconstrução SQLite. Foi corrigida para selecionar os campos por nome; os valores/IDs estavam preservados. A regressão antiga exigia exatamente sete campos JSON: foi ampliada para exigir também os dois metadados nulos nas fixtures sem dispositivo, mantendo as verificações anteriores. Uma rodada móvel abortou com ConnectionResetError no aguardo do reinício; o coletor agora aguarda esse erro dentro do mesmo timeout de inicialização, sem repetir gravações de API. Todas essas rodadas foram preservadas; a rodada final passou.

## Limitações

Fixtures de origem Hardware exercitam software/autenticação e não vieram de sensores. Não foram criadas credenciais ou configurações no banco de uso. Não houve nova dependência .NET/JavaScript, alteração de firewall, instalação de confiança ou ensaio físico. O navegador permanece indisponível nesta conversa; Node/HTTP não comprovam renderização/Safari. Firmware, conferência visual e ensaio elétrico/físico são etapas seguintes.
