#Requires -Version 7.5
# Fixtures de software em SQLite isolado; preserva as leituras de teste no final.
[CmdletBinding()]
param(
    [string] $EvidenceDirectory = 'docs/evidencias/2026-10-17-leituras'
)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskRunId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$taskRunDirectory = Join-Path $taskRoot ".tools/verification/$taskRunId"
$taskEvidenceDirectory = [IO.Path]::GetFullPath($EvidenceDirectory, $taskRoot)
New-Item -ItemType Directory -Path $taskRunDirectory, $taskEvidenceDirectory -Force | Out-Null
$taskDatabase = Join-Path $taskRunDirectory 'iceplay.db'
$taskProject = Join-Path $taskRoot 'src/Iceplay.Api/Iceplay.Api.csproj'
$taskInitialMigration = '20261013172101_InitialCreate'
$taskLeiturasMigration = '20261018023456_AddLeituras'
$taskChecks = [Collections.Generic.List[string]]::new()
$taskRequests = [Collections.Generic.List[object]]::new()
$taskErrors = [Collections.Generic.List[string]]::new()
$taskProcesses = [Collections.Generic.List[object]]::new()
$taskReport = [ordered]@{
    result = 'failed'
    scope = 'Software e fixtures isoladas, inclusive origem Hardware declarada para teste; sem medicoes fisicas'
    startedAtUtc = [DateTime]::UtcNow.ToString('o')
    lastActionAtUtc = [DateTime]::UtcNow.ToString('o')
    finishedAtUtc = $null
    phase = 'preparacao'
    runId = $taskRunId
    isolatedDatabase = $taskDatabase
    logDirectory = $taskEvidenceDirectory
    sdk = $null
    checkCount = 0
    recordedRequestCount = 0
    checksPassed = $taskChecks
    requests = $taskRequests
    errors = $taskErrors
    migrations = @()
    beforeUpgrade = $null
    afterUpgrade = $null
    fixtureGeladeira = $null
    fixtureLeituras = @()
    simulatorResults = @()
    finalDatabase = $null
    cleanup = 'Somente processos criados sao encerrados; fixtures permanecem no banco isolado'
}
$taskFailure = $null
$taskLocationPushed = $false

function Assert-Leituras([bool] $condition, [string] $description) {
    $taskReport.lastActionAtUtc = [DateTime]::UtcNow.ToString('o')
    if (-not $condition) { throw "FALHOU: $description" }
    $taskChecks.Add($description)
    Write-Host "PASSOU: $description"
}

function Start-LeiturasProcess([string[]] $arguments, [string] $environment, [string] $databaseFile, [string] $label, [string] $url) {
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $script:IceplayDotnet
    $startInfo.WorkingDirectory = $taskRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    foreach ($argument in $arguments) { $startInfo.ArgumentList.Add($argument) }
    # A conexao tambem isola a construcao de contexto realizada pela ferramenta EF.
    $startInfo.Environment['ConnectionStrings__Iceplay'] = "Data Source=$databaseFile"
    $startInfo.Environment['ASPNETCORE_ENVIRONMENT'] = $environment
    $startInfo.Environment['DOTNET_ENVIRONMENT'] = $environment
    $process = [Diagnostics.Process]::Start($startInfo)
    $instance = [pscustomobject]@{
        Process = $process
        Output = $process.StandardOutput.ReadToEndAsync()
        Error = $process.StandardError.ReadToEndAsync()
        Label = $label
        Url = $url
        Stopped = $false
    }
    $taskProcesses.Add($instance)
    return $instance
}

function Stop-LeiturasProcess($instance) {
    if ($instance.Stopped) { return }
    if (-not $instance.Process.HasExited) {
        $instance.Process.Kill($true)
        if (-not $instance.Process.WaitForExit(10000)) { throw "Processo de teste nao encerrou: $($instance.Label)." }
    }
    $instance.Output.GetAwaiter().GetResult() | Set-Content -LiteralPath (Join-Path $taskEvidenceDirectory ("leituras-$($instance.Label).stdout.log")) -Encoding utf8
    $instance.Error.GetAwaiter().GetResult() | Set-Content -LiteralPath (Join-Path $taskEvidenceDirectory ("leituras-$($instance.Label).stderr.log")) -Encoding utf8
    $instance.Stopped = $true
}

function Invoke-LeiturasEf([string[]] $arguments, [string] $label) {
    $instance = Start-LeiturasProcess $arguments 'Production' $taskDatabase $label ''
    if (-not $instance.Process.WaitForExit(45000)) { throw "Ferramenta EF nao terminou em 45 segundos: $label." }
    $exitCode = $instance.Process.ExitCode
    $output = $instance.Output.GetAwaiter().GetResult()
    Stop-LeiturasProcess $instance
    Assert-Leituras ($exitCode -eq 0) "Ferramenta EF $label retorna codigo zero"
    return $output
}

function Start-LeiturasApi([string] $environment, [string] $databaseFile, [string] $label) {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = $listener.LocalEndpoint.Port
    $listener.Stop()
    $url = "http://127.0.0.1:$port"
    $arguments = @('run', '--project', $taskProject, '--no-build', '--no-restore', '--no-launch-profile', '--', '--urls', $url)
    return Start-LeiturasProcess $arguments $environment $databaseFile $label $url
}

function Wait-LeiturasApi($instance) {
    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($instance.Process.HasExited) { throw "API encerrou antes de responder: $($instance.Label)." }
        try {
            $response = Invoke-WebRequest -Uri ($instance.Url + '/api/health') -TimeoutSec 2 -SkipHttpErrorCheck
            return
        }
        catch { Start-Sleep -Milliseconds 200 }
    }
    throw "API nao respondeu em 45 segundos: $($instance.Label)."
}

function Invoke-LeiturasRequest {
    param($Instance, [string] $Method, [string] $Path, [int] $ExpectedStatus, [AllowEmptyString()][string] $Body)
    $arguments = @{
        Uri = $Instance.Url + $Path
        Method = $Method
        TimeoutSec = 10
        SkipHttpErrorCheck = $true
        MaximumRedirection = 0
    }
    if ($PSBoundParameters.ContainsKey('Body')) {
        $arguments['Body'] = $Body
        $arguments['ContentType'] = 'application/json; charset=utf-8'
    }
    $record = [ordered]@{
        atUtc = [DateTime]::UtcNow.ToString('o')
        phase = $taskReport.phase
        instance = $Instance.Label
        source = 'verificador HTTP'
        method = $Method
        path = $Path
        requestBody = $Body
        expectedStatus = $ExpectedStatus
        actualStatus = $null
        contentType = $null
        location = $null
        responseBody = $null
    }
    $taskRequests.Add($record)
    $response = Invoke-WebRequest @arguments
    $record.actualStatus = [int] $response.StatusCode
    $record.contentType = [string] $response.Headers['Content-Type']
    $record.location = [string] $response.Headers['Location']
    $record.responseBody = if ($response.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($response.Content) } else { [string] $response.Content }
    Assert-Leituras ($response.StatusCode -eq $ExpectedStatus) "$($taskReport.phase): $Method $Path retorna HTTP $ExpectedStatus"
    $json = $null
    if ($ExpectedStatus -in @(200, 201, 400, 409, 503)) {
        Assert-Leituras ($record.contentType -match '^application/(?:[a-z0-9.+-]+\+)?json(?:;|$)') "$($taskReport.phase): corpo possui tipo JSON"
        $json = ConvertFrom-Json -InputObject $record.responseBody -AsHashtable -DateKind String -NoEnumerate
    }
    if ($ExpectedStatus -eq 204) { Assert-Leituras ([string]::IsNullOrEmpty($record.responseBody)) 'HTTP 204 nao possui corpo' }
    return [pscustomobject]@{ Json = $json; Record = $record }
}

function Convert-LeiturasUtc([string] $value) {
    if ($value -notmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$') { throw "Timestamp de resposta fora do contrato UTC: $value" }
    return [DateTimeOffset]::Parse($value, [Globalization.CultureInfo]::InvariantCulture)
}

function Assert-LeituraEntity($actual, $expected, [string] $label) {
    $valid = $actual -is [Collections.IDictionary]
    if ($valid) {
        $valid = ((@($actual.Keys | Sort-Object) -join ',') -ceq 'geladeiraId,id,medidoEmUtc,origem,portaAberta,recebidoEmUtc,temperaturaC') -and
            ($actual.id -is [int] -or $actual.id -is [long]) -and $actual.id -gt 0 -and
            ($actual.geladeiraId -is [int] -or $actual.geladeiraId -is [long]) -and $actual.geladeiraId -eq $expected.geladeiraId -and
            ($actual.temperaturaC -is [double] -or $actual.temperaturaC -is [decimal] -or $actual.temperaturaC -is [int] -or $actual.temperaturaC -is [long]) -and
            [double]::IsFinite([double] $actual.temperaturaC) -and $actual.temperaturaC -eq $expected.temperaturaC -and
            $actual.portaAberta -is [bool] -and $actual.portaAberta -eq $expected.portaAberta -and
            $actual.origem -is [string] -and $actual.origem -ceq $expected.origem -and
            $actual.medidoEmUtc -is [string] -and $actual.recebidoEmUtc -is [string]
        foreach ($key in @('id', 'recebidoEmUtc')) {
            if ($expected.Contains($key)) { $valid = $valid -and $actual[$key] -ceq $expected[$key] }
        }
    }
    Assert-Leituras $valid "${label}: sete campos, tipos, identidade, temperatura, porta e origem correspondem a fixture"
    $measured = Convert-LeiturasUtc $actual.medidoEmUtc
    $received = Convert-LeiturasUtc $actual.recebidoEmUtc
    $expectedMeasured = Convert-LeiturasUtc $expected.medidoEmUtc
    Assert-Leituras ($measured -eq $expectedMeasured -and $measured -le $received) "${label}: instante de medicao preservado, UTC e nao posterior ao recebimento"
}

function Assert-LeiturasParent($instance, $expected) {
    $parent = Invoke-LeiturasRequest $instance 'GET' "/api/geladeiras/$($expected.id)" 200
    $data = $parent.Json
    $sameCreated = [DateTimeOffset]::Parse($data.criadoEmUtc, [Globalization.CultureInfo]::InvariantCulture) -eq
        [DateTimeOffset]::Parse($expected.criadoEmUtc, [Globalization.CultureInfo]::InvariantCulture)
    Assert-Leituras ($data.id -eq $expected.id -and $data.nome -ceq $expected.nome -and $data.localizacao -ceq $expected.localizacao -and $sameCreated) 'Geladeira anterior a migration preserva ID, nome, localizacao e criacao'
    $health = Invoke-LeiturasRequest $instance 'GET' '/api/health' 200
    Assert-Leituras ($health.Json.status -ceq 'healthy' -and $health.Json.database -ceq 'connected' -and $health.Json.refrigeratorCount -eq 1) 'Saude real confirma exatamente uma geladeira fixture preservada'
}

function Invoke-LeiturasPython([string] $code, [string[]] $arguments, [string] $label) {
    $output = @(& python -c $code @arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $text = ($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
    $text | Set-Content -LiteralPath (Join-Path $taskEvidenceDirectory ("leituras-$label.json")) -Encoding utf8
    Assert-Leituras ($exitCode -eq 0) "Python SQLite $label retorna codigo zero"
    return ConvertFrom-Json -InputObject $text -AsHashtable -DateKind String -NoEnumerate
}

$taskInitialPython = @'
import json, sqlite3, sys
from pathlib import Path
from datetime import datetime, timezone
sys.stdout.reconfigure(encoding="utf-8")
path = Path(sys.argv[1]).resolve(strict=True)
connection = sqlite3.connect(path.as_uri() + "?mode=rw", uri=True)
try:
    assert connection.execute("PRAGMA integrity_check").fetchall() == [("ok",)]
    migrations = [row[0] for row in connection.execute('SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId"')]
    assert migrations == ["20261013172101_InitialCreate"], migrations
    assert connection.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='Leituras'").fetchone()[0] == 0
    assert connection.execute('SELECT count(*) FROM "Geladeiras"').fetchone()[0] == 0
    created = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    name = "FIXTURE LEITURAS UPGRADE - NAO E CADASTRO REAL"
    location = "BANCO ISOLADO - cadastro anterior a migration de leituras"
    cursor = connection.execute('INSERT INTO "Geladeiras" ("Nome","Localizacao","CriadoEmUtc") VALUES (?,?,?)', (name, location, created))
    connection.commit()
    print(json.dumps({"result":"passed","migrations":migrations,"leituraTableExists":False,"fixture":{"id":cursor.lastrowid,"nome":name,"localizacao":location,"criadoEmUtc":created}}, ensure_ascii=False))
finally:
    connection.close()
'@

$taskCountPython = @'
import json, sqlite3, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
path = Path(sys.argv[1]).resolve(strict=True)
connection = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)
try:
    count = connection.execute('SELECT count(*) FROM "Leituras"').fetchone()[0]
    print(json.dumps({"leituraCount":count}))
finally:
    connection.close()
'@

$taskSchemaPython = @'
import json, sqlite3, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
path = Path(sys.argv[1]).resolve(strict=True)
parent_id = int(sys.argv[2])
connection = sqlite3.connect(path.as_uri() + "?mode=rw", uri=True)
try:
    connection.execute("PRAGMA foreign_keys=ON")
    assert connection.execute("PRAGMA foreign_keys").fetchone()[0] == 1
    assert connection.execute("PRAGMA integrity_check").fetchall() == [("ok",)]
    columns = [row[1] for row in connection.execute('PRAGMA table_info("Leituras")')]
    assert set(columns) == {"Id","GeladeiraId","TemperaturaC","PortaAberta","MedidoEmUtc","RecebidoEmUtc","Origem"}, columns
    foreign_keys = connection.execute('PRAGMA foreign_key_list("Leituras")').fetchall()
    assert any(row[2] == "Geladeiras" and row[3] == "GeladeiraId" and row[4] == "Id" and row[6].upper() in ("RESTRICT","NO ACTION") for row in foreign_keys), foreign_keys
    assert connection.execute("PRAGMA foreign_key_check").fetchall() == []
    count = connection.execute('SELECT count(*) FROM "Leituras"').fetchone()[0]
    blocked = None
    if count:
        connection.execute("BEGIN")
        try:
            connection.execute('DELETE FROM "Geladeiras" WHERE "Id"=?', (parent_id,))
        except sqlite3.IntegrityError:
            blocked = True
        else:
            blocked = False
        finally:
            connection.rollback()
        assert blocked, "A FK permitiu excluir geladeira com historico"
    parent_count = connection.execute('SELECT count(*) FROM "Geladeiras" WHERE "Id"=?', (parent_id,)).fetchone()[0]
    assert parent_count == 1
    migrations = [row[0] for row in connection.execute('SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId"')]
    assert len(migrations) == 2 and migrations[0] == "20261013172101_InitialCreate", migrations
    print(json.dumps({"result":"passed","integrity":"ok","columns":columns,"foreignKeys":foreign_keys,"foreignKeyCheck":[],"directParentDeleteBlocked":blocked,"leituraCount":count,"parentFixtureCount":parent_count,"migrations":migrations}, ensure_ascii=False))
finally:
    connection.close()
'@

function Assert-LeiturasCount([int] $expectedCount, [string] $label) {
    $count = Invoke-LeiturasPython $taskCountPython @($taskDatabase) 'count-latest'
    Assert-Leituras ($count.leituraCount -eq $expectedCount) "${label}: SQLite preserva exatamente $expectedCount leituras, sem insert indevido"
}

try {
    . (Join-Path $PSScriptRoot 'common.ps1')
    Push-Location $taskRoot
    $taskLocationPushed = $true
    $taskReport.sdk = & $script:IceplayDotnet --version
    $taskReport.phase = 'build'
    & $script:IceplayDotnet build 'Iceplay.slnx' --no-restore 2>&1 | Tee-Object -FilePath (Join-Path $taskEvidenceDirectory 'build.log')
    Assert-Leituras ($LASTEXITCODE -eq 0) 'Build sem restauracao conclui com codigo zero'
    $taskMigrationNames = @(Get-ChildItem -LiteralPath (Join-Path $taskRoot 'src/Iceplay.Api/Migrations') -File -Filter '*.cs' |
        Where-Object { $_.BaseName -match '^\d{14}_' -and $_.Name -notlike '*.Designer.cs' } |
        Sort-Object Name | ForEach-Object { $_.BaseName })
    Assert-Leituras ($taskMigrationNames.Count -eq 2 -and $taskMigrationNames[0] -ceq $taskInitialMigration -and $taskMigrationNames[1] -ceq $taskLeiturasMigration) 'Fontes contem exatamente InitialCreate e AddLeituras previstas'
    $taskReport.migrations = $taskMigrationNames

    $taskReport.phase = 'migration inicial e fixture antes do upgrade'
    $initialOutput = Invoke-LeiturasEf @('ef', 'database', 'update', $taskInitialMigration, '--project', $taskProject, '--no-build', '--connection', "Data Source=$taskDatabase", '--no-color') 'initial-migration'
    $taskReport.beforeUpgrade = Invoke-LeiturasPython $taskInitialPython @($taskDatabase) 'before-upgrade'
    $taskParent = $taskReport.beforeUpgrade.fixture
    $taskReport.fixtureGeladeira = $taskParent
    Assert-Leituras ($taskReport.beforeUpgrade.result -ceq 'passed' -and -not $taskReport.beforeUpgrade.leituraTableExists) 'Fixture geladeira existe antes de criar tabela Leituras'

    $taskReport.phase = 'upgrade aditivo pela aplicacao'
    $taskCurrent = Start-LeiturasApi 'Development' $taskDatabase 'startup'
    Wait-LeiturasApi $taskCurrent
    Assert-LeiturasParent $taskCurrent $taskParent
    $taskReport.afterUpgrade = Invoke-LeiturasPython $taskSchemaPython @($taskDatabase, [string] $taskParent.id) 'after-upgrade'
    Assert-Leituras ($taskReport.afterUpgrade.leituraCount -eq 0 -and (@($taskReport.afterUpgrade.migrations) -join ',') -ceq ($taskMigrationNames -join ',')) 'Upgrade preserva cadastro, cria Leituras vazia e aplica somente as duas migrations previstas'

    $taskReport.phase = 'POST Simulacao com zero e porta false'
    $taskMeasured = [DateTime]::UtcNow.AddHours(-2).ToString('yyyy-MM-ddTHH:mm:ss.fffffffZ')
    $taskPayload = [ordered]@{ geladeiraId = $taskParent.id; temperaturaC = 0.0; portaAberta = $false; medidoEmUtc = $taskMeasured; origem = 'Simulacao' }
    $taskPayloadWithExtras = [ordered]@{}
    foreach ($entry in $taskPayload.GetEnumerator()) { $taskPayloadWithExtras[$entry.Key] = $entry.Value }
    $taskPayloadWithExtras['id'] = 2147483000
    $taskPayloadWithExtras['recebidoEmUtc'] = '2000-01-01T00:00:00Z'
    $taskBeforePost = [DateTimeOffset]::UtcNow
    $taskCreated = Invoke-LeiturasRequest $taskCurrent 'POST' '/api/leituras' 201 ($taskPayloadWithExtras | ConvertTo-Json -Compress)
    $taskAfterPost = [DateTimeOffset]::UtcNow
    Assert-LeituraEntity $taskCreated.Json $taskPayload 'POST simulacao'
    $taskReceived = Convert-LeiturasUtc $taskCreated.Json.recebidoEmUtc
    Assert-Leituras ($taskCreated.Json.id -ne 2147483000 -and $taskReceived -ge $taskBeforePost -and $taskReceived -le $taskAfterPost) 'ID e recebimento sao gerados pelo servidor, sem aceitar campos extras do cliente'
    $taskFixture1 = $taskCreated.Json
    $taskLocation = [Uri]::new([Uri] $taskCurrent.Url, $taskCreated.Record.location)
    Assert-Leituras (-not [string]::IsNullOrWhiteSpace($taskCreated.Record.location) -and $taskLocation.GetLeftPart([UriPartial]::Authority) -ceq $taskCurrent.Url -and $taskLocation.AbsolutePath -ceq "/api/leituras/$($taskFixture1.id)") 'POST 201 fornece Location da leitura criada na mesma instancia'
    $taskLocated = Invoke-LeiturasRequest $taskCurrent 'GET' $taskLocation.PathAndQuery 200
    Assert-LeituraEntity $taskLocated.Json $taskFixture1 'GET pelo Location'

    $taskReport.phase = 'POST origem Hardware declarada em fixture de software'
    $taskHardwarePayload = [ordered]@{
        geladeiraId = $taskParent.id
        temperaturaC = 1234.5
        portaAberta = $true
        medidoEmUtc = [DateTime]::UtcNow.AddMinutes(-5).ToString('yyyy-MM-ddTHH:mm:ssZ')
        origem = 'Hardware'
    }
    $taskHardware = Invoke-LeiturasRequest $taskCurrent 'POST' '/api/leituras' 201 ($taskHardwarePayload | ConvertTo-Json -Compress)
    Assert-LeituraEntity $taskHardware.Json $taskHardwarePayload 'Hardware apenas declarado, temperatura finita sem faixa arbitraria'
    $taskFixture2 = $taskHardware.Json
    Assert-Leituras ($taskFixture2.id -ne $taskFixture1.id) 'Leituras de origens diferentes recebem IDs distintos'
    $taskReport.fixtureLeituras = @($taskFixture1, $taskFixture2)
    Assert-LeiturasCount 2 'Duas leituras validas'

    $taskInvalid = [Collections.Generic.List[object]]::new()
    foreach ($field in @('geladeiraId', 'temperaturaC', 'portaAberta', 'medidoEmUtc', 'origem')) {
        foreach ($variant in @('ausente', 'nulo')) {
            $body = [ordered]@{}
            foreach ($entry in $taskPayload.GetEnumerator()) { $body[$entry.Key] = $entry.Value }
            if ($variant -eq 'ausente') { $body.Remove($field) } else { $body[$field] = $null }
            $taskInvalid.Add(@{ label = "$field $variant"; body = ($body | ConvertTo-Json -Compress) })
        }
    }
    foreach ($case in @(
        @{ field = 'geladeiraId'; value = 0; label = 'geladeiraId zero' },
        @{ field = 'geladeiraId'; value = -1; label = 'geladeiraId negativo' },
        @{ field = 'geladeiraId'; value = 1.5; label = 'geladeiraId fracionario' },
        @{ field = 'geladeiraId'; value = '1'; label = 'geladeiraId string numerica' },
        @{ field = 'geladeiraId'; value = @(); label = 'geladeiraId array' },
        @{ field = 'temperaturaC'; value = '4.5'; label = 'temperatura string numerica' },
        @{ field = 'temperaturaC'; value = 'NaN'; label = 'temperatura NaN textual' },
        @{ field = 'temperaturaC'; value = 'Infinity'; label = 'temperatura Infinity textual' },
        @{ field = 'temperaturaC'; value = '-Infinity'; label = 'temperatura menos Infinity textual' },
        @{ field = 'temperaturaC'; value = $true; label = 'temperatura booleana' },
        @{ field = 'temperaturaC'; value = @{}; label = 'temperatura objeto' },
        @{ field = 'portaAberta'; value = 'false'; label = 'porta string' },
        @{ field = 'portaAberta'; value = 0; label = 'porta numero' },
        @{ field = 'medidoEmUtc'; value = '2026-10-17T00:00:00'; label = 'medicao sem fuso' },
        @{ field = 'medidoEmUtc'; value = '2026-10-17T00:00:00+00:00'; label = 'medicao offset zero sem Z' },
        @{ field = 'medidoEmUtc'; value = '2026-10-17T00:00:00-03:00'; label = 'medicao offset diferente' },
        @{ field = 'medidoEmUtc'; value = '2026-10-17T00:00:00.12345678Z'; label = 'medicao oito casas fracionarias' },
        @{ field = 'medidoEmUtc'; value = '2026-02-30T00:00:00Z'; label = 'medicao data inexistente' },
        @{ field = 'medidoEmUtc'; value = '2026-10-17T00:00Z'; label = 'medicao sem segundos' },
        @{ field = 'medidoEmUtc'; value = '2026-10-17T00:00:00z'; label = 'medicao z minusculo' },
        @{ field = 'medidoEmUtc'; value = ''; label = 'medicao vazia' },
        @{ field = 'medidoEmUtc'; value = 42; label = 'medicao numerica' },
        @{ field = 'medidoEmUtc'; value = [DateTime]::UtcNow.AddMinutes(10).ToString('yyyy-MM-ddTHH:mm:ss.fffffffZ'); label = 'medicao futura' },
        @{ field = 'origem'; value = 'simulacao'; label = 'origem minuscula' },
        @{ field = 'origem'; value = 'Hardware '; label = 'origem com espaco' },
        @{ field = 'origem'; value = 'Outro'; label = 'origem desconhecida' },
        @{ field = 'origem'; value = ''; label = 'origem vazia' },
        @{ field = 'origem'; value = 0; label = 'origem numero' },
        @{ field = 'origem'; value = $false; label = 'origem booleana' }
    )) {
        $body = [ordered]@{}
        foreach ($entry in $taskPayload.GetEnumerator()) { $body[$entry.Key] = $entry.Value }
        $body[$case.field] = $case.value
        $taskInvalid.Add(@{ label = $case.label; body = ($body | ConvertTo-Json -Depth 5 -Compress) })
    }
    $taskOverflow = [ordered]@{}
    foreach ($entry in $taskPayload.GetEnumerator()) { $taskOverflow[$entry.Key] = $entry.Value }
    $taskOverflow.temperaturaC = 'OVERFLOW_NUMBER'
    $taskInvalid.Add(@{ label = 'temperatura numero excede double finito'; body = (($taskOverflow | ConvertTo-Json -Compress).Replace('"OVERFLOW_NUMBER"', '1e9999')) })
    foreach ($case in @(
        @{ label = 'JSON incompleto'; body = '{"geladeiraId":' },
        @{ label = 'corpo vazio'; body = '' },
        @{ label = 'raiz nula'; body = 'null' },
        @{ label = 'raiz array'; body = '[]' }
    )) { $taskInvalid.Add($case) }

    foreach ($case in $taskInvalid) {
        $taskReport.phase = 'POST invalido: ' + $case.label
        $invalid = Invoke-LeiturasRequest $taskCurrent 'POST' '/api/leituras' 400 $case.body
        Assert-Leituras ($invalid.Json.status -eq 400 -and $invalid.Json.errors -is [Collections.IDictionary] -and $invalid.Json.errors.Count -gt 0) 'Entrada invalida responde JSON de validacao com mensagens de errors'
        Assert-LeiturasCount 2 ('Rejeicao de ' + $case.label)
    }

    $taskReport.phase = 'geladeira inexistente nao recebe leitura'
    $taskMissingParent = [ordered]@{}
    foreach ($entry in $taskPayload.GetEnumerator()) { $taskMissingParent[$entry.Key] = $entry.Value }
    $taskMissingParent.geladeiraId = 2147483647
    $missing = Invoke-LeiturasRequest $taskCurrent 'POST' '/api/leituras' 404 ($taskMissingParent | ConvertTo-Json -Compress)
    Assert-LeiturasCount 2 'Geladeira inexistente'
    foreach ($id in @('0', '-1', 'texto', '2147483647')) {
        $taskReport.phase = "GET leitura inexistente/invalida $id"
        $missingReading = Invoke-LeiturasRequest $taskCurrent 'GET' "/api/leituras/$id" 404
    }

    $taskReport.phase = 'simulador CLI pela mesma API'
    $taskSimulator = Join-Path $taskRoot 'tools/simulator/enviar-leituras.ps1'
    Assert-Leituras (Test-Path -LiteralPath $taskSimulator) 'Simulador CLI existe para teste integrado'
    $taskSimulatorResults = @(& $taskSimulator -ApiUrl $taskCurrent.Url -GeladeiraId $taskParent.id -Quantidade 2 -IntervaloSegundos 0 -TemperaturaC 4.25 -PortaAberta)
    $taskReport.simulatorResults = $taskSimulatorResults
    Assert-Leituras ($taskSimulatorResults.Count -eq 2) 'Simulador retorna exatamente dois resultados estruturados'
    $taskSimulatorIds = [Collections.Generic.List[int]]::new()
    foreach ($result in $taskSimulatorResults) {
        Assert-Leituras ($result.statusHttp -eq 201 -and $result.indice -in @(1, 2) -and $null -ne $result.leitura) 'Simulador informa indice, HTTP 201 e leitura recebida'
        $reading = $result.leitura | ConvertTo-Json -Depth 4 | ConvertFrom-Json -AsHashtable -DateKind String
        $taskRequests.Add([ordered]@{
            atUtc = [DateTime]::UtcNow.ToString('o'); phase = $taskReport.phase; instance = $taskCurrent.Label; source = 'simulador CLI'
            method = 'POST'; path = '/api/leituras'; requestBody = $null; expectedStatus = 201; actualStatus = [int] $result.statusHttp
            contentType = $null; location = $result.location; responseBody = ($reading | ConvertTo-Json -Compress)
        })
        $expected = [ordered]@{ geladeiraId = $taskParent.id; temperaturaC = 4.25; portaAberta = $true; medidoEmUtc = $reading.medidoEmUtc; origem = 'Simulacao' }
        Assert-LeituraEntity $reading $expected 'Resposta do simulador'
        $taskSimulatorIds.Add([int] $reading.id)
        $simLocation = [Uri]::new([Uri] $taskCurrent.Url, [string] $result.location)
        Assert-Leituras ($simLocation.GetLeftPart([UriPartial]::Authority) -ceq $taskCurrent.Url -and $simLocation.AbsolutePath -ceq "/api/leituras/$($reading.id)") 'Location devolvido pelo simulador identifica sua leitura nesta API'
        $simGet = Invoke-LeiturasRequest $taskCurrent 'GET' $simLocation.PathAndQuery 200
        Assert-LeituraEntity $simGet.Json $reading 'GET confirma persistencia e origem Simulacao da leitura enviada pelo CLI'
    }
    Assert-Leituras (@($taskSimulatorIds | Select-Object -Unique).Count -eq 2 -and $taskSimulatorIds -notcontains $taskFixture1.id -and $taskSimulatorIds -notcontains $taskFixture2.id) 'Simulador cria duas leituras novas com IDs distintos'
    Assert-LeiturasCount 4 'Duas fixtures diretas e duas leituras do simulador'

    $taskReport.phase = 'DELETE geladeira com historico'
    $conflict = Invoke-LeiturasRequest $taskCurrent 'DELETE' "/api/geladeiras/$($taskParent.id)" 409
    Assert-Leituras ($conflict.Json.status -eq 409 -and -not [string]::IsNullOrWhiteSpace($conflict.Json.title)) 'Exclusao com historico responde ProblemDetails 409'
    Assert-LeiturasParent $taskCurrent $taskParent
    Assert-LeiturasCount 4 'Conflito de exclusao preserva todas as leituras'
    $fkState = Invoke-LeiturasPython $taskSchemaPython @($taskDatabase, [string] $taskParent.id) 'foreign-key'
    Assert-Leituras ($fkState.directParentDeleteBlocked -eq $true -and $fkState.leituraCount -eq 4) 'FK RESTRICT/NO ACTION impede DELETE SQL direto e preserva parent e leituras'

    $taskReport.phase = 'geladeira sem historico continua excluivel'
    $emptyParent = Invoke-LeiturasRequest $taskCurrent 'POST' '/api/geladeiras' 201 '{"nome":"FIXTURE LEITURAS - SEM HISTORICO"}'
    $emptyParentId = $emptyParent.Json.id
    Assert-Leituras ($emptyParentId -gt 0 -and $emptyParentId -ne $taskParent.id) 'Geladeira auxiliar sem leituras possui ID proprio'
    $deleteEmpty = Invoke-LeiturasRequest $taskCurrent 'DELETE' "/api/geladeiras/$emptyParentId" 204
    $deleteAgain = Invoke-LeiturasRequest $taskCurrent 'DELETE' "/api/geladeiras/$emptyParentId" 404
    Assert-LeiturasParent $taskCurrent $taskParent

    $taskReport.phase = 'persistencia real apos reiniciar API'
    Stop-LeiturasProcess $taskCurrent
    $taskCurrent = Start-LeiturasApi 'Development' $taskDatabase 'restart'
    Wait-LeiturasApi $taskCurrent
    foreach ($fixture in @($taskFixture1, $taskFixture2)) {
        $reopened = Invoke-LeiturasRequest $taskCurrent 'GET' "/api/leituras/$($fixture.id)" 200
        Assert-LeituraEntity $reopened.Json $fixture 'Reinicio preserva identidade, campos, origem e os dois timestamps'
    }
    foreach ($result in $taskSimulatorResults) {
        $reopened = Invoke-LeiturasRequest $taskCurrent 'GET' "/api/leituras/$($result.leitura.id)" 200
        $fixture = $result.leitura | ConvertTo-Json -Depth 4 | ConvertFrom-Json -AsHashtable -DateKind String
        Assert-LeituraEntity $reopened.Json $fixture 'Reinicio preserva leitura Simulacao do CLI'
    }
    Assert-LeiturasParent $taskCurrent $taskParent
    $conflictAgain = Invoke-LeiturasRequest $taskCurrent 'DELETE' "/api/geladeiras/$($taskParent.id)" 409
    Assert-LeiturasCount 4 'Historico continua protegido depois do reinicio'
    $taskReport.finalDatabase = Invoke-LeiturasPython $taskSchemaPython @($taskDatabase, [string] $taskParent.id) 'final-database'
    Assert-Leituras ($taskReport.finalDatabase.directParentDeleteBlocked -eq $true -and $taskReport.finalDatabase.leituraCount -eq 4 -and $taskReport.finalDatabase.parentFixtureCount -eq 1) 'Estado final tem quatro leituras fixture preservadas, um parent e integridade valida'
    Stop-LeiturasProcess $taskCurrent

    $taskReport.phase = 'schema ausente gera 503 generico'
    $taskBroken = Start-LeiturasApi 'Production' (Join-Path $taskRunDirectory 'without-schema.db') 'missing-schema'
    Wait-LeiturasApi $taskBroken
    foreach ($method in @('GET', 'POST')) {
        $path = if ($method -eq 'GET') { '/api/leituras/1' } else { '/api/leituras' }
        if ($method -eq 'POST') { $unavailable = Invoke-LeiturasRequest $taskBroken $method $path 503 ($taskPayload | ConvertTo-Json -Compress) }
        else { $unavailable = Invoke-LeiturasRequest $taskBroken $method $path 503 }
        Assert-Leituras ($unavailable.Record.contentType -match '^application/problem\+json(?:;|$)' -and $unavailable.Json.status -eq 503 -and -not [string]::IsNullOrWhiteSpace($unavailable.Json.title)) 'Banco sem schema responde ProblemDetails 503 para leituras'
        Assert-Leituras ($unavailable.Record.responseBody -notmatch 'Exception|System\.|Microsoft\.|\.db|Data Source|[A-Z]:\\|no such table|SELECT|Sqlite') '503 nao divulga excecao, SQL nem caminho interno'
    }
    Stop-LeiturasProcess $taskBroken
    $taskReport.phase = 'concluido'
    $taskReport.result = 'passed'
}
catch {
    $taskFailure = $_
    $taskErrors.Add($_.Exception.Message)
}
finally {
    foreach ($instance in $taskProcesses) {
        try { Stop-LeiturasProcess $instance }
        catch {
            $taskErrors.Add("Falha no encerramento/log de $($instance.Label): $($_.Exception.Message)")
            $taskReport.result = 'failed'
        }
    }
    $taskReport.lastActionAtUtc = [DateTime]::UtcNow.ToString('o')
    $taskReport.finishedAtUtc = [DateTime]::UtcNow.ToString('o')
    $taskReport.checkCount = $taskChecks.Count
    $taskReport.recordedRequestCount = $taskRequests.Count
    $taskReport | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath (Join-Path $taskEvidenceDirectory 'leituras-api.json') -Encoding utf8
    if ($taskLocationPushed) { Pop-Location }
}
if ($null -ne $taskFailure) { throw $taskFailure }
if ($taskErrors.Count -gt 0) { throw 'Falha ao encerrar processos de teste; consulte leituras-api.json.' }
Write-Host "Leituras: $($taskChecks.Count) verificacoes aprovadas; $($taskRequests.Count) requisicoes registradas. Relatorio: $(Join-Path $taskEvidenceDirectory 'leituras-api.json')"
Write-Host "Fixtures preservadas somente no banco isolado: $taskDatabase"
