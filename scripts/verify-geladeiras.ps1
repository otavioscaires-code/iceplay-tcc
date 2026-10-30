#Requires -Version 7.5
# Exercita somente fixtures HTTP em bancos isolados; nunca altera o banco de uso.
[CmdletBinding()]
param(
    [string] $EvidenceDirectory = 'docs/evidencias/2026-10-15'
)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskRunId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$taskRunDirectory = Join-Path $taskRoot ".tools/verification/$taskRunId"
$taskEvidenceDirectory = [System.IO.Path]::GetFullPath($EvidenceDirectory, $taskRoot)
New-Item -ItemType Directory -Path $taskRunDirectory, $taskEvidenceDirectory -Force | Out-Null
$taskDatabase = Join-Path $taskRunDirectory 'iceplay.db'
$taskProject = Join-Path $taskRoot 'src/Iceplay.Api/Iceplay.Api.csproj'
$taskChecks = [System.Collections.Generic.List[string]]::new()
$taskRequests = [System.Collections.Generic.List[object]]::new()
$taskErrors = [System.Collections.Generic.List[string]]::new()
$taskProcesses = [System.Collections.Generic.List[object]]::new()
$taskReport = [ordered]@{
    result = 'failed'
    type = 'Integracao HTTP CRUD e SQLite com fixtures; sem sensores ou cadastros reais'
    startedAtUtc = [DateTime]::UtcNow.ToString('o')
    lastActionAtUtc = [DateTime]::UtcNow.ToString('o')
    finishedAtUtc = $null
    phase = 'preparacao'
    runId = $taskRunId
    isolatedDatabase = $taskDatabase
    logDirectory = $taskEvidenceDirectory
    sdk = $null
    buildExitCode = $null
    checksPassed = $taskChecks
    checkCount = 0
    requests = $taskRequests
    errors = $taskErrors
    fixtures = @()
    migration = $null
    finalRefrigeratorCount = $null
}
$taskFailure = $null
$taskLocationPushed = $false

function Assert-Crud([bool] $condition, [string] $description) {
    $taskReport.lastActionAtUtc = [DateTime]::UtcNow.ToString('o')
    if (-not $condition) { throw "FALHOU: $description" }
    $taskChecks.Add($description)
    Write-Host "PASSOU: $description"
}

function Start-CrudApi([string] $environment, [string] $databaseFile, [string] $label) {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = $listener.LocalEndpoint.Port
    $listener.Stop()
    $baseUrl = "http://127.0.0.1:$port"
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $script:IceplayDotnet
    $startInfo.WorkingDirectory = $taskRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    foreach ($argument in @('run', '--project', $taskProject, '--no-build', '--no-restore', '--no-launch-profile', '--', '--urls', $baseUrl)) {
        $startInfo.ArgumentList.Add($argument)
    }
    $startInfo.Environment['ASPNETCORE_ENVIRONMENT'] = $environment
    $startInfo.Environment['DOTNET_ENVIRONMENT'] = $environment
    $startInfo.Environment['ConnectionStrings__Iceplay'] = "Data Source=$databaseFile"
    $process = [System.Diagnostics.Process]::Start($startInfo)
    $instance = [pscustomobject]@{
        Process = $process
        Output = $process.StandardOutput.ReadToEndAsync()
        Error = $process.StandardError.ReadToEndAsync()
        Url = $baseUrl
        Label = $label
        Stopped = $false
    }
    $taskProcesses.Add($instance)
    return $instance
}

function Stop-CrudApi($instance) {
    if ($instance.Stopped) { return }
    if (-not $instance.Process.HasExited) {
        $instance.Process.Kill($true)
        if (-not $instance.Process.WaitForExit(10000)) { throw "O processo criado pelo teste nao terminou: $($instance.Label)." }
    }
    $instance.Output.GetAwaiter().GetResult() | Set-Content -LiteralPath (Join-Path $taskEvidenceDirectory ("crud-$($instance.Label).stdout.log")) -Encoding utf8
    $instance.Error.GetAwaiter().GetResult() | Set-Content -LiteralPath (Join-Path $taskEvidenceDirectory ("crud-$($instance.Label).stderr.log")) -Encoding utf8
    $instance.Stopped = $true
}

function Wait-CrudApi($instance) {
    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($instance.Process.HasExited) { throw "A API encerrou antes de responder: $($instance.Label)." }
        try {
            $response = Invoke-WebRequest -Uri ($instance.Url + '/api/health') -TimeoutSec 2 -SkipHttpErrorCheck
            return
        }
        catch { Start-Sleep -Milliseconds 200 }
    }
    throw "A API nao respondeu em 45 segundos: $($instance.Label)."
}

function Invoke-CrudRequest {
    param(
        $Instance,
        [string] $Method,
        [string] $Path,
        [int] $ExpectedStatus,
        [AllowEmptyString()][string] $Body
    )
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
    # PowerShell pode retornar ProblemDetails como bytes, embora seja JSON UTF-8.
    $record.responseBody = if ($response.Content -is [byte[]]) {
        [System.Text.Encoding]::UTF8.GetString($response.Content)
    }
    else { [string] $response.Content }
    Assert-Crud ($response.StatusCode -eq $ExpectedStatus) "$($taskReport.phase): $Method $Path retorna exatamente HTTP $ExpectedStatus"
    $json = $null
    if ($ExpectedStatus -in @(200, 201, 400, 503)) {
        Assert-Crud ($record.contentType -match '^application/(?:[a-z0-9.+-]+\+)?json(?:;|$)') "$($taskReport.phase): resposta $Method $Path possui tipo JSON"
        $json = ConvertFrom-Json -InputObject $record.responseBody -AsHashtable -DateKind String -NoEnumerate
    }
    if ($ExpectedStatus -eq 204) {
        Assert-Crud ([string]::IsNullOrEmpty($record.responseBody)) "$($taskReport.phase): HTTP 204 nao possui corpo"
    }
    return [pscustomobject]@{ Response = $response; Json = $json; Record = $record }
}

function Assert-CrudEntity($actual, $expected, [string] $label) {
    $valid = $actual -is [System.Collections.IDictionary]
    if ($valid) {
        $keys = @($actual.Keys | Sort-Object) -join ','
        $valid = $keys -ceq 'criadoEmUtc,id,localizacao,nome' -and
            ($actual.id -is [int] -or $actual.id -is [long]) -and
            $actual.id -eq $expected.id -and $actual.id -gt 0 -and
            $actual.nome -is [string] -and $actual.nome -ceq $expected.nome -and
            $actual.criadoEmUtc -is [string] -and $actual.criadoEmUtc -match 'Z$'
        if ($null -eq $expected.localizacao) { $valid = $valid -and $null -eq $actual.localizacao }
        else { $valid = $valid -and $actual.localizacao -is [string] -and $actual.localizacao -ceq $expected.localizacao }
        if ($expected.Contains('criadoEmUtc')) { $valid = $valid -and $actual.criadoEmUtc -ceq $expected.criadoEmUtc }
    }
    Assert-Crud $valid "${label}: campos camelCase, ID, nome, localizacao e criacao correspondem exatamente a fixture"
    try { $created = [DateTimeOffset]::Parse($actual.criadoEmUtc, [Globalization.CultureInfo]::InvariantCulture) }
    catch { throw "Timestamp UTC invalido em $label." }
    Assert-Crud ($created.Offset -eq [TimeSpan]::Zero) "${label}: timestamp de criacao e UTC valido"
}

function Assert-CrudState($instance, [object[]] $expected, [string] $label) {
    $listing = Invoke-CrudRequest $instance 'GET' '/api/geladeiras' 200
    Assert-Crud ($listing.Json -is [System.Array] -and $listing.Json.Count -eq $expected.Count) "${label}: lista JSON possui exatamente $($expected.Count) fixtures"
    foreach ($fixture in $expected) {
        $matches = @($listing.Json | Where-Object { $_.id -eq $fixture.id })
        Assert-Crud ($matches.Count -eq 1) "${label}: ID $($fixture.id) aparece exatamente uma vez"
        Assert-CrudEntity $matches[0] $fixture "$label / ID $($fixture.id)"
    }
    $health = Invoke-CrudRequest $instance 'GET' '/api/health' 200
    Assert-Crud ($health.Json.status -ceq 'healthy' -and $health.Json.database -ceq 'connected' -and $health.Json.refrigeratorCount -eq $expected.Count) "${label}: health confirma banco conectado e contagem real $($expected.Count)"
}

function Assert-CrudValidation($response, [string] $field, [string] $label) {
    $valid = $response.Json -is [System.Collections.IDictionary] -and
        $response.Json.status -eq 400 -and
        $response.Json.errors -is [System.Collections.IDictionary] -and
        $response.Json.errors.Count -gt 0
    if ($valid) {
        foreach ($messages in $response.Json.errors.Values) {
            if (@($messages).Count -eq 0 -or @($messages | Where-Object { $_ -isnot [string] -or [string]::IsNullOrWhiteSpace($_) }).Count -gt 0) { $valid = $false }
        }
        if ($field) { $valid = $valid -and $response.Json.errors.Contains($field) }
    }
    Assert-Crud $valid "${label}: JSON de validacao contem status 400 e mensagens de errors para o campo esperado"
}

try {
    . (Join-Path $PSScriptRoot 'common.ps1')
    Push-Location $taskRoot
    $taskLocationPushed = $true
    $taskReport.sdk = & $script:IceplayDotnet --version
    $taskReport.phase = 'build'
    & $script:IceplayDotnet build 'Iceplay.slnx' --no-restore 2>&1 | Tee-Object -FilePath (Join-Path $taskEvidenceDirectory 'build.log')
    $taskReport.buildExitCode = $LASTEXITCODE
    Assert-Crud ($LASTEXITCODE -eq 0) 'Build sem restauracao conclui com codigo zero'

    $taskReport.phase = 'banco inicial vazio'
    $taskCurrent = Start-CrudApi 'Development' $taskDatabase 'startup'
    Wait-CrudApi $taskCurrent
    Assert-Crud (Test-Path -LiteralPath $taskDatabase) 'API cria SQLite apenas no diretorio isolado de verificacao'
    Assert-CrudState $taskCurrent @() 'Banco inicial'

    $taskReport.phase = 'POST fixture 1 e campos pertencentes ao servidor'
    $taskFirstName = 'FIXTURE HTTP - Ação São João'
    $taskFirstLocation = 'Área de teste — Câmara 1'
    $taskBeforeCreate = [DateTimeOffset]::UtcNow
    $taskPayload = @{
        nome = "$([char]0x00A0)  $taskFirstName  $([char]0x2003)"
        localizacao = "  $taskFirstLocation  "
        id = 2147483000
        criadoEmUtc = '2000-01-01T00:00:00Z'
    } | ConvertTo-Json -Compress
    $taskFirst = Invoke-CrudRequest $taskCurrent 'POST' '/api/geladeiras' 201 $taskPayload
    $taskAfterCreate = [DateTimeOffset]::UtcNow
    $taskFixture1 = [ordered]@{ id = $taskFirst.Json.id; nome = $taskFirstName; localizacao = $taskFirstLocation }
    Assert-CrudEntity $taskFirst.Json $taskFixture1 'POST fixture 1'
    $taskFirstTime = [DateTimeOffset]::Parse($taskFirst.Json.criadoEmUtc, [Globalization.CultureInfo]::InvariantCulture)
    Assert-Crud ($taskFirst.Json.id -ne 2147483000 -and $taskFirstTime -ge $taskBeforeCreate -and $taskFirstTime -le $taskAfterCreate) 'POST ignora ID/data extras e gera ID e criacao no intervalo real da requisicao'
    $taskFixture1['criadoEmUtc'] = $taskFirst.Json.criadoEmUtc
    $taskLocation = $taskFirst.Record.location
    Assert-Crud (-not [string]::IsNullOrWhiteSpace($taskLocation)) 'POST 201 fornece header Location'
    $taskLocationUri = [Uri]::new([Uri] $taskCurrent.Url, $taskLocation)
    Assert-Crud ($taskLocationUri.GetLeftPart([UriPartial]::Authority) -ceq $taskCurrent.Url -and $taskLocationUri.AbsolutePath -ceq "/api/geladeiras/$($taskFixture1.id)") 'Location aponta ao ID criado na mesma instancia isolada'
    $taskLocated = Invoke-CrudRequest $taskCurrent 'GET' $taskLocationUri.PathAndQuery 200
    Assert-CrudEntity $taskLocated.Json $taskFixture1 'GET pelo Location'

    $taskReport.phase = 'POST fixture 2 com localizacao omitida'
    $taskSecondName = 'FIXTURE HTTP - Unidade 2'
    $taskSecond = Invoke-CrudRequest $taskCurrent 'POST' '/api/geladeiras' 201 (@{ nome = $taskSecondName } | ConvertTo-Json -Compress)
    $taskFixture2 = [ordered]@{ id = $taskSecond.Json.id; nome = $taskSecondName; localizacao = $null }
    Assert-CrudEntity $taskSecond.Json $taskFixture2 'POST fixture 2'
    Assert-Crud ($taskFixture2.id -ne $taskFixture1.id) 'As duas fixtures recebem IDs distintos'
    $taskFixture2['criadoEmUtc'] = $taskSecond.Json.criadoEmUtc
    $taskReport.fixtures = @($taskFixture1, $taskFixture2)
    Assert-CrudState $taskCurrent @($taskFixture1, $taskFixture2) 'Duas fixtures persistidas'

    $taskReport.phase = 'PUT normalizacao e protecao de ID/criacao'
    $taskEditedName = 'FIXTURE HTTP - Ação revisada'
    $taskEditedLocation = 'Área de teste — Câmara 2'
    $taskEdited = Invoke-CrudRequest $taskCurrent 'PUT' "/api/geladeiras/$($taskFixture1.id)" 200 (@{
        nome = "  $taskEditedName  "
        localizacao = "$([char]0x00A0) $taskEditedLocation $([char]0x2003)"
        id = 2147483001
        criadoEmUtc = '2001-01-01T00:00:00Z'
    } | ConvertTo-Json -Compress)
    $taskFixture1.nome = $taskEditedName
    $taskFixture1.localizacao = $taskEditedLocation
    Assert-CrudEntity $taskEdited.Json $taskFixture1 'PUT preserva ID e data originais e normaliza campos editaveis'
    foreach ($optional in @(
        @{ label = 'localizacao explicitamente nula'; body = @{ nome = $taskSecondName; localizacao = $null } },
        @{ label = 'localizacao omitida'; body = @{ nome = $taskSecondName } }
    )) {
        $taskReport.phase = 'PUT ' + $optional.label
        $taskOptional = Invoke-CrudRequest $taskCurrent 'PUT' "/api/geladeiras/$($taskFixture2.id)" 200 ($optional.body | ConvertTo-Json -Compress)
        Assert-CrudEntity $taskOptional.Json $taskFixture2 ('PUT ' + $optional.label)
    }
    Assert-CrudState $taskCurrent @($taskFixture1, $taskFixture2) 'Edicoes confirmadas por GET e health'

    $taskInvalid = @(
        @{ label = 'nome ausente'; body = '{}'; field = 'Nome' },
        @{ label = 'nome nulo'; body = '{"nome":null}'; field = 'Nome' },
        @{ label = 'nome vazio'; body = '{"nome":""}'; field = 'Nome' },
        @{ label = 'nome so espacos ASCII'; body = (@{ nome = " `t`r`n " } | ConvertTo-Json -Compress); field = 'Nome' },
        @{ label = 'nome so espacos Unicode'; body = (@{ nome = "$([char]0x2003)$([char]0x00A0)$([char]0x2009)" } | ConvertTo-Json -Compress); field = 'Nome' },
        @{ label = 'nome com 101 caracteres'; body = (@{ nome = ('N' * 101) } | ConvertTo-Json -Compress); field = 'Nome' },
        @{ label = 'localizacao com 201 caracteres'; body = (@{ nome = 'FIXTURE HTTP INVALIDA'; localizacao = ('L' * 201) } | ConvertTo-Json -Compress); field = 'Localizacao' },
        @{ label = 'nome numerico'; body = '{"nome":42}'; field = '' },
        @{ label = 'nome objeto'; body = '{"nome":{}}'; field = '' },
        @{ label = 'nome array'; body = '{"nome":[]}'; field = '' },
        @{ label = 'localizacao numerica'; body = '{"nome":"FIXTURE HTTP INVALIDA","localizacao":42}'; field = '' },
        @{ label = 'localizacao objeto'; body = '{"nome":"FIXTURE HTTP INVALIDA","localizacao":{}}'; field = '' },
        @{ label = 'raiz array'; body = '[]'; field = '' },
        @{ label = 'JSON incompleto'; body = '{"nome":'; field = '' },
        @{ label = 'corpo vazio'; body = ''; field = '' },
        @{ label = 'raiz nula'; body = 'null'; field = '' }
    )
    foreach ($method in @('POST', 'PUT')) {
        $path = if ($method -eq 'POST') { '/api/geladeiras' } else { "/api/geladeiras/$($taskFixture1.id)" }
        foreach ($case in $taskInvalid) {
            $taskReport.phase = "$method invalido: $($case.label)"
            $invalidResponse = Invoke-CrudRequest $taskCurrent $method $path 400 $case.body
            Assert-CrudValidation $invalidResponse $case.field $taskReport.phase
            Assert-CrudState $taskCurrent @($taskFixture1, $taskFixture2) "$($taskReport.phase) nao altera nenhum cadastro"
        }
    }

    foreach ($identifier in @('0', '-1', 'texto-invalido', '2147483647')) {
        foreach ($method in @('GET', 'PUT', 'DELETE')) {
            $taskReport.phase = "$method ID ausente/invalido $identifier"
            if ($method -eq 'PUT') {
                $notFound = Invoke-CrudRequest $taskCurrent $method "/api/geladeiras/$identifier" 404 '{"nome":"FIXTURE HTTP NAO DEVE SER CRIADA"}'
            }
            else { $notFound = Invoke-CrudRequest $taskCurrent $method "/api/geladeiras/$identifier" 404 }
            Assert-CrudState $taskCurrent @($taskFixture1, $taskFixture2) "$($taskReport.phase) preserva as duas fixtures"
        }
    }

    $taskReport.phase = 'persistencia apos reinicio do processo'
    Stop-CrudApi $taskCurrent
    $taskCurrent = Start-CrudApi 'Development' $taskDatabase 'restart'
    Wait-CrudApi $taskCurrent
    Assert-CrudState $taskCurrent @($taskFixture1, $taskFixture2) 'Reinicio no mesmo arquivo preserva lista, campos e contagem'
    foreach ($fixture in @($taskFixture1, $taskFixture2)) {
        $reopened = Invoke-CrudRequest $taskCurrent 'GET' "/api/geladeiras/$($fixture.id)" 200
        Assert-CrudEntity $reopened.Json $fixture 'GET por ID depois de encerrar e reiniciar a API'
    }

    $taskReport.phase = 'migration inicial aplicada uma vez'
    $taskMigrations = @(& $script:IceplayDotnet ef migrations list --project $taskProject --no-build --connection "Data Source=$taskDatabase" --no-color 2>&1)
    $taskMigrationExitCode = $LASTEXITCODE
    $taskMigrations | Set-Content -LiteralPath (Join-Path $taskEvidenceDirectory 'crud-migrations-list.log') -Encoding utf8
    Assert-Crud ($taskMigrationExitCode -eq 0) 'dotnet-ef consulta migrations do arquivo isolado sem falhar'
    $taskMigrationLines = @($taskMigrations | ForEach-Object { $_.ToString().Trim() } | Where-Object { $_ -match '^\d{14}_' })
    $taskExpectedMigrations = @(Get-ChildItem -LiteralPath (Join-Path $taskRoot 'src/Iceplay.Api/Migrations') -File |
        Where-Object { $_.Name -match '^\d{14}_.+\.cs$' -and $_.Name -notlike '*.Designer.cs' } |
        Sort-Object Name | ForEach-Object BaseName)
    Assert-Crud ($taskExpectedMigrations.Count -gt 0 -and $taskExpectedMigrations[0] -ceq '20261013172101_InitialCreate' -and
        ($taskMigrationLines -join ',') -ceq ($taskExpectedMigrations -join ',')) 'Arquivo isolado possui InitialCreate e todas as migrations do projeto aplicadas, sem pendencias'
    $taskReport.migration = $taskMigrationLines[0]
    $taskReport['migrations'] = $taskMigrationLines

    foreach ($fixture in @($taskFixture1, $taskFixture2)) {
        $taskReport.phase = "DELETE fixture ID $($fixture.id)"
        $deleted = Invoke-CrudRequest $taskCurrent 'DELETE' "/api/geladeiras/$($fixture.id)" 204
        $remaining = if ($fixture.id -eq $taskFixture1.id) { @($taskFixture2) } else { @() }
        Assert-CrudState $taskCurrent $remaining 'Exclusao remove somente a fixture indicada'
        foreach ($method in @('GET', 'PUT', 'DELETE')) {
            $taskReport.phase = "$method repetido depois de excluir ID $($fixture.id)"
            if ($method -eq 'PUT') {
                $repeated = Invoke-CrudRequest $taskCurrent $method "/api/geladeiras/$($fixture.id)" 404 '{"nome":"FIXTURE HTTP NAO DEVE RESSURGIR"}'
            }
            else { $repeated = Invoke-CrudRequest $taskCurrent $method "/api/geladeiras/$($fixture.id)" 404 }
            Assert-CrudState $taskCurrent $remaining 'Operacao repetida nao ressuscita cadastro nem afeta outra fixture'
        }
    }
    $taskReport.finalRefrigeratorCount = 0
    Stop-CrudApi $taskCurrent

    # Production nao aplica migrations: o erro e provocado em OUTRO arquivo isolado.
    $taskReport.phase = 'falha controlada de schema em Production'
    $taskBroken = Start-CrudApi 'Production' (Join-Path $taskRunDirectory 'without-schema.db') 'missing-schema'
    Wait-CrudApi $taskBroken
    foreach ($method in @('GET', 'POST', 'PUT', 'DELETE')) {
        $path = if ($method -eq 'POST' -or $method -eq 'GET') { '/api/geladeiras' } else { '/api/geladeiras/1' }
        $taskReport.phase = "503 generico: $method $path"
        if ($method -in @('POST', 'PUT')) {
            $unavailable = Invoke-CrudRequest $taskBroken $method $path 503 '{"nome":"FIXTURE HTTP SEM SCHEMA"}'
        }
        else { $unavailable = Invoke-CrudRequest $taskBroken $method $path 503 }
        Assert-Crud ($unavailable.Record.contentType -match '^application/problem\+json(?:;|$)' -and $unavailable.Json.status -eq 503 -and -not [string]::IsNullOrWhiteSpace($unavailable.Json.title)) 'Falha de banco responde ProblemDetails 503 com tipo correto'
        Assert-Crud ($unavailable.Record.responseBody -notmatch 'Exception|System\.|Microsoft\.|\.db|Data Source|[A-Z]:\\|no such table|SELECT|Sqlite') 'ProblemDetails nao divulga excecao, SQL nem caminho interno'
    }
    $taskReport.phase = '503 generico: GET por ID'
    $unavailableById = Invoke-CrudRequest $taskBroken 'GET' '/api/geladeiras/1' 503
    Assert-Crud ($unavailableById.Record.contentType -match '^application/problem\+json(?:;|$)' -and $unavailableById.Json.status -eq 503 -and $unavailableById.Record.responseBody -notmatch 'Exception|System\.|Microsoft\.|\.db|Data Source|[A-Z]:\\|no such table|SELECT|Sqlite') 'GET por ID tambem preserva ProblemDetails generico na indisponibilidade'
    Stop-CrudApi $taskBroken
    $taskReport.phase = 'concluido'
    $taskReport.result = 'passed'
}
catch {
    $taskFailure = $_
    $taskErrors.Add($_.Exception.Message)
}
finally {
    foreach ($instance in $taskProcesses) {
        try { Stop-CrudApi $instance }
        catch {
            $taskErrors.Add("Falha ao encerrar/salvar log de $($instance.Label): $($_.Exception.Message)")
            $taskReport.result = 'failed'
        }
    }
    $taskReport.lastActionAtUtc = [DateTime]::UtcNow.ToString('o')
    $taskReport.finishedAtUtc = [DateTime]::UtcNow.ToString('o')
    $taskReport.checkCount = $taskChecks.Count
    $taskReport | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $taskEvidenceDirectory 'crud-api.json') -Encoding utf8
    if ($taskLocationPushed) { Pop-Location }
}
if ($null -ne $taskFailure) { throw $taskFailure }
if ($taskErrors.Count -gt 0) { throw 'A verificacao falhou ao encerrar seus processos ou salvar logs. Consulte crud-api.json.' }
Write-Host "CRUD verificado: $($taskChecks.Count) verificacoes aprovadas. Relatorio: $(Join-Path $taskEvidenceDirectory 'crud-api.json')"
Write-Host "Banco isolado, agora vazio: $taskDatabase"
