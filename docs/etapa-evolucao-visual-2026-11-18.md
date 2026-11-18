# Imagens da evolução do ICEPLAY — 18/11/2026

O aluno solicitou imagens das primeiras etapas, do código e das telas para documentar a evolução junto ao orientador. Foi preparado um [pacote documental](tcc/evolucao-visual-2026-11-18/README.md) com arquivos existentes e figuras extraídas de fontes verificáveis. Não houve reconstrução da aplicação, geração artificial de capturas antigas ou alteração do funcionamento do sistema.

## Entrega

- Oito JPGs de interface copiados sem alteração: base de 13/10, cadastro de 15/10, painel de 19/10 e acesso/identidade visual de 14/11, em desktop e largura móvel.
- Quatro figuras PNG com trechos reais do primeiro commit disponível: entidade Geladeira, migration inicial, consulta de saúde/SQLite e cadastro pela API.
- Três quadros PNG derivados de registros reais: resultados iniciais, histórico Git e três capturas seriais da entrada GPIO27.
- Caderno PDF de 11 páginas, legendas em TXT/CSV, manifesto com SHA-256/procedência, metadados Git, cópias das fontes e verificador documental sem dependências adicionais.
- ZIP de entrega em `C:/Users/otavi/Downloads/ICEPLAY-Evolucao-Visual-20261118.zip`, fora da árvore de trabalho; contém somente o material documental, sem banco/segredos/artefatos privados.

Os arquivos estão em `docs/tcc/evolucao-visual-2026-11-18/`. As imagens móveis integrais 02/04/06/08 foram mantidas separadas para preservar a legibilidade, sem reduzi-las excessivamente no PDF. O arquivo `LEGENDAS_PARA_COPIAR.txt` orienta a inclusão no Word; a numeração deve ser ajustada ao documento do aluno.

## Datas e procedência

Referência de coleta: `80ae30238922ff13c99c03fd01f248666e0a46a1`. Primeiro commit real disponível: **`a788f2bf39142153ca00b95f0574b1c4a72fad7f`, em 30/10/2026**. Os registros associados às primeiras capturas informam etapas desde **13/10/2026**; os arquivos foram incluídos no Git depois, em 30/10. As legendas e o manifesto distinguem essas informações. Não foram criados commits retroativos.

As figuras de código foram produzidas em **18/11**, com caminho, versão e números de linha. A fonte integral está arquivada e corresponde ao objeto Git do primeiro commit; as quebras visuais não alteram seu conteúdo. São figuras documentais novas, não screenshots antigas de uma IDE. Os quadros de resultados e de Git/serial também estão identificados como composições novas a partir de registros preservados. Os registros locais não são certificação independente da data de criação de cada arquivo.

## Comandos e ferramentas utilizados

Foram lidos `AGENTS.md`, `CONTEXTO_ICEPLAY.md`, `README.md`, os índices acadêmicos, relatórios, fontes de código e histórico relacionados. Foram utilizados `rg`, leituras do PowerShell, `git status --short`, `git branch --show-current`, `git remote get-url origin`, `git rev-parse HEAD`, `git rev-list --max-parents=0 HEAD`, `git log --reverse`, consultas `git show` e `git diff --check`.

A composição foi feita com Python gerenciado já existente, Pillow e ReportLab; pypdf conferiu o documento e pdf2image/Poppler rasterizou as páginas. Não foram instaladas dependências. Preparação e auditoria locais ficaram na pasta ignorada `.tools/evolucao-visual-2026-11-18/`:

```powershell
& 'C:/Users/otavi/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -X utf8 .tools/evolucao-visual-2026-11-18/build_visual.py
& 'C:/Users/otavi/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -X utf8 .\docs\tcc\evolucao-visual-2026-11-18\verificar_integridade.py --repositorio .
& 'C:/Users/otavi/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -X utf8 .tools/evolucao-visual-2026-11-18/audit_visual.py
```

O verificador foi executado também sem `--repositorio`, como será possível na pasta extraída do pacote. A auditoria executa ambas as modalidades e guarda as saídas integrais na pasta privada. A conversão do PDF usou `convert_from_path(..., dpi=110, fmt="png", thread_count=2)` com o Poppler do runtime gerenciado. As imagens e páginas foram abertas para inspeção visual.

## Verificações realmente realizadas

| Conferência desta entrega | Resultado |
| --- | --- |
| Integridade do pacote, sem acesso ao repositório | 76 verificações, zero falhas |
| Integridade com fontes e objetos/metadados Git | 129 verificações, zero falhas |
| Decodificação e dimensões das imagens | 15 imagens válidas |
| Capturas copiadas e comparadas ao primeiro registro Git de cada arquivo | Oito JPGs com bytes idênticos |
| Fontes C# e trechos/linhas comparados aos objetos Git | Quatro arquivos e quatro trechos conferidos |
| Fontes originais preservadas desde a coleta | 19 hashes locais inalterados |
| Comparação dessas fontes com a revisão anterior | Dez idênticas em bytes; nove textos diferem somente em CRLF/LF |
| PDF | 11 páginas, quatro links para código; datas/legendas e extração de texto conferidas |
| Revisão visual | 15 imagens e 11 páginas renderizadas inspecionadas |
| Conteúdo selecionado | Sem banco/configuração privada; inspeção visual e busca textual sem MAC, chave privada ou token Bearer longo encontrados |
| ZIP final | 47 arquivos, 3.819.994 bytes; CRC e comparação de bytes aprovados; verificador executado após extração em pasta nova: 76 verificações, zero falhas |

SHA-256 do ZIP final: `7df9f18c68594a4008f8019c0d4cb6159a9592d86fb8a572c2ae1e4c24e4f4a2`. Os 47 arquivos do pacote também foram comparados ao índice Git antes da publicação, com bytes exatos para imagens/PDF/fontes arquivadas e normalização somente de finais de linha para os novos textos auxiliares. O ZIP foi criado sem sobrescrever arquivo existente; registros da conferência ficam em `.tools/evolucao-visual-2026-11-18/zip-verificacao.json`.

O resultado está em `tcc/evolucao-visual-2026-11-18/verificacao.json`. A verificação de hashes protege a identidade dos arquivos do pacote, sem certificar autoria ou datas. As cópias arquivadas têm atributos Git próprios para conservar seus bytes em outros checkouts; somente a comparação de textos originais com o Git permite a normalização de finais de linha.

Durante a preparação, o rodapé de uma figura de código exigiu ajuste da altura do canvas; as figuras e o PDF foram gerados novamente antes da inspeção final. Na auditoria, uma expectativa em inglês para o log de compilação foi corrigida para `0 Aviso(s)`/`0 Erro(s)`, conforme a saída original em português. A comparação estrita de textos com o objeto Git também identificou conversão de finais de linha; ela foi distinguida de alteração de conteúdo, mantendo os hashes exatos das cópias. O PDF do ReportLab foi marcado como binário nos atributos da pasta para evitar tratamento como texto/normalização pelo Git. As fontes históricas não foram modificadas para fazer a conferência passar.

## Resultados anteriores citados, sem nova execução

O quadro 13 transcreve os registros preservados: build inicial com zero avisos/erros; saúde HTTP com 13 verificações; SQLite com 12; CRUD com 807 asserções em 177 requisições e navegador com 14 verificações. Esses contadores foram comparados aos arquivos de origem, mas **os testes da aplicação não foram executados novamente nesta tarefa**. Contagens de asserções não equivalem a funcionalidades independentes nem porcentagem de cobertura.

O quadro 15 sintetiza capturas reais anteriores de 18/11: oito HIGH sem conexões, oito LOW com jumper e oito HIGH após retirar o jumper, separados por reinício. Não houve nova consulta serial, gravação ou teste físico durante a organização deste material.

## Preservação e pendências

Código executável, frontend, banco de uso, migrations, credenciais, firmware principal, programa gravado na placa e configurações de rede/computador permaneceram sem alteração. Não foi iniciado servidor ou consultado/modificado SQLite para produzir as imagens. Capturas de largura móvel não são prova de iPhone físico; dados fixture/simulação não são dados reais de sensores.

Continuam pendentes sensor/ímã, DS18B20 com resistor correto, firmware principal com ingestão física, ensaio em geladeira, validações restantes no iPhone e preparação do computador da apresentação. O PDF é material de acompanhamento para revisar e inserir na escrita; não representa monografia normalizada/aprovada ou fechamento dos resultados físicos. A assistência de IA foi registrada em `uso-de-ia.md`.

Publicação: esta entrega segue a autorização vigente para commit/push rotineiro na branch `codex/retomada-historico`, sem force ou alteração de referências internas. O manifesto encerra a coleta no commit anterior, preservando a distinção entre o histórico mostrado e o commit posterior que publica este material.
