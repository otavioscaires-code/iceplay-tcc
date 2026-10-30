using System.ComponentModel.DataAnnotations;
using System.Globalization;
using Iceplay.Api.Models;

namespace Iceplay.Api.Contracts;

public sealed class ConsultarHistoricoRequest : IValidatableObject
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

    [Required(ErrorMessage = "Informe a geladeira para consultar o histórico.")]
    [Range(1, int.MaxValue, ErrorMessage = "O identificador da geladeira deve ser maior que zero.")]
    public int? GeladeiraId { get; init; }

    [Required(ErrorMessage = "Informe a origem das leituras.")]
    public string? Origem { get; init; }

    [DisplayFormat(ConvertEmptyStringToNull = false)]
    public string? InicioUtc { get; init; }

    [DisplayFormat(ConvertEmptyStringToNull = false)]
    public string? FimUtc { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "A página deve ser maior que zero.")]
    public int Pagina { get; init; } = 1;

    [Range(1, 100, ErrorMessage = "O tamanho da página deve estar entre 1 e 100.")]
    public int TamanhoPagina { get; init; } = 50;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Origem is not (nameof(OrigemLeitura.Simulacao) or nameof(OrigemLeitura.Hardware)))
            yield return new ValidationResult("Informe exatamente Simulacao ou Hardware.", [nameof(Origem)]);

        var inicioValido = TentarConverter(InicioUtc, out var inicio);
        var fimValido = TentarConverter(FimUtc, out var fim);
        if (!inicioValido)
            yield return new ValidationResult("Informe início em UTC ISO 8601, com segundos e sufixo Z (até sete casas decimais).", [nameof(InicioUtc)]);
        if (!fimValido)
            yield return new ValidationResult("Informe fim em UTC ISO 8601, com segundos e sufixo Z (até sete casas decimais).", [nameof(FimUtc)]);
        if (inicioValido && fimValido && inicio > fim)
            yield return new ValidationResult("O início não pode ser posterior ao fim.", [nameof(InicioUtc), nameof(FimUtc)]);

        // Skip recebe int; calcular primeiro em long impede overflow silencioso.
        if (Pagina > 0 && TamanhoPagina is >= 1 and <= 100 && (Pagina - 1L) * TamanhoPagina > int.MaxValue)
            yield return new ValidationResult("A página excede o deslocamento suportado. Reduza a página ou filtre o período.", [nameof(Pagina)]);
    }

    public DateTime? ObterInicioUtc() => TentarConverter(InicioUtc, out var value) ? value : null;
    public DateTime? ObterFimUtc() => TentarConverter(FimUtc, out var value) ? value : null;

    private static bool TentarConverter(string? value, out DateTime? instante)
    {
        instante = null;
        if (value is null) return true;
        if (!DateTime.TryParseExact(value, FormatosUtc, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed)) return false;
        instante = parsed;
        return true;
    }
}
