#Requires -Version 7.5
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateRange(1,2147483647)][int] $GeladeiraId,
    [string] $Ssid = '',
    [Security.SecureString] $SenhaWifi,
    [Security.SecureString] $Credencial,
    [string] $DiretorioMobile = '.tools/mobile',
    [string] $Destino = 'firmware/esp32/include/config.local.h',
    [switch] $InverterPorta
)
$ErrorActionPreference = 'Stop'
$prepareFirmwareRoot = Split-Path -Parent $PSScriptRoot
$prepareFirmwareTarget = [IO.Path]::GetFullPath($Destino,$prepareFirmwareRoot)
if (-not $prepareFirmwareTarget.StartsWith($prepareFirmwareRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or
    [IO.Path]::GetFileName($prepareFirmwareTarget) -ne 'config.local.h') { throw 'Use um destino dentro do projeto chamado config.local.h.' }
$preparePrivateDefault = [IO.Path]::GetFullPath('firmware/esp32/include/config.local.h',$prepareFirmwareRoot)
$prepareIsolatedRoot = [IO.Path]::GetFullPath('.tools/',$prepareFirmwareRoot).TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
if ($prepareFirmwareTarget -ne $preparePrivateDefault -and -not $prepareFirmwareTarget.StartsWith($prepareIsolatedRoot,[StringComparison]::OrdinalIgnoreCase)) {
    throw 'Configuracoes privadas devem ficar no caminho padrao ignorado ou dentro de .tools.'
}
if (Test-Path -LiteralPath $prepareFirmwareTarget) { throw 'Configuracao ja existe; preserve-a. Revise/guarde o arquivo existente antes de preparar outra.' }
$prepareMobileRoot = [IO.Path]::GetFullPath($DiretorioMobile,$prepareFirmwareRoot)
$prepareMobile = (Get-Content -LiteralPath (Join-Path $prepareMobileRoot 'settings.json') -Raw | ConvertFrom-Json).Mobile
$prepareCa = Get-Content -LiteralPath (Join-Path $prepareMobileRoot 'ICEPLAY-local.pem') -Raw
if ($prepareCa -notmatch '-----BEGIN CERTIFICATE-----' -or $prepareCa -match 'PRIVATE KEY') { throw 'Use somente o certificado publico PEM do modo movel.' }
if (-not $Ssid) { $Ssid = Read-Host 'Nome da rede Wi-Fi 2,4 GHz (SSID)' }
if ($null -eq $SenhaWifi) { $SenhaWifi = Read-Host 'Senha Wi-Fi (nao exibida)' -AsSecureString }
if ($null -eq $Credencial) { $Credencial = Read-Host 'Credencial emitida em Configuracoes (nao exibida)' -AsSecureString }
$prepareWifiPassword = [Net.NetworkCredential]::new('', $SenhaWifi).Password
$prepareDeviceToken = [Net.NetworkCredential]::new('', $Credencial).Password
if ([Text.Encoding]::UTF8.GetByteCount($Ssid) -notin 1..32 -or [Text.Encoding]::UTF8.GetByteCount($prepareWifiPassword) -notin 8..63) {
    throw 'Use SSID de 1..32 bytes e senha pessoal WPA2 de 8..63 bytes UTF-8.'
}
if ($prepareDeviceToken -cnotmatch '^icp_[1-9][0-9]*_[0-9a-f]{64}$') { throw 'Formato de credencial invalido; use a resposta da emissao do dispositivo.' }
function ConvertTo-FirmwareLiteral([string] $Value) {
    if ($Value.ToCharArray() | Where-Object { [char]::IsControl($_) }) { throw 'Nao use caracteres de controle na configuracao.' }
    return '"' + $Value.Replace('\','\\').Replace('"','\"') + '"'
}
$prepareApiUrl = "https://$($prepareMobile.Address):$($prepareMobile.HttpsPort)"
$prepareFirmwareContent = @"
#pragma once
// Configuracao privada local; nunca incluir no Git ou em evidencias.
constexpr bool CONFIGURADO = true;
constexpr char WIFI_SSID[] = $(ConvertTo-FirmwareLiteral $Ssid);
constexpr char WIFI_SENHA[] = $(ConvertTo-FirmwareLiteral $prepareWifiPassword);
constexpr char API_BASE_URL[] = $(ConvertTo-FirmwareLiteral $prepareApiUrl);
constexpr char CREDENCIAL[] = $(ConvertTo-FirmwareLiteral $prepareDeviceToken);
constexpr int GELADEIRA_ID = $GeladeiraId;
constexpr int PINO_TEMPERATURA = 4;
constexpr int PINO_PORTA = 27;
constexpr bool PORTA_FECHADA_COM_CONTATO_FECHADO = $(if ($InverterPorta) { 'false' } else { 'true' });
constexpr char CA_PEM[] = R"ICEPLAYCA(
$($prepareCa.Trim())
)ICEPLAYCA";
"@
New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($prepareFirmwareTarget)) -Force | Out-Null
$prepareFirmwareBytes = [Text.UTF8Encoding]::new($false).GetBytes($prepareFirmwareContent)
$prepareFirmwareStream = [IO.File]::Open($prepareFirmwareTarget,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
try { $prepareFirmwareStream.Write($prepareFirmwareBytes) }
finally { $prepareFirmwareStream.Dispose() }
$prepareWifiPassword = $null; $prepareDeviceToken = $null; $prepareFirmwareContent = $null; $prepareFirmwareBytes = $null
Write-Output 'Configuracao privada criada. Credencial/senha nao foram exibidas. Compilacao nao comprova hardware.'
