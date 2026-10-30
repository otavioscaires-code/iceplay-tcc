#Requires -Version 7.5
# Fixtures de software em banco isolado; nenhuma medicao fisica e representada.
[CmdletBinding()]
param([string] $EvidenceDirectory = 'docs/evidencias/nova-revisao/historico')

. (Join-Path $PSScriptRoot 'common.ps1')
$historyRun = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$historyDirectory = Join-Path $script:IceplayRoot ".tools/verification/historico-$historyRun"
$historyEvidence = [IO.Path]::GetFullPath($EvidenceDirectory, $script:IceplayRoot)
New-Item -ItemType Directory -Path $historyDirectory,$historyEvidence -Force | Out-Null
$historyDatabase = Join-Path $historyDirectory 'iceplay.db'
$historyChecks = [Collections.Generic.List[string]]::new()
$historyRequests = [Collections.Generic.List[object]]::new()
$historyProcesses = [Collections.Generic.List[object]]::new()
$historyReport = [ordered]@{result='failed';startedAtUtc=[DateTime]::UtcNow.ToString('o');finishedAtUtc=$null;
    scope='Historico HTTP/SQLite isolado; Hardware e somente origem declarada de fixture';
    isolatedDatabase=$historyDatabase;checks=$historyChecks;requests=$historyRequests;errors=@();checkCount=0}

function Assert-History([bool]$condition,[string]$description) {
    if (-not $condition) { throw "FALHOU: $description" }
    $historyChecks.Add($description)
    Write-Host "PASSOU: $description"
}
function Start-HistoryApi([string]$environment,[string]$database,[string]$label) {
    $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
    $listener.Start(); $port=$listener.LocalEndpoint.Port; $listener.Stop()
    $start=[Diagnostics.ProcessStartInfo]::new()
    $start.FileName=$script:IceplayDotnet; $start.WorkingDirectory=$script:IceplayRoot
    $start.UseShellExecute=$false; $start.CreateNoWindow=$true
    $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
    foreach ($argument in @('run','--project','src/Iceplay.Api/Iceplay.Api.csproj','--no-build','--no-restore','--no-launch-profile','--','--urls',"http://127.0.0.1:$port")) { $start.ArgumentList.Add($argument) }
    $null=$start.Environment.Remove('ICEPLAY_MOBILE_CONFIG')
    $start.Environment['ASPNETCORE_ENVIRONMENT']=$environment
    $start.Environment['DOTNET_ENVIRONMENT']=$environment
    $start.Environment['ConnectionStrings__Iceplay']="Data Source=$database"
    $process=[Diagnostics.Process]::Start($start)
    $instance=[pscustomobject]@{Process=$process;Output=$process.StandardOutput.ReadToEndAsync();Error=$process.StandardError.ReadToEndAsync();Url="http://127.0.0.1:$port";Label=$label;Stopped=$false}
    $historyProcesses.Add($instance)
    $deadline=[DateTime]::UtcNow.AddSeconds(45)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($process.HasExited) { throw "API encerrou: $label" }
        try { $null=Invoke-WebRequest ($instance.Url+'/api/health') -TimeoutSec 2 -SkipHttpErrorCheck; return $instance }
        catch { Start-Sleep -Milliseconds 200 }
    }
    throw "API nao respondeu: $label"
}
function Stop-HistoryApi($instance) {
    if ($instance.Stopped) { return }
    if (-not $instance.Process.HasExited) { $instance.Process.Kill($true); $null=$instance.Process.WaitForExit(10000) }
    $instance.Output.GetAwaiter().GetResult() | Set-Content (Join-Path $historyEvidence "historico-$($instance.Label).stdout.log") -Encoding utf8
    $instance.Error.GetAwaiter().GetResult() | Set-Content (Join-Path $historyEvidence "historico-$($instance.Label).stderr.log") -Encoding utf8
    $instance.Stopped=$true
}
function Invoke-HistoryRequest($instance,[string]$method,[string]$path,[int]$expected,$body=$null) {
    $options=@{Uri=$instance.Url+$path;Method=$method;TimeoutSec=10;SkipHttpErrorCheck=$true}
    $payload=$null
    if ($null -ne $body) { $payload=$body | ConvertTo-Json -Compress -Depth 6; $options.Body=$payload; $options.ContentType='application/json; charset=utf-8' }
    $response=Invoke-WebRequest @options
    $responseText=if($response.Content -is [byte[]]){[Text.Encoding]::UTF8.GetString($response.Content)}else{[string]$response.Content}
    $historyRequests.Add([ordered]@{atUtc=[DateTime]::UtcNow.ToString('o');method=$method;path=$path;expectedStatus=$expected;actualStatus=[int]$response.StatusCode;requestBody=$payload;responseBody=$responseText})
    Assert-History ($response.StatusCode -eq $expected) "$method $path retorna $expected"
    if ($expected -eq 204) { Assert-History ([string]::IsNullOrEmpty($responseText)) '204 nao possui corpo'; return }
    return ConvertFrom-Json -InputObject $responseText -AsHashtable -DateKind String -NoEnumerate
}
function Assert-HistoryIds($page,[int[]]$ids,[long]$total,[long]$pages) {
    $received=@($page.itens | ForEach-Object { [int]$_.id })
    Assert-History (($received -join ',') -ceq ($ids -join ',')) 'Pagina possui exatamente os IDs esperados na ordem de medicao e desempate'
    Assert-History ($page.totalItens -eq $total -and $page.totalPaginas -eq $pages) 'Contagem e total de paginas correspondem ao filtro'
}
function Get-HistoryDatabaseSnapshot {
    $inspection=@'
import sqlite3,sys,json,hashlib
from pathlib import Path
c=sqlite3.connect(Path(sys.argv[1]).resolve().as_uri()+'?mode=ro',uri=True)
assert c.execute('PRAGMA integrity_check').fetchall()==[('ok',)]
assert c.execute('PRAGMA foreign_key_check').fetchall()==[]
tables=['Geladeiras','Leituras','__EFMigrationsHistory']
rows={t:c.execute('SELECT * FROM "'+t+'" ORDER BY 1').fetchall() for t in tables}
print(json.dumps({'integrity':'ok','counts':{t:len(v) for t,v in rows.items()},'sha256':hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest()}))
c.close()
'@
    $result=@(& python -c $inspection $historyDatabase)
    Assert-History ($LASTEXITCODE -eq 0) 'SQLite isolado possui integridade e chaves estrangeiras validas'
    return ($result -join [Environment]::NewLine) | ConvertFrom-Json -AsHashtable
}

$historyFailure=$null
Push-Location $script:IceplayRoot
try {
    & $script:IceplayDotnet build Iceplay.slnx --no-restore *>&1 | Set-Content (Join-Path $historyEvidence 'build.log') -Encoding utf8
    Assert-History ($LASTEXITCODE -eq 0) 'Build sem restauracao termina com codigo zero'
    $api=Start-HistoryApi 'Development' $historyDatabase 'startup'
    $a=Invoke-HistoryRequest $api 'POST' '/api/geladeiras' 201 @{nome='FIXTURE HISTORICO - A';localizacao='BANCO ISOLADO'}
    $b=Invoke-HistoryRequest $api 'POST' '/api/geladeiras' 201 @{nome='FIXTURE HISTORICO - B'}
    $empty=Invoke-HistoryRequest $api 'POST' '/api/geladeiras' 201 @{nome='FIXTURE HISTORICO - SEM LEITURAS'}
    $base="/api/leituras?geladeiraId=$($a.id)&origem=Simulacao"
    $zero=Invoke-HistoryRequest $api 'GET' $base 200
    Assert-HistoryIds $zero @() 0 0
    Assert-History ($zero.pagina -eq 1 -and $zero.tamanhoPagina -eq 50 -and $zero.geladeiraId -eq $a.id -and $zero.origem -ceq 'Simulacao' -and $null -eq $zero.inicioUtc -and $null -eq $zero.fimUtc) 'Resposta vazia possui defaults e filtros explicitos'
    # Instantes fixos de fixture anteriores ao desenvolvimento; nao representam coleta real.
    $old=Invoke-HistoryRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=10;portaAberta=$true;medidoEmUtc='2026-10-01T10:00:00Z';origem='Simulacao'}
    $boundary=Invoke-HistoryRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=0;portaAberta=$false;medidoEmUtc='2026-10-01T11:00:00.1234567Z';origem='Simulacao'}
    $tie=Invoke-HistoryRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=-1;portaAberta=$true;medidoEmUtc=$boundary.medidoEmUtc;origem='Simulacao'}
    $latest=Invoke-HistoryRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=4;portaAberta=$true;medidoEmUtc='2026-10-01T12:00:00Z';origem='Simulacao'}
    $late=Invoke-HistoryRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=99;portaAberta=$true;medidoEmUtc='2026-10-01T09:00:00Z';origem='Simulacao'}
    $hw=Invoke-HistoryRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=7;portaAberta=$true;medidoEmUtc='2026-10-01T12:00:00Z';origem='Hardware'}
    $other=Invoke-HistoryRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$b.id;temperaturaC=8;portaAberta=$false;medidoEmUtc='2026-10-01T12:00:00Z';origem='Simulacao'}
    $before=Get-HistoryDatabaseSnapshot
    Assert-History ($before.counts.Geladeiras -eq 3 -and $before.counts.Leituras -eq 7) 'Somente as tres geladeiras e sete leituras fixture foram gravadas'
    $all=Invoke-HistoryRequest $api 'GET' $base 200
    Assert-HistoryIds $all @($latest.id,$tie.id,$boundary.id,$old.id,$late.id) 5 1
    $zeroValue=@($all.itens | Where-Object id -eq $boundary.id)[0]
    Assert-History ($zeroValue.temperaturaC -eq 0 -and $zeroValue.portaAberta -eq $false -and $zeroValue.medidoEmUtc.EndsWith('Z') -and $zeroValue.recebidoEmUtc.EndsWith('Z')) 'Historico preserva zero, false e dois timestamps UTC'
    Assert-History ($late.id -gt $latest.id -and $all.itens[-1].id -eq $late.id) 'Medicao atrasada recebida depois permanece no final temporal'
    $page1=Invoke-HistoryRequest $api 'GET' ($base+'&tamanhoPagina=2') 200
    $page2=Invoke-HistoryRequest $api 'GET' ($base+'&tamanhoPagina=2&pagina=2') 200
    $page3=Invoke-HistoryRequest $api 'GET' ($base+'&tamanhoPagina=2&pagina=3') 200
    Assert-HistoryIds $page1 @($latest.id,$tie.id) 5 3
    Assert-HistoryIds $page2 @($boundary.id,$old.id) 5 3
    Assert-HistoryIds $page3 @($late.id) 5 3
    $beyond=Invoke-HistoryRequest $api 'GET' ($base+'&tamanhoPagina=2&pagina=4') 200
    Assert-HistoryIds $beyond @() 5 3
    $maximum=Invoke-HistoryRequest $api 'GET' ($base+'&tamanhoPagina=100') 200
    Assert-HistoryIds $maximum @($latest.id,$tie.id,$boundary.id,$old.id,$late.id) 5 1
    $largePage=Invoke-HistoryRequest $api 'GET' ($base+'&tamanhoPagina=1&pagina=2147483647') 200
    Assert-HistoryIds $largePage @() 5 5
    $hardware=Invoke-HistoryRequest $api 'GET' "/api/leituras?geladeiraId=$($a.id)&origem=Hardware" 200
    Assert-HistoryIds $hardware @($hw.id) 1 1
    Assert-History ($hardware.itens[0].origem -ceq 'Hardware') 'Origem Hardware declarada da fixture nao mistura simulacao'
    $another=Invoke-HistoryRequest $api 'GET' "/api/leituras?geladeiraId=$($b.id)&origem=Simulacao" 200
    Assert-HistoryIds $another @($other.id) 1 1
    $noReadings=Invoke-HistoryRequest $api 'GET' "/api/leituras?geladeiraId=$($empty.id)&origem=Hardware" 200
    Assert-HistoryIds $noReadings @() 0 0
    $exact=[Uri]::EscapeDataString($boundary.medidoEmUtc)
    $inclusive=Invoke-HistoryRequest $api 'GET' ($base+"&inicioUtc=$exact&fimUtc=$exact") 200
    Assert-HistoryIds $inclusive @($tie.id,$boundary.id) 2 1
    Assert-History ([DateTimeOffset]::Parse($inclusive.inicioUtc) -eq [DateTimeOffset]::Parse($boundary.medidoEmUtc) -and $inclusive.inicioUtc -ceq $inclusive.fimUtc) 'Filtros inclusivos retornam os instantes efetivamente usados'
    $from=Invoke-HistoryRequest $api 'GET' ($base+'&inicioUtc=2026-10-01T12%3A00%3A00Z') 200
    Assert-HistoryIds $from @($latest.id) 1 1
    $until=Invoke-HistoryRequest $api 'GET' ($base+'&fimUtc=2026-10-01T10%3A00%3A00Z') 200
    Assert-HistoryIds $until @($old.id,$late.id) 2 1
    $outside=Invoke-HistoryRequest $api 'GET' ($base+'&inicioUtc=2026-10-02T00%3A00%3A00Z') 200
    Assert-HistoryIds $outside @() 0 0
    foreach ($fraction in @('','.1','.12','.123','.1234','.12345','.123456','.1234567')) {
        $stamp=[Uri]::EscapeDataString("2026-10-01T11:00:00${fraction}Z")
        $null=Invoke-HistoryRequest $api 'GET' ($base+"&inicioUtc=$stamp") 200
    }
    $single=Invoke-HistoryRequest $api 'GET' "/api/leituras/$($boundary.id)" 200
    Assert-History ($single.id -eq $boundary.id -and $single.origem -ceq 'Simulacao') 'Consulta por ID existente permanece disponivel'
    foreach ($query in @('', '?origem=Simulacao', '?geladeiraId=1', '?geladeiraId=0&origem=Simulacao', '?geladeiraId=-1&origem=Simulacao', '?geladeiraId=abc&origem=Simulacao', '?geladeiraId=2147483648&origem=Simulacao', "?geladeiraId=$($a.id)&origem=hardware", "?geladeiraId=$($a.id)&origem=0", "?geladeiraId=$($a.id)&origem=", "?geladeiraId=$($a.id)&origem=%20")) {
        $invalid=Invoke-HistoryRequest $api 'GET' "/api/leituras$query" 400
        Assert-History ($invalid.status -eq 400 -and $invalid.errors.Count -gt 0) 'Filtros obrigatorios invalidos retornam ValidationProblemDetails'
    }
    foreach ($suffix in @('&pagina=0','&pagina=-1','&pagina=abc','&pagina=2147483648','&tamanhoPagina=0','&tamanhoPagina=-1','&tamanhoPagina=101','&tamanhoPagina=abc','&pagina=2147483647&tamanhoPagina=100','&inicioUtc=2026-10-01','&inicioUtc=2026-10-01T11%3A00%3A00','&inicioUtc=2026-10-01T11%3A00%3A00%2B00%3A00','&inicioUtc=2026-10-01T11%3A00%3A00.12345678Z','&inicioUtc=2026-02-30T11%3A00%3A00Z','&fimUtc=errado','&inicioUtc=2026-10-02T00%3A00%3A00Z&fimUtc=2026-10-01T00%3A00%3A00Z')) {
        $invalid=Invoke-HistoryRequest $api 'GET' ($base+$suffix) 400
        Assert-History ($invalid.status -eq 400 -and $invalid.errors.Count -gt 0) 'Periodo ou paginacao invalida retorna 400 sem consulta ampla'
    }
    foreach ($suffix in @('&inicioUtc=','&fimUtc=','&pagina=','&tamanhoPagina=')) {
        $invalid=Invoke-HistoryRequest $api 'GET' ($base+$suffix) 400
        Assert-History ($invalid.status -eq 400 -and $invalid.errors.Count -gt 0) 'Parametro presente mas vazio nao equivale a filtro omitido'
    }
    $missing=Invoke-HistoryRequest $api 'GET' '/api/leituras?geladeiraId=2147483647&origem=Simulacao' 404
    Assert-History ($missing.status -eq 404) 'Equipamento inexistente recebe 404, distinto de historico vazio'
    $after=Get-HistoryDatabaseSnapshot
    Assert-History ($before.sha256 -ceq $after.sha256) 'Consultas validas e invalidas nao modificam dados nem migrations'
    Stop-HistoryApi $api
    $api=Start-HistoryApi 'Development' $historyDatabase 'restart'
    $restarted=Invoke-HistoryRequest $api 'GET' $base 200
    Assert-History (($all | ConvertTo-Json -Depth 8 -Compress) -ceq ($restarted | ConvertTo-Json -Depth 8 -Compress)) 'Reinicio real preserva exatamente contrato, filtros e leituras do historico'
    Stop-HistoryApi $api
    $broken=Start-HistoryApi 'Production' (Join-Path $historyDirectory 'without-schema.db') 'missing-schema'
    $unavailable=Invoke-HistoryRequest $broken 'GET' '/api/leituras?geladeiraId=1&origem=Simulacao' 503
    Assert-History ($unavailable.status -eq 503 -and ($unavailable | ConvertTo-Json) -notmatch 'Exception|SELECT|\.db|no such table|Microsoft\.') 'Falha real de esquema retorna 503 generico sem caminhos ou SQL'
    Stop-HistoryApi $broken
    $final=Get-HistoryDatabaseSnapshot
    Assert-History ($before.sha256 -ceq $final.sha256) 'Reinicio preserva conteudo logico do SQLite isolado'
    $historyReport['finalDatabase']=$final
    $historyReport.result='passed'
} catch {
    $historyFailure=$_
    $historyReport.errors=@($_.Exception.Message)
} finally {
    foreach ($instance in $historyProcesses) {
        try { Stop-HistoryApi $instance } catch { $historyReport.result='failed'; $historyReport.errors+=@($_.Exception.Message) }
    }
    $historyReport.checkCount=$historyChecks.Count
    $historyReport.finishedAtUtc=[DateTime]::UtcNow.ToString('o')
    $historyReport | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $historyEvidence 'historico-api.json') -Encoding utf8
    Pop-Location
}
if ($historyFailure) { throw $historyFailure }
if ($historyReport.result -ne 'passed') { throw 'Falha ao concluir verificacao; consulte historico-api.json' }
Write-Host "Historico verificado: $($historyChecks.Count) assercoes; $($historyRequests.Count) requisicoes HTTP registradas."
