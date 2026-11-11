namespace Iceplay.Api.Models;

public sealed class ConfiguracaoGeladeira
{
    public int GeladeiraId { get; set; }
    public double TemperaturaMinimaC { get; set; }
    public double TemperaturaMaximaC { get; set; }
    public int ToleranciaPortaAbertaSegundos { get; set; }
    public int AusenciaLeiturasSegundos { get; set; }
    public OrigemLeitura OrigemMonitorada { get; set; }
    public bool MonitoramentoAtivo { get; set; }
    public DateTime? InicioMonitoramentoEmUtc { get; set; }
    public DateTime AtualizadoEmUtc { get; set; }
}
