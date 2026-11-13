#Requires -Version 7.5
[CmdletBinding()]
param([string] $Python = 'python')
$ErrorActionPreference = 'Stop'
$firmwareInstallRoot = Split-Path -Parent $PSScriptRoot
$firmwareVenv = Join-Path $firmwareInstallRoot '.tools/platformio-venv'
$firmwareInterpreter = Join-Path $firmwareVenv 'Scripts/python.exe'
if (-not (Test-Path -LiteralPath $firmwareInterpreter)) {
    & $Python -c 'import sys; assert sys.version_info[:2] == (3,12), "Use Python 3.12, versao validada nesta etapa."'
    if ($LASTEXITCODE -ne 0) { throw 'Informe -Python com o executavel Python 3.12.' }
    & $Python -m venv $firmwareVenv
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel criar o ambiente Python local.' }
}
& $firmwareInterpreter -m pip install --disable-pip-version-check -r (Join-Path $firmwareInstallRoot 'firmware/requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar as ferramentas locais de firmware.' }
& $firmwareInterpreter -m platformio --version
if ($LASTEXITCODE -ne 0) { throw 'PlatformIO nao executou.' }
