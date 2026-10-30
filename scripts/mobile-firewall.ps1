#Requires -Version 7.5
#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [ValidateSet('Ativar','Desativar')][string] $Acao = 'Ativar',
    [string] $Diretorio = '.tools/mobile'
)
$ErrorActionPreference = 'Stop'
$mobileFirewallRoot = Split-Path -Parent $PSScriptRoot
$mobileFirewallConfig = Get-Content -LiteralPath (Join-Path ([IO.Path]::GetFullPath($Diretorio,$mobileFirewallRoot)) 'settings.json') -Raw | ConvertFrom-Json -DateKind String
$mobileFirewallIp = $mobileFirewallConfig.Mobile.Address
$mobileFirewallInterface = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object IPAddress -eq $mobileFirewallIp)
if ($mobileFirewallInterface.Count -ne 1) { throw 'IP configurado não pertence a uma única interface deste computador.' }
$mobileFirewallName = 'ICEPLAY-Mobile-' + $mobileFirewallIp.Replace('.','-')
if ($Acao -eq 'Desativar') {
    Get-NetFirewallRule -Name $mobileFirewallName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    Write-Host 'Regra específica do ICEPLAY removida.'
    return
}
if (Get-NetFirewallRule -Name $mobileFirewallName -ErrorAction SilentlyContinue) { throw 'Regra já existe. Remova a regra específica antes de recriá-la.' }
New-NetFirewallRule -Name $mobileFirewallName -DisplayName "ICEPLAY móvel — somente rede local ($mobileFirewallIp)" -Direction Inbound -Action Allow -Protocol TCP -LocalAddress $mobileFirewallIp -LocalPort @($mobileFirewallConfig.Mobile.HttpsPort,$mobileFirewallConfig.Mobile.CertificatePort) -RemoteAddress LocalSubnet -InterfaceAlias $mobileFirewallInterface[0].InterfaceAlias -Profile Any | Out-Null
Write-Host 'Liberadas somente as duas portas do ICEPLAY, no IP/interface configurados, para a sub-rede local. Perfil da rede e demais regras preservados.'
