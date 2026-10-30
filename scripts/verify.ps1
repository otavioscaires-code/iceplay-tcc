#Requires -Version 7.5
# Verificação HTTP em banco isolado; não modifica o banco de uso.
[CmdletBinding()]
param(
    [string] $EvidenceDirectory = 'docs/evidencias'
)
. (Join-Path $PSScriptRoot 'common.ps1')
$taskChecks = [System.Collections.Generic.List[string]]::new()
$taskRunId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$taskRunDirectory = Join-Path $script:IceplayRoot ".tools/verification/$taskRunId"
New-Item -ItemType Directory -Path $taskRunDirectory -Force | Out-Null
$taskDatabase = Join-Path $taskRunDirectory 'iceplay.db'
$taskProject = Join-Path $script:IceplayRoot 'src/Iceplay.Api/Iceplay.Api.csproj'
$taskEvidenceDirectory = [System.IO.Path]::GetFullPath($EvidenceDirectory, $script:IceplayRoot)
New-Item -ItemType Directory -Path $taskEvidenceDirectory -Force | Out-Null
$taskProcesses = [System.Collections.Generic.List[object]]::new()

function Assert-Iceplay([bool] $condition, [string] $description) {
    if (-not $condition) { throw "FALHOU: $description" }
    $taskChecks.Add($description)
    Write-Host "PASSOU: $description"
}

function Start-IceplayVerification([string] $environment, [string] $databaseFile, [string] $label) {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = $listener.LocalEndpoint.Port
    $listener.Stop()
    $baseUrl = "http://127.0.0.1:$port"
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $script:IceplayDotnet
    $startInfo.WorkingDirectory = $script:IceplayRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    foreach ($argument in @('run', '--project', $taskProject, '--no-build', '--no-restore', '--no-launch-profile', '--', '--urls', $baseUrl)) {
        $startInfo.ArgumentList.Add($argument)
    }
    $startInfo.Environment['ASPNETCORE_ENVIRONMENT'] = $environment
    $startInfo.Environment['ConnectionStrings__Iceplay'] = "Data Source=$databaseFile"
    $process = [System.Diagnostics.Process]::Start($startInfo)
    $instance = [pscustomobject]@{ Process = $process; Output = $process.StandardOutput.ReadToEndAsync(); Error = $process.StandardError.ReadToEndAsync(); Url = $baseUrl; Label = $label }
    $taskProcesses.Add($instance)
    return $instance
}

function Stop-IceplayVerification($instance) {
    if (-not $instance.Process.HasExited) {
        $instance.Process.Kill($true)
        if (-not $instance.Process.WaitForExit(10000)) { throw 'O processo de teste não terminou.' }
    }
    $instance.Output.GetAwaiter().GetResult() | Set-Content -LiteralPath (Join-Path $taskRunDirectory ($instance.Label + '.stdout.log')) -Encoding utf8
    $instance.Error.GetAwaiter().GetResult() | Set-Content -LiteralPath (Join-Path $taskRunDirectory ($instance.Label + '.stderr.log')) -Encoding utf8
}

function Wait-IceplayHealth($instance) {
    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($instance.Process.HasExited) { throw "A API encerrou antes de responder: $($instance.Label)" }
        try { return Invoke-WebRequest -Uri ($instance.Url + '/api/health') -TimeoutSec 2 -SkipHttpErrorCheck }
        catch { Start-Sleep -Milliseconds 200 }
    }
    throw "A API não respondeu em 45 segundos: $($instance.Label)"
}

Push-Location $script:IceplayRoot
try {
    & $script:IceplayDotnet build 'Iceplay.slnx' --no-restore
    if ($LASTEXITCODE -ne 0) { throw 'Compilação falhou; verificação interrompida.' }
    $taskCurrent = Start-IceplayVerification 'Development' $taskDatabase 'startup'
    $taskResponse = Wait-IceplayHealth $taskCurrent
    $taskHealth = $taskResponse.Content | ConvertFrom-Json -DateKind String
    Assert-Iceplay ($taskResponse.StatusCode -eq 200) 'GET /api/health retorna HTTP 200'
    Assert-Iceplay ($taskHealth.status -eq 'healthy' -and $taskHealth.database -eq 'connected') 'API consulta SQLite com sucesso'
    Assert-Iceplay ($taskHealth.refrigeratorCount -eq 0) 'Banco novo contém zero geladeiras, sem seed fictício'
    Assert-Iceplay ($taskHealth.checkedAtUtc -match 'Z$') 'Saúde fornece timestamp UTC'
    Assert-Iceplay (Test-Path -LiteralPath $taskDatabase) 'Migration cria arquivo SQLite isolado'
    $taskPage = Invoke-WebRequest -Uri ($taskCurrent.Url + '/') -TimeoutSec 5
    Assert-Iceplay ($taskPage.StatusCode -eq 200 -and $taskPage.Content -match '<title>ICEPLAY') 'Página inicial é servida pela aplicação'
    Assert-Iceplay ($taskPage.Content -match 'id="base-tecnica"' -and $taskPage.Content -match 'id="proximas-etapas"') 'Destinos da navegação existem no HTML servido'
    $taskCss = Invoke-WebRequest -Uri ($taskCurrent.Url + '/styles.css') -TimeoutSec 5
    $taskJs = Invoke-WebRequest -Uri ($taskCurrent.Url + '/app.js') -TimeoutSec 5
    Assert-Iceplay ($taskCss.StatusCode -eq 200 -and $taskCss.Headers['Content-Type'] -match 'text/css') 'CSS é servido com tipo correto'
    Assert-Iceplay ($taskJs.StatusCode -eq 200 -and $taskJs.Content -match '/api/health') 'JavaScript servido consulta a saúde'
    $taskNotFound = Invoke-WebRequest -Uri ($taskCurrent.Url + '/api/rota-inexistente') -TimeoutSec 5 -SkipHttpErrorCheck
    Assert-Iceplay ($taskNotFound.StatusCode -eq 404) 'Rota inexistente retorna HTTP 404'
    Stop-IceplayVerification $taskCurrent
    $taskCurrent = Start-IceplayVerification 'Development' $taskDatabase 'restart'
    $taskRestartResponse = Wait-IceplayHealth $taskCurrent
    $taskRestart = $taskRestartResponse.Content | ConvertFrom-Json -DateKind String
    Assert-Iceplay ($taskRestartResponse.StatusCode -eq 200 -and $taskRestart.refrigeratorCount -eq 0) 'Reinício reutiliza banco e migration sem falha'
    Stop-IceplayVerification $taskCurrent
    # Production não aplica migrations: arquivo sem tabela deve produzir 503.
    $taskCurrent = Start-IceplayVerification 'Production' (Join-Path $taskRunDirectory 'without-schema.db') 'missing-schema'
    $taskFailureResponse = Wait-IceplayHealth $taskCurrent
    $taskFailure = $taskFailureResponse.Content | ConvertFrom-Json -DateKind String
    Assert-Iceplay ($taskFailureResponse.StatusCode -eq 503 -and $taskFailure.status -eq 'unhealthy' -and $taskFailure.database -eq 'unavailable') 'Banco sem schema retorna HTTP 503 real'
    Assert-Iceplay ($taskFailureResponse.Content -notmatch 'Data Source|Exception|\.db') 'Resposta de falha não divulga detalhes internos'
    Stop-IceplayVerification $taskCurrent
    [ordered]@{
        executedAtUtc = [DateTime]::UtcNow.ToString('o')
        result = 'passed'
        type = 'Software HTTP e SQLite; sem hardware ou leituras de sensores'
        sdk = (& $script:IceplayDotnet --version)
        isolatedDatabase = $taskDatabase
        logDirectory = $taskRunDirectory
        checks = $taskChecks.ToArray()
        health = $taskHealth
        restartHealth = $taskRestart
        missingSchemaHealth = $taskFailure
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $taskEvidenceDirectory 'smoke-latest.json') -Encoding utf8
    Write-Host ("Verificação concluída: " + (Join-Path $taskEvidenceDirectory 'smoke-latest.json'))
    Write-Host "Banco isolado: $taskDatabase"
}
catch {
    [ordered]@{
        executedAtUtc = [DateTime]::UtcNow.ToString('o')
        result = 'failed'
        type = 'Software HTTP e SQLite; sem hardware ou leituras de sensores'
        isolatedDatabase = $taskDatabase
        logDirectory = $taskRunDirectory
        checks = $taskChecks.ToArray()
        error = $_.Exception.Message
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $taskEvidenceDirectory 'smoke-latest.json') -Encoding utf8
    throw
}
finally {
    foreach ($instance in $taskProcesses) { Stop-IceplayVerification $instance }
    Pop-Location
}
