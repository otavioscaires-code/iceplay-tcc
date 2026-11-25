# Abrir o ICEPLAY pelo pacote Windows

O pacote de execução **Windows x64** foi preparado e verificado em 25/11/2026. Inclui a API, o site e o runtime .NET. A publicação autocontida dispensa instalar o SDK/runtime .NET para executar; a máquina ainda precisa ter Windows e componentes nativos compatíveis. [Modelo de publicação documentado pela Microsoft](https://learn.microsoft.com/en-us/dotnet/core/deploying/).

## No computador

1. Extraia **todo** o `ICEPLAY_Windows_x64.zip` para uma pasta com permissão de escrita.
2. Entre na pasta `ICEPLAY` e abra **Iniciar-ICEPLAY.cmd**.
3. O iniciador espera a API e o banco ficarem disponíveis e abre o navegador.
4. Mantenha a janela aberta; encerre com **Ctrl+C**.

Não precisa de VS Code, Visual Studio, Node, Python ou servidor SQLite para executar esse pacote. A execução foi conferida neste computador com Windows PowerShell 5.1, sem SDK no PATH e em diretório com espaços. **O notebook da apresentação ainda precisa ser testado.** Não foi realizado ensaio em um Windows recém-instalado.

O ZIP gerado está em `.tools/exports/2026-11-25-execucao-windows-x64/ICEPLAY_Windows_x64.zip`. Binários permanecem fora do Git. O pacote não inclui banco de uso, certificados ou credenciais; sua primeira execução cria um banco vazio, sem cadastros ou leituras automáticas.

## Dados e acesso pelo celular

O banco criado fica em `ICEPLAY/app/data/iceplay.db` e é reutilizado ao reiniciar. Preserve a pasta após usar. Para levar os dados anteriores, use um [backup consistente separado](operacao.md#backup-consistente), com todas as instâncias paradas e sem substituir um banco existente no destino. O ZIP original não contém os três registros históricos de simulação do banco de uso.

**Iniciar-ICEPLAY.cmd** atende somente no próprio computador. O acesso pelo celular e pelo ESP32 exige a preparação HTTPS para o IP e a rede do computador escolhido. Siga o [guia do iPhone](acesso-iphone.md) e use os scripts existentes do projeto para preparar esse perfil. Essa preparação ainda exige as ferramentas descritas no guia; o novo ZIP não é um configurador autônomo de certificados/rede.

Depois de preparado, arraste o `settings.json` privado para **Iniciar-ICEPLAY-Mobile.cmd**. Os certificados referenciados no perfil precisam existir nos caminhos preparados. O iniciador recusa um endereço que não esteja neste computador. Não instala certificados, altera firewall ou ativa túnel. A conferência de confiança HTTPS, QR/câmera no iPhone e hotspot no notebook de destino continua necessária.

O perfil HTTPS sintético já criado pelos testes foi usado para verificar que o iniciador carrega o modo móvel sem SDK. Isso não é ensaio com iPhone, 4G/5G ou ESP32. Reiniciar a API continua invalidando a sessão do navegador; as credenciais de dispositivo persistidas no banco seguem o contrato existente.

## Regenerar e verificar

No computador de desenvolvimento, com o SDK local e PowerShell 7.5 preparados:

```powershell
.\scripts\publish-local.ps1
.\scripts\verify-package.ps1 -Pacote '.tools/exports/PASTA_GERADA/ICEPLAY_Windows_x64.zip' -EvidenceDirectory 'docs/evidencias/NOVA_PASTA'
```

O publicador usa uma cópia isolada dos arquivos versionados do projeto, resolve a publicação `win-x64` nessa cópia e preserva os arquivos de dependências originais. Cada execução exige destino novo em `.tools/exports`. O verificador extrai para uma cópia nova, confere hashes e arquivos, executa o iniciador e testa páginas, persistência e reinício com dados explicitamente Simulacao. `-ConfigMobileTeste` aceita um perfil HTTPS de ensaio já preparado; não instala sua CA no sistema.

[Resultados e limites desta etapa](plano-fechamento-2026-11-25.md). O pacote e os testes de software não substituem os ensaios físicos pendentes.
