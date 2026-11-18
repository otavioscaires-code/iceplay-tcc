# ICEPLAY — imagens da evolução do projeto

Material organizado em **18/11/2026**, com assistência de IA, para revisão pelo aluno e pelo orientador. Reúne arquivos preservados do projeto e figuras documentais extraídas de fontes reais. O funcionamento da aplicação não foi alterado nesta tarefa.

## O que usar nos documentos

- `ICEPLAY_Evolucao_Visual.pdf`: caderno de 11 páginas, com telas desktop, código, resultados e histórico Git. Pode ser enviado para revisão do orientador.
- `imagens/`: 15 imagens separadas para inserir no Word; inclui quatro capturas móveis integrais que não foram comprimidas no PDF.
- `LEGENDAS_PARA_COPIAR.txt`: títulos, explicações e fontes das 15 imagens.
- `legendas-e-fontes.csv`: o mesmo catálogo em tabela, com SHA-256.
- `manifesto.json`: procedência, datas, classificação, linhas de código e hashes.
- `fontes_codigo/`: quatro arquivos C# completos extraídos do primeiro commit disponível; não são cópias do código atual.
- `fontes_relatorios/`: cópias sem alteração dos registros associados, incluindo os JPGs de origem.
- `historico-git.json`: metadados reais dos commits até a revisão `80ae302`, anterior à organização deste material.
- `verificacao.json`: resultado da conferência documental desta entrega.
- `verificar_integridade.py`: conferência local dos hashes e trechos, sem bibliotecas adicionais ou alteração de arquivos.

| Figuras | Conteúdo | Natureza e data |
| --- | --- | --- |
| 01–02 | Tela inicial e saúde da API/SQLite, desktop e móvel | JPGs preservados; relatório associado registra 13/10/2026 |
| 03–04 | Cadastro e edição de geladeiras | JPGs preservados; relatório de 15/10/2026; cadastro de teste em banco isolado |
| 05–06 | Painel com temperatura, porta e recência | JPGs preservados; relatório de 19/10/2026; dados de simulação/fixtures |
| 07–08 | Black & Ice Blue, navegação e acesso | JPGs preservados de 14/11/2026, anteriores à correção posterior do leitor interno; sem QR ativo |
| 09 | Entidade Geladeira e validações | Figura de código preparada em 18/11, extraída do commit de 30/10 |
| 10 | Migration inicial | Figura de código preparada em 18/11, extraída do commit de 30/10 |
| 11 | Consulta SQLite da rota de saúde | Figura de código preparada em 18/11, extraída do commit de 30/10 |
| 12 | Cadastro pela API com EF Core | Figura de código preparada em 18/11, extraída do commit de 30/10 |
| 13 | Resultados iniciais preservados | Quadro preparado em 18/11 a partir dos relatórios de 13 e 15/10 |
| 14 | Histórico real do Git | Quadro preparado em 18/11 a partir dos commits disponíveis |
| 15 | Entrada GPIO27 com jumper | Quadro preparado em 18/11 a partir de três capturas seriais reais e separadas |

## Como explicar as datas

Os relatórios e as capturas preservados registram etapas desde **13/10/2026**. O primeiro commit disponível é **`a788f2bf39142153ca00b95f0574b1c4a72fad7f`, de 30/10/2026**. As primeiras capturas foram incluídas no Git nessa data. Não há commits de 13/10 para apresentar.

As figuras de código e os quadros foram preparados **agora, em 18/11/2026**, e trazem essa identificação. Não são capturas antigas de um editor ou terminal. A data no identificador da migration pertence ao arquivo e não muda a data do primeiro commit disponível. Os registros locais e o Git permitem conferir a procedência do material; não constituem certificação independente da data de produção de cada arquivo.

## Inserção no Word

1. Use **Inserir → Imagens** e escolha o arquivo em `imagens/`.
2. Preserve a proporção e confirme que o texto continua legível. Capturas móveis integrais são altas; use-as em apêndice ou selecione uma área pertinente, mantendo o original e identificando o recorte.
3. Copie a explicação e a fonte de `LEGENDAS_PARA_COPIAR.txt`. Ajuste a numeração à sequência do seu documento, preferencialmente com **Referências → Inserir Legenda**.
4. Explique no texto o que a figura demonstra e seu limite. Por exemplo: tela inicial com consulta real ao SQLite; cadastro fixture em banco isolado; painel alimentado pelo simulador; código obtido do primeiro commit disponível.
5. Revise a seleção, a normalização e o texto com o orientador. Este caderno complementa os materiais de modelagem de 17/11; não substitui a monografia final.

## Limites das evidências

As oito capturas JPG foram copiadas **sem alterar seus bytes**. Os dados de teste das telas são fixtures/simulação identificadas; não representam medições de uma geladeira física. As capturas em largura móvel são de navegador e não comprovam execução no iPhone físico. A tela de acesso de 14/11 não comprova o uso da câmera.

A figura 15 registra somente a entrada elétrica GPIO27: oito HIGH sem conexões, oito LOW com ponte de jumper e oito HIGH após retirar a ponte, em capturas separadas por reinício. Não comprova sensor magnético, DS18B20, medição de temperatura, latência ou envio físico à API. Nesta tarefa documental, esses ensaios não foram repetidos. A placa continua com o programa temporário de diagnóstico.

Não foram recriadas telas antigas nem simulada uma janela de IDE/terminal. Não foram alterados horários dos commits, código executável, banco, migrations, credenciais ou configurações do computador. Fotos pessoais da conversa e logs privados com identificadores exclusivos não integram este material. A assistência de IA na inspeção, seleção, composição e conferência está registrada; o aluno deve revisar, compreender e defender o conteúdo.

## Conferir a integridade

O ZIP pode ser aberto e as imagens/PDF utilizados sem instalar Python. Para repetir a conferência opcional, com Python 3 já disponível:

```powershell
python .\verificar_integridade.py
```

Execute na pasta extraída do pacote. Para conferir também contra as fontes do repositório e os objetos Git, partindo da raiz do ICEPLAY, com Python e Git disponíveis:

```powershell
python .\docs\tcc\evolucao-visual-2026-11-18\verificar_integridade.py --repositorio .
```

O programa só lê arquivos e imprime JSON. Resultado esperado: `"result": "passed"`. As cópias arquivadas e imagens exigem os hashes exatos; a comparação opcional de relatórios textuais com o repositório tolera somente a conversão CRLF/LF de finais de linha, prevista no Git. Trata-se de verificação documental de integridade, não de novo teste de funcionamento da aplicação ou de sensores. Os hashes identificam os bytes preservados; não certificam, por si sós, autoria ou data.
