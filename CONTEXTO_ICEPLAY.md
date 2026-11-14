# CONTEXTO ICEPLAY

Referência consolidada em **13/11/2026**. Leia também `AGENTS.md`, `README.md`, os contratos e os arquivos da tarefa. As etapas anteriores permanecem nos relatórios datados e no Git; este resumo substitui suas listas antigas de pendências, sem atribuir testes novos a datas passadas.

**Incremento de 14/11/2026:** acesso pelo iPhone também por QR Code temporário, gerado na página `/acesso` do computador. Convite em memória, válido por 120 s/uso único; confirmação no celular abre a mesma sessão de operador. Código manual e proteção HTTPS/CSRF preservados. Sem migration/pacote de backend novo. Ver `docs/contrato-pareamento.md` e `docs/etapa-pareamento-2026-11-14.md`. Testes: 127 Node, 13 asserções com relógio controlado, móvel 176/134 e páginas 212/50; navegador desktop/largura 390 px conferido. A câmera/Safari do iPhone ainda precisa validar este novo fluxo.

**Correção posterior de 14/11:** o usuário relatou abertura do QR ainda pedindo código e solicitou leitura dentro do site. Acesso agora oferece **Ler QR Code** no celular, captura local sem áudio/upload, validação de origem e confirmação sem código manual. Trata `hashchange`/`pageshow` em abas existentes; entrada `/acesso?modo=qr` e `no-store` evitam HTML antigo. `GET /api/acesso` acrescenta `enderecoMovel`, mostrado no computador. Ver `docs/etapa-leitor-qr-2026-11-14.md`. Rodada atual: 149 Node, 13 asserções de convite, móvel 181/137, páginas 216/52, builds sem avisos/erros. Desktop conferido; o navegador automatizado não confiou na CA local para abrir o endereço HTTPS, sem bypass. Permissão/captura reais no iPhone continuam pendentes. Não registrar o relato anterior como login por QR aprovado.

## 1 Objetivo e situação real

**Novo requisito de apresentação, confirmado em 14/11:** acesso por 4G/5G, sem Wi-Fi da faculdade, desktop de destino sem Wi-Fi, solução gratuita e possibilidade de compartilhar internet do iPhone. Usuário confirmou desktop sem internet por rede, com permissão para instalar o aplicativo/driver de compartilhamento pelo USB; reconhecimento e conexão no destino ainda não testados. Análise em `docs/plano-acesso-remoto-apresentacao-2026-11-14.md`: candidato computador próprio + túnel HTTPS gratuito, condicionado à disponibilidade do servidor e às regras do plano. Perfil remoto/login/ativação do túnel ainda não implementados; não expor a porta local com bypass de operador. Arquitetura e banco preservados; nenhuma hospedagem contratada.

ICEPLAY é o TCC de Ciência da Computação de Otávio Souza Caires, orientado por Sérgio Mazini, campus Araçatuba. Monitora geladeiras comerciais: temperatura, estado da porta, dois timestamps UTC, histórico e episódios de alertas. A interface é web responsiva, usada pelo Safari; não é aplicativo nativo. Controle significa gestão/consulta dos parâmetros, sem acionamento de compressor.

Prazo do professor: versão completa em **24/11/2026**, apresentação em **01/12/2026**, com evidências de execução. O usuário pediu encerrar o trabalho de software antes da chegada do hardware, por incrementos validados. Voz foi excluída do MVP em 09/11; notificações externas são futuras.

**Software implementado e verificado:** CRUD, ingestão/simulador, painel, histórico, páginas independentes, acesso móvel, configurações, regras/alertas, credenciais de dispositivo e reenvio idempotente. **Firmware escrito e compilado:** ESP32 clássico, DS18B20 e reed. **Não validado:** montagem, gravação, sensor físico, comunicação real da placa, precisão e ensaio na geladeira. A nova interface ainda precisa de conferência visual no iPhone.

## 2 Arquitetura e versões

Uma aplicação ASP.NET Core serve API e arquivos estáticos HTML/CSS/JavaScript. EF Core persiste em SQLite. `Monitoring/AlertasWorker` roda no mesmo processo e avalia a cada segundo, com escopo EF/transação por equipamento. Não há framework frontend, npm de aplicação, broker, microserviços ou banco remoto.

- SDK local `.tools/dotnet/dotnet.exe`: .NET 10.0.401; EF Core SQLite/Design e dotnet-ef: 10.0.12, fixados.
- PowerShell 7.5+; Python e Node são necessários para partes da verificação, não para iniciar a API.
- Firmware: PlatformIO Core 6.1.18 em venv Python 3.12 local; plataforma espressif32 6.12.0, Arduino ESP32 2.0.17, OneWire 2.3.8, DallasTemperature 4.0.5.
- Ferramentas, bancos, backups e segredos ficam em `.tools`/arquivos ignorados. Não instalar dependências extras ou substituir tecnologias sem necessidade.

## 3 Arquivos e responsabilidades

| Local | Responsabilidade |
| --- | --- |
| `src/Iceplay.Api/Program.cs` | DI, SQLite, migrations em Development, middleware e rotas HTML próprias |
| `Controllers/`, `Contracts/`, `Models/` | API, validação/DTOs e entidades |
| `Data/IceplayDbContext.cs`, `Migrations/` | Restrições, índices e cinco evoluções de esquema |
| `Monitoring/` | Avaliador periódico, checkpoints, deduplicação e situação do serviço |
| `Devices/DispositivoCredentials.cs` | Hash de credencial e contexto do emissor autenticado |
| `Mobile/` | Sub-rede, HTTPS, cookie de operador, CSRF e limitação de login |
| `wwwroot/` | Sete HTMLs, shell responsivo, tema Black & Ice Blue e clientes das páginas |
| `scripts/verify*.ps1`, `*.py`, `*.test.mjs` | Verificações em bancos isolados, HTTP/TLS e DOM/fetch controlados |
| `tests/Iceplay.Verification/` | Regras executáveis em C# com SQLite real e relógio controlado, sem pacote de testes novo |
| `tools/simulator/enviar-leituras.ps1` | Simulador explicitamente Simulacao pela API |
| `firmware/esp32/`, `scripts/*firmware.ps1` | Programa, dependências, configuração privada e ferramentas de compilação/gravação |
| `docs/contrato-*.md`, `docs/modelagem-atual.md`, `docs/operacao.md` | Contratos, modelagem consolidada e manual |
| `docs/hardware/`, `docs/tcc/` | Montagem/protocolo pendentes de ensaio e fontes da escrita acadêmica |
| `docs/evidencias/` | Logs e resultados reais, incluindo tentativas com falha preservadas |

## 4 Páginas e acesso

`/` e `/dashboard`: Visão geral. `/geladeiras`: CRUD. `/historico`: filtros, gráfico da página, tabela e paginação. `/alertas`: filtros/episódios. `/configuracoes`: parâmetros e emissão/revogação de credenciais. `/acesso`: sessão móvel. `/sobre`: base técnica. Cada URL entrega HTML independente, funciona com recarga/acesso direto e tem menu lateral desktop/recolhível móvel. Não há fallback SPA; desconhecidas retornam 404.

O tema usa `theme.css`, `styles.css` e `assets/iceplay-mark.svg`. Clientes usam `window.iceplayFetch` para sessão/CSRF/timeout. Conteúdo da API entra como texto; falhas limpam dados antigos em vez de confirmar zero. Painel/alertas atualizam a cada 15 s enquanto visíveis. O gráfico representa somente as amostras da página, sem inventar medições intermediárias.

## 5 API e contratos

| Método e rota | Sucesso e regras |
| --- | --- |
| `GET /api/health` | 200/503, consulta real a Geladeiras; `{status,database,refrigeratorCount,checkedAtUtc}` |
| `GET/POST /api/geladeiras` | Lista 200; cria 201/Location. Nome obrigatório 1..100 após validação, localização opcional até 200 |
| `GET/PUT/DELETE /api/geladeiras/{id}` | 200/200/204; ausente 404; com leituras ou alertas, exclusão 409 |
| `GET/PUT /api/geladeiras/{id}/configuracao` | GET 200 com configuração nula se ausente; PUT criação 201 ou atualização 200; equipamento ausente 404 |
| `POST /api/leituras` | Cria 201/Location; com dispositivo+UUID, repetição idêntica 200, conteúdo conflitante 409 |
| `GET /api/leituras/{id}` | 200 ou 404, leitura com origem, dois timestamps e metadados anuláveis do emissor |
| `GET /api/leituras` | geladeiraId/origem obrigatórios, inicioUtc/fimUtc inclusivos opcionais, pagina=1/tamanhoPagina=50 até 100; resposta com contagem/páginas/itens |
| `GET /api/monitoramento?origem=...` | Uma leitura por geladeira na origem escolhida, pela maior medição e ID no empate; null quando não há leitura |
| `GET /api/alertas`, `/{id}` | Lista com filtros/paginação ou detalhe; tipos, gravidade, situação, parâmetros e motivos |
| `GET /api/alertas/resumo?origem=...` | Contagens reais, equipamentos ativos/sem monitoramento, cinco recentes e situação do avaliador |
| `GET/POST /api/geladeiras/{id}/dispositivos` | Metadados sem segredo ou emissão 201 `{dispositivo,credencial}`; só um ativo, conflito 409 |
| `GET /api/geladeiras/{id}/dispositivos/{dispositivoId}` | Metadados ou 404 para ID/vínculo inexistente |
| `POST /api/geladeiras/{id}/dispositivos/{dispositivoId}/revogar` | Revogação idempotente 200; ausente 404 |
| `GET /api/acesso`, `POST /api/acesso/entrar`, `/sair` | Sessão móvel/código e CSRF; 204 para entrada/saída válida, login limitado |
| `POST/DELETE /api/acesso/pareamento` | Emite/cancela convite somente pelo computador local; exige origem exata e `X-ICEPLAY-LOCAL: 1` |
| `POST /api/acesso/pareamento/entrar` | HTTPS com CSRF, JSON `{token}`; 204/401/429, consumo único |

Entradas inválidas: 400; recursos inexistentes: 404; conflito: 409; falha reconhecida de persistência: 503 genérico. Contratos completos em `docs/contrato-leituras.md`, `contrato-configuracoes.md`, `contrato-alertas.md`, `contrato-dispositivos.md` e README.

Leitura exige `geladeiraId`, número finito `temperaturaC`, booleano `portaAberta`, `medidoEmUtc` e origem exata `Simulacao`/`Hardware`. UTC exige segundos, Z e até sete casas; futuro é recusado sem tolerância. Recebimento/ID são do servidor. Dispositivo Bearer exige UUID D `medicaoId`, origem Hardware e vínculo correto; servidor define `dispositivoId`. Credencial inválida/revogada 401; outra geladeira/rota 403. Emissão/revogação remota exige a sessão/CSRF do operador.

Operador/simulador preserva o POST anterior; pode declarar Hardware sem credencial, com vínculo de dispositivo nulo. A etiqueta e mesmo a credencial não comprovam leitura física/precisão. No teste de credenciais, Hardware é fixture de software apenas no banco isolado.

## 6 Banco e migrations

Uso: `src/Iceplay.Api/data/iceplay.db` (`Data Source=data/iceplay.db`, relativo ao content root; Windows trata Data/data sem distinção). Não usar EnsureCreated nem apagar banco para atualizar. Instância única, migrations automáticas somente em Development; Production precisa de aplicação explícita e backup.

| Entidade/tabela | Conteúdo e vínculos |
| --- | --- |
| Geladeira / Geladeiras | ID, nome, localização, criação UTC |
| Leitura / Leituras | FK equipamento RESTRICT, temperatura/porta/origem, medição/recebimento UTC, dispositivo/UUID anuláveis |
| ConfiguracaoGeladeira / ConfiguracoesGeladeiras | PK/FK equipamento 1:0..1, faixa, tempos, origem, ativação/início/atualização; CASCADE sem apagar leituras |
| Alerta / Alertas | FK equipamento/leitura de abertura RESTRICT, episódio, origem/tipo/gravidade, evidências/instantes/motivo, cópia dos parâmetros |
| EstadoMonitoramento / EstadosMonitoramento | PK/FK configuração, versão, checkpoint medição/ID e início da sequência de porta |
| Dispositivo / Dispositivos | FK equipamento, nome, hash de segredo aleatório, criação/revogação; leituras preservam vínculo |

Migrations preservadas: `20261013172101_InitialCreate`, `20261018023456_AddLeituras`, `20261109233935_AddConfiguracoesGeladeiras`, `20261112192436_AddAlertas`, `20261112194714_AddDispositivos`. A quinta exige reconstrução interna de Leituras pelo SQLite/EF, testada com campos/IDs e alerta preexistentes. Não presumir ordem física de colunas; selecionar por nome. SQL atual para banco novo: `docs/sql/iceplay-criacao-2026-11-12.sql`; anteriores mantidos.

Índice único parcial de episódio aberto por equipamento/origem/tipo; de dispositivo ativo por equipamento; de dispositivo/UUID para idempotência. Datas são UTC; enumerações são texto. Restrições de finitude, faixa/tempos, FK e coerência dos instantes são verificadas. A API não define faixa física/sanitária para todas as leituras; o firmware filtra erros do sensor previsto.

## 7 Regras e decisões temporais

Somente configuração explicitamente ativa gera alertas. Temperatura fora dos limites inclusivos abre Critico; porta aberta confirmada em medições por duração e ausência abrem Atencao. Gravidades são decisão do protótipo, não classificação sanitária.

Ausência usa idade da medição elegível ou início da ativação, e é avaliada sem POST. Isso evita renovar o prazo com upload antigo, ajustando o critério inicial de recebimento descrito no planejamento histórico. Lacuna maior/igual ao prazo de ausência quebra a sequência de porta. Medições atrasadas não retrocedem o checkpoint. Editar parâmetros encerra episódios anteriores e exige novas amostras para temperatura/porta; editar limites não adia o início da ausência. Desativar/trocar origem é explícito.

Encerrado tem motivo: CondicaoNormalizada, SemDadosRecentes, ConfiguracaoAlterada ou MonitoramentoDesativado. Encerrar por falta de dados não confirma normalização. Reinício preserva episódios/checkpoint; não inventa verificações enquanto a API esteve desligada. O serviço sinaliza falta de sucesso recente e a tela não apresenta zero como situação confirmada nesse caso. Referência visual de 60 s continua independente.

## 8 Execução neste computador

PowerShell 7, raiz `C:/Users/otavi/Downloads/iceplay`:

```powershell
.\scripts\setup.ps1
.\scripts\run.ps1
```

Local: `http://localhost:5080`. Encerrar antes de recompilar. Para rede já preparada, usar somente `scripts/run-mobile.ps1`, com IP atual **192.168.1.123**, HTTPS **5443**, bootstrap de certificado **5081**, loopback **5080**. iPhone usa `https://192.168.1.123:5443/acesso`, mesma rede, código em `.tools/mobile/codigo-acesso.txt`. Não publicar esse arquivo ou settings/PFX, alterar firewall/confiança ou ignorar TLS. Sessão Secure/HttpOnly/SameSite Strict dura até 8 h e reinício exige reconectar.

`scripts/backup-database.py` cria cópia consistente privada em `.tools/backups`, sem substituir origem. Ver `docs/operacao.md`. Na conclusão de 13/11, foram aplicadas as cinco migrations no banco de uso e comparados backups: uma geladeira, três leituras Simulacao, zero configurações/alertas/checkpoints/dispositivos; hash dos campos históricos igual antes/depois. Nenhum limite ou token foi criado automaticamente. Evidência: `docs/evidencias/2026-11-13-fechamento/`.

## 9 Testes e limites de verificação

Scripts base/CRUD/leituras/histórico/painel/configurações/alertas/dispositivos/páginas/móvel usam bancos isolados; sempre passar nova pasta `-EvidenceDirectory`. Executar sequencialmente, sem servidor de uso em execução durante builds. Node: sete arquivos `scripts/*.test.mjs`, 112 testes na última rodada. Firmware: `scripts/verify-firmware.ps1` compila exemplo e cópia isolada configurada; não copia configuração privada nem grava placa.

Resultados executados em 12–13/11: build .NET zero avisos/erros; base 13; CRUD 807/177 requisições; leituras 339/75; histórico 145/68; painel 70/29; configurações 153/67; alertas 31 com relógio controlado e HTTP 91/67 na rodada final; dispositivos 84/55; móvel 139/102; páginas 207/47; Node 112. Não somar como funcionalidades independentes ou porcentagem de cobertura. Consultar relatórios para requisições extras/simulador/concorrência e tentativas falhas preservadas. O commit `c9c0a29` corrigiu a aceitação de fração UTC vazia no filtro; ver `docs/correcao-filtro-utc-2026-11-13.md`.

Firmware passou em ambos os perfis; configurado usou 47708 bytes de RAM estática e 929469 bytes de aplicação flash segundo compilador. Dois avisos OneWire 2.3.8 em #undef, sem erro. Não são medições de RAM dinâmica/TLS na placa. Relatórios em `docs/etapa-alertas-2026-11-12.md`, `etapa-interface-alertas-2026-11-12.md`, `etapa-dispositivos-2026-11-12.md`, `etapa-firmware-2026-11-13.md`.

## 10 iPhone e hardware

Em 09/11 o usuário confirmou acesso, saúde, cadastro/edição/navegação, histórico vazio e recarga; foto posterior mostrou três leituras Simulacao e gráfico. Registro em `docs/evidencias/2026-11-09-iphone/validacao-manual.md`. Novos formulários/alertas/refinamentos não foram conferidos visualmente no aparelho. Ferramenta de navegador respondeu indisponível nesta conversa em 12/11; testes DOM/HTTP não são renderização ou Safari.

Hardware previsto: uma placa ESP32 clássica, sonda DS18B20, um par reed/ímã, resistor 4k7 (não 47R), protoboard/jumpers e USB com dados. GPIO4 para DQ, pull-up a 3V3 e GPIO27/GND para contato; conferir fios/polaridade/modelo reais. Placa/alimentação fora da geladeira. Sem atuação na rede elétrica/compressor.

Em 14/11, o usuário confirmou recebimento somente do cabo, kit de contatos magnéticos e resistores comprados com valor errado; os corretos ainda serão entregues. ESP32, DS18B20, protoboard e jumpers ainda não recebidos. Não há montagem, gravação ou ensaio físico validado. Fotos/embalagens não comprovam transmissão USB nem contato seco.

Firmware: amostragem nominal 10 s, conversão 800 ms, debounce 50 ms, UTC SNTP, CA HTTPS, UUID/retry; uma amostra pendente em RAM até 30 s, sem histórico offline completo. Operações HTTP podem atrasar polling; não promete capturar todo pulso curto. `firmware/README.md` e `docs/hardware/` têm comandos, montagem e 12 ensaios pendentes. Configurar WiFi/chave em `config.local.h`, ignorado; verificador nunca publica binário privado.

## 11 Git e documentação acadêmica

Branch `codex/retomada-historico`, origin `https://github.com/otavioscaires-code/iceplay-tcc.git`. Autorização de 30/10 cobre commits/pushes rotineiros validados; sem ações destrutivas. Incrementos desta continuação: `db960eb` regras; `4a6199d` interface; `caccaf3` credenciais; `b9b3d97` firmware. Consultar log/status/ls-remote para fechamento posterior. Fetch anterior encontrou referência interna Codex inválida; não apagar refs/resetar. Push normal e consulta direta do remoto funcionaram.

Escrita em `docs/tcc/`: minuta de monografia, artigo de trabalho, referências verificadas e instruções de uso do modelo UNIP. Conteúdo deve ser revisado/defendido pelo aluno e orientador. Resultados físicos/conclusão final/formatação Word não podem ser declarados prontos antes dos ensaios/revisão. RA e cópia pessoal ficam em `.tools/documentacao-iceplay`, fora do Git. Assistência está em `docs/uso-de-ia.md`; não inventar autoria manual, referências ou evidência.

## 12 Próximas prioridades

1. Conferir fisicamente as peças recebidas, montagem/polaridade/cabo/COM; preparar configuração privada e gravar, conforme protocolo.
2. Executar bancada e geladeira: temperatura/porta, HTTPS/UTC, erros, ausência/recuperação/reinício/revogação; guardar resultados reais.
3. Conferir no iPhone os novos formulários, alertas e refinamentos em orientação/teclado/reconexão, sem confundir com os testes HTTP.
4. Preencher parâmetros reais com o orientador, resultados físicos, discussão/limitações, capturas novas e concluir revisão/formatação do TCC/artigo/apresentação.

Não reconstruir módulos já concluídos, criar dados fictícios, trocar tecnologias ou considerar simulação equivalente ao ensaio físico.
