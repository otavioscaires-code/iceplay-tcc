# Operação e preservação de dados

## Iniciar e consultar

Em PowerShell 7, na raiz, `scripts/run.ps1` inicia a aplicação local em `http://localhost:5080`. Para a rede já preparada, encerrar a instância local e executar `scripts/run-mobile.ps1`; iPhone e ESP32 usam o IP privado com HTTPS. Não iniciar duas instâncias no mesmo banco. Detalhes de instalação no README e em `acesso-iphone.md`.

Visão geral consulta saúde/leituras/alertas; Geladeiras gerencia cadastros; Histórico tem filtro de origem/equipamento/período e paginação; Alertas apresenta episódios e motivos; Configurações salva parâmetros e gerencia credenciais. Nenhum cadastro, configuração, chave ou leitura é criado ao iniciar. `Hardware` sem vínculo autenticado continua sendo apenas rótulo declarado. Confira os dois timestamps e a origem antes de interpretar os dados.

A saúde verifica a tabela Geladeiras. Uma aplicação Production com schema antigo pode ter saúde 200 e outra rota 503; aplicar todas as migrations antes de usá-la. Development aplica as migrations ao iniciar. A referência visual de 60 s do painel é independente do prazo persistido de ausência. O servidor precisa ficar ligado para avaliar ausência.

## Backup consistente

Python é necessário somente para esta ferramenta e os verificadores, não para executar a API. Antes de migrations ou ensaio importante, a partir da raiz:

```powershell
python -X utf8 .\scripts\backup-database.py
```

O script abre a origem em modo somente leitura, usa a API de backup do SQLite e confere integridade/FKs da cópia. Cria arquivo novo em `.tools/backups`, sem sobrescrever. O relatório mostra contagens e migrations, sem dados pessoais do cadastro ou segredos. A cópia contém os dados do banco e hashes de credenciais: guarde-a como arquivo privado, fora de publicações. Copiar somente `iceplay.db` enquanto a aplicação grava pode deixar transações do WAL de fora; por isso usar backup consistente.

O Git não guarda banco nem `.tools`. Para transferência de computador, preservar separadamente o backup e as configurações privadas necessárias. Código publicado sozinho inicia com banco novo vazio; não inclui medições anteriores. Validar a cópia e o caminho antes de qualquer restauração. Uma restauração exige parar a API, preservar o banco atual/arquivos auxiliares, escolher um backup conferido e realizar a substituição deliberadamente. Não há restauração automática nem recriação de banco por script de teste.

## Evidência de execução

Os verificadores usam bancos isolados em `.tools/verification`; passar sempre uma pasta nova em `-EvidenceDirectory`. Para evidência do banco de uso, guardar o JSON de saúde, configuração aplicada, consultas de leitura/alertas e backup correspondente. O histórico mostra no máximo 100 itens por página e o gráfico corresponde à página atual. Não apresentar uma captura de uma página como todo um período.

No ensaio físico, usar `hardware/protocolo-ensaio.md`: identificar montagem, versão, horários, origem, parâmetros e limitações. Screenshot não deve incluir credencial, senha, código de acesso ou RA. Antes de publicar foto/log, conferir seu conteúdo. O relatório automático de software não deve ser reclassificado como validação de sensor.

## Falhas e recuperação

503 indica operação de banco não concluída; conferir logs do processo e migrations, preservando arquivos. Não apagar o banco. Erro de rede/timeout em cadastro pode ter resultado incerto: consultar antes de repetir. Dispositivo com UUID pode repetir a mesma medição e receber 200 sem duplicação. Credencial inválida/revogada recebe 401; outra geladeira/origem recebe 403; UUID reutilizado com outro conteúdo recebe 409.

Reiniciar API invalida a sessão do iPhone; reconectar em Acesso. Credencial de dispositivo persiste no SQLite. Perdeu a credencial: consultar metadados, revogar e emitir outra; o segredo não pode ser recuperado. Mudança de IP/certificado precisa de nova preparação e conferência de confiança pelo responsável; não ignorar aviso TLS nem abrir portas para internet.
