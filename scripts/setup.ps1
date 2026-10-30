[CmdletBinding()]
param()

. (Join-Path $PSScriptRoot 'common.ps1')
Push-Location $script:IceplayRoot
try {
    & $script:IceplayDotnet restore 'Iceplay.slnx' --locked-mode --configfile 'NuGet.Config'
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao restaurar os pacotes NuGet.' }
    & $script:IceplayDotnet tool restore --configfile 'NuGet.Config'
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao restaurar a ferramenta local dotnet-ef.' }
    & $script:IceplayDotnet build 'Iceplay.slnx' --no-restore
    if ($LASTEXITCODE -ne 0) { throw 'Falha na compilação.' }
}
finally { Pop-Location }
