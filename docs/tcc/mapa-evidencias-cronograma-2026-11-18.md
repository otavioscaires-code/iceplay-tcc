# ICEPLAY — evidências por etapa do cronograma

Auditoria documental realizada em **18/11/2026**, usando o repositório na revisão `c902b42c996d662dc0e467e5570a85757e0f9e19` e a lista de acompanhamento enviada pelo aluno. Este mapa relaciona os registros disponíveis às 11 aulas previstas; não certifica presença, demonstração ou aceite pelo professor.

O [cronograma oficial registrado em 19/10](../cronograma-oficial.md) conserva as metas e a situação daquela época. O quadro abaixo descreve a disponibilidade de evidências em 18/11, sem alterar retroativamente o cronograma, os relatórios ou os commits.

## Como interpretar

**Data prevista** é a data da aula. **Data do registro** é a data informada pelo relatório, captura ou commit. **Data de organização** é quando o material foi reunido para a documentação. Essas datas devem continuar distintas nas legendas. O primeiro commit disponível é `a788f2b`, de **30/10/2026**; arquivos/relatórios anteriores foram versionados depois. Não foi localizado commit de setembro ou do início de outubro.

A ausência de um registro no repositório não permite concluir que uma conversa, orientação ou apresentação não aconteceu. Significa que o material examinado não a comprova. Fotos, mensagens ou comprovantes originais que o aluno localizar podem complementar este mapa, com a procedência e as datas efetivamente verificadas.

## Mapa das 11 etapas

| Aula prevista | Etapa | Evidência disponível e data real | O que ainda falta comprovar/completar |
| --- | --- | --- | --- |
| **22/09/2026** | 1. Planejamento | [Planejamento da base](../planejamento.md), identificado como etapa de **13/10**, contém escopo, arquitetura, requisitos e evolução proposta. Não foi encontrado registro contemporâneo de 22/09 nas fontes examinadas. | Localizar anotação, orientação, conversa ou documento original da época. Confirmar a composição da equipe e a divisão de tarefas, se existiram; não deduzir responsáveis a partir dos commits ou da assistência de IA. |
| **29/09/2026** | 2. Ambiente | [Inspeção do ambiente](../ambiente.md) registrada em **13/10**, além de scripts/estrutura e build preservados. O primeiro commit é de **30/10**. | Registro original de preparação em 29/09, se houver. Não foi localizado print antigo do VS Code dessa data; as figuras de código organizadas em 18/11 não são prints de IDE de setembro. |
| **06/10/2026** | 3. Banco de dados | [Migration inicial](../../src/Iceplay.Api/Migrations/20261013172101_InitialCreate.cs) tem identificador de **13/10**, posterior à aula. Há [SQL](../sql/iceplay-criacao.sql), [verificação inicial do banco](../evidencias/database-latest.json) de **13/10** e modelo posterior atualizado em **17/11**. | Evidência original do trabalho/entrega em 06/10, se existir. O modelo atual representa a evolução do sistema e não comprova que todas as tabelas/relacionamentos existiam em 06/10. |
| **13/10/2026** | 4. Estrutura | [Tela inicial desktop](../evidencias/tela-desktop.jpg), [móvel](../evidencias/tela-mobile.jpg), [relatório do navegador](../evidencias/browser.json) e [saúde HTTP](../evidencias/smoke-latest.json) associados a **13/10**. Figuras **01–02** do pacote visual. | Completar identificação na cópia institucional e revisar legenda/numeração. Para afirmar apresentação ou aceite naquela aula, é necessário registro específico da aula/feedback; a execução de software não comprova isso por si só. |
| **20/10/2026** | 5. Funcionalidade principal I | [Cadastro desktop](../evidencias/2026-10-15/cadastro-desktop.jpg), [relatório de interface](../evidencias/2026-10-15/browser.json), [CRUD](../evidencias/2026-10-15/crud-api.json) e [relato da etapa](../etapa-2026-10-15.md) de **15/10**, anteriores à aula. Figuras **03–04**, com fixture em banco isolado. | Foto/print/registro da demonstração e feedback de 20/10, se houver. O texto pode informar que há verificações do cadastro em 15/10; não deve afirmar aceite do professor sem registro. |
| **27/10/2026** | 6. Funcionalidade principal II | [Painel](../evidencias/2026-10-19-painel/painel-desktop.jpg) e [relatório](../evidencias/2026-10-19-painel/browser.json) de **19/10**, com simulação identificada. Figuras **05–06**. Histórico via API consta na [etapa de 30/10](../etapa-historico-2026-10-30.md); regras/alertas são incrementos posteriores de novembro. | Registro contemporâneo da aula de 27/10 e escopo realmente mostrado. Não atribuir o histórico de 30/10 ou os alertas de 12/11 à entrega de 27/10. A captura de 19/10 mantém essa data. |
| **03/11/2026** | 7. Integração | Há integração de CRUD/UI/API/SQLite nos registros de outubro, histórico via API em **30/10**, [páginas integradas](../etapa-paginas-2026-11-09.md) em **09/11** e [alertas na interface](../etapa-interface-alertas-2026-11-12.md) em **12/11**. O [diagrama de arquitetura](materiais-modelagem-2026-11-17/figuras/arquitetura.png) foi preparado em **17/11**. | Demonstração/registro datado de 03/11, se existir. Não apresentar o diagrama posterior como captura de execução daquela aula, nem afirmar que o fluxo com alertas estava completo em 03/11. Integração física continua pendente. |
| **10/11/2026** | 8. Testes | Há [verificações de páginas de 09/11](../etapa-paginas-2026-11-09.md), [configurações de 11/11](../etapa-configuracoes-2026-11-11.md) e [nova rodada de 17/11](../evidencias/2026-11-17-modelagem-validacao/rodada.json). Na busca de metadados de execução não foi encontrado relatório identificado em **10/11**. | Logs, foto, relatório ou registro da execução/apresentação realizada em 10/11, se houver. Usar a rodada de 17/11 com sua própria data; ela não substitui prova de execução em 10/11. |
| **17/11/2026** | 9. Refinamento | [Material de requisitos/modelagem](materiais-modelagem-2026-11-17/README.md), [relatório da etapa](../etapa-documentacao-modelagem-2026-11-17.md) e regressões de **17/11**. Há também captura de acesso/QR no desktop de **14/11**, figura **07**. | Evidência da demonstração/feedback da aula, quando disponível; revisão institucional final. Não há medição de desempenho ou validação física concluída. O ensaio do novo leitor QR no iPhone ainda está pendente. |
| **24/11/2026** | 10. Versão final | **Data futura em relação a esta auditoria.** Existem minutas, manual, fontes e código em evolução; ainda há pendências físicas e de apresentação. | Depois da execução/entrega: registrar versão/commit, pacote realmente usado, testes, manual, capturas/fotos, resultados e pendências reais. Atualizar Word, discussão e conclusões com base no que foi efetivamente validado. |
| **01/12/2026** | 11. Apresentação/validação | **Data futura em relação a esta auditoria.** [Roteiro preparado](../roteiro-demonstracao.md) é planejamento, não prova de apresentação. | Depois da apresentação: registrar funcionalidades demonstradas, condições de execução, falhas observadas, evidências e feedback real do professor/banca. Aprovação não deve ser presumida. |

## iPhone: o registro que já existe

Há um [registro manual parcial de 09/11](../evidencias/2026-11-09-iphone/validacao-manual.md). O aluno relatou acesso, saúde, cadastro/edição e navegação; uma foto posterior na conversa mostrou histórico e gráfico com três leituras de **Simulacao**. As fotos não foram copiadas para o repositório. É possível usar a imagem original na documentação, identificando a versão, a data relatada e o caráter de simulação.

Esse material não comprova a câmera do leitor QR implementado depois, todos os formulários posteriores, integração física ou precisão de temperatura. Uma captura em viewport móvel de navegador também não deve ser descrita como foto do Safari no iPhone.

## Texto sugerido para explicar o acompanhamento

> O cronograma do professor foi utilizado como referência de acompanhamento. As evidências preservadas disponíveis no repositório registram etapas de execução desde 13/10/2026, enquanto o histórico de commits disponível começa em 30/10/2026. A documentação distingue as datas previstas das aulas das datas efetivas dos registros. Para as aulas sem evidência contemporânea localizada, foram indicadas as fontes técnicas disponíveis e as lacunas de acompanhamento, sem presumir demonstração ou aceite do orientador.

O aluno deve revisar esse texto e acrescentar somente informações que possa confirmar. Dados pessoais permanecem na cópia privada institucional; não foram inventados integrantes, responsabilidades, presença, orientações ou aprovação.

## O que reunir agora

1. Buscar originais em conversas do grupo, cadernos, arquivos pessoais, histórico de documentos e comprovantes do ambiente institucional. Priorizar **22/09, 29/09 e 06/10**, que não têm registro contemporâneo localizado no repositório.
2. Procurar registros de demonstração/feedback de **20/10, 27/10, 03/11 e 10/11**. Material de software anterior/posterior pode contextualizar a evolução, com data explícita; não prova apresentação naquela aula.
3. Confirmar autoria/equipe e distribuição real das atividades na cópia do TCC. Se a divisão não foi formalizada, registrar essa situação, sem reconstruir uma ata antiga como se fosse original.
4. Selecionar as imagens do [pacote visual](evolucao-visual-2026-11-18/README.md) e os diagramas de 17/11, preservando as legendas/fontes. As figuras novas organizadas em 18/11 continuam identificadas como novas.
5. Reservar a comprovação de sensores, geladeira, versão final e apresentação para os ensaios/eventos efetivos. Atualmente estão comprovados comunicação serial e teste da entrada GPIO27 com jumper; o SP-1006/ímã, DS18B20 e envio físico à API ainda não estão validados.

Se nenhum original de uma aula for localizado, manter a lacuna explícita e alinhar com o orientador a forma de recuperação documental. Novas execuções e capturas devem usar a data em que forem feitas.

## Método e limite desta auditoria

Foram lidos as referências de continuidade, cronograma, planejamento/ambiente, migration/SQL, relatórios relacionados, manifesto/legendas do pacote visual e registro parcial do iPhone. Foram usados `rg`, leituras do PowerShell, `git status --short` e `git log --reverse --format='%h %aI %cI %s'`. A busca por datas nos textos encontrou metas de cronograma, que não foram tratadas como execução.

Uma leitura dos JSONs em `docs/evidencias/` identificou **136 arquivos com metadados superiores de execução** entre as chaves examinadas (`startedAtUtc`, `finishedAtUtc`, `verifiedAtUtc`, `completedAtUtc`, `executedAtUtc`, `checkedAtUtc`, `generatedAtUtc`, `timestampUtc`). Para 22/09, 29/09, 06/10, 27/10, 03/11 e 10/11 não houve correspondência nessa busca. Para 13/10 houve três, 15/10 seis, 19/10 25 e 17/11 12. São contagens de arquivos com datas de execução, não número de testes ou entregas; não substituem inspeção de mensagens/arquivos pessoais fora do repositório.

Esta tarefa criou somente um mapa textual e referências de continuidade. Não executou novamente build/testes da aplicação, não consultou SQLite ou COM3 e não alterou capturas/relatórios históricos, pacote ZIP/PDF de imagens, banco, migrations, firmware ou configurações. A assistência de IA foi registrada; a classificação deve ser revisada pelo aluno/orientador.

Conferência do mapa: **28 links locais** com destino existente e **11 datas**, todas terças-feiras, de 22/09 a 01/12. O verificador documental do pacote visual foi repetido com comparação ao repositório: **129 verificações, zero falhas**. Os SHA-256 do PDF e do ZIP anteriores continuaram iguais. Registro desta conferência em `.tools/auditoria-cronograma-2026-11-18/verificacao.json`, ignorado pelo Git; esses resultados não são novos testes da aplicação ou dos sensores.
