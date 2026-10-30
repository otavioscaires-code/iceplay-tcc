$ErrorActionPreference = 'Stop'
$script:IceplayRoot = Split-Path -Parent $PSScriptRoot
$script:IceplayDotnet = Join-Path $script:IceplayRoot '.tools/dotnet/dotnet.exe'
if (-not (Test-Path -LiteralPath $script:IceplayDotnet)) {
    throw 'SDK local ausente. Execute: .\scripts\install-dotnet.ps1'
}
$env:DOTNET_ROOT = Split-Path -Parent $script:IceplayDotnet
$env:PATH = "$env:DOTNET_ROOT;$env:PATH"
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = '0'
$env:DOTNET_CLI_HOME = Join-Path $script:IceplayRoot '.tools/cli-home'
$env:NUGET_PACKAGES = Join-Path $script:IceplayRoot '.tools/nuget-packages'
