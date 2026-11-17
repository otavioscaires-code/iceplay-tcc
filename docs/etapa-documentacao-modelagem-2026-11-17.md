# Documentação de requisitos, modelagem e validação — 17/11/2026

## Resultado e escopo

Foi preparado um [complemento editável para o TCC](tcc/materiais-modelagem-2026-11-17/README.md): Word de 22 páginas, fonte Markdown, três diagramas em PNG/SVG, fontes PlantUML, nove CSVs e dois JSONs de dados. Contém 16 requisitos funcionais, 12 não funcionais, 12 regras, oito casos de uso detalhados e 18 cenários de validação com situação e rastreabilidade. Os identificadores RF/RNF existentes foram preservados.

A referência de código é `98dabcc7888239de896db8410ee44b2ddfde831e`. Foram inspecionados Models, IceplayDbContext, contratos, verificadores e documentação. As seis entidades possuem 49 atributos públicos e sete associações no EF Core. `UltimaLeituraId` de EstadoMonitoramento é marcador, sem FK declarada; vínculos opcionais e exclusões Restrict/Cascade foram registrados. Os métodos das operações não foram inventados nas entidades.

O diagrama de casos de uso considera Operador e Emissor como papéis externos. Relógio, avaliador e banco pertencem ao sistema, portanto não são atores externos nesta revisão. Não foram criados casos de uso de conta por usuário/senha, acionamento de compressor, voz ou encerramento manual de alertas. A especificação de cada caso contém objetivo, pré-condições, fluxo, alternativas, pós-condições e ligações aos testes.

Não houve alteração de `src`, `firmware`, `tests`, scripts existentes, banco de uso ou migrations. Os verificadores utilizaram bancos isolados. Não foram criados cadastros/leituras no banco de uso. Evidências e figuras antigas foram preservadas; os índices de documentação agora apontam também para o modelo completo.

## Execução real de software

Nova pasta: [evidencias/2026-11-17-modelagem-validacao](evidencias/2026-11-17-modelagem-validacao/rodada.json). Início **14:57:13 UTC**, término **15:00:01 UTC**, em 17/11/2026. O setup restaurou os pacotes fixados e compilou com **0 avisos e 0 erros**. Os dez arquivos JavaScript existentes executaram **149 testes, 149 aprovados, 0 falhas**. Os dez verificadores PowerShell foram executados sequencialmente e terminaram sem falha.

| Conjunto | Verificações/testes aprovados | Requisições | Evidência |
| --- | --- | --- | --- |
| Base/saúde | 13 | Não contabilizado no relatório | `verify/smoke-latest.json` |
| Geladeiras | 807 | 177 | `verify-geladeiras/crud-api.json` |
| Leituras/SQLite | 339 | 75 | `verify-leituras/leituras-api.json` |
| Histórico | 145 | 68 | `verify-historico/historico-api.json` |
| Painel | 70 | 29 | `verify-monitoramento/monitoramento-api.json` |
| Configurações | 153 | 67 | `verify-configuracoes/configuracoes-api.json` |
| Alertas HTTP | 92 | 68 | `verify-alertas/alertas-api.json` |
| Dispositivos | 85 | 56 | `verify-dispositivos/dispositivos-api.json` |
| Páginas HTTP/DOM | 216 | 52 | `verify-pages/pages-api.json` |
| Móvel HTTP/TLS | 181 | 137 | `verify-mobile/mobile-api.json` |
| Avaliador com relógio controlado | 31 asserções | Não se aplica | `verify-alertas/regras.log` |
| Convites com relógio controlado | 13 asserções | Não contabilizado no relatório | `verify-mobile/pareamento-regras.json` |
| JavaScript | 149 testes | Não se aplica | `javascript.log` |

Os caminhos da tabela são relativos à nova pasta. Logs `*-runner.log` conservam a saída dos verificadores; os relatórios incluem erros vazios e/ou resultado `passed`. `setup.log` registra restore/build. Os cenários incluem persistência após reinício, upgrades sem perda, integridade/FKs, entradas inválidas, IDs inexistentes, limites e duração, ausência sem novo POST, autorização/escopo, idempotência, páginas e sessão/QR.

As contagens não são número de funcionalidades ou cobertura percentual. Requisições de polling na inicialização podem variar. HTTP/DOM não equivalem a inspeção visual, e os objetos de câmera usados nos testes JavaScript são controlados. Nenhum cenário desta rodada demonstra precisão térmica ou aquisição de um sensor físico.

## Comandos e ferramentas

Foram executados `git status`, `git log`, `git remote -v`, buscas `rg`, leitura dos arquivos relacionados, `scripts/setup.ps1`, Node `--test` com os dez arquivos `scripts/*.test.mjs`, e cada script abaixo com `-EvidenceDirectory` apontando para uma subpasta nova da rodada:

```powershell
.\scripts\verify.ps1
.\scripts\verify-geladeiras.ps1
.\scripts\verify-leituras.ps1
.\scripts\verify-historico.ps1
.\scripts\verify-monitoramento.ps1
.\scripts\verify-configuracoes.ps1
.\scripts\verify-alertas.ps1
.\scripts\verify-dispositivos.ps1
.\scripts\verify-pages.ps1
.\scripts\verify-mobile.ps1
```

Os comandos acima identificam os scripts executados; **não os copiar sem indicar uma nova pasta de evidências**, pois seus caminhos padrão são históricos. Para reproduzir a rodada, em PowerShell 7.5+, com SDK local preparado, Python e Node disponíveis, usar por exemplo:

```powershell
$taskEvidence = 'docs/evidencias/' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-revisao-documental'
New-Item -ItemType Directory -Path $taskEvidence -ErrorAction Stop | Out-Null
.\scripts\setup.ps1
if ($LASTEXITCODE -ne 0) { throw 'Setup/build falhou.' }
$taskNodeTests = @(Get-ChildItem -LiteralPath scripts -Filter '*.test.mjs' -File | Sort-Object Name | ForEach-Object FullName)
node --test @taskNodeTests
if ($LASTEXITCODE -ne 0) { throw 'Testes JavaScript falharam.' }
$taskVerifiers = @('verify','verify-geladeiras','verify-leituras','verify-historico','verify-monitoramento','verify-configuracoes','verify-alertas','verify-dispositivos','verify-pages','verify-mobile')
foreach ($taskVerifier in $taskVerifiers) {
    & ".\scripts\$taskVerifier.ps1" -EvidenceDirectory (Join-Path $taskEvidence $taskVerifier) -ErrorAction Stop
}
```

`verify-mobile.ps1` precisa de um IPv4 privado local em `-EnderecoIp`, ou da preparação móvel já existente em `.tools/mobile/settings.json`. Não publica serviço nem instala confiança/firewall durante a verificação. Nesta máquina foi usada a preparação existente, sem registrar segredos. Os caminhos exatos dos executáveis do runtime gerenciado são específicos deste computador; não são dependências novas da aplicação. A reprodução consulta o README para os pré-requisitos e limitações dos scripts.

## Preparação e conferência do documento

O modelo Word UNIP fornecido pelo aluno foi aberto como referência e seu SHA-256 permaneceu `e336e7a96b1b44a65acd61bf885bea9c7e12c03cbb65c1c719b7f4931a8ac262`. As 21 páginas da referência foram renderizadas e inspecionadas. O documento entregue é uma cópia com novo corpo, mantendo A4, margens, estilo Arial e cabeçalhos institucionais; não contém os nomes, textos educacionais e aprovações do exemplo. O corpo do complemento começa na página 1 após uma capa técnica. Não é a monografia final normalizada/aprovada.

Foram usados Python/python-docx do runtime gerenciado, geração de SVG a partir dos dados e Sharp local para PNG. Fontes PlantUML foram incluídas para edição; não foi executado PlantUML. O renderizador canônico `render_docx.py` foi tentado, mas falhou pela ausência de `soffice.exe`. A alternativa efetivamente executada foi Microsoft Word já instalado, abertura somente leitura e exportação para PDF temporário, seguida de rasterização pelo Poppler do runtime gerenciado. Não foi instalado um editor novo. As **22 páginas finais foram conferidas visualmente**, corrigindo quebras de tabelas e posicionamento de rótulos. O PDF e as imagens de QA ficam privados em `.tools/documentacao-modelagem-2026-11-17/`.

Uma primeira cópia gerada não abriu no Word devido à remoção de relações de notas ainda referidas pelas configurações do modelo. Foi corrigida preservando footnotes/endnotes e suas relações. As exportações posteriores abriram corretamente; a cópia defeituosa foi substituída antes da entrega. A conferência estrutural e dos vínculos/dados consta em [verificacao-documental.json](evidencias/2026-11-17-modelagem-validacao/verificacao-documental.json). Nenhum erro de compilação/teste da aplicação foi ocultado ou corrigido por mudança de runtime nesta tarefa.

## O que ainda falta

TV01–TV15 correspondem aos cenários de software verificados. TV16 referencia somente o reconhecimento USB de **16/11/2026**, sem repetir a consulta nesta tarefa. F01 permanece parcial: não houve gravação/boot do firmware ICEPLAY. **TV17 e F02–F12 estão pendentes**: montagem, sensores, comunicação física, alertas observados e ensaio na geladeira. O rótulo `Hardware` ou uma credencial válida não substituem essas evidências.

TV18 também está pendente: pacote para o computador da apresentação, perfil remoto, conectividade/hotspot e ensaio no destino. A câmera real do leitor QR no iPhone continua pendente. Revisão pelo aluno/orientador, inserção/numeração no TCC completo, conclusões após os ensaios e adequação final do artigo não são substituídas por este complemento.

A próxima tarefa de integração física continua sendo verificar comunicação serial sem gravar a placa e conferir as peças/pinagem antes da montagem, conforme o protocolo e as autorizações aplicáveis. Esta entrega apenas organiza a documentação e renova as evidências de software. A assistência de IA foi registrada de forma explícita.

## Observação sobre o Git local

Ao preparar a publicação, `git fetch origin` falhou com `bad object` em uma referência interna `refs/codex/turn-diffs/checkpoints/...`, seguido de erro de conectividade de objetos. A consulta direta `git ls-remote --heads origin refs/heads/codex/retomada-historico` confirmou o mesmo commit `98dabcc` da branch local; `git cat-file -e HEAD^{commit}` passou e a comparação com o upstream retornou `0 0`. A falha do fetch global não é resultado de teste da aplicação nem foi ocultada. A publicação deve usar apenas a branch atual, sem force. A referência interna inválida não foi removida ou reescrita; seu diagnóstico continua como pendência local distinta do conteúdo do TCC.
