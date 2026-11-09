# Teste parcial no iPhone — 09/11/2026

## Origem da evidência

O aluno executou as ações no próprio aparelho e enviou uma foto mostrando a página "ICEPLAY na rede local". Depois das instruções de certificado/acesso, respondeu "pronto". Após o roteiro de saúde, cadastro/edição, histórico vazio, navegação e atualização de página, respondeu "sim, tudo perfeito". A foto não foi copiada para o repositório; as demais ações são registradas como relato do usuário, não como captura/automação do Safari.

Modelo do iPhone e versão do iOS: não informados. Ambiente: computador Windows na rede local, aplicação HTTP loopback e HTTPS no IP privado configurado. Foi usada a versão local com reorganização em páginas ainda sem commit de código; esta documentação não afirma disponibilidade dessa versão em clone remoto.

| Etapa | Evidência / resultado |
| --- | --- |
| Página de preparação no iPhone | Foto enviada na conversa mostra a página e o certificado público. |
| Conexão e uso no aparelho | Relatados pelo aluno após o roteiro de acesso. |
| Saúde real | Aluno confirmou API operacional/SQLite conectado; GET local `/api/health` retornou 200, healthy/connected e uma geladeira em `2026-11-09T20:14:46.3737314Z`. |
| Cadastro e edição | Aluno confirmou; GET `/api/geladeiras` retornou ID 2, nome `TESTE IPHONE EDITADO`, criado em `2026-11-09T20:13:06.4688333Z`. |
| Histórico sem leituras, navegação e refresh | Confirmados pelo aluno no roteiro. Não equivalem a reiniciar o processo da aplicação. |
| Menu e campos na tela | Usuário respondeu positivamente à pergunta sobre acessibilidade dos controles no aparelho. Não certifica todos os viewports/zoom/orientações. |

## Envio subsequente de dados de teste

Foi anunciado o envio de três leituras Simulacao para o cadastro de teste ID 2. O comando só foi executado após conferir por GET que o nome continuava exatamente `TESTE IPHONE EDITADO`.

```powershell
.\tools\simulator\enviar-leituras.ps1 -ApiUrl http://127.0.0.1:5080 -GeladeiraId 2 -Quantidade 3 -IntervaloSegundos 1 -TemperaturaC 4.25
```

Os três POSTs retornaram 201, IDs 1/2/3, origem Simulacao, 4,25 °C constantes e `portaAberta: false`. Os timestamps foram produzidos pelo emissor e pela API durante a execução; esses valores não representam sensores físicos. Resultado em `envio-simulacao.json`. O GET `/api/leituras?geladeiraId=2&origem=Simulacao&pagina=1&tamanhoPagina=50` retornou totalItens 3, preservando os dois timestamps, conforme `historico-api.json`.

## Pendências

- Confirmar a tabela/gráfico dessas leituras no iPhone.
- Testar logout, reconexão e reinício do servidor com preservação de dados.
- Testar exclusão somente de cadastro fixture sem leituras; o ID 2 agora tem leituras e deve ser protegido por 409.
- Registrar iOS/modelo e conferir separadamente zoom, teclado/orientação e estados de erro.
- Encerrar as regressões/documentação/commit da reorganização em páginas.
- Hardware físico, alertas e regras permanecem pendentes.

Esta etapa não executou nova suíte completa, não reiniciou o servidor após o cadastro e não afirma validação de ESP32/DS18B20/sensor magnético.
