#Requires -Version 7.5
# Verifica documentos/rotas reais via HTTP. Nao equivale a renderizacao de navegador.
[CmdletBinding()]
param([string] $EvidenceDirectory = 'docs/evidencias/nova-revisao/paginas')

. (Join-Path $PSScriptRoot 'common.ps1')
$pagesRun = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$pagesDirectory = Join-Path $script:IceplayRoot ".tools/verification/paginas-$pagesRun"
$pagesEvidence = [IO.Path]::GetFullPath($EvidenceDirectory, $script:IceplayRoot)
New-Item -ItemType Directory -Path $pagesDirectory,$pagesEvidence -Force | Out-Null
$pagesDatabase = Join-Path $pagesDirectory 'iceplay.db'
$pagesChecks = [Collections.Generic.List[string]]::new()
$pagesRequests = [Collections.Generic.List[object]]::new()
$pagesProcesses = [Collections.Generic.List[object]]::new()
$pagesReport = [ordered]@{result='failed';startedAtUtc=[DateTime]::UtcNow.ToString('o');finishedAtUtc=$null;
    scope='Documentos e navegacao HTTP independentes em banco isolado; sem renderizacao, viewport ou aparelho fisico';
    isolatedDatabase=$pagesDatabase;checks=$pagesChecks;requests=$pagesRequests;errors=@();checkCount=0}

function Assert-Pages([bool]$condition,[string]$description) {
    if (-not $condition) { throw "FALHOU: $description" }
    $pagesChecks.Add($description)
    Write-Host "PASSOU: $description"
}
function Start-PagesApi([string]$label) {
    $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
    $listener.Start(); $port=$listener.LocalEndpoint.Port; $listener.Stop()
    $start=[Diagnostics.ProcessStartInfo]::new()
    $start.FileName=$script:IceplayDotnet; $start.WorkingDirectory=$script:IceplayRoot
    $start.UseShellExecute=$false; $start.CreateNoWindow=$true
    $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
    foreach ($argument in @('run','--project','src/Iceplay.Api/Iceplay.Api.csproj','--no-build','--no-restore','--no-launch-profile','--','--urls',"http://127.0.0.1:$port")) { $start.ArgumentList.Add($argument) }
    $null=$start.Environment.Remove('ICEPLAY_MOBILE_CONFIG')
    $start.Environment['ASPNETCORE_ENVIRONMENT']='Development'
    $start.Environment['DOTNET_ENVIRONMENT']='Development'
    $start.Environment['ConnectionStrings__Iceplay']="Data Source=$pagesDatabase"
    $process=[Diagnostics.Process]::Start($start)
    $instance=[pscustomobject]@{Process=$process;Output=$process.StandardOutput.ReadToEndAsync();Error=$process.StandardError.ReadToEndAsync();Url="http://127.0.0.1:$port";Label=$label;Stopped=$false}
    $pagesProcesses.Add($instance)
    $deadline=[DateTime]::UtcNow.AddSeconds(45)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($process.HasExited) { throw "API encerrou: $label" }
        try { $null=Invoke-WebRequest ($instance.Url+'/api/health') -TimeoutSec 2 -SkipHttpErrorCheck; return $instance }
        catch { Start-Sleep -Milliseconds 200 }
    }
    throw "API nao respondeu: $label"
}
function Stop-PagesApi($instance) {
    if ($instance.Stopped) { return }
    if (-not $instance.Process.HasExited) { $instance.Process.Kill($true); $null=$instance.Process.WaitForExit(10000) }
    $instance.Output.GetAwaiter().GetResult() | Set-Content (Join-Path $pagesEvidence "paginas-$($instance.Label).stdout.log") -Encoding utf8
    $instance.Error.GetAwaiter().GetResult() | Set-Content (Join-Path $pagesEvidence "paginas-$($instance.Label).stderr.log") -Encoding utf8
    $instance.Stopped=$true
}
function Invoke-PagesRequest($instance,[string]$method,[string]$path,[int]$expected,$body=$null) {
    $options=@{Uri=$instance.Url+$path;Method=$method;TimeoutSec=10;SkipHttpErrorCheck=$true;Headers=@{'Cache-Control'='no-cache'}}
    if ($null -ne $body) { $options.Body=$body | ConvertTo-Json -Compress -Depth 6; $options.ContentType='application/json; charset=utf-8' }
    $response=Invoke-WebRequest @options
    $responseText=if($response.Content -is [byte[]]){[Text.Encoding]::UTF8.GetString($response.Content)}else{[string]$response.Content}
    $pagesRequests.Add([ordered]@{atUtc=[DateTime]::UtcNow.ToString('o');method=$method;path=$path;expectedStatus=$expected;actualStatus=[int]$response.StatusCode;contentType=[string]$response.Headers['Content-Type']})
    Assert-Pages ($response.StatusCode -eq $expected) "$method $path retorna $expected"
    return [pscustomobject]@{Text=$responseText;Response=$response}
}
function Get-PagesSnapshot {
    $inspection=@'
import sqlite3,sys,json,hashlib
from pathlib import Path
c=sqlite3.connect(Path(sys.argv[1]).resolve().as_uri()+'?mode=ro',uri=True)
assert c.execute('PRAGMA integrity_check').fetchall()==[('ok',)]
assert not c.execute('PRAGMA foreign_key_check').fetchall()
rows={t:c.execute('SELECT * FROM "'+t+'" ORDER BY 1').fetchall() for t in ['Geladeiras','Leituras','ConfiguracoesGeladeiras','Alertas','EstadosMonitoramento','__EFMigrationsHistory']}
print(json.dumps({'integrity':'ok','counts':{t:len(r) for t,r in rows.items()},'sha256':hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest()}))
c.close()
'@
    $output=@(& python -c $inspection $pagesDatabase)
    Assert-Pages ($LASTEXITCODE -eq 0) 'SQLite isolado tem integridade e vinculos validos'
    return ($output -join [Environment]::NewLine) | ConvertFrom-Json -AsHashtable
}
function Get-PagesAttribute([string]$tag,[string]$name) {
    $attribute=[regex]::Match($tag,'\b'+[regex]::Escape($name)+'\s*=\s*["'']([^"'']*)["'']',[Text.RegularExpressions.RegexOptions]::IgnoreCase)
    return $(if($attribute.Success){$attribute.Groups[1].Value}else{''})
}

$pagesFailure=$null
Push-Location $script:IceplayRoot
try {
    & $script:IceplayDotnet build Iceplay.slnx --no-restore *>&1 | Set-Content (Join-Path $pagesEvidence 'build.log') -Encoding utf8
    Assert-Pages ($LASTEXITCODE -eq 0) 'Build sem restauracao termina com codigo zero'
    $api=Start-PagesApi 'startup'
    $parent=(Invoke-PagesRequest $api 'POST' '/api/geladeiras' 201 @{nome='FIXTURE PAGINAS - BANCO ISOLADO'}).Text | ConvertFrom-Json -DateKind String
    $reading=(Invoke-PagesRequest $api 'POST' '/api/leituras' 201 @{geladeiraId=$parent.id;temperaturaC=0;portaAberta=$false;medidoEmUtc=[DateTime]::UtcNow.AddSeconds(-5).ToString('o');origem='Simulacao'}).Text | ConvertFrom-Json -DateKind String
    $before=Get-PagesSnapshot
    $expected=[ordered]@{'/dashboard'='monitoramento-lista';'/geladeiras'='geladeira-form';'/historico'='historico-form';'/alertas'='alertas-form';'/configuracoes'='configuracao-form';'/acesso'='acesso-movel';'/sobre'='base-tecnica'}
    $documents=@{}
    $titles=[Collections.Generic.HashSet[string]]::new()
    $mainContents=[Collections.Generic.HashSet[string]]::new()
    foreach ($path in $expected.Keys) {
        $page=Invoke-PagesRequest $api 'GET' $path 200
        Assert-Pages ([string]$page.Response.Headers['Content-Type'] -match 'text/html') "$path e documento HTML, nao resposta generica de API"
        Assert-Pages ($page.Text -match '<!doctype html>' -and $page.Text -match '<html\b') "$path entrega documento completo independente"
        if ($expected[$path]) { Assert-Pages ($page.Text -match ('id="'+[regex]::Escape($expected[$path])+'"')) "$path contem o conteudo funcional esperado" }
        $title=[regex]::Match($page.Text,'<title>(.*?)</title>',[Text.RegularExpressions.RegexOptions]::Singleline).Groups[1].Value
        Assert-Pages (-not [string]::IsNullOrWhiteSpace($title) -and $title -match 'ICEPLAY' -and $titles.Add($title)) "$path possui titulo proprio"
        $main=[regex]::Match($page.Text,'<main\b[^>]*>(.*?)</main>',[Text.RegularExpressions.RegexOptions]::Singleline).Groups[1].Value
        Assert-Pages (-not [string]::IsNullOrWhiteSpace($main) -and $mainContents.Add($main)) "$path possui conteudo principal proprio"
        $links=@([regex]::Matches($page.Text,'<a\b[^>]*>',[Text.RegularExpressions.RegexOptions]::IgnoreCase) | ForEach-Object { [pscustomobject]@{Href=(Get-PagesAttribute $_.Value 'href');Current=(Get-PagesAttribute $_.Value 'aria-current')} })
        foreach ($destination in @('/dashboard','/geladeiras','/historico','/alertas','/configuracoes')) {
            Assert-Pages (@($links | Where-Object Href -eq $destination).Count -gt 0) "$path oferece link real para $destination"
        }
        $selected=@($links | Where-Object Current -eq 'page')
        if ($path -in @('/dashboard','/geladeiras','/historico','/alertas','/configuracoes')) {
            Assert-Pages ($selected.Count -eq 1 -and $selected[0].Href -eq $path) "$path possui exatamente a opcao correta marcada como pagina atual"
        } else { Assert-Pages ($selected.Count -eq 0) "$path auxiliar nao marca uma opcao principal incorreta" }
        $reload=Invoke-PagesRequest $api 'GET' $path 200
        Assert-Pages ($reload.Text -ceq $page.Text) "Atualizar diretamente $path preserva o documento correto"
        $documents[$path]=$page.Text
    }
    $root=Invoke-PagesRequest $api 'GET' '/' 200
    Assert-Pages ($root.Text -ceq $documents['/dashboard']) 'Raiz e /dashboard entregam a mesma Visao geral'
    Assert-Pages ($documents['/dashboard'] -notmatch 'id="geladeira-form"|id="historico-form"') 'Dashboard nao concentra os formularios das outras paginas'
    Assert-Pages ($documents['/geladeiras'] -notmatch 'id="historico-form"') 'Cadastro nao concentra formulario do historico'
    Assert-Pages ($documents['/historico'] -match 'id="historico-tabela"' -and $documents['/historico'] -notmatch 'id="geladeira-form"') 'Historico tem tabela propria e nao concentra CRUD'
    Assert-Pages ($documents['/sobre'] -match 'id="proximas-etapas"') 'Conteudo tecnico e proximas etapas foram preservados em Sobre'
    $null=Invoke-PagesRequest $api 'POST' '/acesso' 405
    Assert-Pages ($documents['/acesso'] -match '<form\b[^>]*method="post"[^>]*action="/acesso"') 'Formulario de acesso nao envia codigo na URL se JavaScript falhar'
    Assert-Pages ($documents['/alertas'] -match 'id="alertas-lista"' -and $documents['/alertas'] -match '/alertas.js\?v=') 'Alertas possui consulta funcional propria integrada a API'
    $assetPaths=[Collections.Generic.HashSet[string]]::new()
    $navigationPaths=[Collections.Generic.HashSet[string]]::new()
    foreach ($path in $documents.Keys) {
        foreach ($tag in [regex]::Matches($documents[$path],'<(?:script|link|img)\b[^>]*>',[Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
            $asset=Get-PagesAttribute $tag.Value $(if($tag.Value -match '^<link\b'){'href'}else{'src'})
            if (-not $asset) { continue }
            Assert-Pages ($asset.StartsWith('/') -and -not $asset.StartsWith('//')) "Asset de $path usa URL absoluta da propria aplicacao: $asset"
            $null=$assetPaths.Add($asset)
        }
        foreach ($tag in [regex]::Matches($documents[$path],'<a\b[^>]*>',[Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
            $destination=Get-PagesAttribute $tag.Value 'href'
            if ($destination.StartsWith('/') -and -not $destination.StartsWith('//')) { $null=$navigationPaths.Add($destination) }
            elseif ($destination.StartsWith('#')) { Assert-Pages ($documents[$path] -match ('id="'+[regex]::Escape($destination.Substring(1))+'"')) "Ancora local de $path existe: $destination" }
        }
    }
    foreach ($asset in $assetPaths) { $null=Invoke-PagesRequest $api 'GET' $asset 200 }
    foreach ($destination in $navigationPaths) {
        $url=[Uri]::new($api.Url+$destination)
        $target=Invoke-PagesRequest $api 'GET' ($url.PathAndQuery) 200
        if ($url.Fragment) { Assert-Pages ($target.Text -match ('id="'+[regex]::Escape($url.Fragment.Substring(1))+'"')) "Ancora navegavel existe no documento destino: $destination" }
    }
    foreach ($unknown in @('/pagina-inexistente','/historico/rota-inexistente','/api/rota-inexistente')) {
        $missing=Invoke-PagesRequest $api 'GET' $unknown 404
        Assert-Pages ($missing.Text -notmatch '<!doctype html>|<title>.*ICEPLAY') "$unknown nao cai no HTML da Visao geral como fallback SPA"
    }
    $history=(Invoke-PagesRequest $api 'GET' "/api/leituras?geladeiraId=$($parent.id)&origem=Simulacao" 200).Text | ConvertFrom-Json -DateKind String
    Assert-Pages ($history.totalItens -eq 1 -and $history.itens[0].id -eq $reading.id -and $history.itens[0].temperaturaC -eq 0 -and $history.itens[0].portaAberta -eq $false) 'API real continua retornando fixture Simulacao com zero/false apos navegacao'
    $after=Get-PagesSnapshot
    Assert-Pages ($before.sha256 -ceq $after.sha256) 'GETs de paginas, assets, links e API nao alteram dados nem migrations'
    Stop-PagesApi $api
    $api=Start-PagesApi 'restart'
    $reloaded=Invoke-PagesRequest $api 'GET' '/historico' 200
    Assert-Pages ($reloaded.Text -ceq $documents['/historico']) 'URL direta de historico permanece correta apos reiniciar'
    $persisted=(Invoke-PagesRequest $api 'GET' "/api/leituras?geladeiraId=$($parent.id)&origem=Simulacao" 200).Text | ConvertFrom-Json -DateKind String
    Assert-Pages ($persisted.totalItens -eq 1 -and $persisted.itens[0].id -eq $reading.id) 'Fixtures persistem apos reinicio real'
    Stop-PagesApi $api
    $final=Get-PagesSnapshot
    Assert-Pages ($before.sha256 -ceq $final.sha256) 'Reinicio preserva conteudo logico do SQLite isolado'
    $pagesReport['finalDatabase']=$final
    $pagesReport.result='passed'
} catch {
    $pagesFailure=$_
    $pagesReport.errors=@($_.Exception.Message)
} finally {
    foreach ($instance in $pagesProcesses) {
        try { Stop-PagesApi $instance } catch { $pagesReport.result='failed'; $pagesReport.errors+=@($_.Exception.Message) }
    }
    $pagesReport.checkCount=$pagesChecks.Count
    $pagesReport['requestCount']=$pagesRequests.Count
    $pagesReport.finishedAtUtc=[DateTime]::UtcNow.ToString('o')
    $pagesReport | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $pagesEvidence 'pages-api.json') -Encoding utf8
    Pop-Location
}
if ($pagesFailure) { throw $pagesFailure }
if ($pagesReport.result -ne 'passed') { throw 'Falha ao concluir verificacao; consulte pages-api.json' }
Write-Host "Paginas verificadas: $($pagesChecks.Count) assercoes; $($pagesRequests.Count) requisicoes HTTP registradas."
