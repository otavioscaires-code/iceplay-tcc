namespace Iceplay.Api.Models;

public sealed class Leitura
{
    public int Id { get; set; }
    public int GeladeiraId { get; set; }
    public double TemperaturaC { get; set; }
    public bool PortaAberta { get; set; }
    public DateTime MedidoEmUtc { get; set; }
    public DateTime RecebidoEmUtc { get; set; }
    public OrigemLeitura Origem { get; set; }
}
