# Regressão e testes adicionais do programa — 26/11/2026

O aluno solicitou novos testes para reduzir imprevistos. A [rodada inicial](evidencias/20261126T041425Z-regressao-programa/rodada.json), com [critérios prévios](evidencias/20261126T041425Z-regressao-programa/criterios.json), executou build com zero avisos/erros, os 149 testes JavaScript existentes, dez verificadores e 15 verificações do pacote completo anterior. Todos passaram. Processos e bancos de teste ficaram isolados; a API usada pelo ESP32 não foi reiniciada.

## Falha encontrada na confirmação de Configurações

No navegador nativo, salvar uma configuração com monitoramento ativo ainda mostrava **“Esta versão ainda não gera alertas”**. A mesma tela confirmava avaliação das regras e a página Alertas mostrava episódios reais das fixtures de simulação. A mensagem vinha de uma etapa anterior do projeto. Um teste antigo também exigia essa frase e precisava ser atualizado.

A confirmação agora informa a gravação e orienta consultar o estado confirmado pela API. O módulo recebeu versão nova na URL do HTML. Foi acrescentado um caso que salva monitoramento ativo, confere o booleano, o início devolvido pelo servidor e a apresentação coerente do estado. A fixture de resposta foi ajustada para devolver início válido quando ativa. O teste novo reproduziu a contradição antes da correção: 22 passaram e um falhou no módulo; após a correção, os **150 testes JavaScript passaram**, sem falhas, cancelamentos ou casos ignorados.

Os verificadores afetados foram repetidos em novas pastas: Configurações passou em 153 verificações/67 requisições; páginas em 216/52. Os dois assets corrigidos foram copiados à execução publicada neste computador, com backups privados e hashes em [correção local](evidencias/20261126T041425Z-regressao-programa/correcao-local.json), sem mexer no banco, firmware, regras ou reiniciar a API. A conferência HTTP confirmou que o servidor normal e a cópia servem os bytes corrigidos. Após recarregar a página, o navegador confirmou o módulo novo e a mensagem correta.

## Concorrência, histórico e recuperação

O novo [verificador reproduzível](../scripts/verify-estabilidade.py), iniciado pelo [script PowerShell](../scripts/verify-estabilidade.ps1), usa um banco novo exclusivamente em `.tools/verification`. Passou em **305 verificações e 250 requisições HTTP**, com até oito clientes simultâneos. São asserções e requisições da mesma execução, não 305 ensaios físicos independentes.

- Oito envios simultâneos do mesmo UUID produziram uma criação e sete repetições, com o mesmo ID, recebimento e valores zero/false. Mais 64 envios de 16 medições distintas mantiveram uma linha por medição.
- Duas requisições concorrentes com o mesmo UUID e conteúdos diferentes produziram uma criação e um conflito HTTP 409.
- Quarenta inserções Simulacao e 20 consultas concorrentes conservaram a consistência entre contagem e página. Uma extração com corte UTC fixo recuperou exatamente as 100 leituras anteriores, sem omissão ou duplicação. Isso não promete estabilidade entre páginas sem corte enquanto novos dados entram.
- Uma corrida entre revogação e envio persistiu somente requisições aceitas; os envios posteriores foram recusados. A credencial substituta do cliente de software funcionou, e reiniciar o servidor conservou todas as linhas e a idempotência.

As fixtures `Hardware` servem apenas para exercitar autenticação em banco isolado; não representam um ESP32 físico. O restante dos dados gerados foi identificado como `Simulacao`. Logs e relatórios integrais com dados de teste permanecem privados; o [resumo estruturado](evidencias/20261126T041425Z-regressao-programa/resumo-software.json) registra contagens, cenários e hashes.

Para repetir esse verificador em outra pasta de evidências, no PowerShell7.5 ou posterior a partir da raiz:

```powershell
.\scripts\verify-estabilidade.ps1 -EvidenceDirectory docs/evidencias/nova-rodada/estabilidade
```

## Conferência visual e limites

No navegador integrado foram observados painel, equipamento sem leitura, histórico paginado, página 2 preservada após recarregar, resultado vazio, faixa inválida recusada, configuração persistida e episódios abertos/encerrados de temperatura. No viewport de 390 × 844, menu e navegação funcionaram; o documento teve largura de375px e o gráfico297px, dentro do viewport. Nenhum erro JavaScript foi registrado na aba final do histórico. As imagens foram observadas durante a execução, sem novo arquivo de screenshot arquivado. A cópia visual e seu emissor Simulacao foram encerrados; o viewport foi restaurado e as abas temporárias fechadas. Isso não equivale a novo teste no Safari real.

O prefixo das medições reais e os cadastros/configurações/dispositivo/migrations foram preservados; o banco original do código-fonte e o perfil móvel mantiveram seus hashes. Não houve instalação, alteração de firewall/confiança ou novo ensaio físico. A publicação e a conferência de um novo pacote devem acompanhar esta correção antes de recomendar seu uso no outro notebook. O [fechamento físico anterior](etapa-fechamento-final-2026-11-26.md) continua preservado, incluindo seus limites térmicos e o notebook da apresentação ainda indisponível. Testes reduzem risco; não estabelecem ausência absoluta de falhas em qualquer ambiente.

## Pacote corrigido publicado e verificado

Uma nova publicação autocontida foi gerada em cópia isolada e conservada em `.tools/exports/2026-11-26-programa-testado-windows-x64/`. O [runtime corrigido](evidencias/20261126T041425Z-regressao-programa/runtime-corrigido.json) passou em17 verificações, incluindo Windows PowerShell5.1/pasta com espaços/SDK ausente do PATH, primeira execução vazia, páginas, igualdade entre HTML/JavaScript servido e arquivos do pacote, persistência após reinício, recusa de perfil de outro IP e perfil HTTPS sintético preservado sem instalar certificados. O verificador do pacote recebeu as duas novas conferências de assets. A conferência nativa após recarregar resolveu a verificação pendente do registro inicial de cópia dos assets. Word/PDF anteriores não foram editados nesta rodada.
