#Requires -Version 7.5
# Emissor de teste explícito. Não acessa o SQLite nem representa um sensor físico.
[CmdletBinding()]
param(
    [string] $ApiUrl = 'http://localhost:5080',
    [Parameter(Mandatory)]
    [ValidateRange(1, [int]::MaxValue)]
    [int] $GeladeiraId,
    [ValidateRange(1, 1000)]
    [int] $Quantidade = 1,
    [ValidateRange(0, 3600)]
    [double] $IntervaloSegundos = 1,
    [double] $TemperaturaC = 4,
    [switch] $PortaAberta
)

$ErrorActionPreference = 'Stop'
$simulatorUri = $null
if (-not [Uri]::TryCreate($ApiUrl, [UriKind]::Absolute, [ref]$simulatorUri) -or
    $simulatorUri.Scheme -notin @('http', 'https') -or $simulatorUri.UserInfo -or
    $simulatorUri.Query -or $simulatorUri.Fragment) {
    throw 'ApiUrl deve ser um endereço HTTP/HTTPS, sem credenciais, consulta ou fragmento.'
}
if (-not [double]::IsFinite($TemperaturaC) -or -not [double]::IsFinite($IntervaloSegundos)) {
    throw 'TemperaturaC e IntervaloSegundos devem ser números finitos.'
}
$simulatorEndpoint = $ApiUrl.TrimEnd('/') + '/api/leituras'
Write-Host 'SIMULAÇÃO: valores de teste, sem sensor físico. Origem sempre Simulacao.'

for ($simulatorIndex = 1; $simulatorIndex -le $Quantidade; $simulatorIndex++) {
    $simulatorBody = @{
        geladeiraId = $GeladeiraId
        temperaturaC = $TemperaturaC
        portaAberta = [bool]$PortaAberta
        medidoEmUtc = [DateTime]::UtcNow.ToString('o')
        origem = 'Simulacao'
    } | ConvertTo-Json -Compress
    try {
        $simulatorResponse = Invoke-WebRequest -Uri $simulatorEndpoint -Method Post -ContentType 'application/json; charset=utf-8' -Body $simulatorBody -TimeoutSec 10 -SkipHttpErrorCheck
    }
    catch {
        # Uma resposta perdida não prova que o POST falhou; repetir pode duplicar dados.
        throw "Envio $simulatorIndex sem resposta confirmada. A leitura pode ter sido salva. Não houve repetição automática; confira a API antes de reenviar. $($_.Exception.Message)"
    }
    $simulatorContent = if ($simulatorResponse.Content -is [byte[]]) {
        [Text.Encoding]::UTF8.GetString($simulatorResponse.Content)
    } else { [string]$simulatorResponse.Content }
    if ([int]$simulatorResponse.StatusCode -ne 201) {
        throw "Envio $simulatorIndex recusado: HTTP $($simulatorResponse.StatusCode). $simulatorContent"
    }
    try { $simulatorReading = $simulatorContent | ConvertFrom-Json -DateKind String }
    catch { throw "Envio $simulatorIndex recebeu 201 com JSON inválido. Confira a API; não houve repetição automática." }
    if ($simulatorReading.origem -cne 'Simulacao' -or $simulatorReading.geladeiraId -ne $GeladeiraId -or
        $null -eq $simulatorReading.id -or $simulatorReading.id -le 0) {
        throw "Envio $simulatorIndex recebeu uma confirmação inesperada. Confira a API; não houve repetição automática."
    }
    [pscustomobject]@{
        indice = $simulatorIndex
        statusHttp = [int]$simulatorResponse.StatusCode
        location = [string]($simulatorResponse.Headers.Location | Select-Object -First 1)
        leitura = $simulatorReading
    }
    if ($simulatorIndex -lt $Quantidade -and $IntervaloSegundos -gt 0) {
        Start-Sleep -Milliseconds ([int]($IntervaloSegundos * 1000))
    }
}
