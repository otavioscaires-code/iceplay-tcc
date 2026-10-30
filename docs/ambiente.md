# Ambiente examinado em 13/10/2026

Pasta: `C:\Users\otavi\Downloads\iceplay`. A inspeção inicial com `Get-ChildItem -Force` não encontrou arquivos. `rg --files` não encontrou código, README, configuração ou instruções AGENTS.md. As pastas ancestrais examinadas também não continham AGENTS.md. `git status` informou que a pasta ainda não era um repositório.

| Recurso | Resultado observado |
| --- | --- |
| Sistema operacional | Windows 10 Pro 22H2, build 19045.6466, x64 |
| PowerShell | 7.6.5 |
| SDK .NET inicial | Não encontrado em PATH nem em `C:\Program Files\dotnet` |
| Git | 2.53.0.windows.1 |
| Node.js | 24.14.0 |
| npm | 11.9.0 |
| Python / launcher py | 3.14.3 |
| SQLite CLI | 3.50.4, 32 bits, disponível via Android SDK |
| ripgrep | 15.2.0 |
| ESP32 e sensores | Indisponíveis, conforme informado pelo aluno; não inspecionados fisicamente |

O primeiro `Get-ComputerInfo` devolveu campos vazios de sistema; a identificação acima foi obtida com `RuntimeInformation.OSDescription`, `OSVersion` e o registro `Windows NT\CurrentVersion`. Isso evita tratar campos vazios como informação verificada.

## Decisões de ferramentas

- Manter a arquitetura solicitada. Node/npm e Python não são necessários para iniciar o sistema.
- Instalar o SDK .NET **10.0.401** em `.tools/dotnet`, sem alterar o PATH permanentemente nem instalar serviço. O manifesto oficial consultado anunciou SDK 10.0.401 e runtime 10.0.12. A instalação confere SHA-512 antes de extrair.
- Usar EF Core SQLite **10.0.12**, EF Core Design **10.0.12** e `dotnet-ef` **10.0.12** local. SQLite inclui sua biblioteca nativa via pacote NuGet; não exige instalar servidor ou usar o executável do Android.
- Usar somente dois pacotes diretos no backend. `Design` e `dotnet-ef` são ferramentas para gerar e aplicar migrações; o provedor SQLite faz a persistência.
- Fixar SDK em `global.json`, versões NuGet e arquivo de lock. Nenhum framework de frontend, Docker, MQTT, serviço externo ou biblioteca de gráficos é necessário nesta fase.

O acesso inicial ao manifesto pelo terminal falhou com conexão recusada no ambiente restrito. A consulta foi repetida com autorização de acesso externo. Downloads e restauração de pacotes dependem de internet.

## Fontes técnicas verificadas

- [Política de suporte .NET](https://dotnet.microsoft.com/en-us/platform/support/policy): .NET 10 LTS tem suporte até 14/11/2028; .NET 8 e 9 encerram suporte em 10/11/2026, antes da apresentação.
- [Manifesto oficial .NET 10](https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json): origem da versão, URL e hash do SDK instalado.
- [Limitações do SQLite no EF Core](https://learn.microsoft.com/en-us/ef/core/providers/sqlite/limitations): fundamenta o uso de `DateTime` em UTC e a atenção à evolução do esquema.

Essas são fontes técnicas de implementação, não referências científicas nem resultados experimentais de refrigeração. Consulte `evidencias/` para os resultados efetivamente executados.
