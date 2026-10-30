using System.ComponentModel.DataAnnotations;

namespace Iceplay.Api.Models;

public sealed class Geladeira
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Nome { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Localizacao { get; set; }

    public DateTime CriadoEmUtc { get; set; } = DateTime.UtcNow;
}
