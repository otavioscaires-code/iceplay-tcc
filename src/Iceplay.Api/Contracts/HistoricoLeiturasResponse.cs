namespace Iceplay.Api.Contracts;

public sealed record HistoricoLeiturasResponse(
    int GeladeiraId,
    string Origem,
    DateTime? InicioUtc,
    DateTime? FimUtc,
    int Pagina,
    int TamanhoPagina,
    long TotalItens,
    long TotalPaginas,
    List<LeituraResponse> Itens);
