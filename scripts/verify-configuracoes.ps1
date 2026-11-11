#Requires -Version 7.5
[CmdletBinding()]
param([string] $EvidenceDirectory = 'docs/evidencias/nova-revisao/configuracoes')
. (Join-Path $PSScriptRoot 'common.ps1')
$configRun = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$configTestDirectory = Join-Path $script:IceplayRoot ".tools/verification/configuracoes-$configRun"
$configEvidence = [IO.Path]::GetFullPath($EvidenceDirectory,$script:IceplayRoot)
New-Item -ItemType Directory -Path $configTestDirectory,$configEvidence -Force | Out-Null
Push-Location $script:IceplayRoot
try {
    & $script:IceplayDotnet build Iceplay.slnx --no-restore *>&1 | Set-Content (Join-Path $configEvidence 'build.log') -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw 'Build falhou; consulte build.log.' }
    & python -X utf8 "$PSScriptRoot/verify-configuracoes.py" --dotnet $script:IceplayDotnet --database (Join-Path $configTestDirectory 'iceplay.db') --evidence $configEvidence
    if ($LASTEXITCODE -ne 0) { throw 'Verificacao de configuracoes falhou; consulte configuracoes-api.json.' }
}
finally { Pop-Location }
