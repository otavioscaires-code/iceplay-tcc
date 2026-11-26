# Aviso sonoro e revisão do ICEPLAY em 26 de novembro

O aviso sonoro foi implementado e o aluno confirmou os três bipes de teste no PC e no iPhone, além da repetição automática no PC. A regressão de software passou sem falhas e as medições físicas voltaram após o reinício USB relatado. Há uma divergência atual na porta: fechada no relato, mas aberta nas medições, inclusive após aproximar os ímãs. O Word/PDF registra essa pendência. O outro notebook continua indisponível; sua rede e execução exigem ensaio no destino.

## Alterações

Visão geral e Alertas têm Ativar som, Testar som e Silenciar. O áudio começa desativado, acompanha todos os equipamentos da origem escolhida e consulta os episódios abertos a cada 15 segundos com a página visível. Há repetição a cada 30 segundos enquanto houver alerta. Silenciar não altera ocorrências no banco. Trocar de página ou recarregar exige ativar novamente. As regras de temperatura, porta e ausência permanecem no servidor.

O som é produzido pelo navegador do PC ou celular. A primeira tentativa no iPhone não foi ouvida; após orientar a desativação do modo Silencioso e ajuste de volume, o aluno confirmou os três bipes. O comportamento do modo silencioso sobre Web Audio está documentado no [registro do WebKit](https://bugs.webkit.org/show_bug.cgi?id=237322). Não há garantia com página oculta, aparelho bloqueado ou navegador fechado. A confirmação manual refere-se ao botão Testar som; a reação automática a episódios foi exercitada nos testes de software.

Também foi corrigida a mensagem de exclusão de geladeiras: o bloqueio pode decorrer de leituras **ou alertas** armazenados. A mensagem anterior atribuía todo conflito a leituras.

## Revisão do código e verificações

Foram inspecionados os módulos próprios da API, contratos, entidades, persistência, regras temporais, acesso móvel, credenciais, interface e firmware. A revisão conferiu validação, UTC, transações, idempotência, cancelamento de consultas, tratamento de falhas, escopo de credenciais e limpeza de câmera/áudio. Migrations e modelo foram conferidos pelas verificações existentes. Firmware e ligações físicas não foram alterados.

O [inventário](evidencias/20261126T154501Z-som-auditoria-regressao/inventario-codigo.json) registra 132 arquivos versionados e 24.015 linhas, incluindo 76 arquivos de produto, ferramentas, testes, dependências e modelo gerado. As declarações são localizadas por heurística; isso não é uma métrica de cobertura. Dependências e arquivos gerados foram tratados por versões, integridade, compilação e integração, sem afirmar auditoria manual de cada uma de suas linhas. Revisão e testes não garantem ausência de falhas em qualquer ambiente.

| Verificação | Resultado e alcance |
|---|---|
| Build da solução | Zero avisos e erros. |
| JavaScript | 161 testes passaram; 11 novos casos de som. |
| API e SQLite | Dez verificadores existentes passaram em bancos isolados. |
| Estabilidade | 305 asserções e 250 requisições HTTP, até oito clientes; fixtures isoladas. |
| Runtime Windows com som | 24 verificações, inclusive PowerShell 5.1 sem SDK no PATH, persistência após reinício, perfil HTTPS sintético e correspondência dos assets servidos. |
| Som nos aparelhos | Bipes de teste ouvidos pelo aluno no PC e iPhone. |
| TCC | Word/PDF de 46 páginas, 20 figuras e cinco tabelas, incluindo apêndice da operação de hoje; campos, listas e todas as páginas conferidos. Imagens anteriores preservadas byte a byte. |
| Banco de uso | Prefixo completo de 1.944 leituras e metadados preservados; SQLite íntegro, sem violações de vínculos ou fixtures Simulacao. |

Os [resultados da rodada](evidencias/20261126T154501Z-som-auditoria-regressao/rodada.json), [runtime](evidencias/20261126T154501Z-som-auditoria-regressao/runtime.json), [documento](evidencias/20261126T154501Z-som-auditoria-regressao/documento.json) e [confirmações manuais](evidencias/20261126T154501Z-som-auditoria-regressao/confirmacoes-manuais.json) detalham a procedência. Os testes DOM usam controle de áudio em software. O acesso de automação ao navegador estava indisponível nesta conversa; não houve nova captura de tela nativa dessa implementação.

## Operação física e pendências

A API estava encerrada no início da conferência e foi reaberta com o perfil existente. A última leitura permanecia em 26/11 às 01:46:54 locais. Após o reinício somente do USB relatado pelo aluno, a [retomada passou](evidencias/20261126T154501Z-som-auditoria-regressao/operacao-retomada.json) com três amostras recentes do mesmo dispositivo, IDs 1981–1983, de 4,3750, 4,2500 e 4,1875 °C, coincidentes na API e no SQLite. Ausência #14 normalizou. Isso não é novo ensaio térmico com critérios prospectivos.

O aluno informou porta fisicamente fechada, enquanto o dado indicava aberta. A [aproximação dos ímãs ficou incompleta](evidencias/20261126T154501Z-som-auditoria-regressao/aproximacao-ima-operacao.json): as três leituras finais continuaram abertas. A fixação/contato precisa de inspeção atual antes da demonstração. Não se inverteu a polaridade ou alteraram parâmetros para esconder o resultado. Os ciclos de 25/11 permanecem registros históricos; não provam estabilidade da montagem de hoje. O aluno foi avisado para soltar os ímãs; não há ação física mantida em espera.

- Ensaiar o outro notebook e a rede efetiva da apresentação quando disponíveis, incluindo HTTPS, celular e rota da ESP32.
- Conferir medições recentes antes de demonstrar. API saudável e LED aceso não comprovam que a placa está enviando.
- Corrigir a divergência atual do contato da porta e conferir o estado fechado após a correção. Uma foto atual da posição e dos contatos é necessária para orientar o próximo ajuste.
- Preservar o resultado térmico: a janela prospectiva de 30 minutos teve queda média de 0,85 °C, abaixo do critério de 1 °C. A extensão de 47 min 31 s foi exploratória e não altera o resultado original.
- Permanecem sem ensaio físico no principal a interrupção DQ, o reenvio após perda de confirmação e a rotação de credencial. Há testes de software correspondentes, com alcance próprio.
- Calibração, comparação com termômetro de referência, operação comercial e disponibilidade prolongada permanecem fora da validação realizada.

O [guia de uso e apresentação](guia-uso-apresentacao.md) explica acesso, QR Code, páginas, parâmetros e som. Documentos preenchidos, fotos, banco e ZIP completo continuam privados; versões anteriores foram preservadas.
