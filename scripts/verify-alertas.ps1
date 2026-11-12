#Requires -Version 7.5
[CmdletBinding()]
param([string] $EvidenceDirectory = 'docs/evidencias/nova-revisao/alertas')
. (Join-Path $PSScriptRoot 'common.ps1')
$alertRun = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$alertEvidence = [IO.Path]::GetFullPath($EvidenceDirectory,$script:IceplayRoot)
$alertDatabase = Join-Path $script:IceplayRoot ".tools/verification/alertas-$alertRun/iceplay.db"
New-Item -ItemType Directory -Path $alertEvidence -Force | Out-Null
Push-Location $script:IceplayRoot
try {
    & $script:IceplayDotnet restore tests/Iceplay.Verification --locked-mode *> (Join-Path $alertEvidence 'restore.log')
    if ($LASTEXITCODE -ne 0) { throw 'Restore falhou; consulte restore.log.' }
    & $script:IceplayDotnet build tests/Iceplay.Verification --no-restore *> (Join-Path $alertEvidence 'build.log')
    if ($LASTEXITCODE -ne 0) { throw 'Build falhou; consulte build.log.' }
    & $script:IceplayDotnet run --project tests/Iceplay.Verification --no-build -- $alertDatabase *> (Join-Path $alertEvidence 'regras.log')
    if ($LASTEXITCODE -ne 0) { Get-Content (Join-Path $alertEvidence 'regras.log') -Tail 20; throw 'Regras falharam.' }
    Get-Content (Join-Path $alertEvidence 'regras.log') -Tail 1
    & python -X utf8 "$PSScriptRoot/verify-alertas.py" --dotnet $script:IceplayDotnet --database ($alertDatabase -replace 'iceplay.db$','http.db') --evidence $alertEvidence *> (Join-Path $alertEvidence 'http.log')
    Get-Content (Join-Path $alertEvidence 'http.log') -Tail 3
    if ($LASTEXITCODE -ne 0) { throw 'HTTP de alertas falhou; consulte http.log e alertas-api.json.' }
}
finally { Pop-Location }
