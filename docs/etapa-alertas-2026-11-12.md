# Backend de alertas — 12/11/2026

## Entrega

Foram mantidos ASP.NET Core/EF Core/SQLite, contratos anteriores e arquivos estáticos. A migration aditiva `20261112192436_AddAlertas` cria episódios e checkpoints, sem modificar as três anteriores e sem seed. As decisões estão em `contrato-alertas.md`. O serviço periódico usa `TimeProvider.System`; o relógio controlado fica somente no programa de verificação, sem rota de teste exposta.

Foram adicionados `Models/Alerta.cs`, `EstadoMonitoramento.cs`, `Monitoring/`, contratos/controlador de consulta e verificadores C#/Python/PowerShell. A exclusão de uma geladeira com ocorrências retorna 409. A interface ainda será integrada no próximo incremento. Nenhum equipamento de uso foi ativado.

## Execuções reais

Evidências em `evidencias/2026-11-12-pre-hardware/`:

| Verificação | Resultado observado |
| --- | --- |
| Base antes das alterações | Build, zero avisos/erros; 85 testes Node passaram |
| `verify-alertas.ps1`, pasta `alertas-http-01` | 31 verificações com relógio controlado e SQLite real; HTTP: 88 verificações, 64 requisições registradas |
| `verify.ps1` | 13 verificações da base aprovadas |
| `verify-geladeiras.ps1` | 807 verificações / 177 requisições |
| `verify-leituras.ps1` | 339 / 75, incluindo upgrade histórico e simulador |
| `verify-historico.ps1` | 145 / 68 |
| `verify-monitoramento.ps1` | 70 / 29, além do simulador |
| `verify-configuracoes.ps1` | 153 / 67, além de dois PUTs concorrentes |
| `verify-mobile.ps1` | 120 / 85, TCP/TLS/HTTP real com banco isolado |
| EF `has-pending-model-changes` | Nenhuma alteração pendente |
| Inspeção de fontes | Nenhum byte NUL encontrado |

As chamadas foram executadas em PowerShell 7, a partir da raiz. Os seis verificadores anteriores usaram `-EvidenceDirectory docs/evidencias/2026-11-12-pre-hardware/alertas-regressoes/<nome>`. Alertas usou `.../alertas-http-01`; móvel usou `-EnderecoIp 192.168.1.123 -EvidenceDirectory .../alertas-mobile`. O SQL de criação de banco novo foi gerado por `dotnet ef migrations script --project src/Iceplay.Api --no-build --output docs/sql/iceplay-criacao-2026-11-12-alertas.sql`, com SDK/ferramentas locais via `scripts/common.ps1`.

Os verificadores antigos continuam cobrindo os mesmos cenários; a comparação de migrations agora usa o manifesto completo das fontes, preservando a ordem das três migrations anteriores. Os logs das execuções intermediárias foram mantidos. Uma chamada inicial ao PowerShell usou escape incorreto e falhou antes de compilar; foi corrigida usando diretamente o executável PowerShell 7. O build e os testes da tabela acima foram efetivamente executados depois disso.

## Preservação e limites

Antes das alterações, SQLite de uso íntegro, sem violações de FK, com uma geladeira, três leituras e zero configurações. Backup consistente em `.tools/backups/antes-alertas-20261112T191907Z.db`, ignorado pelo Git. As verificações usaram bancos novos em `.tools/verification`, sem fixtures no banco de uso. O esquema de uso será atualizado somente após a integração validada.

Não houve leitura física, instalação de confiança, alteração de firewall ou teste visual no navegador. A ferramenta respondeu `Local browser access is unavailable for this chat` na tentativa desta data. Testes HTTP/DOM não comprovam Safari. A compilação e os resultados acima não são ensaios de precisão térmica ou de sensores. A API precisa permanecer em execução para avaliar ausência; não há histórico inventado de ciclos enquanto estava desligada.
