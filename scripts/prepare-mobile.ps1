#Requires -Version 7.5
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $EnderecoIp,
    [string] $Diretorio = '.tools/mobile',
    [ValidateRange(1024,65535)][int] $PortaHttps = 5443,
    [ValidateRange(1024,65535)][int] $PortaCertificado = 5081,
    [ValidateRange(1024,65535)][int] $PortaLocal = 5080,
    [switch] $RenovarCertificado
)
$ErrorActionPreference = 'Stop'
$mobileRoot = Split-Path -Parent $PSScriptRoot
$mobileIp = $null
if (-not [Net.IPAddress]::TryParse($EnderecoIp,[ref]$mobileIp)) { throw 'Informe um IPv4 da rede local.' }
$mobileBytes = $mobileIp.GetAddressBytes()
if ($mobileBytes.Length -ne 4 -or -not ($mobileBytes[0] -eq 10 -or ($mobileBytes[0] -eq 172 -and $mobileBytes[1] -ge 16 -and $mobileBytes[1] -le 31) -or ($mobileBytes[0] -eq 192 -and $mobileBytes[1] -eq 168))) { throw 'Use um IPv4 privado da rede local.' }
$mobileInterface = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -eq $EnderecoIp -and $_.AddressState -eq 'Preferred' })
if ($mobileInterface.Count -ne 1) { throw 'O IP precisa pertencer a uma interface ativa deste computador.' }
if (@($PortaHttps,$PortaCertificado,$PortaLocal | Select-Object -Unique).Count -ne 3) { throw 'As três portas precisam ser diferentes.' }
$mobileDirectory = [IO.Path]::GetFullPath($Diretorio,$mobileRoot)
$mobileTools = [IO.Path]::GetFullPath((Join-Path $mobileRoot '.tools')) + [IO.Path]::DirectorySeparatorChar
if (-not $mobileDirectory.StartsWith($mobileTools,[StringComparison]::OrdinalIgnoreCase)) { throw 'Grave os segredos somente dentro de .tools.' }
New-Item -ItemType Directory -Path $mobileDirectory -Force | Out-Null
# Chaves privadas e código ficam acessíveis somente à conta que prepara o ambiente.
$mobileOwner = [Security.Principal.WindowsIdentity]::GetCurrent().User
$mobileAcl = Get-Acl -LiteralPath $mobileDirectory
$mobileRules = @($mobileAcl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
if (-not $mobileAcl.AreAccessRulesProtected -or $mobileRules.Count -ne 1 -or $mobileRules[0].IdentityReference -ne $mobileOwner) {
    # Altera somente a DACL; preservar proprietário evita exigir privilégios de auditoria.
    $mobileAcl.SetAccessRuleProtection($true,$false)
    foreach ($mobileRule in @($mobileAcl.GetAccessRules($true,$false,[Security.Principal.SecurityIdentifier]))) { $mobileAcl.RemoveAccessRuleSpecific($mobileRule) }
    $mobileAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($mobileOwner,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
    Set-Acl -LiteralPath $mobileDirectory -AclObject $mobileAcl
}
$mobileConfigPath = Join-Path $mobileDirectory 'settings.json'
if ((Test-Path -LiteralPath $mobileConfigPath) -and -not $RenovarCertificado) {
    $mobileExisting = Get-Content -LiteralPath $mobileConfigPath -Raw | ConvertFrom-Json -DateKind String
    if ($mobileExisting.Mobile.Address -ne $EnderecoIp -or $mobileExisting.Mobile.HttpsPort -ne $PortaHttps -or $mobileExisting.Mobile.CertificatePort -ne $PortaCertificado -or $mobileExisting.Mobile.LocalPort -ne $PortaLocal) { throw 'A configuração existente usa outro endereço/portas. Use outro Diretorio para gerar um certificado novo.' }
    if ([DateTimeOffset]::Parse($mobileExisting.expiresAtUtc) -lt [DateTimeOffset]::UtcNow.AddDays(7)) { throw 'Certificado próximo de vencer. Prepare outro Diretorio e instale o novo certificado no iPhone.' }
    Write-Host "Configuração existente preservada: $mobileConfigPath"
    return
}
$mobilePassword = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$mobileCode = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).TrimEnd('=').Replace('+','-').Replace('/','_')
$mobileStart = [DateTimeOffset]::UtcNow.AddMinutes(-10)
$mobileEnd = [DateTimeOffset]::UtcNow.AddDays(90)
$mobileCaKey = [Security.Cryptography.RSA]::Create(3072)
$mobileServerKey = [Security.Cryptography.RSA]::Create(2048)
try {
    $mobileCaRequest = [Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=ICEPLAY Local',$mobileCaKey,[Security.Cryptography.HashAlgorithmName]::SHA256,[Security.Cryptography.RSASignaturePadding]::Pkcs1)
    $mobileCaRequest.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($true,$false,0,$true))
    $mobileCaRequest.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new([Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyCertSign -bor [Security.Cryptography.X509Certificates.X509KeyUsageFlags]::CrlSign,$true))
    $mobileCaIdentifier = [Security.Cryptography.X509Certificates.X509SubjectKeyIdentifierExtension]::new($mobileCaRequest.PublicKey,$false)
    $mobileCaRequest.CertificateExtensions.Add($mobileCaIdentifier)
    $mobileCaRequest.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509AuthorityKeyIdentifierExtension]::CreateFromSubjectKeyIdentifier($mobileCaIdentifier))
    $mobileCa = $mobileCaRequest.CreateSelfSigned($mobileStart,$mobileEnd.AddDays(30))
    $mobileServerRequest = [Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=ICEPLAY Local Server',$mobileServerKey,[Security.Cryptography.HashAlgorithmName]::SHA256,[Security.Cryptography.RSASignaturePadding]::Pkcs1)
    $mobileServerRequest.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false,$false,0,$true))
    $mobileServerRequest.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509SubjectKeyIdentifierExtension]::new($mobileServerRequest.PublicKey,$false))
    $mobileServerRequest.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509AuthorityKeyIdentifierExtension]::CreateFromCertificate($mobileCa,$true,$false))
    $mobileServerRequest.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new([Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor [Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment,$true))
    $mobileUsage = [Security.Cryptography.OidCollection]::new()
    $null = $mobileUsage.Add([Security.Cryptography.Oid]::new('1.3.6.1.5.5.7.3.1'))
    $mobileServerRequest.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($mobileUsage,$true))
    $mobileSan = [Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
    $mobileSan.AddIpAddress($mobileIp)
    $mobileSan.AddDnsName('localhost')
    $mobileServerRequest.CertificateExtensions.Add($mobileSan.Build())
    $mobileIssued = $mobileServerRequest.Create($mobileCa,$mobileStart,$mobileEnd,[Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
    $mobileServer = [Security.Cryptography.X509Certificates.RSACertificateExtensions]::CopyWithPrivateKey($mobileIssued,$mobileServerKey)
    $mobilePublicPath = Join-Path $mobileDirectory 'ICEPLAY-local.cer'
    $mobilePemPath = Join-Path $mobileDirectory 'ICEPLAY-local.pem'
    $mobilePfxPath = Join-Path $mobileDirectory 'servidor.pfx'
    [IO.File]::WriteAllBytes($mobilePublicPath,$mobileCa.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert))
    [IO.File]::WriteAllText($mobilePemPath,$mobileCa.ExportCertificatePem())
    [IO.File]::WriteAllBytes($mobilePfxPath,$mobileServer.Export([Security.Cryptography.X509Certificates.X509ContentType]::Pfx,$mobilePassword))
    [IO.File]::WriteAllText((Join-Path $mobileDirectory 'codigo-acesso.txt'),$mobileCode)
    [ordered]@{Mobile=[ordered]@{Enabled=$true;Address=$EnderecoIp;PrefixLength=$mobileInterface[0].PrefixLength;LocalPort=$PortaLocal;HttpsPort=$PortaHttps;CertificatePort=$PortaCertificado;CertificatePath=$mobilePfxPath;CertificatePassword=$mobilePassword;PublicCertificatePath=$mobilePublicPath;AccessCode=$mobileCode};expiresAtUtc=$mobileEnd.ToString('o')} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $mobileConfigPath -Encoding utf8
    Write-Host "Configuração preparada: $mobileConfigPath"
    Write-Host "No iPhone, após liberar o firewall: http://${EnderecoIp}:$PortaCertificado"
    Write-Host "Aplicação: https://${EnderecoIp}:$PortaHttps/#acesso-movel"
    Write-Host "SHA-256 do certificado público: $((Get-FileHash -LiteralPath $mobilePublicPath -Algorithm SHA256).Hash)"
    Write-Host 'Código de acesso guardado em codigo-acesso.txt; não compartilhe settings.json, PFX ou o código em evidências.'
}
finally {
    if ($mobileServer) { $mobileServer.Dispose() }; if ($mobileIssued) { $mobileIssued.Dispose() }; if ($mobileCa) { $mobileCa.Dispose() }
    $mobileServerKey.Dispose(); $mobileCaKey.Dispose()
}
