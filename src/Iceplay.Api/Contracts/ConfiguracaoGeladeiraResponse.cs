namespace Iceplay.Api.Contracts;

public sealed record ConfiguracaoGeladeiraResponse(
    int GeladeiraId,
    ParametrosMonitoramentoResponse? Configuracao);

public sealed record ParametrosMonitoramentoResponse(
    double TemperaturaMinimaC,
    double TemperaturaMaximaC,
    int ToleranciaPortaAbertaSegundos,
    int AusenciaLeiturasSegundos,
    string OrigemMonitorada,
    bool MonitoramentoAtivo,
    DateTime? InicioMonitoramentoEmUtc,
    DateTime AtualizadoEmUtc);
