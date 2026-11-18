# Etapa de 14/11/2026 — conexão por QR Code

O usuário relatou dificuldade para digitar o código longo no iPhone e perguntou sobre QR/login. Foi implementado pareamento temporário para o operador local do MVP. Mantidos código manual, sessão de até 8 h, HTTPS, CSRF, rate limit, API de dispositivos, banco e migrations. Contas individuais ficam para uma etapa que realmente precise de múltiplos usuários.

## Arquivos e decisões

- `Mobile/MobilePairing.cs`: um convite em memória, aleatório de 256 bits, hash SHA-256, validade 120 s, consumo atômico, substituição/cancelamento.
- `Controllers/AcessoController.cs`, `MobileAccessExtensions.cs`, `MobileAccessMiddleware.cs`: três endpoints de pareamento, DI, limitador próprio e entrada anônima com CSRF. Emissão/cancelamento continuam restritos ao computador/origem/cabeçalho local.
- `wwwroot/acesso.html`, `pareamento.js`, `styles.css`: emissão/cancelamento, SVG, prazo visual e confirmação no celular. Código permanente continua como alternativa. Fragmento removido antes de HTTP e nenhum segredo em armazenamento do navegador.
- `wwwroot/vendor/qrcodegen-v1.8.0.js` e README: biblioteca oficial Nayuki, licença MIT/hash preservados, geração local. Nenhum pacote de backend novo.
- `.gitattributes`: preserva os bytes do arquivo vendorizado para que a normalização de finais de linha não invalide seu hash em outro checkout.
- A conferência Git identificou espaços do arquivo oficial e dos logs; exceções de whitespace limitadas a esses artefatos preservam seu conteúdo, sem desabilitar a verificação do código próprio.
- `tests/Iceplay.Verification/PairingChecks.cs`, `Program.cs`: modo `pareamento`, relógio controlado e concorrência sem novo framework de testes.
- `scripts/pareamento.test.mjs`, `verify-mobile.ps1`, `verify-mobile.py`: testes do fluxo e extensão do verificador TLS existente.
- README, guia do iPhone, contexto, AGENTS e [contrato](contrato-pareamento.md): uso, endpoints, limites e continuação.

Nenhum código de acesso, token, certificado privado ou banco foi incluído no commit. Capturas estão sem QR ativo.

## Comandos executados

Na raiz, PowerShell 7; os scripts usam o SDK local já existente:

```powershell
git status --short
python -X utf8 .\scripts\backup-database.py
. .\scripts\common.ps1
& $script:IceplayDotnet build Iceplay.slnx --no-restore
$testFiles = @(rg --files scripts -g '*.test.mjs')
node --test @testFiles
.\scripts\verify-mobile.ps1 -EvidenceDirectory docs/evidencias/2026-11-14-pareamento/mobile-01
.\scripts\verify-pages.ps1 -EvidenceDirectory docs/evidencias/2026-11-14-pareamento/paginas-02
.\scripts\run-mobile.ps1
```

Backup consistente executado antes e depois. Node repetido após o último ajuste de limpeza da página. `verify-mobile.ps1` também executou build do programa de verificação e `dotnet run --project tests/Iceplay.Verification --no-build --no-restore -- pareamento`. A restauração com `dotnet restore tests/Iceplay.Verification --locked-mode` foi adicionada ao script e executada separadamente com sucesso, permitindo verificar também uma cópia sem os artefatos desse programa de testes. O artefato QR foi baixado da release oficial 1.8.0, conferido e mantido sem alterações; origem/hash em seu README. A compilação ocorreu com o servidor de uso encerrado; depois ele foi iniciado novamente. A redução do log SQL foi apenas variável do processo, sem configuração permanente.

## Resultados executados

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Build API e programa de verificação | Sucesso, 0 avisos/erros | `validacao-01/build-inicial.log`, `mobile-01/build.log`, `mobile-01/pareamento-build.log` |
| JavaScript, oito arquivos | 127 aprovados, 0 falhas | `validacao-01/node-final.log` |
| Convites/relógio controlado | 13 asserções; prazo exato, uso único, cancelamento, substituição, nova instância e consumo concorrente | `mobile-01/pareamento-regras.json` |
| TCP/TLS/HTTP e SQLite isolado | 176 verificações / 134 requisições registradas; inclui código anterior, novo pareamento, CSRF, origem, replay, cancelamento, rate limit, reinício e emissor autenticado | `mobile-01/mobile-api.json` |
| Páginas/rotas/assets e persistência isolada | 212 asserções / 50 requisições; QR assets 200 e rotas anteriores preservadas | `paginas-02/pages-api.json` |
| Banco de uso | Integridade ok, cinco migrations, 1 geladeira / 3 leituras Simulacao / demais tabelas vazias; hash histórico igual | `banco-antes.json`, `banco-depois.json` |
| Navegador real de desktop | Página, geração e cancelamento observados; SVG 264 × 264 px, viewBox 45 × 45 | `visual-desktop.jpg` e registro abaixo |
| Largura 390 × 844 | Conteúdo 375 px dentro do viewport, sem overflow horizontal; menu abriu/fechou; override removido ao concluir | `visual-390.jpg` |

Todas as evidências desta tabela estão em [docs/evidencias/2026-11-14-pareamento](evidencias/2026-11-14-pareamento/). Os testes não registram os corpos com credenciais. Um vínculo de aba temporária expirou durante a primeira conferência visual; uma nova aba foi aberta e a sequência de emissão/cancelamento foi repetida com sucesso. As imagens foram feitas com o QR removido; não são fotos do iPhone.

A primeira rodada de páginas (`paginas-01`, 211/49) também passou. A segunda foi executada após versionar a URL do CSS de Acesso, para evitar estilo antigo em cache no Safari; a URL adicional explica a diferença de contagem. Os relatórios anteriores foram preservados.

## Próximo teste manual

No computador, abrir `http://localhost:5080/acesso`, gerar o QR e ler pela câmera do iPhone. Conferir abertura no Safari, confirmação, acesso aos dados, logout, reutilização rejeitada e novo convite. Este roteiro ainda não foi executado no iPhone para o novo fluxo. A confiança no certificado já preparada continua necessária. Software de simulação e este teste de navegador não comprovam sensores físicos.

Permanece a validação física do ESP32/DS18B20/reed quando as peças chegarem, além da conferência das novas páginas no iPhone e conclusão acadêmica com resultados reais. Não foi instalado driver nem alterado firewall/confiança/código permanente por esta etapa.
