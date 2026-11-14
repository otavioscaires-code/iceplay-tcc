using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace Iceplay.Api.Mobile;

// Um único convite em memória: gerar outro ou reiniciar invalida o anterior.
// O QR contém este segredo temporário, nunca o código permanente do computador.
public sealed class MobilePairing(TimeProvider clock)
{
    public const int LifetimeSeconds = 120;
    private readonly object gate = new();
    private byte[]? activeHash;
    private DateTimeOffset expiresAt;

    public PairingInvitation Issue()
    {
        var token = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        lock (gate)
        {
            activeHash = Hash(token);
            expiresAt = clock.GetUtcNow().AddSeconds(LifetimeSeconds);
            return new(token, expiresAt);
        }
    }

    public bool TryConsume(string token)
    {
        lock (gate)
        {
            if (activeHash is null) return false;
            if (clock.GetUtcNow() >= expiresAt)
            {
                activeHash = null;
                return false;
            }
            if (!CryptographicOperations.FixedTimeEquals(activeHash, Hash(token))) return false;
            activeHash = null; // Consumo atômico: duas requisições não abrem duas sessões.
            return true;
        }
    }

    public void Revoke()
    {
        lock (gate) activeHash = null;
    }

    private static byte[] Hash(string token) => SHA256.HashData(Encoding.UTF8.GetBytes(token));
}

public sealed record PairingInvitation(string Token, DateTimeOffset ExpiresAt);
