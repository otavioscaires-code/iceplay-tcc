#Requires -Version 7.5
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $Pacote,
    [string] $ConfigMobileTeste,
    [string] $EvidenceDirectory = ('docs/evidencias/'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')+'-pacote')
)
. (Join-Path $PSScriptRoot 'common.ps1')
$packageArchive = [IO.Path]::GetFullPath($Pacote, $script:IceplayRoot)
$packageEvidence = [IO.Path]::GetFullPath($EvidenceDirectory, $script:IceplayRoot)
if (Test-Path -LiteralPath $packageEvidence) { throw 'Usar uma nova pasta de evidências.' }
[void](New-Item -ItemType Directory -Path $packageEvidence)
$packageCheckRoot = Join-Path $script:IceplayRoot ('.tools/verification/pacote/'+[Guid]::NewGuid().ToString('N')+'/copia com espacos')
[void](New-Item -ItemType Directory -Path $packageCheckRoot)
$packageChecks = [Collections.Generic.List[string]]::new()
$packageProcesses = [Collections.Generic.List[object]]::new()
$packageData = Join-Path $script:IceplayRoot 'src/Iceplay.Api/data/iceplay.db'
$packageDataHash = if (Test-Path -LiteralPath $packageData) { (Get-FileHash -LiteralPath $packageData -Algorithm SHA256).Hash } else { $null }
$packageResult = [ordered]@{result='running';startedAtUtc=[DateTime]::UtcNow.ToString('o');scope='Execucao do pacote Windows x64 em copia isolada, sem SDK no PATH; sem sensor fisico';isolatedPackageDirectory=[IO.Path]::GetRelativePath($script:IceplayRoot,$packageCheckRoot).Replace('\','/');checks=@();error=$null}

function Assert-Package([bool] $condition,[string] $message) {
    if (-not $condition) { throw "FALHOU: $message" }
    $packageChecks.Add($message)
    Write-Host "PASSOU: $message"
}
function Get-PackagePort {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
    $listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop()
    return $port
}
function Start-PackageProcess([string] $exe,[string[]] $arguments,[string] $directory) {
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName=$exe; $start.WorkingDirectory=$directory; $start.UseShellExecute=$false
    $start.CreateNoWindow=$true; $start.WindowStyle=[Diagnostics.ProcessWindowStyle]::Hidden
    $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
    foreach ($argument in $arguments) { $start.ArgumentList.Add($argument) }
    foreach ($key in @($start.Environment.Keys | Where-Object { $_ -like 'DOTNET_ROOT*' -or $_ -eq 'ICEPLAY_MOBILE_CONFIG' -or $_ -eq 'ASPNETCORE_URLS' })) {
        [void]$start.Environment.Remove($key)
    }
    $start.Environment['PATH'] = "$env:SystemRoot/System32;$env:SystemRoot;$env:SystemRoot/System32/WindowsPowerShell/v1.0"
    $start.Environment['DOTNET_MULTILEVEL_LOOKUP']='0'
    $start.Environment['DOTNET_ENVIRONMENT']='Development'
    $start.Environment['ASPNETCORE_ENVIRONMENT']='Development'
    $start.Environment['Logging__LogLevel__Microsoft.EntityFrameworkCore.Database.Command']='Warning'
    $process = [Diagnostics.Process]::Start($start)
    $instance = [pscustomobject]@{process=$process;stdout=$process.StandardOutput.ReadToEndAsync();stderr=$process.StandardError.ReadToEndAsync();saved=$false}
    $packageProcesses.Add($instance)
    return $instance
}
function Stop-PackageProcess($instance) {
    if (-not $instance.process.HasExited) { $instance.process.Kill($true) }
    $instance.process.WaitForExit()
    if (-not $instance.saved) {
        $label='processo-'+$instance.process.Id
        [IO.File]::WriteAllText((Join-Path $packageEvidence ($label+'.stdout.log')),$instance.stdout.GetAwaiter().GetResult())
        [IO.File]::WriteAllText((Join-Path $packageEvidence ($label+'.stderr.log')),$instance.stderr.GetAwaiter().GetResult())
        $instance.saved=$true
    }
}
function Wait-PackageHealth($instance,[string] $baseUrl) {
    $deadline=[DateTime]::UtcNow.AddSeconds(45)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($instance.process.HasExited) { throw 'O executável encerrou antes de responder.' }
        try { return Invoke-RestMethod -Uri ($baseUrl+'/api/health') -TimeoutSec 2 }
        catch { Start-Sleep -Milliseconds 200 }
    }
    throw 'O pacote não respondeu em 45 segundos.'
}

try {
    $zip=[IO.Compression.ZipFile]::OpenRead($packageArchive)
    try {
        $names=@($zip.Entries | ForEach-Object { $_.FullName.Replace('\','/') })
        Assert-Package (-not @($names | Where-Object { -not $_.StartsWith('ICEPLAY/') -or $_ -match '(^|/)\.\.(/|$)' }).Count) 'ZIP limitado a pasta ICEPLAY, sem caminhos externos'
        Assert-Package (-not @($names | Where-Object { $_ -match '\.db(?:-|$)|\.pfx$|\.pem$|\.cer$|config\.local|(^|/)\.env$' }).Count) 'Pacote original sem banco, certificados ou configuração privada'
    } finally { $zip.Dispose() }
    [IO.Compression.ZipFile]::ExtractToDirectory($packageArchive,$packageCheckRoot)
    $packageFolder=Join-Path $packageCheckRoot 'ICEPLAY'
    $app=Join-Path $packageFolder 'app'
    $exe=Join-Path $app 'Iceplay.Api.exe'
    $manifest=Get-Content -LiteralPath (Join-Path $packageFolder 'manifesto.json') -Raw | ConvertFrom-Json
    foreach ($file in $manifest.files) {
        $path=[IO.Path]::GetFullPath($file.path,$packageFolder)
        if (-not $path.StartsWith($packageFolder+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Manifesto referencia caminho externo.' }
        if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $file.sha256) { throw "Hash divergente: $($file.path)" }
    }
    Assert-Package ($manifest.selfContained -and $manifest.runtime -eq 'win-x64') 'Manifesto declara publicação autocontida win-x64 e hashes conferem'
    $runtime=Get-Content -LiteralPath (Join-Path $app 'Iceplay.Api.runtimeconfig.json') -Raw | ConvertFrom-Json
    Assert-Package ($runtime.runtimeOptions.includedFrameworks.Count -ge 2 -and -not $runtime.runtimeOptions.framework) 'Runtime incluído, sem depender de instalação compartilhada .NET'
    $port=Get-PackagePort
    $windowsShell=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
    $launcher=Start-PackageProcess $windowsShell @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $packageFolder 'Iniciar-ICEPLAY.ps1'),'-Porta',"$port",'-Verificar','-NaoAbrirNavegador') $packageCheckRoot
    if (-not $launcher.process.WaitForExit(60000)) { throw 'Iniciador não encerrou o diagnóstico no prazo.' }
    $launchOutput=$launcher.stdout.GetAwaiter().GetResult()
    Assert-Package ($launcher.process.ExitCode -eq 0 -and $launchOutput -match 'ICEPLAY_CHECK=') 'Iniciador funciona no Windows PowerShell 5.1, em pasta com espaços e sem SDK no PATH'
    $initial=($launchOutput -split '\r?\n' | Where-Object { $_.StartsWith('ICEPLAY_CHECK=') } | Select-Object -First 1).Substring(14) | ConvertFrom-Json
    Assert-Package ($initial.refrigeratorCount -eq 0) 'Primeira execução cria banco isolado vazio, sem seed'
    Stop-PackageProcess $launcher
    $port=Get-PackagePort; $url="http://localhost:$port"
    $server=Start-PackageProcess $exe @('--contentRoot',$app,'--urls',$url,'--Mobile:Enabled','false') $packageCheckRoot
    $health=Wait-PackageHealth $server $url
    Assert-Package ($health.status -eq 'healthy' -and $health.database -eq 'connected') 'Executável abre SQLite nativo incluído no pacote'
    $listeners=@(Get-NetTCPConnection -State Listen -OwningProcess $server.process.Id)
    Assert-Package ($listeners.Count -ge 1 -and -not @($listeners | Where-Object LocalAddress -NotIn @('127.0.0.1','::1')).Count) 'Execução local atende somente loopback'
    foreach ($page in @('/','/geladeiras','/historico','/alertas','/configuracoes','/acesso','/sobre','/styles.css','/app.js')) {
        $response=Invoke-WebRequest -Uri ($url+$page) -TimeoutSec 5
        if ($response.StatusCode -ne 200) { throw "Recurso ausente: $page" }
    }
    Assert-Package $true 'Páginas e arquivos estáticos incluídos no executável distribuído'
    $record=Invoke-RestMethod -Uri ($url+'/api/geladeiras') -Method Post -ContentType 'application/json' -Body '{"nome":"Verificacao isolada do pacote"}'
    $payload=@{geladeiraId=$record.id;temperaturaC=3.625;portaAberta=$false;medidoEmUtc=[DateTime]::UtcNow.AddSeconds(-1).ToString('o');origem='Simulacao'} | ConvertTo-Json
    $reading=Invoke-RestMethod -Uri ($url+'/api/leituras') -Method Post -ContentType 'application/json' -Body $payload
    Assert-Package ($reading.origem -eq 'Simulacao' -and $reading.temperaturaC -eq 3.625) 'Cadastro e leitura explicitamente Simulacao persistem na cópia de teste'
    Stop-PackageProcess $server
    $port=Get-PackagePort; $url="http://localhost:$port"
    $server=Start-PackageProcess $exe @('--contentRoot',$app,'--urls',$url,'--Mobile:Enabled','false') $packageCheckRoot
    $restarted=Wait-PackageHealth $server $url
    $saved=Invoke-RestMethod -Uri ($url+'/api/leituras/'+$reading.id)
    Assert-Package ($restarted.refrigeratorCount -eq 1 -and $saved.id -eq $reading.id -and $saved.origem -eq 'Simulacao' -and $saved.temperaturaC -eq 3.625) 'Reinício do pacote conserva cadastro e leitura com mesmos valores e IDs'
    Stop-PackageProcess $server
    $badProfile=Join-Path $packageCheckRoot 'perfil-outro-endereco.json'
    @{Mobile=@{Enabled=$true;Address='203.0.113.1';LocalPort=(Get-PackagePort)}} | ConvertTo-Json | Set-Content -LiteralPath $badProfile -Encoding utf8
    $badLauncher=Start-PackageProcess $windowsShell @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $packageFolder 'Iniciar-ICEPLAY.ps1'),'-ConfigMobile',$badProfile,'-Verificar','-NaoAbrirNavegador') $packageCheckRoot
    if (-not $badLauncher.process.WaitForExit(30000)) { throw 'Recusa de perfil inválido excedeu o prazo.' }
    Assert-Package ($badLauncher.process.ExitCode -ne 0) 'Iniciador recusa perfil móvel com endereço ausente deste computador'
    Stop-PackageProcess $badLauncher
    if ($ConfigMobileTeste) {
        $mobileProfile=[IO.Path]::GetFullPath($ConfigMobileTeste,$script:IceplayRoot)
        $mobileHash=(Get-FileHash -LiteralPath $mobileProfile -Algorithm SHA256).Hash
        $mobileLauncher=Start-PackageProcess $windowsShell @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $packageFolder 'Iniciar-ICEPLAY.ps1'),'-ConfigMobile',$mobileProfile,'-Verificar','-NaoAbrirNavegador') $packageCheckRoot
        if (-not $mobileLauncher.process.WaitForExit(60000)) { throw 'Iniciador móvel excedeu o prazo.' }
        Assert-Package ($mobileLauncher.process.ExitCode -eq 0 -and $mobileLauncher.stdout.GetAwaiter().GetResult() -match 'ICEPLAY_CHECK=') 'Pacote inicia no perfil HTTPS de teste, sem SDK e sem instalar certificados'
        Stop-PackageProcess $mobileLauncher
        Assert-Package ((Get-FileHash -LiteralPath $mobileProfile -Algorithm SHA256).Hash -eq $mobileHash) 'Perfil HTTPS de teste preservado byte a byte'
    }
    if ($packageDataHash) { Assert-Package ((Get-FileHash -LiteralPath $packageData -Algorithm SHA256).Hash -eq $packageDataHash) 'Banco de uso preservado byte a byte' }
    $packageResult.result='passed'
} catch {
    $packageResult.result='failed'; $packageResult.error=$_.Exception.Message
    throw
} finally {
    foreach ($instance in $packageProcesses) { Stop-PackageProcess $instance }
    $packageResult.finishedAtUtc=[DateTime]::UtcNow.ToString('o')
    $packageResult.checks=$packageChecks.ToArray()
    $packageResult.archiveSha256=(Get-FileHash -LiteralPath $packageArchive -Algorithm SHA256).Hash.ToLowerInvariant()
    $packageResult | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $packageEvidence 'pacote.json') -Encoding utf8
    Write-Host "Resultado: $($packageResult.result)"
}
