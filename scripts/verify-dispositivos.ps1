#Requires -Version 7.5
[CmdletBinding()]
param([string] $EvidenceDirectory = 'docs/evidencias/nova-revisao/dispositivos')
. (Join-Path $PSScriptRoot 'common.ps1')
$deviceRun = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$deviceEvidence = [IO.Path]::GetFullPath($EvidenceDirectory,$script:IceplayRoot)
$deviceDatabase = Join-Path $script:IceplayRoot ".tools/verification/dispositivos-$deviceRun/iceplay.db"
New-Item -ItemType Directory -Path $deviceEvidence -Force | Out-Null
Push-Location $script:IceplayRoot
try {
    & $script:IceplayDotnet build Iceplay.slnx --no-restore *> (Join-Path $deviceEvidence 'build.log')
    if ($LASTEXITCODE -ne 0) { throw 'Build falhou; consulte build.log.' }
    & python -X utf8 "$PSScriptRoot/verify-dispositivos.py" --dotnet $script:IceplayDotnet --database $deviceDatabase --evidence $deviceEvidence *> (Join-Path $deviceEvidence 'http.log')
    Get-Content (Join-Path $deviceEvidence 'http.log') -Tail 5
    if ($LASTEXITCODE -ne 0) { throw 'Verificacao de dispositivos falhou.' }
}
finally { Pop-Location }
