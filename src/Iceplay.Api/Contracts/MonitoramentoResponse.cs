namespace Iceplay.Api.Contracts;

public sealed record MonitoramentoResponse(
    DateTime ConsultadoEmUtc,
    string Origem,
    List<MonitoramentoGeladeiraResponse> Geladeiras);

public sealed record MonitoramentoGeladeiraResponse(
    int Id,
    string Nome,
    string? Localizacao,
    LeituraResponse? UltimaLeitura);
