#Requires -Version 7.5
[CmdletBinding()]
param([string] $Diretorio = '.tools/mobile')
. (Join-Path $PSScriptRoot 'common.ps1')
$mobileSettingsPath = Join-Path ([IO.Path]::GetFullPath($Diretorio,$script:IceplayRoot)) 'settings.json'
if (-not (Test-Path -LiteralPath $mobileSettingsPath)) { throw 'Execute prepare-mobile.ps1 -EnderecoIp SEU_IP antes de iniciar.' }
$mobileSettings = Get-Content -LiteralPath $mobileSettingsPath -Raw | ConvertFrom-Json -DateKind String
if (-not (Get-NetIPAddress -AddressFamily IPv4 | Where-Object IPAddress -eq $mobileSettings.Mobile.Address)) { throw 'O IP da configuração não está mais neste computador. Prepare outra configuração.' }
foreach ($mobilePort in @($mobileSettings.Mobile.LocalPort,$mobileSettings.Mobile.HttpsPort,$mobileSettings.Mobile.CertificatePort)) {
    if (Get-NetTCPConnection -State Listen -LocalPort $mobilePort -ErrorAction SilentlyContinue) { throw "Porta $mobilePort ocupada. Encerre a outra instância com Ctrl+C." }
}
$mobilePreviousConfig = $env:ICEPLAY_MOBILE_CONFIG
$mobilePreviousAspEnvironment = $env:ASPNETCORE_ENVIRONMENT
$mobilePreviousDotnetEnvironment = $env:DOTNET_ENVIRONMENT
Push-Location $script:IceplayRoot
try {
    $env:ICEPLAY_MOBILE_CONFIG = $mobileSettingsPath
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $env:DOTNET_ENVIRONMENT = 'Development'
    Write-Host "No computador: http://localhost:$($mobileSettings.Mobile.LocalPort)"
    Write-Host "Preparar iPhone: http://$($mobileSettings.Mobile.Address):$($mobileSettings.Mobile.CertificatePort)"
    Write-Host "Painel móvel: https://$($mobileSettings.Mobile.Address):$($mobileSettings.Mobile.HttpsPort)/#acesso-movel"
    & $script:IceplayDotnet run --project 'src/Iceplay.Api/Iceplay.Api.csproj' --no-restore --no-launch-profile
    if ($LASTEXITCODE -ne 0) { throw 'A aplicação móvel terminou com erro.' }
}
finally {
    $env:ICEPLAY_MOBILE_CONFIG = $mobilePreviousConfig
    $env:ASPNETCORE_ENVIRONMENT = $mobilePreviousAspEnvironment
    $env:DOTNET_ENVIRONMENT = $mobilePreviousDotnetEnvironment
    Pop-Location
}
