using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Iceplay.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Iceplay.Api.Devices;

public sealed record EmissorAutenticado(int DispositivoId, int GeladeiraId);

public sealed class DispositivoCredentials(IceplayDbContext database)
{
    private static readonly object ItemKey = new();
    public static EmissorAutenticado? Obter(HttpContext context) => context.Items.TryGetValue(ItemKey, out var value) ? value as EmissorAutenticado : null;
    public static string NovoSegredo() => Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(32));
    public static byte[] Hash(string segredo) => SHA256.HashData(Encoding.UTF8.GetBytes(segredo));

    public async Task<bool> AutenticarAsync(HttpContext context)
    {
        var header = context.Request.Headers.Authorization.ToString();
        if (header.Length > 160 || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return false;
        var parts = header[7..].Split('_');
        if (parts.Length != 3 || parts[0] != "icp" || !int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var id)
            || id <= 0 || parts[2].Length != 64 || parts[2].Any(c => !char.IsAsciiHexDigit(c))) return false;
        var dispositivo = await database.Dispositivos.AsNoTracking().SingleOrDefaultAsync(d => d.Id == id && d.RevogadoEmUtc == null, context.RequestAborted);
        if (dispositivo is null || !CryptographicOperations.FixedTimeEquals(dispositivo.CredencialHash, Hash(parts[2]))) return false;
        context.Items[ItemKey] = new EmissorAutenticado(dispositivo.Id, dispositivo.GeladeiraId);
        return true;
    }
}
