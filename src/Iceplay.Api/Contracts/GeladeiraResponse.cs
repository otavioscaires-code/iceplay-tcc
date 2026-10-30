namespace Iceplay.Api.Contracts;

public sealed record GeladeiraResponse(
    int Id,
    string Nome,
    string? Localizacao,
    DateTime CriadoEmUtc);
