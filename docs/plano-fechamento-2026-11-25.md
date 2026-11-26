# Fechamento do ICEPLAY — 25/11/2026

**Estado atualizado na noite de 25/11:** a montagem da sonda foi recuperada; o principal foi compilado, gravado e iniciou na placa. O fluxo autenticado até API/SQLite/interface desktop, os episódios de porta/temperatura e a ausência após desligamento passaram. O reinício da API preservou as 802 leituras/quatro episódios. [Resultados físicos](etapa-integracao-fisica-2026-11-25.md) e [monografia atualizada](etapa-monografia-bancada-2026-11-25.md) distinguem cada controle. Os parágrafos posteriores preservam a preparação e os resultados da manhã.

| Trabalho atual | Estado e próximo resultado necessário |
| --- | --- |
| Software, execução e firmware | Verificações de software/pacote aprovadas; principal em uso e sem nova alteração de fonte nesta continuidade |
| Aquisição, alertas e persistência reais | Bancada/ausência aprovadas; todas as linhas iguais após reinício. Recuperação com a mesma credencial ainda precisa de captura |
| Instalação na geladeira doméstica | Ponta metálica dentro conforme relato; foto parcial recebida. Corrigir distância/alinhamento do contato/ímã e apoiar o ESP32 em base isolante antes de alimentar |
| Série real na geladeira | Coletor preparado para 15 min; ainda não executado. Registrar alimentação, posição, duração, lacunas e fotografia final |
| iPhone com Hardware | Leitor/pareamento doméstico já relatado; nova consulta das medições físicas após o reinício ainda pendente |
| Monografia | Word/PDF privados de 41 páginas, 16 figuras e cinco tabelas conferidos; atualizar somente com os próximos resultados efetivos e confirmar o orientador da capa |
| Transferência/apresentação | ZIP completo privado preparado com runtime/código/Word/PDF e hashes conferidos. Banco e perfil de rede ficam separados; notebook/hotspot ainda não ensaiados |

O ZIP completo é um retrato da fonte `d4d756e`, com o runtime previamente testado preservado byte a byte e os documentos privados. Não inclui o banco de uso, credenciais ou perfil HTTPS e não significa que o destino esteja preparado. As instruções do pacote identificam essa preparação. Não publicar o ZIP completo no GitHub, pois contém os dados do grupo no Word/PDF.

## Registro da preparação matinal

O aluno solicitou retomar e terminar o TCC. Ao esclarecer a montagem, informou possuir somente sonda, jumpers e protoboard, sem confirmar ferro/estanho ou adaptador com bornes. A recuperação das conexões ainda não foi demonstrada. A orientação continua sendo manter o USB desligado e preparar três terminações firmes e isoladas antes do reteste. Soldar extensões é uma opção; não se solda na protoboard branca.

## Software e execução conferidos nesta etapa

Uma [nova rodada de software](evidencias/20261125T030844Z-fechamento-software/rodada.json) executou setup/build, os 149 testes JavaScript e os dez verificadores existentes. Todos passaram. O build teve zero avisos/erros; o avaliador temporal passou em 31 asserções e os convites em 13. Os dados de teste permaneceram em bancos isolados e identificados como simulação quando aplicável. São verificações HTTP/SQLite/DOM/TLS com controle de software, sem câmera real ou sensores.

Foi acrescentada a [publicação autocontida Windows x64](execucao-pacote-windows.md), mantendo a arquitetura, os arquivos da API, interface e migrations. O pacote é gerado em fonte isolada e inclui runtime e iniciadores; não inclui o banco de uso ou segredos móveis. [Publicação .NET](https://learn.microsoft.com/en-us/dotnet/core/deploying/).

O [primeiro ensaio do pacote](evidencias/2026-11-25-pacote-windows-x64/pacote.json) aprovou as 12 verificações então existentes. Depois, o verificador foi ampliado para rejeição de perfil incorreto e carregamento/preservação de perfil HTTPS de teste; a [rodada ampliada](evidencias/2026-11-25-pacote-windows-x64-com-perfil/pacote.json) passou em 15 verificações. Ambas foram preservadas, com horários reais nos JSONs.

| Verificação | Resultado observado |
| --- | --- |
| Arquivo distribuído | ZIP de 53.729.695 bytes, com manifesto/hashes conferidos e sem banco/certificados/credenciais |
| Runtime e iniciador | Windows PowerShell 5.1, SDK ausente do PATH e diretório com espaços; API/SQLite iniciaram |
| Site | Sete páginas e assets consultados por HTTP no executável publicado |
| Persistência | Cadastro e leitura Simulacao em cópia isolada preservados com os mesmos IDs/valores após reinício |
| Rede local | Inicialização comum vinculada somente a loopback |
| Perfil móvel | Endereço ausente recusado; perfil HTTPS de teste carregado e preservado, sem instalar CA |
| Banco de uso | SHA-256 antes/depois igual: `e8ecae14a84243a292d3e21f953a14eea7d950c2c3fe929d43a4a68dd5ba9317` |
| Fontes do produto | Backend, interface, migrations e firmware principal/diagnósticos preservados |

A preparação de certificados/rede no notebook continua seguindo o guia existente e exige as ferramentas ali descritas. O pacote facilita a execução depois de preparada a máquina; não se declara acesso móvel no destino validado. Não houve novo ensaio físico, gravação, coleta serial, instalação, mudança de confiança/firewall ou ativação de acesso público. O estado da placa continua sendo diagnóstico dos sensores, sem rede/API. A falha posterior da sonda continua registrada.

## Sequência que falta para encerrar o TCC

| Ordem | Trabalho restante | Evidência necessária |
| --- | --- | --- |
| 1 | Recuperar fixação da sonda e retestar temperatura | Montagem conferida sem alimentação; depois log real de leitura/variação e ensaio controlado de desconexão, preservando a falha anterior |
| 2 | Preparar rede/credencial e executar o firmware principal | Configuração privada correta, gravação autorizada e boot; UTC/TLS e respostas de ingestão autenticada observados |
| 3 | Conferir a integração e os alertas | Mesmos IDs/valores em sensor, API, SQLite e interface; abertura/encerramento/ausência/recuperação conforme protocolo F04–F11 |
| 4 | Operar na geladeira e ensaiar a apresentação | Série real, posição/condições, duração/lacunas e fotos; notebook/hotspot/iPhone/QR e reinício testados no conjunto usado na banca |
| 5 | Atualizar a monografia com esses resultados | Fotos finais, registros/capturas e análise efetiva; conclusão/abstract/quadros revistos, campos atualizados e Word/PDF conferidos |

As etapas físicas seguem o [protocolo F01–F12](hardware/protocolo-ensaio.md). F01/F02/F03 permanecem parciais. A versão escrita atual e as figuras corrigidas continuam disponíveis, sem transformar essas pendências em trabalhos futuros já dispensados do projeto. O grupo ainda precisa confirmar o nome do orientador divergente entre conversa e Word; os dados da capa foram preservados.
