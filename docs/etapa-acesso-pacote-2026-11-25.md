# Acesso móvel do pacote em execução — 25/11/2026

O aluno extraiu o pacote Windows na raiz do repositório e iniciou `app/Iceplay.Api.exe`. A consulta real encontrou API saudável, SQLite conectado e zero geladeiras no **banco do pacote** (`app/data/iceplay.db`). O banco anterior do projeto permanece separado em `src/Iceplay.Api/data/iceplay.db`; zero cadastros no pacote não significa perda daquele banco.

A instância local foi reiniciada no perfil móvel já existente em `.tools/mobile/settings.json`, após conferir IP presente, validade e arquivos do certificado. Continua usando o banco do pacote. A conferência somente leitura antes/depois confirmou os mesmos registros e integridade SQLite ok. Nenhum cadastro, configuração, credencial de sensor ou medição foi criado nessa troca.

## Conferência do servidor

- HTTP local: saúde `healthy`, banco `connected`.
- HTTPS: página `/acesso` disponível, com certificado e hostname validados por cliente que confia explicitamente no PEM local, sem alterar a confiança do Windows.
- API por HTTPS sem sessão: HTTP 401, conforme esperado.
- Perfil e certificado existentes reutilizados; sem instalação de certificado, alteração de firewall ou ativação de túnel.
- [Registro técnico](evidencias/2026-11-25-acesso-pacote-ativo/conferencia.json), com os limites da conferência local.

O aluno inicialmente informou iPhone usando apenas 4G/5G. Depois confirmou a conexão ao Wi-Fi do mesmo roteador e, em resposta à orientação de abrir a URL no Safari, informou que **a tela de acesso do ICEPLAY abriu**. Em seguida, após a orientação de ler o QR pela câmera dentro do site e tocar em **Conectar este dispositivo**, respondeu **“Conectou e consigo abrir o painel”**. Esse é um resultado de teste manual relatado pelo aluno, distinto da conferência automatizada do servidor.

O fluxo orientado e confirmado foi gerar o convite na página `/acesso` do computador, usar **Ler QR Code** dentro do site no iPhone e confirmar **Conectar este dispositivo**. O convite mantém validade de dois minutos e uso único; não foi copiado para logs, Git ou documentos. Não houve screenshot ou captura instrumental da câmera nesta etapa. O relato não mede desempenho nem encerra a validação dos sensores, da ingestão ou da rede da apresentação. A retomada seguinte é conferir as posições e a fixação da sonda com USB desligado; não foi obtida nova leitura física.

## Arquivos e continuidade

O `.gitignore` agora protege a pasta `app`, os iniciadores, o manifesto e os logs quando o pacote é extraído na raiz. Os arquivos extraídos e seus dados foram preservados. Os templates versionados em `scripts/distribuicao/` continuam disponíveis; as novas regras se limitam à raiz.

A execução móvel fica ativa para o teste do aluno, com HTTP local em `http://localhost:5080` e acesso móvel em `https://192.168.1.123:5443/acesso?modo=qr`. Não iniciar outra instância nas mesmas portas. Mudar para o notebook/hotspot exige preparar e conferir o perfil correto para aquela rede; este teste doméstico não valida a apresentação por 4G/5G.

Não houve alteração de backend, interface, migrations ou firmware, nem nova coleta serial/ensaio físico. A sonda ainda precisa de terminações firmes e reteste antes da gravação do programa principal e da integração completa. A documentação final de resultados continua condicionada aos ensaios reais.
