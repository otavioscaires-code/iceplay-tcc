#Requires -Version 7.5
# Somente fixtures identificadas em banco isolado; nunca usa o banco normal.
[CmdletBinding()]
param([string] $EvidenceDirectory = 'docs/evidencias/2026-10-19-painel')

. (Join-Path $PSScriptRoot 'common.ps1')
$panelRun = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$panelDirectory = Join-Path $script:IceplayRoot ".tools/verification/painel-$panelRun"
$panelEvidence = [IO.Path]::GetFullPath($EvidenceDirectory, $script:IceplayRoot)
New-Item -ItemType Directory -Path $panelDirectory,$panelEvidence -Force | Out-Null
$panelDatabase = Join-Path $panelDirectory 'iceplay.db'
$panelChecks = [Collections.Generic.List[string]]::new()
$panelRequests = [Collections.Generic.List[object]]::new()
$panelProcesses = [Collections.Generic.List[object]]::new()
$panelReport = [ordered]@{ result='failed'; startedAtUtc=[DateTime]::UtcNow.ToString('o'); finishedAtUtc=$null;
    scope='Painel, API e fixtures de software; Hardware e apenas rotulo declarado de teste';
    isolatedDatabase=$panelDatabase; checks=$panelChecks; requests=$panelRequests; errors=@(); checkCount=0; finalDatabase=$null }

function Assert-Panel([bool]$condition,[string]$description) {
    if (-not $condition) { throw "FALHOU: $description" }
    $panelChecks.Add($description)
    Write-Host "PASSOU: $description"
}
function Start-PanelApi([string]$environment,[string]$database,[string]$label) {
    $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
    $listener.Start(); $port=$listener.LocalEndpoint.Port; $listener.Stop()
    $start=[Diagnostics.ProcessStartInfo]::new()
    $start.FileName=$script:IceplayDotnet; $start.WorkingDirectory=$script:IceplayRoot
    $start.UseShellExecute=$false; $start.CreateNoWindow=$true
    $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
    foreach ($argument in @('run','--project','src/Iceplay.Api/Iceplay.Api.csproj','--no-build','--no-restore','--no-launch-profile','--','--urls',"http://127.0.0.1:$port")) { $start.ArgumentList.Add($argument) }
    $start.Environment['ASPNETCORE_ENVIRONMENT']=$environment
    $start.Environment['DOTNET_ENVIRONMENT']=$environment
    $start.Environment['ConnectionStrings__Iceplay']="Data Source=$database"
    $process=[Diagnostics.Process]::Start($start)
    $instance=[pscustomobject]@{Process=$process;Output=$process.StandardOutput.ReadToEndAsync();Error=$process.StandardError.ReadToEndAsync();Url="http://127.0.0.1:$port";Label=$label;Stopped=$false}
    $panelProcesses.Add($instance)
    $deadline=[DateTime]::UtcNow.AddSeconds(45)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($process.HasExited) { throw "API encerrou: $label" }
        try { $null=Invoke-WebRequest ($instance.Url+'/api/health') -TimeoutSec 2 -SkipHttpErrorCheck; return $instance }
        catch { Start-Sleep -Milliseconds 200 }
    }
    throw "API nao respondeu: $label"
}
function Stop-PanelApi($instance) {
    if ($instance.Stopped) { return }
    if (-not $instance.Process.HasExited) { $instance.Process.Kill($true); $null=$instance.Process.WaitForExit(10000) }
    $instance.Output.GetAwaiter().GetResult() | Set-Content (Join-Path $panelEvidence "painel-$($instance.Label).stdout.log") -Encoding utf8
    $instance.Error.GetAwaiter().GetResult() | Set-Content (Join-Path $panelEvidence "painel-$($instance.Label).stderr.log") -Encoding utf8
    $instance.Stopped=$true
}
function Invoke-PanelRequest($instance,[string]$method,[string]$path,[int]$expected,$body=$null) {
    $requestOptions=@{Uri=$instance.Url+$path;Method=$method;TimeoutSec=10;SkipHttpErrorCheck=$true}
    $payload=$null
    if ($null -ne $body) { $payload=$body | ConvertTo-Json -Compress -Depth 6; $requestOptions.Body=$payload; $requestOptions.ContentType='application/json; charset=utf-8' }
    $response=Invoke-WebRequest @requestOptions
    $text=if($response.Content -is [byte[]]){[Text.Encoding]::UTF8.GetString($response.Content)}else{[string]$response.Content}
    $panelRequests.Add([ordered]@{atUtc=[DateTime]::UtcNow.ToString('o');method=$method;path=$path;expectedStatus=$expected;actualStatus=[int]$response.StatusCode;requestBody=$payload;responseBody=$text})
    Assert-Panel ($response.StatusCode -eq $expected) "$method $path retorna $expected"
    if ($expected -eq 204) { Assert-Panel ([string]::IsNullOrEmpty($text)) 'DELETE 204 nao tem corpo'; return }
    return ConvertFrom-Json -InputObject $text -AsHashtable -DateKind String -NoEnumerate
}
function Assert-PanelReading($snapshot,[int]$parent,[int]$reading,[double]$temperature,[bool]$door,[string]$origin) {
    $item=@($snapshot.geladeiras | Where-Object id -eq $parent)
    Assert-Panel ($item.Count -eq 1) "Painel contem uma unica geladeira $parent"
    $value=$item[0].ultimaLeitura
    Assert-Panel ($null -ne $value -and $value.id -eq $reading -and $value.temperaturaC -eq $temperature -and $value.portaAberta -eq $door -and $value.origem -ceq $origin) 'Ultima leitura, zero/false, porta e origem correspondem ao SQLite'
    Assert-Panel ($value.medidoEmUtc.EndsWith('Z') -and $value.recebidoEmUtc.EndsWith('Z') -and $snapshot.consultadoEmUtc.EndsWith('Z')) 'Os dois timestamps e o horario da consulta sao UTC'
}

$panelFailure=$null
Push-Location $script:IceplayRoot
try {
    & $script:IceplayDotnet build Iceplay.slnx --no-restore *>&1 | Set-Content (Join-Path $panelEvidence 'build.log') -Encoding utf8
    Assert-Panel ($LASTEXITCODE -eq 0) 'Build sem restauracao termina com codigo zero'
    $api=Start-PanelApi 'Development' $panelDatabase 'startup'
    foreach ($origin in @('Simulacao','Hardware')) {
        $empty=Invoke-PanelRequest $api 'GET' "/api/monitoramento?origem=$origin" 200
        Assert-Panel ($empty.origem -ceq $origin -and $empty.geladeiras.Count -eq 0 -and $empty.consultadoEmUtc.EndsWith('Z')) 'Banco vazio devolve array vazio e origem explicita, sem dados ficticios'
    }
    foreach ($query in @('','?origem=','?origem=hardware','?origem=0','?origem=Outra','?origem=%20')) {
        $invalid=Invoke-PanelRequest $api 'GET' "/api/monitoramento$query" 400
        Assert-Panel ($invalid.status -eq 400 -and $invalid.errors.Count -gt 0) 'Origem ausente ou invalida recebe validacao 400'
    }
    $a=Invoke-PanelRequest $api 'POST' '/api/geladeiras' 201 @{nome='FIXTURE PAINEL - A';localizacao='BANCO ISOLADO'}
    $b=Invoke-PanelRequest $api 'POST' '/api/geladeiras' 201 @{nome='FIXTURE PAINEL - B'}
    $c=Invoke-PanelRequest $api 'POST' '/api/geladeiras' 201 @{nome='FIXTURE PAINEL - SEM LEITURAS'}
    $semLeituras=Invoke-PanelRequest $api 'GET' '/api/monitoramento?origem=Simulacao' 200
    Assert-Panel ($semLeituras.geladeiras.Count -eq 3 -and @($semLeituras.geladeiras | Where-Object {$null -ne $_.ultimaLeitura}).Count -eq 0) 'Equipamentos sem amostras permanecem com ultimaLeitura null'
    $measured=[DateTime]::UtcNow.AddSeconds(-30).ToString('o')
    $first=Invoke-PanelRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=10.25;portaAberta=$true;medidoEmUtc=[DateTime]::UtcNow.AddSeconds(-120).ToString('o');origem='Simulacao'}
    $second=Invoke-PanelRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=11.5;portaAberta=$false;medidoEmUtc=$first.medidoEmUtc;origem='Simulacao'}
    $tied=Invoke-PanelRequest $api 'GET' '/api/monitoramento?origem=Simulacao' 200
    Assert-PanelReading $tied $a.id $second.id 11.5 $false 'Simulacao'
    $newer=Invoke-PanelRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=0;portaAberta=$false;medidoEmUtc=$measured;origem='Simulacao'}
    $late=Invoke-PanelRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=99;portaAberta=$true;medidoEmUtc=[DateTime]::UtcNow.AddHours(-1).ToString('o');origem='Simulacao'}
    $ordered=Invoke-PanelRequest $api 'GET' '/api/monitoramento?origem=Simulacao' 200
    Assert-PanelReading $ordered $a.id $newer.id 0 $false 'Simulacao'
    Assert-Panel ($late.id -gt $newer.id) 'Leitura atrasada tem ID maior, mas nao substitui medicao mais recente'
    $hardware=Invoke-PanelRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=7.75;portaAberta=$true;medidoEmUtc=[DateTime]::UtcNow.AddSeconds(-5).ToString('o');origem='Hardware'}
    $sim=Invoke-PanelRequest $api 'GET' '/api/monitoramento?origem=Simulacao' 200
    $hw=Invoke-PanelRequest $api 'GET' '/api/monitoramento?origem=Hardware' 200
    Assert-PanelReading $sim $a.id $newer.id 0 $false 'Simulacao'
    Assert-PanelReading $hw $a.id $hardware.id 7.75 $true 'Hardware'
    Assert-Panel (@($hw.geladeiras | Where-Object {$_.id -in @($b.id,$c.id) -and $null -eq $_.ultimaLeitura}).Count -eq 2) 'Hardware selecionado nao reaproveita simulacao de outra origem'
    $simulated=@(& (Join-Path $script:IceplayRoot 'tools/simulator/enviar-leituras.ps1') -ApiUrl $api.Url -GeladeiraId $b.id -Quantidade 1 -IntervaloSegundos 0 -TemperaturaC -3.25 -PortaAberta)
    Assert-Panel ($simulated.Count -eq 1 -and $simulated[0].statusHttp -eq 201) 'Simulador existente envia amostra pela mesma API'
    $panelReport['simulatorResults']=$simulated
    $afterSimulator=Invoke-PanelRequest $api 'GET' '/api/monitoramento?origem=Simulacao' 200
    Assert-PanelReading $afterSimulator $b.id $simulated[0].leitura.id -3.25 $true 'Simulacao'
    $lastTie=Invoke-PanelRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$a.id;temperaturaC=4.5;portaAberta=$false;medidoEmUtc=$measured;origem='Simulacao'}
    $updated=Invoke-PanelRequest $api 'PUT' "/api/geladeiras/$($a.id)" 200 @{nome='FIXTURE PAINEL - A EDITADA';localizacao='BANCO ISOLADO'}
    $null=Invoke-PanelRequest $api 'DELETE' "/api/geladeiras/$($c.id)" 204
    $beforeRestart=Invoke-PanelRequest $api 'GET' '/api/monitoramento?origem=Simulacao' 200
    Assert-Panel ($beforeRestart.geladeiras.Count -eq 2 -and $beforeRestart.geladeiras[0].nome -ceq $updated.nome) 'Painel reflete edicao e exclusao de cadastro sem cache inventado'
    Assert-PanelReading $beforeRestart $a.id $lastTie.id 4.5 $false 'Simulacao'
    Stop-PanelApi $api
    $api=Start-PanelApi 'Development' $panelDatabase 'restart'
    $afterRestart=Invoke-PanelRequest $api 'GET' '/api/monitoramento?origem=Simulacao' 200
    Assert-Panel (($beforeRestart.geladeiras | ConvertTo-Json -Depth 6 -Compress) -ceq ($afterRestart.geladeiras | ConvertTo-Json -Depth 6 -Compress)) 'Reinicio real preserva cadastros e exatamente as mesmas ultimas leituras'
    $hwAfter=Invoke-PanelRequest $api 'GET' '/api/monitoramento?origem=Hardware' 200
    Assert-PanelReading $hwAfter $a.id $hardware.id 7.75 $true 'Hardware'
    foreach ($asset in @('/monitoramento.js','/monitoramento-estado.mjs')) {
        $assetResponse=Invoke-WebRequest ($api.Url+$asset) -TimeoutSec 5
        Assert-Panel ($assetResponse.StatusCode -eq 200 -and [string]$assetResponse.Headers['Content-Type'] -match 'javascript') "Modulo $asset servido com MIME JavaScript"
    }
    Stop-PanelApi $api
    $broken=Start-PanelApi 'Production' (Join-Path $panelDirectory 'without-schema.db') 'missing-schema'
    $unavailable=Invoke-PanelRequest $broken 'GET' '/api/monitoramento?origem=Simulacao' 503
    Assert-Panel ($unavailable.status -eq 503 -and ($unavailable | ConvertTo-Json) -notmatch 'Exception|SELECT|\.db|no such table|Microsoft\.') 'Falha real devolve 503 generico, sem SQL ou caminho interno'
    Stop-PanelApi $broken
    $databaseInspection=@'
import sqlite3,sys,json
from pathlib import Path
connection=sqlite3.connect(Path(sys.argv[1]).resolve().as_uri()+'?mode=ro',uri=True)
assert connection.execute('PRAGMA integrity_check').fetchall()==[('ok',)]
assert connection.execute('PRAGMA foreign_key_check').fetchall()==[]
counts=[connection.execute('SELECT COUNT(*) FROM Geladeiras').fetchone()[0],connection.execute('SELECT COUNT(*) FROM Leituras').fetchone()[0]]
assert counts==[2,7],counts
migrations=[r[0] for r in connection.execute('SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId')]
assert migrations==['20261013172101_InitialCreate','20261018023456_AddLeituras']
print(json.dumps({'integrity':'ok','geladeiras':counts[0],'leituras':counts[1],'migrations':migrations}))
connection.close()
'@
    $inspection=@(& python -c $databaseInspection $panelDatabase)
    Assert-Panel ($LASTEXITCODE -eq 0) 'SQLite confirma integridade, duas migrations e nenhuma insercao pelo GET'
    $panelReport.finalDatabase=($inspection -join [Environment]::NewLine) | ConvertFrom-Json
    $panelReport.result='passed'
} catch {
    $panelFailure=$_
    $panelReport.errors=@($_.Exception.Message)
} finally {
    foreach ($instance in $panelProcesses) {
        try { Stop-PanelApi $instance } catch { $panelReport.result='failed'; $panelReport.errors+=@($_.Exception.Message) }
    }
    $panelReport.checkCount=$panelChecks.Count
    $panelReport.finishedAtUtc=[DateTime]::UtcNow.ToString('o')
    $panelReport | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $panelEvidence 'monitoramento-api.json') -Encoding utf8
    Pop-Location
}
if ($panelFailure) { throw $panelFailure }
if ($panelReport.result -ne 'passed') { throw 'Falha ao concluir verificacao; consulte monitoramento-api.json' }
Write-Host "Painel verificado: $($panelChecks.Count) assercoes; $($panelRequests.Count) requisicoes HTTP registradas, alem do POST do simulador."
