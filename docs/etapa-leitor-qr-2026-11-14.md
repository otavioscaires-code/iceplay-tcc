# Correção de 14/11/2026 — leitor QR dentro da página

O usuário informou que ler o QR abria o site, mas ainda pedia código. Pediu uma opção de leitura dentro do navegador do celular e limitou esta etapa à correção desse acesso.

## Comportamento

No computador, `http://localhost:5080/acesso?modo=qr` mostra o endereço HTTPS de entrada no celular e permite gerar/cancelar o convite. No Safari do iPhone, abrir esse endereço, tocar em **Ler QR Code**, permitir câmera e enquadrar o QR do computador. A leitura reconhecida encerra a câmera, oculta o código manual e mostra **Conectar este dispositivo**. O código permanente não é necessário nesse fluxo. Mantida a alternativa manual para quem a escolher.

O script anterior só processava o fragmento ao carregar. Agora também reconhece `hashchange`/`pageshow`, cobrindo convites em abas existentes. Essa condição foi verificada em testes de JavaScript; não se atribui causa única ao Safari sem inspeção do aparelho. Entrada `?modo=qr`, `no-store` no HTML de acesso e versões novas de JS/CSS evitam reutilização de interface antiga. O atalho comum passa a ser **Ler QR Code / Entrar**.

## Arquivos

- `wwwroot/leitor-qr.js`: captura por clique, preferência traseira, vídeo inline/muted, frames locais de até 640 px/180 ms, limite de 90 s, encerramento dos tracks e mensagens de permissão/erros.
- `wwwroot/pareamento.js`: validação do QR somente da mesma origem, estado único da conexão, confirmação e tratamento de abas existentes. Nunca navegar para QR estrangeiro.
- `wwwroot/acesso.html`, `acesso.js`, `styles.css` e versões de acesso nos sete HTMLs: leitor, endereço móvel visível no computador, alternativa manual e carregamento atualizado.
- `Controllers/AcessoController.cs`: `enderecoMovel` no GET existente e query não secreta na URL do convite. Contratos de emissão/consumo mantidos.
- `Mobile/MobileAccessMiddleware.cs`: HTML de entrada sem cache, câmera da própria origem e mídia local/blob na CSP. HTTPS/CSRF/rede/autenticação anteriores preservados.
- `wwwroot/vendor/jsqr-v1.4.0.js`, `jsqr-LICENSE.txt`, README e `.gitattributes`: artefatos oficiais com bytes/licença/SRI/hashes preservados. Nenhuma instalação npm ou dependência nova de backend.
- `scripts/leitor-qr.test.mjs`, `acesso-pareamento.test.mjs`, testes existentes de acesso/pareamento e `verify-mobile.py`: regressões, decodificação e integração.
- README, contexto, AGENTS, contrato e guia do iPhone: operação e limites atualizados.

Nenhuma migration, tabela, código permanente, credencial de sensor, regra de firewall ou confiança de certificado foi modificada.

## Comandos e resultados reais

```powershell
git status --short
python -X utf8 .\scripts\backup-database.py
$testFiles = @(rg --files scripts -g '*.test.mjs')
node --test @testFiles
.\scripts\verify-mobile.ps1 -EvidenceDirectory docs/evidencias/2026-11-14-leitor-qr/mobile-01
.\scripts\verify-pages.ps1 -EvidenceDirectory docs/evidencias/2026-11-14-leitor-qr/paginas-01
.\scripts\run-mobile.ps1
```

O servidor de uso foi encerrado antes dos builds e iniciado novamente ao concluir. O pacote oficial jsQR foi baixado do registro npm, sem executar scripts, validado com SHA-512/SRI e extraídos somente biblioteca/licença. As versões estão no README do vendor. Backups privados consistentes executados antes e depois.

| Verificação | Resultado | Evidência em `docs/evidencias/2026-11-14-leitor-qr/` |
| --- | --- | --- |
| Build API e programa de verificação | Sucesso, zero avisos/erros | `mobile-01/build.log`, `mobile-01/pareamento-build.log` |
| Node, dez arquivos | 149 aprovados, zero falhas | `validacao-01/node.log` |
| Relógio controlado/convite | 13 asserções aprovadas | `mobile-01/pareamento-regras.json` |
| TLS/HTTP/SQLite isolados | 181 verificações / 137 requisições registradas | `mobile-01/mobile-api.json` |
| Páginas/rotas/assets e persistência | 216 asserções / 52 requisições registradas | `paginas-01/pages-api.json` |
| Banco de uso | Integridade ok; 1 geladeira, 3 leituras Simulacao, cinco migrations; hash histórico igual; demais tabelas vazias | `banco-antes.json`, `banco-depois.json` |
| Navegador, computador | Endereço móvel mostrado, emissão/cancelamento com nova URL observados | `visual-computador.jpg`, capturada sem QR ativo |

Os testes do leitor exercitam permissão negada, HTTP inseguro, câmera ausente, falha de vídeo, QR estrangeiro, cancelamento antes de resolver permissão, duplo clique, ocultação/saída e prazo de captura. A imagem sintética do QR gerado pela biblioteca Nayuki foi decodificada pela biblioteca jsQR e a URL completa comparada. Isso verifica os algoritmos com pixels de teste, não uma câmera física.

Os testes combinados executam os scripts reais de acesso/pareamento no mesmo contexto, com API controlada, validando CSRF, entrada inicial, convite em aba aberta e leitura interna sem POST de código permanente. A integração HTTP mantém banco real isolado, valida TLS com CA explícita e preserva os testes de código anterior, idempotência de dispositivo, CSRF, revogação e reinício.

## Limites e teste do aluno

O navegador automatizado abriu a página local do computador, mas rejeitou o endereço HTTPS com `ERR_CERT_AUTHORITY_INVALID`. Não foi ignorado aviso nem instalada confiança. Isso é distinto do verificador TLS com CA explícita e da confiança já preparada no iPhone. Portanto não foi feita conferência visual do leitor em Safari nem captura real do aparelho nesta etapa.

No iPhone, abrir o endereço novo `https://192.168.1.123:5443/acesso?modo=qr`, tocar em **Ler QR Code**, permitir câmera, enquadrar convite recém-gerado e confirmar. Registrar se o painel abriu sem código, se a câmera encerrou e se a sessão foi mantida. Se der erro, registrar a mensagem, sem enviar convite válido ou código permanente. O relato anterior não é pareamento aprovado. A implementação física dos sensores permanece pendente e não faz parte desta correção. Aguardar a próxima orientação do usuário após este teste.
