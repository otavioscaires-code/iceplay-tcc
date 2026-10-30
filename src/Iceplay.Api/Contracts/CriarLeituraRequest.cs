using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json.Serialization;
using Iceplay.Api.Models;

namespace Iceplay.Api.Contracts;

public sealed class CriarLeituraRequest : IValidatableObject
{
    private static readonly string[] FormatosUtc =
    [
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.f'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.ff'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.fff'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.ffff'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.fffff'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.ffffff'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'"
    ];

    [Required(ErrorMessage = "O identificador da geladeira é obrigatório.")]
    [Range(1, int.MaxValue, ErrorMessage = "O identificador da geladeira deve ser maior que zero.")]
    [JsonNumberHandling(JsonNumberHandling.Strict)]
    public int? GeladeiraId { get; init; }

    [Required(ErrorMessage = "A temperatura é obrigatória.")]
    [JsonNumberHandling(JsonNumberHandling.Strict)]
    public double? TemperaturaC { get; init; }

    [Required(ErrorMessage = "O estado da porta é obrigatório.")]
    public bool? PortaAberta { get; init; }

    [Required(ErrorMessage = "O instante da medição é obrigatório.")]
    public string? MedidoEmUtc { get; init; }

    [Required(ErrorMessage = "A origem da leitura é obrigatória.")]
    public string? Origem { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (TemperaturaC.HasValue && !double.IsFinite(TemperaturaC.Value))
        {
            yield return new ValidationResult(
                "A temperatura deve ser um número finito.", [nameof(TemperaturaC)]);
        }

        if (MedidoEmUtc is not null && !TentarObterMedidoEmUtc(out _))
        {
            yield return new ValidationResult(
                "Informe a medição em UTC, no formato ISO 8601 com segundos e sufixo Z; use até sete casas decimais.",
                [nameof(MedidoEmUtc)]);
        }

        if (Origem is not null && Origem is not (nameof(OrigemLeitura.Simulacao) or nameof(OrigemLeitura.Hardware)))
        {
            yield return new ValidationResult(
                "A origem deve ser exatamente Simulacao ou Hardware.", [nameof(Origem)]);
        }
    }

    public bool TentarObterMedidoEmUtc(out DateTime medidoEmUtc) => DateTime.TryParseExact(
        MedidoEmUtc,
        FormatosUtc,
        CultureInfo.InvariantCulture,
        DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
        out medidoEmUtc);
}
