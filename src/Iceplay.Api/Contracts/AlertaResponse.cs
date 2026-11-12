namespace Iceplay.Api.Contracts;

public sealed record AlertaResponse(int Id, int GeladeiraId, string GeladeiraNome, string Origem,
    string Tipo, string Gravidade, string Situacao, DateTime InicioCondicaoEmUtc, DateTime AbertoEmUtc,
    DateTime UltimaEvidenciaEmUtc, DateTime? EncerradoEmUtc, string? MotivoEncerramento,
    int? LeituraAberturaId, double? TemperaturaAberturaC, double TemperaturaMinimaC,
    double TemperaturaMaximaC, int ToleranciaPortaAbertaSegundos, int AusenciaLeiturasSegundos);

public sealed record AlertasResponse(int? GeladeiraId, string? Origem, string? Tipo, string? Gravidade,
    string? Situacao, DateTime? InicioUtc, DateTime? FimUtc, int Pagina, int TamanhoPagina,
    long TotalItens, long TotalPaginas, IReadOnlyList<AlertaResponse> Itens);
