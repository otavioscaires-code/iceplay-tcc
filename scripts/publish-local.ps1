#Requires -Version 7.5
[CmdletBinding()]
param([string] $Destino)

. (Join-Path $PSScriptRoot 'common.ps1')
$publishStamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
if (-not $Destino) { $Destino = ".tools/exports/$publishStamp-windows-x64" }
$publishRoot = [IO.Path]::GetFullPath($Destino, $script:IceplayRoot)
$publishAllowed = [IO.Path]::GetFullPath((Join-Path $script:IceplayRoot '.tools/exports'))
if (-not $publishRoot.StartsWith($publishAllowed + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Escolha uma pasta nova dentro de .tools/exports; não substituir versões ou bancos.'
}
if (Test-Path -LiteralPath $publishRoot) { throw 'Destino já existe. Use uma pasta nova.' }
[void](New-Item -ItemType Directory -Path $publishRoot)
$publishSource = Join-Path $publishRoot 'fonte-publicacao'
$publishApp = Join-Path $publishRoot 'ICEPLAY/app'
$publishPackage = Split-Path -Parent $publishApp
[void](New-Item -ItemType Directory -Path $publishSource)

# Copia somente os arquivos versionados do projeto. Dados e configurações
# ignorados pelo Git não entram na fonte isolada nem no pacote de execução.
Push-Location $script:IceplayRoot
try {
    $publishFiles = @(& git -c core.quotepath=false ls-files -- 'src/Iceplay.Api')
    if ($LASTEXITCODE -ne 0 -or $publishFiles.Count -eq 0) { throw 'Não foi possível enumerar a fonte versionada.' }
    foreach ($publishFile in $publishFiles) {
        $publishRelative = [IO.Path]::GetRelativePath('src/Iceplay.Api', $publishFile)
        $publishTarget = Join-Path $publishSource $publishRelative
        [void](New-Item -ItemType Directory -Path (Split-Path -Parent $publishTarget) -Force)
        Copy-Item -LiteralPath (Join-Path $script:IceplayRoot $publishFile) -Destination $publishTarget
    }
    Copy-Item -LiteralPath (Join-Path $script:IceplayRoot 'NuGet.Config') -Destination (Join-Path $publishSource 'NuGet.Config')
    # A resolução específica win-x64 é gerada somente nessa cópia. O lock do
    # projeto original não é regravado por uma publicação para outra plataforma.
    & $script:IceplayDotnet publish (Join-Path $publishSource 'Iceplay.Api.csproj') `
        -c Release -r win-x64 --self-contained true -o $publishApp `
        '-p:RestoreLockedMode=false' '-p:DebugType=None' '-p:DebugSymbols=false' `
        *> (Join-Path $publishRoot 'publish.log')
    if ($LASTEXITCODE -ne 0) { throw "Publicação falhou. Consulte $publishRoot/publish.log" }
    foreach ($publishRequired in @('Iceplay.Api.exe','coreclr.dll','e_sqlite3.dll','wwwroot/index.html','appsettings.json')) {
        if (-not (Test-Path -LiteralPath (Join-Path $publishApp $publishRequired))) { throw "Arquivo necessário ausente: $publishRequired" }
    }
    $publishUnexpected = @(Get-ChildItem -LiteralPath $publishApp -File -Recurse | Where-Object {
        $_.Name -match '\.db(?:-|$)|\.pfx$|\.pem$|\.cer$|^\.env$|config\.local|^appsettings\.(?!json$)'
    })
    if ($publishUnexpected.Count) { throw 'A saída contém arquivo de dados/configuração privada inesperado; pacote não gerado.' }
    $publishUtf8 = [Text.UTF8Encoding]::new($true)
    foreach ($publishTemplate in @('Iniciar-ICEPLAY.ps1','Iniciar-ICEPLAY.cmd','Iniciar-ICEPLAY-Mobile.cmd','LEIA-ME.txt')) {
        $publishText = [IO.File]::ReadAllText((Join-Path $PSScriptRoot "distribuicao/$publishTemplate"))
        # BOM permite ler mensagens em português no Windows PowerShell 5.1.
        if ($publishTemplate.EndsWith('.ps1')) {
            [IO.File]::WriteAllText((Join-Path $publishPackage $publishTemplate), $publishText, $publishUtf8)
        } else {
            [IO.File]::WriteAllText((Join-Path $publishPackage $publishTemplate), $publishText, [Text.UTF8Encoding]::new($false))
        }
    }
    $publishManifest = [ordered]@{
        generatedAtUtc=[DateTime]::UtcNow.ToString('o'); sourceCommit=(& git rev-parse HEAD).Trim()
        runtime='win-x64'; selfContained=$true; sdk=(& $script:IceplayDotnet --version)
        databaseIncluded=$false; mobileSecretsIncluded=$false; hardwareValidated=$false
        files=@(Get-ChildItem -LiteralPath $publishPackage -File -Recurse | Sort-Object FullName | ForEach-Object {
            [ordered]@{path=[IO.Path]::GetRelativePath($publishPackage,$_.FullName).Replace('\','/');bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
        })
    }
    $publishManifest | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $publishPackage 'manifesto.json') -Encoding utf8
    $publishZip = Join-Path $publishRoot 'ICEPLAY_Windows_x64.zip'
    Compress-Archive -LiteralPath $publishPackage -DestinationPath $publishZip -CompressionLevel Optimal
    [ordered]@{result='passed';generatedAtUtc=[DateTime]::UtcNow.ToString('o');archive=$publishZip;sha256=(Get-FileHash -LiteralPath $publishZip -Algorithm SHA256).Hash.ToLowerInvariant();bytes=(Get-Item -LiteralPath $publishZip).Length;selfContained=$true;databaseIncluded=$false;mobileSecretsIncluded=$false} |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $publishRoot 'publicacao.json') -Encoding utf8
    Write-Host "Pacote Windows x64: $publishZip"
    Write-Host 'Banco e perfil HTTPS são transportados separadamente. Teste também no computador da apresentação.'
}
finally { Pop-Location }
