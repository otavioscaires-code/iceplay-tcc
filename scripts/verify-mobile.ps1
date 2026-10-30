#Requires -Version 7.5
[CmdletBinding()]
param([string] $EnderecoIp = '', [string] $EvidenceDirectory = 'docs/evidencias/2026-10-19-mobile')
. (Join-Path $PSScriptRoot 'common.ps1')
if (-not $EnderecoIp) {
    $mobilePrepared = Join-Path $script:IceplayRoot '.tools/mobile/settings.json'
    if (-not (Test-Path $mobilePrepared)) { throw 'Informe -EnderecoIp com o IPv4 privado deste computador.' }
    $EnderecoIp = (Get-Content $mobilePrepared -Raw | ConvertFrom-Json -DateKind String).Mobile.Address
}
$mobileVerificationId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$mobileVerificationDirectory = Join-Path $script:IceplayRoot ".tools/verification/mobile-$mobileVerificationId"
$mobileVerificationEvidence = [IO.Path]::GetFullPath($EvidenceDirectory,$script:IceplayRoot)
New-Item -ItemType Directory -Path $mobileVerificationDirectory,$mobileVerificationEvidence -Force | Out-Null
$mobileListeners = @(1..3 | ForEach-Object { $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0); $listener.Start(); $listener })
$mobilePorts = @($mobileListeners | ForEach-Object { $_.LocalEndpoint.Port })
$mobileListeners | ForEach-Object { $_.Stop() }
Push-Location $script:IceplayRoot
try {
    & $script:IceplayDotnet build Iceplay.slnx --no-restore *>&1 | Set-Content (Join-Path $mobileVerificationEvidence 'build.log') -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw 'Build falhou' }
    & "$PSScriptRoot/prepare-mobile.ps1" -EnderecoIp $EnderecoIp -Diretorio (Join-Path $mobileVerificationDirectory 'certificados') -PortaLocal $mobilePorts[0] -PortaHttps $mobilePorts[1] -PortaCertificado $mobilePorts[2] *>&1 | Set-Content (Join-Path $mobileVerificationEvidence 'preparacao-teste.log') -Encoding utf8
    & python -X utf8 "$PSScriptRoot/verify-mobile.py" --config (Join-Path $mobileVerificationDirectory 'certificados/settings.json') --dotnet $script:IceplayDotnet --database (Join-Path $mobileVerificationDirectory 'iceplay.db') --evidence $mobileVerificationEvidence
    if ($LASTEXITCODE -ne 0) { throw 'Verificação móvel falhou. Confira mobile-api.json e os logs.' }
}
finally { Pop-Location }
