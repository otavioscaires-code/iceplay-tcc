#Requires -Version 7.5
[CmdletBinding()]
param([string] $EvidenceDirectory = 'docs/evidencias/nova-revisao/firmware')
. (Join-Path $PSScriptRoot 'common-firmware.ps1')
$firmwareEvidence = [IO.Path]::GetFullPath($EvidenceDirectory,$script:FirmwareRoot)
New-Item -ItemType Directory -Path $firmwareEvidence -Force | Out-Null
Push-Location $script:FirmwareRoot
try {
    & $script:FirmwarePython -m platformio --version *> (Join-Path $firmwareEvidence 'platformio.log')
    if ($LASTEXITCODE -ne 0) { throw 'PlatformIO nao executou.' }
    & $script:FirmwarePython -m platformio run -d firmware/esp32 -e verificacao *> (Join-Path $firmwareEvidence 'compilacao.log')
    Get-Content (Join-Path $firmwareEvidence 'compilacao.log') -Tail 16
    if ($LASTEXITCODE -ne 0) { throw 'Compilacao ESP32 falhou; consulte compilacao.log.' }
    $firmwareBin = Join-Path $script:FirmwareRoot '.tools/firmware-build/verificacao/firmware.bin'
    $firmwareResult = [ordered]@{ result='passed'; checkedAtUtc=[DateTime]::UtcNow.ToString('O'); scope='Compilacao para ESP32 classico com configuracao de exemplo; sem placa, rede ou sensores fisicos'; board='esp32dev'; environment='verificacao'; firmwareSha256=(Get-FileHash -LiteralPath $firmwareBin -Algorithm SHA256).Hash; bytes=(Get-Item -LiteralPath $firmwareBin).Length }
    $firmwareResult | ConvertTo-Json | Set-Content (Join-Path $firmwareEvidence 'firmware.json') -Encoding utf8

    # Segunda compilacao: copia isolada com configuracao sintetica habilitada.
    # Isso verifica tambem o codigo/link das funcoes que o otimizador poderia
    # remover ao compilar somente CONFIGURADO=false. Nunca grava uma placa.
    $firmwareFixtureRoot = Join-Path $script:FirmwareRoot ('.tools/fwcheck/' + [Guid]::NewGuid().ToString('N').Substring(0,8))
    $firmwareFixtureProject = Join-Path $firmwareFixtureRoot 'esp32'
    New-Item -ItemType Directory -Path $firmwareFixtureProject -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $script:FirmwareRoot 'firmware/esp32/src') -Destination $firmwareFixtureProject -Recurse
    New-Item -ItemType Directory -Path (Join-Path $firmwareFixtureProject 'include') -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $script:FirmwareRoot 'firmware/esp32/include/config.example.h') -Destination (Join-Path $firmwareFixtureProject 'include')
    $firmwareFixtureIni = (Get-Content -LiteralPath 'firmware/esp32/platformio.ini' -Raw).Replace('build_dir = ../../.tools/firmware-build','build_dir = .pio/build')
    [IO.File]::WriteAllText((Join-Path $firmwareFixtureProject 'platformio.ini'),$firmwareFixtureIni,[Text.UTF8Encoding]::new($false))
    $firmwareFixtureMobile = Join-Path $firmwareFixtureRoot 'certificado'
    New-Item -ItemType Directory -Path $firmwareFixtureMobile -Force | Out-Null
    @{Mobile=@{Address='192.168.0.2';HttpsPort=5443}} | ConvertTo-Json | Set-Content (Join-Path $firmwareFixtureMobile 'settings.json') -Encoding utf8
    $firmwareTestKey = [Security.Cryptography.RSA]::Create(2048)
    try {
        $firmwareTestRequest = [Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=ICEPLAY FIXTURE SOMENTE COMPILACAO',$firmwareTestKey,[Security.Cryptography.HashAlgorithmName]::SHA256,[Security.Cryptography.RSASignaturePadding]::Pkcs1)
        $firmwareTestCert = $firmwareTestRequest.CreateSelfSigned([DateTimeOffset]::UtcNow.AddDays(-1),[DateTimeOffset]::UtcNow.AddDays(1))
        try { [IO.File]::WriteAllText((Join-Path $firmwareFixtureMobile 'ICEPLAY-local.pem'),$firmwareTestCert.ExportCertificatePem()) }
        finally { $firmwareTestCert.Dispose() }
    } finally { $firmwareTestKey.Dispose() }
    $firmwareTestToken = 'icp_999999_' + [Convert]::ToHexStringLower([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    $firmwarePreparedHeader = Join-Path $firmwareFixtureProject 'include/config.local.h'
    $firmwareTestArguments = @{GeladeiraId=999999;Ssid='ICEPLAY "FIXTURE" \REDE';SenhaWifi=(ConvertTo-SecureString 'SOMENTE-TESTE-SOFTWARE' -AsPlainText -Force);Credencial=(ConvertTo-SecureString $firmwareTestToken -AsPlainText -Force);DiretorioMobile=$firmwareFixtureMobile;Destino=$firmwarePreparedHeader}
    & "$PSScriptRoot/prepare-firmware.ps1" @firmwareTestArguments *> (Join-Path $firmwareEvidence 'preparacao-config.log')
    $firmwareHeaderHash = (Get-FileHash -LiteralPath $firmwarePreparedHeader).Hash
    $firmwareRefusedOverwrite = $false
    try { & "$PSScriptRoot/prepare-firmware.ps1" @firmwareTestArguments | Out-Null }
    catch { if ($_.Exception.Message -like 'Configuracao ja existe*') { $firmwareRefusedOverwrite = $true } else { throw } }
    if (-not $firmwareRefusedOverwrite -or (Get-FileHash -LiteralPath $firmwarePreparedHeader).Hash -ne $firmwareHeaderHash) { throw 'Preparacao nao preservou arquivo privado existente.' }
    $firmwareBadArguments = $firmwareTestArguments.Clone()
    $firmwareBadArguments.Destino = Join-Path $firmwareFixtureRoot 'invalido/config.local.h'
    $firmwareBadArguments.Credencial = ConvertTo-SecureString 'INVALIDA' -AsPlainText -Force
    $firmwareRefusedInvalid = $false
    try { & "$PSScriptRoot/prepare-firmware.ps1" @firmwareBadArguments | Out-Null }
    catch { if ($_.Exception.Message -like 'Formato de credencial invalido*') { $firmwareRefusedInvalid = $true } else { throw } }
    if (-not $firmwareRefusedInvalid -or (Test-Path $firmwareBadArguments.Destino)) { throw 'Credencial invalida nao foi recusada antes de escrever.' }
    $firmwareBadArguments.Destino = Join-Path $script:FirmwareRoot ('docs/config-teste-' + [Guid]::NewGuid().ToString('N') + '/config.local.h')
    $firmwareRefusedPublicPath = $false
    try { & "$PSScriptRoot/prepare-firmware.ps1" @firmwareBadArguments | Out-Null }
    catch { if ($_.Exception.Message -like 'Configuracoes privadas devem ficar*') { $firmwareRefusedPublicPath = $true } else { throw } }
    if (-not $firmwareRefusedPublicPath -or (Test-Path $firmwareBadArguments.Destino)) { throw 'Preparacao permitiu gravar segredo fora de pasta ignorada.' }
    & $script:FirmwarePython -m platformio run -d $firmwareFixtureProject -e esp32dev *> (Join-Path $firmwareEvidence 'compilacao-configurada.log')
    Get-Content (Join-Path $firmwareEvidence 'compilacao-configurada.log') -Tail 14
    if ($LASTEXITCODE -ne 0) { throw 'Compilacao com configuracao sintetica falhou.' }
    $firmwareFullBin = Join-Path $firmwareFixtureProject '.pio/build/esp32dev/firmware.bin'
    [ordered]@{result='passed';checkedAtUtc=[DateTime]::UtcNow.ToString('O');scope='Compilacao com configuracao sintetica, certificado publico efemero e credencial nao registrada; nenhum envio/placa';board='esp32dev';mainSha256=(Get-FileHash firmware/esp32/src/main.cpp).Hash;firmwareSha256=(Get-FileHash $firmwareFullBin).Hash;bytes=(Get-Item $firmwareFullBin).Length;refusedOverwrite=$firmwareRefusedOverwrite;refusedInvalidCredential=$firmwareRefusedInvalid;refusedUnignoredDestination=$firmwareRefusedPublicPath} | ConvertTo-Json | Set-Content (Join-Path $firmwareEvidence 'firmware-configurado.json') -Encoding utf8
}
finally { Pop-Location }
