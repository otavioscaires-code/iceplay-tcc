#Requires -Version 7.5
[CmdletBinding()]
param([ValidateSet('Compilar','Gravar','Monitorar')][string] $Acao = 'Compilar', [string] $Porta = '')
. (Join-Path $PSScriptRoot 'common-firmware.ps1')
if ($Acao -in @('Gravar','Monitorar') -and $Porta -notmatch '^COM[1-9][0-9]*$') { throw 'Informe explicitamente a porta da placa, por exemplo -Porta COM3.' }
if (-not (Test-Path -LiteralPath (Join-Path $script:FirmwareRoot 'firmware/esp32/include/config.local.h'))) { throw 'Prepare config.local.h com scripts/prepare-firmware.ps1; nenhum segredo deve entrar no Git.' }
Push-Location $script:FirmwareRoot
try {
    if ($Acao -eq 'Monitorar') { & $script:FirmwarePython -m platformio device monitor -p $Porta -b 115200 }
    else {
        $firmwareArguments = @('-m','platformio','run','-d','firmware/esp32','-e','esp32dev')
        if ($Acao -eq 'Gravar') { $firmwareArguments += @('-t','upload','--upload-port',$Porta) }
        & $script:FirmwarePython @firmwareArguments
    }
    if ($LASTEXITCODE -ne 0) { throw 'A operacao de firmware falhou; consulte a saida.' }
}
finally { Pop-Location }
