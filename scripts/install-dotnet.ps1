# Instala o SDK somente no projeto, sem administrador nem alteração permanente de PATH.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskTools = Join-Path $taskRoot '.tools'
$taskSdkDirectory = Join-Path $taskTools 'dotnet'
$taskDotnet = Join-Path $taskSdkDirectory 'dotnet.exe'
$taskSdkVersion = '10.0.401'
$taskUrl = 'https://builds.dotnet.microsoft.com/dotnet/Sdk/10.0.401/dotnet-sdk-10.0.401-win-x64.zip'
$taskExpectedHash = '24b670ad3d923bfcf47df6c3b034152398b42f6dbc388e10d783aee1cfb5e5817d399fc0ae2a12cfa822a55e61d34830ccb15c50ef6efee437ab874bb7c79430'

if (Test-Path -LiteralPath $taskDotnet) {
    $taskInstalledVersion = & $taskDotnet --version
    if ($LASTEXITCODE -eq 0 -and $taskInstalledVersion -eq $taskSdkVersion) {
        Write-Host "SDK $taskSdkVersion já disponível em $taskSdkDirectory"
        return
    }
    throw 'Já existe outro SDK local. Confira .tools/dotnet antes de substituir qualquer arquivo.'
}

New-Item -ItemType Directory -Path $taskTools -Force | Out-Null
$taskArchive = Join-Path $taskTools "dotnet-sdk-$taskSdkVersion-win-x64.zip"
Write-Host "Baixando SDK $taskSdkVersion da Microsoft..."
Invoke-WebRequest -Uri $taskUrl -OutFile $taskArchive -TimeoutSec 600
$taskActualHash = (Get-FileHash -LiteralPath $taskArchive -Algorithm SHA512).Hash
if ($taskActualHash -ne $taskExpectedHash) {
    throw 'O SHA-512 do download não corresponde ao manifesto oficial. SDK não extraído.'
}
New-Item -ItemType Directory -Path $taskSdkDirectory -Force | Out-Null
Expand-Archive -LiteralPath $taskArchive -DestinationPath $taskSdkDirectory
& $taskDotnet --info
if ($LASTEXITCODE -ne 0) { throw 'O SDK foi extraído, mas não conseguiu executar.' }
Remove-Item -LiteralPath $taskArchive
