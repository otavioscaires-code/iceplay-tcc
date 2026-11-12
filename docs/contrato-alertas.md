# Regras e episódios de alertas

Decisão de implementação de 12/11/2026. Complementa as configurações existentes, sem definir temperaturas sanitárias para o usuário. Os parâmetros reais dependem da geladeira e do uso e devem ser acordados com o orientador.

## Semântica

- Só equipamentos com configuração explicitamente ativa são avaliados. Não há seed, ativação automática ou mistura entre `Simulacao` e `Hardware`.
- Um serviço da própria API avalia o SQLite a cada segundo, inclusive sem novos POSTs. A API precisa estar em execução. Não é um serviço externo de notificação.
- Temperatura: abaixo do mínimo ou acima do máximo abre `TemperaturaForaFaixa` (gravidade `Critico`). Os limites são inclusivos: exatamente no limite é normal.
- Porta: leituras abertas consecutivas devem confirmar uma duração maior ou igual à tolerância. O tempo é contado pelas medições, não pelo simples tempo de uma tela aberta. Um intervalo entre amostras maior ou igual ao prazo de ausência quebra a continuidade. Não se inventa o estado da porta durante uma lacuna.
- Ausência: abre `AusenciaLeituras` (`Atencao`) quando o horário atual alcança o último instante de medição elegível mais o prazo configurado. Sem medição desde a ativação, usa o início do monitoramento. Receber hoje uma medição antiga não renova o prazo. Porta aberta tem gravidade `Atencao`; essas classificações são escolhas do protótipo, não certificações de risco alimentar.
- Só medições posteriores ou iguais à atualização da configuração alimentam temperatura/porta. Alterar parâmetros encerra os episódios anteriores como `ConfiguracaoAlterada` e reinicia a confirmação dessas duas regras. O início da contagem de ausência não é adiado por uma simples edição de limites.
- Leituras já aplicadas são identificadas por medição/ID; leituras atrasadas não fazem o estado atual retroceder. A origem e a versão da configuração fazem parte do estado persistido.
- Um episódio aberto por equipamento/origem/tipo é único. Outra leitura anormal atualiza a evidência do mesmo episódio. Uma recuperação permite abrir outro episódio futuro.
- `Encerrado` não significa necessariamente normalizado: o motivo distingue `CondicaoNormalizada`, `SemDadosRecentes`, `ConfiguracaoAlterada` e `MonitoramentoDesativado`. Ausência encerra os episódios de temperatura/porta como sem dados, preservando seu histórico. Nenhum botão declara uma temperatura normal sem medição.
- Reinício preserva episódios e continuidade confirmada no SQLite. Na retomada, o serviço avalia a situação presente. Não cria um histórico fictício de verificações durante o tempo em que a aplicação esteve desligada.

## Persistência

`Alertas` guarda equipamento, origem, tipo, gravidade, início observado da condição, abertura pelo servidor, última evidência, encerramento/motivo, leitura de abertura quando aplicável e cópia dos parâmetros usados. `EstadosMonitoramento` guarda o ponto de processamento e início confirmado da sequência de porta. São tabelas aditivas; as três migrations anteriores permanecem intactas.

As alterações de um ciclo por equipamento usam transação de escrita SQLite. O índice único parcial impede dois episódios abertos do mesmo tipo. A exclusão de equipamentos com alertas é recusada para preservar as ocorrências.

## Consulta

`GET /api/alertas`: filtros opcionais `geladeiraId`, `origem` (`Simulacao`/`Hardware`), `tipo`, `gravidade` (`Atencao`/`Critico`), `situacao` (`Aberto`/`Encerrado`), `inicioUtc` e `fimUtc` (abertura, inclusivos, ISO UTC Z), `pagina=1`, `tamanhoPagina=50` (1..100). Retorna filtros, contagem, páginas e `itens`, ordenados por abertura/ID decrescentes. Entrada inválida: 400; equipamento inexistente: 404; falha de banco: 503. `GET /api/alertas/{id}` consulta um episódio ou retorna 404.

`GET /api/alertas/resumo?origem=Simulacao` exige origem e retorna contagens reais de abertos/críticos, equipamentos monitorados e sem configuração ativa, cinco ocorrências recentes e situação do avaliador. A interface deve distinguir serviço sem avaliação recente de confirmação de zero ocorrências.

Testes de software, integração HTTP e simulação não comprovam funcionamento físico. Os resultados executados serão registrados no relatório desta etapa.
