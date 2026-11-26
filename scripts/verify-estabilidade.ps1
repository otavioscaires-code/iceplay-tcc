#Requires -Version 7.5
[CmdletBinding()]
param([string] $EvidenceDirectory = ('docs/evidencias/'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')+'-estabilidade'))
. (Join-Path $PSScriptRoot 'common.ps1')
$stabilityEvidence = [IO.Path]::GetFullPath($EvidenceDirectory,$script:IceplayRoot)
if (Test-Path -LiteralPath $stabilityEvidence) { throw 'Use uma nova pasta de evidencias.' }
[void](New-Item -ItemType Directory -Path $stabilityEvidence)
$stabilityDatabase = Join-Path $script:IceplayRoot ('.tools/verification/estabilidade-'+[Guid]::NewGuid().ToString('N')+'/iceplay.db')
Push-Location $script:IceplayRoot
try {
    & $script:IceplayDotnet build Iceplay.slnx --no-restore *> (Join-Path $stabilityEvidence 'build.log')
    if ($LASTEXITCODE -ne 0) { throw 'Build falhou; consulte build.log.' }
    & python -X utf8 "$PSScriptRoot/verify-estabilidade.py" --dotnet $script:IceplayDotnet --database $stabilityDatabase --evidence $stabilityEvidence *> (Join-Path $stabilityEvidence 'http.log')
    Get-Content (Join-Path $stabilityEvidence 'http.log') -Tail 3
    if ($LASTEXITCODE -ne 0) { throw 'Verificacao de estabilidade falhou; consulte http.log e estabilidade-api.json.' }
}
finally { Pop-Location }
