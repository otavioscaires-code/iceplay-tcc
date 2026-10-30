using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace Iceplay.Api.Mobile;

public sealed class MobileAccessSettings
{
    public bool Enabled { get; set; }
    public string Address { get; set; } = "";
    public int PrefixLength { get; set; } = 24;
    public int LocalPort { get; set; } = 5080;
    public int HttpsPort { get; set; } = 5443;
    public int CertificatePort { get; set; } = 5081;
    public string CertificatePath { get; set; } = "";
    public string CertificatePassword { get; set; } = "";
    public string PublicCertificatePath { get; set; } = "";
    public string AccessCode { get; set; } = "";

    public string HttpsUrl => $"https://{Address}:{HttpsPort}";

    public void Validate()
    {
        if (!Enabled) return;
        if (!IPAddress.TryParse(Address, out var address) || !IsPrivateV4(address)
            || PrefixLength is < 8 or > 30)
            throw new InvalidOperationException("O modo móvel exige IPv4 privado e prefixo de rede válido.");
        var ports = new[] { LocalPort, HttpsPort, CertificatePort };
        if (ports.Any(port => port is < 1024 or > 65535) || ports.Distinct().Count() != 3)
            throw new InvalidOperationException("Configure três portas distintas entre 1024 e 65535.");
        if (!File.Exists(CertificatePath) || !File.Exists(PublicCertificatePath)
            || CertificatePassword.Length < 20 || AccessCode.Length < 32 || AccessCode.Length > 128)
            throw new InvalidOperationException("Prepare os certificados e o código local com prepare-mobile.ps1.");
    }

    public bool IsLocal(HttpContext context) => !Enabled ||
        (context.Connection.RemoteIpAddress is { } address && IPAddress.IsLoopback(address)
         && context.Connection.LocalPort == LocalPort && !context.Request.IsHttps);

    public bool Allows(IPAddress? address)
    {
        if (address is null) return false;
        if (IPAddress.IsLoopback(address)) return true;
        if (!Enabled || !IsPrivateV4(address)) return false;
        var local = IPAddress.Parse(Address).GetAddressBytes();
        var remote = address.GetAddressBytes();
        for (var bit = 0; bit < PrefixLength; bit++)
        {
            var mask = 1 << (7 - bit % 8);
            if ((local[bit / 8] & mask) != (remote[bit / 8] & mask)) return false;
        }
        return true;
    }

    public bool MatchesCode(string code) => CryptographicOperations.FixedTimeEquals(
        SHA256.HashData(Encoding.UTF8.GetBytes(code)), SHA256.HashData(Encoding.UTF8.GetBytes(AccessCode)));

    private static bool IsPrivateV4(IPAddress address)
    {
        var bytes = address.GetAddressBytes();
        return bytes.Length == 4 && (bytes[0] == 10 || bytes[0] == 172 && bytes[1] is >= 16 and <= 31
            || bytes[0] == 192 && bytes[1] == 168);
    }
}
