# Teste parcial no iPhone — 09/11/2026

## Origem da evidência

O aluno executou as ações no próprio aparelho e enviou uma foto mostrando a página "ICEPLAY na rede local". Depois das instruções de certificado/acesso, respondeu "pronto". Após o roteiro de saúde, cadastro/edição, histórico vazio, navegação e atualização de página, respondeu "sim, tudo perfeito". Uma segunda foto, enviada depois do envio das simulações, mostrou a tabela e o gráfico das três leituras na página Histórico do iPhone. As fotos permanecem somente na conversa, sem cópia para o repositório. As ações sem imagem são registradas como relato do usuário, não como captura/automação do Safari.

Modelo do iPhone e versão do iOS: não informados. Ambiente: computador Windows na rede local, aplicação HTTP loopback e HTTPS no IP privado configurado. No momento do teste foi usada a versão local com reorganização em páginas ainda sem commit de código. O fechamento e a publicação dessa revisão devem ser consultados no relatório próprio e no Git; este registro de teste manual não comprova push.

| Etapa | Evidência / resultado |
| --- | --- |
| Página de preparação no iPhone | Foto enviada na conversa mostra a página e o certificado público. |
| Conexão e uso no aparelho | Relatados pelo aluno após o roteiro de acesso. |
| Saúde real | Aluno confirmou API operacional/SQLite conectado; GET local `/api/health` retornou 200, healthy/connected e uma geladeira em `2026-11-09T20:14:46.3737314Z`. |
| Cadastro e edição | Aluno confirmou; GET `/api/geladeiras` retornou ID 2, nome `TESTE IPHONE EDITADO`, criado em `2026-11-09T20:13:06.4688333Z`. |
| Histórico sem leituras, navegação e refresh | Confirmados pelo aluno no roteiro. Não equivalem a reiniciar o processo da aplicação. |
| Menu e campos na tela | Usuário respondeu positivamente à pergunta sobre acessibilidade dos controles no aparelho. Não certifica todos os viewports/zoom/orientações. |
| Histórico com leituras simuladas | Segunda foto na conversa mostra gráfico e tabela com IDs 1/2/3, geladeira 2, 4,25 °C, porta fechada e origem Simulação. Confirma apresentação desses registros no aparelho; não é medição física. |

## Envio subsequente de dados de teste

Foi anunciado o envio de três leituras Simulacao para o cadastro de teste ID 2. O comando só foi executado após conferir por GET que o nome continuava exatamente `TESTE IPHONE EDITADO`.

```powershell
.\tools\simulator\enviar-leituras.ps1 -ApiUrl http://127.0.0.1:5080 -GeladeiraId 2 -Quantidade 3 -IntervaloSegundos 1 -TemperaturaC 4.25
```

Os três POSTs retornaram 201, IDs 1/2/3, origem Simulacao, 4,25 °C constantes e `portaAberta: false`. Os timestamps foram produzidos pelo emissor e pela API durante a execução; esses valores não representam sensores físicos. Resultado em `envio-simulacao.json`. O GET `/api/leituras?geladeiraId=2&origem=Simulacao&pagina=1&tamanhoPagina=50` retornou totalItens 3, preservando os dois timestamps, conforme `historico-api.json`.

No primeiro registro deste roteiro, a conferência do histórico com dados ainda estava pendente. A foto subsequente confirma essa parte: a página mostrava três leituras, tabela e gráfico de temperatura constante. O refinamento do gráfico e do indicador de acesso foi feito depois dessa foto e não está validado por ela.

## Pendências

- Conferir no iPhone os refinamentos posteriores do gráfico e do indicador de acesso; tabela/gráfico da versão fotografada já foram confirmados.
- Testar logout, reconexão e reinício do servidor com preservação de dados.
- Testar exclusão somente de cadastro fixture sem leituras; o ID 2 agora tem leituras e deve ser protegido por 409.
- Registrar iOS/modelo e conferir separadamente zoom, teclado/orientação e estados de erro.
- Consultar o [relatório do fechamento de páginas](../../etapa-paginas-2026-11-09.md) e o Git para os testes de software e a publicação; esta evidência manual não comprova essas ações.
- Hardware físico, alertas e regras permanecem pendentes.

Este teste manual não executou uma suíte completa nem acompanhou o reinício no iPhone. O relatório de fechamento registra separadamente o reinício e a persistência verificados no computador, sem substituir logout/reconexão e reinício acompanhados no aparelho. Não há hardware disponível nem validação de ESP32/DS18B20/sensor magnético.
