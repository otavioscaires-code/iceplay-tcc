namespace Iceplay.Api.Models;

// Checkpoint durável: reiniciar a API não reabre episódios nem perde uma
// sequência de porta que já tenha sido confirmada por medições recentes.
public sealed class EstadoMonitoramento
{
    public int GeladeiraId { get; set; }
    public DateTime ConfiguracaoEmUtc { get; set; }
    public DateTime? UltimaMedicaoEmUtc { get; set; }
    public int UltimaLeituraId { get; set; }
    public DateTime? InicioPortaAbertaEmUtc { get; set; }
}
