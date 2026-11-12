namespace Iceplay.Api.Models;

public sealed class Dispositivo
{
    public int Id { get; set; }
    public int GeladeiraId { get; set; }
    public string Nome { get; set; } = "";
    public byte[] CredencialHash { get; set; } = [];
    public DateTime CriadoEmUtc { get; set; }
    public DateTime? RevogadoEmUtc { get; set; }
}
