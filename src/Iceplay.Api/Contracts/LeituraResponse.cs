namespace Iceplay.Api.Contracts;

public sealed record LeituraResponse(
    int Id,
    int GeladeiraId,
    double TemperaturaC,
    bool PortaAberta,
    DateTime MedidoEmUtc,
    DateTime RecebidoEmUtc,
    string Origem);
