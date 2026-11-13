# ICEPLAY Monitoramento de geladeiras com API e interface web responsiva

{{AUTOR}}

Universidade Paulista UNIP Campus {{CAMPUS}}

Orientador {{ORIENTADOR}}

{{ANO}}

**Artigo de trabalho, não versão final para submissão.** Confirmar modelo/extensão com o orientador e incorporar ensaios físicos antes de concluir resultados, resumo e conclusão.

## Resumo provisório

O ICEPLAY é um protótipo de monitoramento de temperatura e estado da porta de geladeiras, com persistência local e consulta pelo navegador do celular. Uma aplicação ASP.NET Core integra API, Entity Framework Core, SQLite e arquivos estáticos. O software inclui histórico paginado, parâmetros por equipamento, episódios de alerta e credencial para emissor com UUID de medição. A verificação incremental exercitou contratos, entradas inválidas, persistência/reinício e regras temporais. Um simulador usa a mesma API com origem identificada. O firmware ESP32 foi compilado, enquanto montagem e ensaio na geladeira permanecem pendentes. Os resultados apresentados são de software e não demonstram precisão térmica ou eficácia em campo. O protocolo físico preparado orienta a coleta posterior e delimita as conclusões possíveis.

Palavras chave IoT; monitoramento; refrigeração; persistência; sistemas web.

## 1 Introdução

Este artigo trata da construção de um fluxo verificável entre aquisição prevista, armazenamento e consulta de dados de uma geladeira. O problema inclui interpretar o instante da informação e reconhecer ausência, em vez de manter um valor antigo como situação atual. A proposta é um protótipo local de monitoramento acessível pelo Safari, sem atuação sobre o circuito de refrigeração.

A fundamentação inicial utiliza trabalhos de sensoriamento conectado e monitoramento em cadeia fria, relacionados na bibliografia do TCC, além da documentação dos componentes e ferramentas. O recorte não inclui comparar experimentalmente soluções comerciais ou atribuir ao protótipo resultados de redução de perdas.

## 2 Método

O desenvolvimento foi organizado em incrementos: persistência/cadastro, ingestão/simulador, painel/histórico, páginas, parâmetros, regras/alertas, autorização e firmware. A cada conjunto concluído foram executadas verificações e registradas evidências/commits reais. Testes de software utilizaram SQLite isolado. Um programa C# com relógio controlado exercitou regras; clientes HTTP verificaram o servidor real; testes JavaScript usaram DOM/fetch controlados.

A validação física prevista identifica conjunto/montagem, condições, parâmetros e observações F01–F12. Inclui sensor, porta, rede/UTC, persistência, ausência/recuperação e consulta no iPhone. A etapa permanece não executada nesta versão do artigo. Assistência de IA utilizada em análise, código, testes e redação está registrada; o autor deve revisar, reproduzir e defender os artefatos.

## 3 Solução implementada

ASP.NET Core serve API e sete páginas HTML próprias. EF Core mapeia seis entidades de negócio para SQLite. A leitura preserva temperatura, porta, origem, medição UTC e recebimento UTC. A interface oferece consulta atual, histórico/gráfico da página, filtros/paginação e configuração sem valores automáticos. Um serviço periódico na mesma aplicação persiste episódios, mantendo motivo de encerramento e evitando duplicação.

A sequência de porta depende das medições observadas e é interrompida por lacuna. Ausência usa medição/início de ativação para não ser renovada por upload antigo. A credencial de dispositivo limita o envio ao equipamento vinculado; UUID repetido com o mesmo conteúdo retorna o registro existente. A sessão web e o dispositivo possuem mecanismos de autorização diferentes.

O firmware compilado utiliza ESP32 clássico, DS18B20 e reed, com UTC/HTTPS e uma amostra pendente em RAM até 30 segundos. Não existe promessa de fila offline completa ou captura de todo pulso curto da porta. Rotina de aquisição, rede e efeitos elétricos ainda exigem ensaio real.

## 4 Resultados de software

Build .NET passou sem avisos/erros; 112 testes JavaScript passaram. Foram registrados, entre outros, 31 testes de regras com relógio controlado, 84 verificações/55 requisições de dispositivo, 139/102 de rede móvel e 207/47 de páginas, além das regressões anteriores. Não se somam essas contagens como cobertura ou funcionalidades independentes. Relatórios preservam tentativas interrompidas e correções.

O upgrade do banco de uso para cinco migrations manteve uma geladeira e três leituras Simulacao, com o mesmo hash dos campos anteriores. O perfil de firmware configurado sinteticamente compilou; dois avisos de biblioteca foram registrados. Esses resultados verificam os cenários de software exercitados, não aquisição física. Uso parcial anterior no iPhone foi relatado, mas as novas telas exigem conferência visual.

## 5 Resultados físicos e discussão

**Preencher após o ensaio.** Informar conjunto, geladeira/posição, duração, parâmetros, série real e evidências. Relatar falhas, perdas, atraso de amostragem/rede e comportamento de recuperação. Comparação com referência térmica só pode ser discutida se realizada e documentada. Não apresentar especificação do fabricante como exatidão medida.

## 6 Conclusão parcial

O software disponível integra armazenamento, consulta e regras com comunicação autorizada, dentro do ambiente local e dos casos verificados. A conclusão sobre o sistema IoT completo depende da montagem e da validação física, da revisão das telas no aparelho e da análise do conjunto de evidências. A versão final deve atualizar esta seção e o resumo com resultados efetivamente obtidos.

## Referências

Usar a lista verificada em `referencias.md`, mantendo somente obras citadas na versão final e padronizando conforme o modelo de artigo confirmado com o orientador. Não reutilizar a bibliografia educacional do modelo Word por conveniência.
