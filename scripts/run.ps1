[CmdletBinding()]
param()

. (Join-Path $PSScriptRoot 'common.ps1')
Push-Location $script:IceplayRoot
try {
    & $script:IceplayDotnet run --project 'src/Iceplay.Api/Iceplay.Api.csproj' --no-restore --launch-profile http
    if ($LASTEXITCODE -ne 0) { throw 'A aplicação terminou com erro.' }
}
finally { Pop-Location }
