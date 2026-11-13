$ErrorActionPreference = 'Stop'
$script:FirmwareRoot = Split-Path -Parent $PSScriptRoot
$script:FirmwarePython = Join-Path $script:FirmwareRoot '.tools/platformio-venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $script:FirmwarePython)) { throw 'Execute scripts/install-firmware-tools.ps1 com Python 3.12.' }
$env:PLATFORMIO_CORE_DIR = Join-Path $script:FirmwareRoot '.tools/platformio'
$env:PLATFORMIO_SETTING_ENABLE_TELEMETRY = 'No'
$env:PYTHONIOENCODING = 'utf-8'
