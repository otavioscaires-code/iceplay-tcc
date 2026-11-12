using System.ComponentModel.DataAnnotations;

namespace Iceplay.Api.Contracts;

public sealed record DispositivoResponse(int Id, int GeladeiraId, string Nome, DateTime CriadoEmUtc, DateTime? RevogadoEmUtc);
public sealed record EmitirCredencialResponse(DispositivoResponse Dispositivo, string Credencial);

public sealed class CriarDispositivoRequest
{
    [Required(ErrorMessage = "Informe o nome do dispositivo.")]
    [StringLength(100)]
    public string? Nome { get; init; }
}
