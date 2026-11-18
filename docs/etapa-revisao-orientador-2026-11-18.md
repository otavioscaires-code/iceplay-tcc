# Revisão da documentação conforme orientação do professor

## Resultado e escopo

Em 18/11/2026 foram revisadas as fontes acadêmicas existentes e produzido um [complemento Word de 15 páginas](tcc/revisao-orientador-2026-11-18/README.md). A minuta passou a conter figuras numeradas, referências no texto, comparação documental com soluções comerciais, siglas, apêndices e conclusão compatível com o estado real. O artigo e as referências foram atualizados. Nenhum módulo de API, frontend, firmware ou migration foi alterado.

O Word que o professor revisou não foi encontrado entre os arquivos examinados. O aluno respondeu que um amigo o encaminhou e não soube identificar a versão. Portanto, este material não afirma corrigir o sumário, o subtítulo “3.4 MODELO DE DADOS” ou todas as páginas daquele documento. A versão original deverá ser recebida e preservada antes da integração final.

Referência do software verificado: `bc89543d15993ba2274b3eb7134f0cf8a8e24115`. O trabalho documental não retroage as datas de imagens/commits e não altera as evidências anteriores.

## Arquivos e decisões

- `docs/tcc/monografia.md`: nove figuras com fonte/data, lista de siglas com DOM, comparação Sitrad Pro/testo Saveris 2, resultado da rodada atual, referências agrupadas e conclusão revista. O contrato local pertence ao Apêndice A, não à bibliografia externa.
- `docs/tcc/artigo.md` e `referencias.md`: resultados e fontes atualizados, sem alegar aquisição física ou precisão a partir de simulação.
- `docs/tcc/revisao-orientador-2026-11-18/`: complemento editável, DER PNG/SVG, esquema JSON, foto real do iPhone sem alterar bytes, procedência, fontes consultadas, conclusão e lista de atendimento/pendências.
- `scripts/prepare-tcc.py`: ajuste documental para copiar as nove imagens públicas ao gerar cada nova minuta privada, preservar seus hashes e resolver referências locais. Não altera a aplicação. RA e cópias preenchidas continuam privados.
- Índices, contexto e registro de IA: atualizados para a entrega e para não repetir a afirmação obsoleta de que nunca houve gravação/consulta serial. A placa continua com o diagnóstico temporário GPIO27, não com o firmware de ingestão.

O novo DER foi conferido executando `docs/sql/iceplay-criacao-2026-11-12.sql` somente em SQLite `:memory:` e consultando tabelas/colunas/FKs/índices. São seis tabelas de domínio, 49 colunas e sete FKs. A figura mostra chaves/cardinalidades; o JSON contém o dicionário completo. `UltimaLeituraId` é um marcador sem FK. O vínculo histórico admite vários dispositivos por geladeira, limitado pelo índice parcial a um ativo.

O verificador do pacote visual anterior foi executado somente em leitura, com `verificar_integridade.py --repositorio .`: **129 verificações, zero falhas**. Capturas, fontes arquivadas e metadados históricos foram preservados. A inspeção dos novos arquivos públicos não encontrou os padrões procurados de chave privada, token Bearer longo, MAC ou RA; bancos e configurações privadas não integram a entrega. Essa procura é uma conferência limitada de publicação, não uma auditoria geral de segurança.

## Comandos e resultados efetivamente executados

Os comandos foram executados a partir da raiz, em PowerShell 7; os runners privados organizaram logs e pastas novas sem sobrescrever evidências. As ferramentas de documentos usaram Python/Node do runtime gerenciado existente.

```powershell
.\scripts\setup.ps1
$taskNodeFiles = @(Get-ChildItem -LiteralPath scripts -Filter '*.test.mjs' -File | Sort-Object Name | ForEach-Object FullName)
& 'C:/Users/otavi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' --test --test-reporter=tap @taskNodeFiles
```

Foram executados, sequencialmente, `verify.ps1`, `verify-geladeiras.ps1`, `verify-leituras.ps1`, `verify-historico.ps1`, `verify-monitoramento.ps1`, `verify-configuracoes.ps1`, `verify-alertas.ps1`, `verify-dispositivos.ps1`, `verify-pages.ps1` e `verify-mobile.ps1`, cada um com `-EvidenceDirectory` apontando para seu subdiretório novo em `docs/evidencias/20261118T220205Z-revisao-orientador/`.

| Verificação | Resultado real |
| --- | --- |
| Setup/build | Aprovado; zero avisos e zero erros |
| JavaScript | Dez arquivos; 149 testes aprovados, zero falhas |
| Base | 13 verificações |
| Geladeiras | 807 verificações / 177 requisições |
| Leituras | 339 / 75 |
| Histórico | 145 / 68 |
| Painel | 70 / 29 |
| Configurações | 153 / 67 |
| Alertas HTTP | 92 / 68 |
| Avaliador temporal | 31 asserções com relógio controlado |
| Dispositivos | 85 / 56 |
| Páginas | 216 / 52 |
| Móvel | 181 / 137 |
| Convites | 13 asserções com relógio controlado |

A [rodada](evidencias/20261118T220205Z-revisao-orientador/rodada.json) ocorreu de **22:02:05 a 22:05:06 UTC de 18/11**, com resultado `passed`. O [resumo](evidencias/20261118T220205Z-revisao-orientador/resumo-software.json) aponta os JSONs de origem. São contagens de asserções, não funcionalidades independentes ou percentual de cobertura. Casos com origem `Hardware` nos verificadores são fixtures de software, não dados adquiridos por sensores.

Também foram executados os auxiliares documentais privados `build_der.py`, `rasterize-der.cjs`, `build_complement.py`, `finalize-complement.ps1` e `verify_documentation.py`, além de `scripts/prepare-tcc.py`, com runtimes existentes. O último gerou três minutas privadas e nove cópias de imagens; foram conferidos hashes e existência dos links locais, sem divulgar os dados pessoais.

O renderer `render_docx.py` foi tentado e falhou porque `soffice.exe` não está disponível no PATH. A alternativa efetivamente usada foi o **Microsoft Word já instalado**, via COM, para atualizar campos, repaginar, salvar o DOCX e exportar o PDF privado de QA. Poppler rasterizou as 15 páginas; todas foram abertas e conferidas, com correções de quebras, listas e título antes da versão entregue. Não houve instalação de LibreOffice. Resultado estrutural: um sumário, duas listas automáticas, seis imagens, oito legendas SEQ, seis referências REF e 59 campos contabilizados pelo Word.

Os comandos de geração/QA foram executados em `.tools/revisao-orientador-2026-11-18/`, ignorado pelo Git; as versões intermediárias e dados pessoais permanecem privados. O [manifesto público da conferência](tcc/revisao-orientador-2026-11-18/verificacao-documental.json) registra os hashes dos entregáveis e das fontes visuais.

Durante a preparação, o primeiro auxiliar de conferência procurou IDs ingleses de estilos e precisou reconhecer os nomes OOXML após o Word em português renomear os IDs. O auditor de publicação também foi ajustado para examinar padrões ASCII sem converter a codificação dos logs nativos. Ambos passaram após a correção; não houve alteração dos bytes dos logs ou do documento para contornar essas verificações.

## Execução da interface e limitação de captura

Foi iniciada uma API real separada em `http://127.0.0.1:62615`, apontando somente para SQLite em pasta privada isolada. A saúde inicial confirmou zero geladeiras. Foram enviados explicitamente um cadastro de teste, configuração ativa e seis leituras `Simulacao`; o avaliador gerou episódio e as consultas HTTP foram registradas em [estado-api.json](evidencias/20261118T220205Z-revisao-orientador/interface/estado-api.json).

A navegação nativa do Chrome confirmou por acessibilidade a Visão geral, a saúde e a identificação de simulação. A captura gráfica falhou com `FrameArrived timed out`/`window capture timed out`, e a geometria de clique não ficou disponível. Não foi produzido print novo nem declarada inspeção gráfica dessa execução. As imagens do complemento são capturas reais preservadas, com suas datas. Somente a janela anônima criada para a tarefa foi fechada; o servidor isolado foi encerrado após conferir seu processo/endereço. Não houve mudança de confiança TLS, firewall ou banco de uso.

## Fontes e revisão acadêmica

Consultados o guia oficial de normalização UNIP de 2025, a página da biblioteca, o manual oficial Sitrad Pro e o FAQ oficial testo Saveris 2 v2.12. Também foram conferidos metadados/resumos das referências científicas indicadas e a RFC 6750. O [registro de fontes](tcc/revisao-orientador-2026-11-18/fontes-consultadas.md) distingue consulta atual, referências consultadas anteriormente e limites de leitura.

A comparação é documental, sem instalação/ensaio dos produtos ou alegação de novidade/superioridade. A revisão assistida de formato não certifica ABNT ou aprovação acadêmica. A paginação e as citações da monografia completa exigem o arquivo efetivamente enviado.

## Pendências e próxima ação

1. Receber do amigo o Word enviado ao professor, integrar as correções, atualizar campos globais e conferir todas as páginas exportadas.
2. Retomar o sensor magnético com ímã e, com resistor 4k7 correto, o DS18B20. O ensaio GPIO27 com jumper de 18/11 já está registrado; não equivale a validar esses sensores.
3. Preparar/gravar o firmware principal com configuração privada e ensaiar aquisição autenticada, histórico, regras/alertas e recuperação na geladeira, seguindo o protocolo físico.
4. Concluir a validação do leitor QR/novos formulários no iPhone e executar um ensaio no computador/rede da apresentação.
5. Inserir os resultados físicos e imagens reais na discussão/conclusão final, revisar com o orientador e fechar a entrega de 24/11.

Nesta tarefa não houve agente auxiliar, instalação, consulta serial, upload de firmware ou nova leitura física. Banco de uso, migrations, segredos e registros históricos preservados. Publicação segue a autorização vigente de commits e pushes rotineiros; o resultado do push deve ser conferido no Git, sem `fetch` que aciona a referência interna de checkpoint inválida conhecida.
