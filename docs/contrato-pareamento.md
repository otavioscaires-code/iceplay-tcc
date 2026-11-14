# Conexão móvel por QR Code

Incremento de 14/11/2026. Preserva HTTPS, cookies, CSRF, código manual, SQLite e credenciais de sensores. Atende ao operador local do MVP; contas individuais e permissões por usuário continuam fora desta etapa.

## Uso

1. Iniciar `scripts/run-mobile.ps1` com a configuração local existente.
2. No computador, abrir `http://localhost:5080/acesso` e clicar em **Gerar QR Code**.
3. No iPhone da mesma rede, com certificado já instalado/confiável, ler o QR pela Câmera, abrir no Safari e tocar em **Conectar este dispositivo** em até 120 s.

O QR permite uma conexão com as mesmas permissões do código compartilhado. O operador pode gerar outro ou cancelar. A sessão dura até 8 h, sem renovação automática, e termina ao sair/reiniciar. A leitura da câmera não é feita por JavaScript no site. Nenhum usuário, limite de geladeira ou leitura é criado por este fluxo.

## Contratos

`GET /api/acesso` mantém os campos existentes e acrescenta `pareamentoDisponivel`. É `true` somente no loopback HTTP/porta local, quando o modo móvel está habilitado.

| Método/rota | Requisição | Resposta |
| --- | --- | --- |
| `POST /api/acesso/pareamento` | Sem corpo; somente operador no loopback, `Origin` igual à origem da requisição e `X-ICEPLAY-LOCAL: 1` | 200, `{url,expiraEmUtc,validadeSegundos:120}` |
| `DELETE /api/acesso/pareamento` | Mesmas restrições | 204, cancelamento idempotente |
| `POST /api/acesso/pareamento/entrar` | HTTPS, cookie/token CSRF válidos e JSON `{token}` | 204 e cookie de sessão; consumo único |

`url` é gerada com IP/porta HTTPS já configurados, no formato `https://IP_LOCAL:PORTA_HTTPS/acesso#parear=TOKEN_TEMPORARIO`. O token tem 43 caracteres base64url, gerados com 32 bytes aleatórios criptográficos. O código permanente nunca é incluído. Não colocar um token real nos exemplos ou evidências.

400: formato inválido, HTTP na entrada ou CSRF ausente/inválido. 401: token incorreto, consumido ou expirado; ou tentativa remota de emitir convite sem sessão. 403: origem externa, ausência de cabeçalho local na emissão/cancelamento ou tentativa de gerenciá-los por cliente HTTPS autenticado. 404: modo móvel desligado, respeitadas as restrições de rede. 429: mais de oito tentativas de entrada por QR por minuto no total da instância. O limitador é separado do código manual. O bootstrap HTTP de certificados nunca oferece estas APIs.

## Decisões e limites

- Apenas um convite pendente por instância. O servidor guarda SHA-256 em memória e prazo; gerar outro substitui o anterior. Cancelar/reiniciar invalida o pendente. Não existe migration nova.
- Comparação em tempo constante e consumo protegido por lock; duas requisições concorrentes não reutilizam o convite. Tentativa incorreta não consome o convite legítimo. O limite de validade é inclusivo na expiração.
- A página remove o fragmento com `history.replaceState` antes de aguardar HTTP, mantém o token apenas em memória e exige confirmação explícita. O segredo vai no corpo do POST, sem query string, localStorage ou sessionStorage. Atualizar antes de confirmar perde a cópia em memória; é preciso escanear novamente ou gerar outro.
- O fragmento não integra a requisição HTTP. A API responde `no-store`; não registrar corpos/cookies/QR ativo em logs ou Git. Quem obtiver a imagem de um convite ainda válido pode usá-lo. Exibi-lo somente para o aparelho autorizado.
- Emissão/cancelamento exigem loopback, origem exata e cabeçalho próprio. Isso preserva o papel de operador do computador e impede que outra página emita/revogue convites com uma requisição simples. Hosts permitidos, TLS e CSRF anteriores continuam ativos.
- O SVG é gerado localmente pela biblioteca [Project Nayuki 1.8.0](https://www.nayuki.io/page/qr-code-generator-library), vendorizada com licença MIT/hash em `wwwroot/vendor/README.md`. Não há serviço de QR externo ou dependência adicional de backend. A imagem usa preto/branco e margem de quatro módulos.
- Ao sair da página, a interface limpa imagem/segredo; isso não confirma cancelamento no servidor. O convite restante expira pelo prazo original. Falha de rede no cancelamento é apresentada como resultado não confirmado.
- O QR não instala nem torna confiável o certificado; a preparação do iPhone continua necessária. Não torna o aplicativo público ou multiusuário.

As propriedades de aleatoriedade, validade e uso único seguem as recomendações gerais para tokens temporários da [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), aplicadas aqui ao pareamento; o ICEPLAY não implementou recuperação de senha.

## Verificar

Com o servidor de uso encerrado antes dos builds:

```powershell
.\scripts\verify-mobile.ps1 -EvidenceDirectory docs/evidencias/sua-nova-revisao/mobile
node --test scripts/acesso.test.mjs scripts/pareamento.test.mjs
.\scripts\verify-pages.ps1 -EvidenceDirectory docs/evidencias/sua-nova-revisao/paginas
```

O primeiro usa configuração/certificado/banco isolados e relógio controlado somente no programa de verificação. Não muda o certificado/confiança/firewall do computador de uso. Testes HTTP/DOM/viewport não equivalem à leitura por câmera no iPhone. Resultados executados: [relatório desta etapa](etapa-pareamento-2026-11-14.md).
