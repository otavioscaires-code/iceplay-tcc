# Comunicação autenticada do dispositivo

Decisão de 12/11/2026. Mantém `POST /api/leituras`, ASP.NET Core/EF Core/SQLite e o acesso do navegador. Não introduz serviço externo, OAuth ou JWT. A credencial opaca aleatória é específica do protótipo local; usa o cabeçalho Bearer e HTTPS conforme os cuidados de transporte descritos na [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750.html). Não se declara implementação de um servidor OAuth.

## Provisionamento pelo operador

| Rota | Contrato |
| --- | --- |
| `GET /api/geladeiras/{id}/dispositivos` | Metadados, sem segredo/hash. Geladeira inexistente: 404. |
| `POST /api/geladeiras/{id}/dispositivos` | `{"nome":"ESP32 da geladeira"}` (1..100 caracteres, trim). 201, Location, `{dispositivo, credencial}`. A credencial é mostrada somente nesta resposta. Já existe ativo: 409. |
| `GET /api/geladeiras/{id}/dispositivos/{dispositivoId}` | Metadados ou 404, inclusive vínculo incorreto. |
| `POST /api/geladeiras/{id}/dispositivos/{dispositivoId}/revogar` | 200 com metadados; repetir preserva o instante original. 404 para vínculo inexistente. Nova emissão exige revogar a anterior. |

Operador local ou sessão móvel HTTPS/CSRF. O ESP32 não recebe permissão para consultar cadastros, ler o banco, emitir outras credenciais ou gerenciar configurações. Nenhuma credencial é criada ao iniciar o sistema. Na interface, a emissão/revogação é explícita e tem confirmação; perder a resposta de emissão exige consultar os metadados e revogar antes de emitir outra.

O segredo contém 32 bytes aleatórios (256 bits), é mantido apenas pelo operador/placa e armazenado no SQLite somente como SHA-256, comparado em tempo constante. Não é senha humana. O banco guarda ID, vínculo, nome, hash, criação e revogação; arquivos pessoais e firmware configurado não entram no Git. Quem possui a credencial pode declarar dados daquele equipamento: autenticação não comprova a existência/precisão do sensor.

## Ingestão

O dispositivo envia `Authorization: Bearer <credencial>` e os cinco campos anteriores de leitura, mais `medicaoId` no formato UUID D, por exemplo `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` com dígitos hexadecimais. `origem` precisa ser `Hardware`; `geladeiraId` precisa corresponder à credencial. Sem correspondência: 403. Credencial inválida/revogada: 401. Credencial em outra rota/método: 403. A proteção de sub-rede e HTTPS é preservada; HTTP existe somente para o operador/testes no loopback. O ESP32 não usa cookie nem CSRF.

- Primeira entrega de uma medição: 201 e Location.
- Repetição do mesmo UUID, dispositivo e conteúdo: 200, mesmo ID/recebimento/Location; não cria outra leitura ou novo episódio.
- Mesmo UUID com conteúdo diferente: 409. UUID de outro dispositivo é independente.
- JSON/medição/futuro inválidos: 400; banco indisponível: 503.
- Revogação é novamente conferida dentro da transação de ingestão. Cadastro/exclusão/envio concorrentes são serializados pelas transações SQLite.

As respostas de leitura passam a incluir `dispositivoId` e `medicaoId` anuláveis. A quinta migration é aditiva e preserva os registros antigos com esses campos nulos. Leitura com credencial possui vínculo definido pelo servidor, nunca pelo campo extra enviado pelo cliente. A origem continua declarativa; a autenticação é uma informação adicional.

O simulador/operador local e o navegador mantêm o contrato anterior sem credencial de dispositivo. Podem declarar `Hardware` para testar o contrato, mas `dispositivoId: null` distingue esses registros de ingestão autenticada. Dados de teste de hardware no verificador ficam apenas em banco isolado e não são medições físicas.

## Relógio e falhas

Permanece a regra existente: UTC ISO com segundos/sufixo Z, até sete casas, sem tolerância para futuro. O firmware sincroniza UTC por SNTP e envia segundos completos; medição futura recebe 400 e exige conferir os relógios. Não forjar timestamp nem desligar a validação TLS para contornar problemas.

Falha do DS18B20, CRC/conversão inválida ou relógio não sincronizado não produzem uma leitura numérica de substituição. Sem leituras válidas, a regra de ausência configurada pode abrir ocorrência. Reenvios de falha de rede/timeout/503 conservam o mesmo UUID, medição e conteúdo; respostas 400/401/403/409 requerem correção, não repetição infinita do mesmo pedido. O firmware manterá apenas uma amostra pendente em RAM, com prazo e política documentados; reiniciar a placa perde esse buffer. Não há promessa de histórico offline completo.
