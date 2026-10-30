using System.ComponentModel.DataAnnotations;

namespace Iceplay.Api.Contracts;

public sealed class SalvarGeladeiraRequest
{
    [Required(ErrorMessage = "O nome é obrigatório.")]
    [MaxLength(100, ErrorMessage = "O nome deve ter no máximo 100 caracteres.")]
    public string? Nome { get; init; }

    [MaxLength(200, ErrorMessage = "A localização deve ter no máximo 200 caracteres.")]
    public string? Localizacao { get; init; }
}
