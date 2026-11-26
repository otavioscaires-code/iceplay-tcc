# Preparação do firmware principal com configuração real — 25/11/2026

O programa principal do ICEPLAY foi compilado com a configuração privada da bancada real. **Não houve gravação, boot desse programa, teste de rede na placa ou envio físico à API nesta etapa.** Os [quatro ensaios USB da sonda](etapa-retomada-sonda-2026-11-25.md) continuam sendo evidências do diagnóstico separado.

## Preparação e preservação

O cadastro ID 1, **Prototipo ICEPLAY - bancada real**, identifica esta montagem sem afirmar instalação em geladeira. No banco do pacote `app/data/iceplay.db`, foi emitida explicitamente uma credencial para o dispositivo ID 1, **ESP32 bancada fisica 25-11-2026**. Nenhuma leitura foi inserida por essa preparação, e o monitoramento não foi ativado automaticamente.

O aluno forneceu a rede e digitou a senha localmente. A primeira janela de preparação parou numa checagem incorreta de lista vazia de dispositivos; a tentativa de reabrir essa janela foi bloqueada pela revisão automática. Não houve contorno da abertura bloqueada. Como alternativa, o aluno baixou um arquivo de texto, preencheu no Bloco de Notas e salvou. A cópia preenchida em Downloads foi localizada e consumida sem exibir seu conteúdo. Não pedir a senha pelo chat nem publicar arquivos privados.

O script existente `scripts/prepare-firmware.ps1` criou `firmware/esp32/include/config.local.h`, ignorado pelo Git, com GPIO4/27, alimentação prevista de 3V3, credencial vinculada e CA pública do perfil móvel existente. O token e a senha não foram passados em argumentos de shell ou incluídos nas evidências públicas. Configuração, caches privados e binário com credencial permanecem locais. Não sobrescrever a configuração nem emitir outra credencial sem conferir o estado atual.

A API do pacote estava encerrada na retomada noturna. Foi iniciada novamente com o mesmo perfil móvel e banco, sem mudar confiança, certificado, firewall ou fonte da aplicação. Saúde local confirmada; o novo processo executa `app/Iceplay.Api.exe`. Backups consistentes anteriores às operações de preparação foram preservados em `.tools/backups`, com relatórios privados. O banco original de `src/Iceplay.Api/data/iceplay.db` permanece separado.

## Compilação executada

[Resultado estruturado](evidencias/2026-11-25-firmware-principal/20261125T222230Z-compilacao/compilacao.json), com critérios registrados previamente: configuração real existente, saída nativa zero e binário gerado. Início às 22:22:30 UTC de 25/11, equivalente a 19:22:30 em São Paulo. Target `esp32dev`, mesmas bibliotecas e fonte já adotadas no projeto.

| Item | Resultado |
| --- | --- |
| Saída nativa | 0; compilação aprovada |
| Avisos | Dois, na biblioteca OneWire; não se afirma build sem avisos |
| RAM estática estimada pelo build | 47.708 bytes de 327.680; 14,6% |
| Aplicação flash estimada | 929.865 bytes de 1.310.720; 70,9% |
| Arquivo `firmware.bin` privado | 936.448 bytes |
| Fonte `firmware/esp32/src/main.cpp`, SHA-256 | `b93526f8d1a5948e0678fb93c2e519e43e2a2c4829e119c8d5f0bcfa962aab10` |
| Binário privado, SHA-256 | `a3bf43f28c8ff17040ed639d755e0c3fe5f21009afe800ee627bce5ec6f2cf1a` |

Tamanhos do build não medem consumo máximo em execução. Logs integrais e cópia do binário ficam privados em `.tools/hardware/20261125T222230Z-compilacao-principal/`. O JSON público contém somente resumo permitido e procedência, sem senha, SSID, token ou identificadores exclusivos da placa.

## Próxima ação e limites

Na conferência USB noturna, o Windows não listou a COM3; foi solicitado ao aluno conectar a placa mantendo as ligações firmes já conferidas. Depois do reconhecimento e da autorização específica prevista no `AGENTS.md`, a gravação substituirá o diagnóstico pelo programa principal. Não reinstalar driver ou alterar circuito somente pela ausência momentânea da porta.

O primeiro ensaio deverá observar boot, associação Wi-Fi, sincronização UTC, validação TLS, leitura dos sensores e resposta da API. Só depois correlacionar registros reais no SQLite/interface e avançar para alertas/geladeira. Compilação com rede configurada não encerra F01/F02/F03 nem comprova F04/F05 do [protocolo físico](hardware/protocolo-ensaio.md). Não houve alteração de fonte da API/interface, migrations ou bibliotecas nesta preparação; a suíte de software anterior não foi repetida.

Preparação e organização tiveram assistência de IA; os resultados de execução e as ações do aluno estão distinguidos. Os documentos acadêmicos finais ainda precisam receber os resultados da integração efetivamente realizada.
