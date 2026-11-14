# Conexão móvel por QR Code

Incremento de 14/11/2026. Preserva HTTPS, cookies, CSRF, código manual, SQLite e credenciais de sensores. Atende ao operador local do MVP; contas individuais e permissões por usuário continuam fora desta etapa.

## Uso

1. Iniciar `scripts/run-mobile.ps1` com a configuração local existente.
2. No computador, abrir `http://localhost:5080/acesso?modo=qr`. A página mostra o endereço HTTPS de entrada no celular, sem segredo.
3. No iPhone da mesma rede, com certificado já instalado/confiável, abrir esse endereço no Safari e tocar em **Ler QR Code**, autorizando a câmera.
4. No computador, gerar o QR. Ler com o vídeo dentro da página do iPhone e tocar em **Conectar este dispositivo** em até 120 s da emissão.

O QR permite uma conexão com as mesmas permissões do código compartilhado. O operador pode gerar outro ou cancelar. A sessão dura até 8 h, sem renovação automática, e termina ao sair/reiniciar. A leitura é feita localmente em JavaScript, sem upload de frames. A alternativa de ler pelo aplicativo Câmera continua aceita, inclusive quando o Safari reutiliza uma aba. Nenhum usuário, limite de geladeira ou leitura é criado por este fluxo.

## Contratos

`GET /api/acesso` mantém os campos existentes e acrescenta `pareamentoDisponivel` e `enderecoMovel`. O primeiro é `true` somente no loopback HTTP/porta local, com modo móvel habilitado. O segundo é o endereço HTTPS `/acesso?modo=qr`, sem token, ou null no modo comum.

| Método/rota | Requisição | Resposta |
| --- | --- | --- |
| `POST /api/acesso/pareamento` | Sem corpo; somente operador no loopback, `Origin` igual à origem da requisição e `X-ICEPLAY-LOCAL: 1` | 200, `{url,expiraEmUtc,validadeSegundos:120}` |
| `DELETE /api/acesso/pareamento` | Mesmas restrições | 204, cancelamento idempotente |
| `POST /api/acesso/pareamento/entrar` | HTTPS, cookie/token CSRF válidos e JSON `{token}` | 204 e cookie de sessão; consumo único |

`url` é gerada com IP/porta HTTPS já configurados, no formato `https://IP_LOCAL:PORTA_HTTPS/acesso?modo=qr#parear=TOKEN_TEMPORARIO`. A query é somente um marcador de interface, sem segredo; cria uma entrada distinta para evitar HTML antigo em cache. O token tem 43 caracteres base64url, gerados com 32 bytes aleatórios criptográficos. O código permanente nunca é incluído. Não colocar um token real nos exemplos ou evidências.

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

## Leitor interno e correção de navegação

`leitor-qr.js` usa `getUserMedia` após clique explícito, vídeo com `playsinline`/muted e câmera traseira preferencial, sem áudio. A biblioteca local [jsQR 1.4.0](https://github.com/cozmo/jsQR), Apache-2.0, decodifica frames com maior dimensão de até 640 px, a cada 180 ms. Licença, origem e hashes estão em `wwwroot/vendor/README.md`; sem instalação npm ou pacote de backend novo.

O leitor aceita somente URL HTTPS da **mesma origem**, caminho `/acesso`, query vazia/`modo=qr` e token no formato esperado. QR externo não é aberto nem transmitido. O reconhecimento fecha a câmera e mostra a confirmação; ainda não inicia sessão automaticamente. O campo de código manual fica oculto enquanto há convite reconhecido. Erro de autenticação devolve a opção de leitura, sem exigir código.

Cancelar, ocultar/sair da página, autenticar ou passar 90 s encerra a captura e os tracks. Permissão que chegar após cancelamento tem o stream encerrado. Imagens são processadas em memória e não são enviadas, persistidas ou colocadas em logs. Permissão negada, câmera ausente e falha de vídeo possuem mensagens específicas. HTTPS confiável continua sendo necessário; não ignorar avisos de certificado.

O código anterior só lia o fragmento no carregamento; agora trata também `hashchange` e `pageshow`. Isso cobre a chegada de um novo convite em aba existente, reproduzida nos testes de JavaScript. Sem inspeção do Safari do usuário, não se atribui a essa falha a causa única do relato. `/acesso` e `/acesso.html` respondem `no-store`; scripts/CSS são versionados para carregar o novo fluxo. O Safari/câmera real ainda precisa de validação do aluno, conforme [relatório do leitor](etapa-leitor-qr-2026-11-14.md).

As propriedades de aleatoriedade, validade e uso único seguem as recomendações gerais para tokens temporários da [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), aplicadas aqui ao pareamento; o ICEPLAY não implementou recuperação de senha.

## Verificar

Com o servidor de uso encerrado antes dos builds:

```powershell
.\scripts\verify-mobile.ps1 -EvidenceDirectory docs/evidencias/sua-nova-revisao/mobile
node --test scripts/acesso.test.mjs scripts/pareamento.test.mjs
.\scripts\verify-pages.ps1 -EvidenceDirectory docs/evidencias/sua-nova-revisao/paginas
```

O primeiro usa configuração/certificado/banco isolados e relógio controlado somente no programa de verificação. Não muda o certificado/confiança/firewall do computador de uso. Testes HTTP/DOM/viewport não equivalem à leitura por câmera no iPhone. Resultados executados: [relatório desta etapa](etapa-pareamento-2026-11-14.md).
