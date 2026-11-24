# ICEPLAY Monitoramento de geladeiras com API e interface web responsiva

{{AUTOR}}

Universidade Paulista UNIP Campus {{CAMPUS}}

Orientador {{ORIENTADOR}}

{{ANO}}

**Artigo de trabalho, não versão final para submissão.** Confirmar modelo/extensão com o orientador e incorporar ensaios físicos antes de concluir resultados, resumo e conclusão.

## Resumo provisório

O ICEPLAY é um protótipo de monitoramento de temperatura e estado da porta de geladeiras, com persistência local e consulta pelo navegador do celular. Uma aplicação ASP.NET Core integra API, Entity Framework Core, SQLite e arquivos estáticos. O software inclui histórico paginado, parâmetros por equipamento, episódios de alerta e credencial para emissor com UUID de medição. A verificação incremental exercitou contratos, entradas inválidas, persistência/reinício e regras temporais. Um simulador usa a mesma API com origem identificada. O firmware principal ESP32 foi compilado; diagnósticos isolados demonstraram resposta básica do contato magnético e oito aquisições reais de temperatura pela USB. Integração física com API e ensaio na geladeira permanecem pendentes. Os resultados não demonstram precisão térmica ou eficácia em campo. O protocolo físico delimita as conclusões possíveis e orienta os ensaios restantes.

Palavras chave IoT; monitoramento; refrigeração; persistência; sistemas web.

## 1 Introdução

Este artigo trata da construção de um fluxo verificável entre aquisição prevista, armazenamento e consulta de dados de uma geladeira. O problema inclui interpretar o instante da informação e reconhecer ausência, em vez de manter um valor antigo como situação atual. A proposta é um protótipo local de monitoramento acessível pelo Safari, sem atuação sobre o circuito de refrigeração.

A fundamentação inicial utiliza trabalhos de sensoriamento conectado e monitoramento em cadeia fria, relacionados na bibliografia do TCC, além da documentação dos componentes e ferramentas. O recorte não inclui comparar experimentalmente soluções comerciais ou atribuir ao protótipo resultados de redução de perdas.

## 2 Método

O desenvolvimento foi organizado em incrementos: persistência/cadastro, ingestão/simulador, painel/histórico, páginas, parâmetros, regras/alertas, autorização e firmware. A cada conjunto concluído foram executadas verificações e registradas evidências/commits reais. Testes de software utilizaram SQLite isolado. Um programa C# com relógio controlado exercitou regras; clientes HTTP verificaram o servidor real; testes JavaScript usaram DOM/fetch controlados.

A validação física identifica conjunto/montagem, condições, parâmetros e observações F01–F12. Inclui sensor, porta, rede/UTC, persistência, ausência/recuperação e consulta no iPhone. Foram realizadas verificações parciais de bancada com diagnósticos isolados; a integração ponta a ponta permanece pendente. Assistência de IA utilizada em análise, código, testes e redação está registrada; o autor deve revisar, reproduzir e defender os artefatos.

## 3 Solução implementada

ASP.NET Core serve API e sete páginas HTML próprias. EF Core mapeia seis entidades de negócio para SQLite. A leitura preserva temperatura, porta, origem, medição UTC e recebimento UTC. A interface oferece consulta atual, histórico/gráfico da página, filtros/paginação e configuração sem valores automáticos. Um serviço periódico na mesma aplicação persiste episódios, mantendo motivo de encerramento e evitando duplicação.

A sequência de porta depende das medições observadas e é interrompida por lacuna. Ausência usa medição/início de ativação para não ser renovada por upload antigo. A credencial de dispositivo limita o envio ao equipamento vinculado; UUID repetido com o mesmo conteúdo retorna o registro existente. A sessão web e o dispositivo possuem mecanismos de autorização diferentes.

O firmware compilado utiliza ESP32 clássico, DS18B20 e reed, com UTC/HTTPS e uma amostra pendente em RAM até 30 segundos. Não existe promessa de fila offline completa ou captura de todo pulso curto da porta. Rotina de aquisição, rede e efeitos elétricos ainda exigem ensaio real.

## 4 Resultados de software

Na rodada de 18/11/2026, build .NET passou sem avisos/erros e os 149 testes JavaScript passaram. Foram registrados, entre outros, 31 testes de regras com relógio controlado, 85 verificações/56 requisições de dispositivo, 181/137 de rede móvel e 216/52 de páginas, além dos demais verificadores. Não se somam essas contagens como cobertura ou funcionalidades independentes. Os registros estão em `docs/evidencias/20261118T220205Z-revisao-orientador/`; rodadas anteriores preservam suas próprias datas e resultados.

O upgrade do banco de uso para cinco migrations manteve uma geladeira e três leituras Simulacao, com o mesmo hash dos campos anteriores. O perfil de firmware configurado sinteticamente compilou; dois avisos de biblioteca foram registrados. Esses resultados verificam os cenários de software exercitados, não aquisição física. Uso parcial anterior no iPhone foi relatado, mas as novas telas exigem conferência visual.

## 5 Resultados físicos e discussão

Em 16/11 houve reconhecimento USB e, em 18/11, comunicação serial e gravação autorizada de um diagnóstico temporário de GPIO27. Foram observados oito HIGH sem conexões, oito LOW com jumper e oito HIGH após sua retirada, em capturas separadas por reinício. Na noite de 23/11, o contato SP-1006 com ímã produziu HIGH/LOW/HIGH/LOW/HIGH, com 8/8/8/7/8 registros em capturas separadas, verificando resposta elétrica básica sem medir latência/alcance. Depois de montagem confirmada verbalmente e autorização específica, um diagnóstico de temperatura/porta foi gravado. A captura de 24/11 às 01:04:49–01:05:05 UTC (23/11 à noite em São Paulo) recebeu oito temperaturas reais de 24,4375 °C pela USB, sem mensagens de erro; quatro casas não demonstram precisão experimental. [Relatório e dados da aquisição](../etapa-leitura-temperatura-2026-11-23.md). O firmware principal de ingestão ainda não foi gravado e não houve envio físico à API.

Permanecem necessários resposta térmica, ensaio de desconexão e integração na geladeira: identificar montagem/posição, duração, parâmetros, série real persistida, falhas e recuperação. Comparação com referência térmica só pode ser discutida se realizada e documentada. A validação física integra o objetivo atual do TCC, não foi transferida para trabalho futuro e não é substituída pela especificação do fabricante.

## 6 Conclusão parcial

O software disponível integra armazenamento, consulta e regras com comunicação autorizada, dentro do ambiente local e dos casos verificados. A conclusão sobre o sistema IoT completo depende da montagem e da validação física, da revisão das telas no aparelho e da análise do conjunto de evidências. A versão final deve atualizar esta seção e o resumo com resultados efetivamente obtidos.

## Referências

Usar a lista verificada em `referencias.md`, mantendo somente obras citadas na versão final e padronizando conforme o modelo de artigo confirmado com o orientador. Não reutilizar a bibliografia educacional do modelo Word por conveniência.
