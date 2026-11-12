using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace Iceplay.Api.Contracts;

public sealed class ConsultarAlertasRequest : IValidatableObject
{
    [Range(1, int.MaxValue)] public int? GeladeiraId { get; init; }
    [DisplayFormat(ConvertEmptyStringToNull = false)] public string? Origem { get; init; }
    [DisplayFormat(ConvertEmptyStringToNull = false)] public string? Tipo { get; init; }
    [DisplayFormat(ConvertEmptyStringToNull = false)] public string? Gravidade { get; init; }
    [DisplayFormat(ConvertEmptyStringToNull = false)] public string? Situacao { get; init; }
    [DisplayFormat(ConvertEmptyStringToNull = false)] public string? InicioUtc { get; init; }
    [DisplayFormat(ConvertEmptyStringToNull = false)] public string? FimUtc { get; init; }
    [Range(1, int.MaxValue)] public int Pagina { get; init; } = 1;
    [Range(1, 100)] public int TamanhoPagina { get; init; } = 50;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Origem is not (null or "Simulacao" or "Hardware")) yield return new("Origem inválida.", [nameof(Origem)]);
        if (Tipo is not (null or "TemperaturaForaFaixa" or "PortaAberta" or "AusenciaLeituras")) yield return new("Tipo inválido.", [nameof(Tipo)]);
        if (Gravidade is not (null or "Atencao" or "Critico")) yield return new("Gravidade inválida.", [nameof(Gravidade)]);
        if (Situacao is not (null or "Aberto" or "Encerrado")) yield return new("Situação inválida.", [nameof(Situacao)]);
        var ini = TryUtc(InicioUtc, out var inicio);
        var end = TryUtc(FimUtc, out var fim);
        if (!ini) yield return new("Informe início UTC ISO 8601 com segundos e Z.", [nameof(InicioUtc)]);
        if (!end) yield return new("Informe fim UTC ISO 8601 com segundos e Z.", [nameof(FimUtc)]);
        if (ini && end && inicio > fim) yield return new("Início posterior ao fim.", [nameof(InicioUtc)]);
        if ((Pagina - 1L) * TamanhoPagina > int.MaxValue) yield return new("Página excede o deslocamento suportado.", [nameof(Pagina)]);
    }

    public DateTime? ObterInicioUtc() => TryUtc(InicioUtc, out var value) ? value : null;
    public DateTime? ObterFimUtc() => TryUtc(FimUtc, out var value) ? value : null;

    private static bool TryUtc(string? value, out DateTime? result)
    {
        result = null;
        if (value is null) return true;
        var formats = new[] { "yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd'T'HH:mm:ss.FFFFFFF'Z'" };
        if (!DateTime.TryParseExact(value, formats, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed)) return false;
        result = parsed;
        return true;
    }
}
