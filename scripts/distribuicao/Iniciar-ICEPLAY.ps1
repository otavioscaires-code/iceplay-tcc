#Requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateRange(1024,65535)][int] $Porta = 5080,
    [string] $ConfigMobile,
    [switch] $NaoAbrirNavegador,
    [switch] $Verificar
)
$ErrorActionPreference = 'Stop'
$packageApp = Join-Path $PSScriptRoot 'app'
$packageExe = Join-Path $packageApp 'Iceplay.Api.exe'
if (-not (Test-Path -LiteralPath $packageExe)) { throw 'Extraia toda a pasta ICEPLAY antes de iniciar.' }
$packageUrl = "http://localhost:$Porta"
$packageMobilePath = $null
if ($ConfigMobile) {
    $packageMobilePath = (Resolve-Path -LiteralPath $ConfigMobile).Path
    $packageMobile = Get-Content -LiteralPath $packageMobilePath -Raw | ConvertFrom-Json
    if (-not $packageMobile.Mobile.Enabled) { throw 'Esse perfil não habilita o acesso pelo celular.' }
    $packageAddress = $packageMobile.Mobile.Address
    if (-not (Get-NetIPAddress -AddressFamily IPv4 | Where-Object IPAddress -eq $packageAddress)) {
        throw 'O perfil HTTPS usa outro endereço de rede. Prepare um perfil para este computador e esta rede.'
    }
    $Porta = [int]$packageMobile.Mobile.LocalPort
    $packageUrl = "http://localhost:$Porta"
}
if (Get-NetTCPConnection -State Listen -LocalPort $Porta -ErrorAction SilentlyContinue) {
    throw "A porta $Porta já está em uso. Encerre a outra instância antes de iniciar."
}
$packageLogs = Join-Path $PSScriptRoot 'logs'
[void](New-Item -ItemType Directory -Path $packageLogs -Force)
$packageLog = Join-Path $packageLogs ([DateTime]::UtcNow.ToString('yyyyMMddTHHmmss')+'-'+[Guid]::NewGuid().ToString('N').Substring(0,8))
$packageStart = New-Object System.Diagnostics.ProcessStartInfo
$packageStart.FileName = $packageExe
$packageStart.WorkingDirectory = $packageApp
$packageStart.UseShellExecute = $false
$packageStart.CreateNoWindow = $true
$packageStart.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
$packageStart.RedirectStandardOutput = $true
$packageStart.RedirectStandardError = $true
$packageStart.EnvironmentVariables['ASPNETCORE_ENVIRONMENT'] = 'Development'
$packageStart.EnvironmentVariables['DOTNET_ENVIRONMENT'] = 'Development'
$packageStart.EnvironmentVariables['Logging__LogLevel__Microsoft.EntityFrameworkCore.Database.Command'] = 'Warning'
if ($packageMobilePath) {
    $packageStart.EnvironmentVariables['ICEPLAY_MOBILE_CONFIG'] = $packageMobilePath
    $packageStart.Arguments = '--contentRoot "'+$packageApp+'"'
} else {
    [void]$packageStart.EnvironmentVariables.Remove('ICEPLAY_MOBILE_CONFIG')
    $packageStart.Arguments = '--contentRoot "'+$packageApp+'" --urls '+$packageUrl+' --Mobile:Enabled false'
}
$packageProcess = $null
try {
    $packageProcess = [Diagnostics.Process]::Start($packageStart)
    $packageStdout = $packageProcess.StandardOutput.ReadToEndAsync()
    $packageStderr = $packageProcess.StandardError.ReadToEndAsync()
    $packageDeadline = [DateTime]::UtcNow.AddSeconds(45)
    $packageReady = $false
    while ([DateTime]::UtcNow -lt $packageDeadline) {
        if ($packageProcess.HasExited) { throw "O programa não iniciou. Consulte os arquivos em $packageLogs" }
        try {
            $packageHealth = Invoke-RestMethod -Uri ($packageUrl+'/api/health') -TimeoutSec 2
            if ($packageHealth.status -eq 'healthy' -and $packageHealth.database -eq 'connected') { $packageReady=$true; break }
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $packageReady) { throw "O banco não ficou disponível. Consulte os arquivos em $packageLogs" }
    Write-Host "ICEPLAY pronto: $packageUrl"
    if ($packageMobilePath) { Write-Host "No celular: https://$($packageMobile.Mobile.Address):$($packageMobile.Mobile.HttpsPort)/acesso" }
    if ($Verificar) {
        Write-Output ('ICEPLAY_CHECK='+($packageHealth | ConvertTo-Json -Compress))
    } else {
        Write-Host 'Mantenha esta janela aberta. Para encerrar, pressione Ctrl+C.'
        if (-not $NaoAbrirNavegador) {
            $packageBrowser = New-Object Diagnostics.ProcessStartInfo
            $packageBrowser.FileName = $packageUrl
            $packageBrowser.UseShellExecute = $true
            [void][Diagnostics.Process]::Start($packageBrowser)
        }
        while (-not $packageProcess.HasExited) { Start-Sleep -Milliseconds 500 }
        if ($packageProcess.ExitCode -ne 0) { throw "A execução terminou com erro. Consulte os arquivos em $packageLogs" }
    }
} finally {
    if ($null -ne $packageProcess) {
        if (-not $packageProcess.HasExited) { $packageProcess.Kill() }
        $packageProcess.WaitForExit()
        [IO.File]::WriteAllText($packageLog+'.stdout.log', $packageStdout.GetAwaiter().GetResult())
        [IO.File]::WriteAllText($packageLog+'.stderr.log', $packageStderr.GetAwaiter().GetResult())
        $packageProcess.Dispose()
    }
}
