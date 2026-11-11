using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Iceplay.Api.Models;

namespace Iceplay.Api.Contracts;

public sealed class SalvarConfiguracaoRequest : IValidatableObject
{
    [Required(ErrorMessage = "A temperatura mínima é obrigatória.")]
    [JsonNumberHandling(JsonNumberHandling.Strict)]
    public double? TemperaturaMinimaC { get; init; }

    [Required(ErrorMessage = "A temperatura máxima é obrigatória.")]
    [JsonNumberHandling(JsonNumberHandling.Strict)]
    public double? TemperaturaMaximaC { get; init; }

    [Required(ErrorMessage = "A tolerância de porta aberta é obrigatória.")]
    [Range(1, int.MaxValue, ErrorMessage = "A tolerância de porta aberta deve ser um inteiro positivo em segundos.")]
    [JsonNumberHandling(JsonNumberHandling.Strict)]
    public int? ToleranciaPortaAbertaSegundos { get; init; }

    [Required(ErrorMessage = "O prazo de ausência de leituras é obrigatório.")]
    [Range(1, int.MaxValue, ErrorMessage = "O prazo de ausência de leituras deve ser um inteiro positivo em segundos.")]
    [JsonNumberHandling(JsonNumberHandling.Strict)]
    public int? AusenciaLeiturasSegundos { get; init; }

    [Required(ErrorMessage = "A origem monitorada é obrigatória.")]
    public string? OrigemMonitorada { get; init; }

    [Required(ErrorMessage = "Informe se o monitoramento deve ficar habilitado.")]
    public bool? MonitoramentoAtivo { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (TemperaturaMinimaC.HasValue && !double.IsFinite(TemperaturaMinimaC.Value))
        {
            yield return new ValidationResult("A temperatura mínima deve ser finita.", [nameof(TemperaturaMinimaC)]);
        }

        if (TemperaturaMaximaC.HasValue && !double.IsFinite(TemperaturaMaximaC.Value))
        {
            yield return new ValidationResult("A temperatura máxima deve ser finita.", [nameof(TemperaturaMaximaC)]);
        }

        if (TemperaturaMinimaC.HasValue && TemperaturaMaximaC.HasValue
            && TemperaturaMinimaC.Value >= TemperaturaMaximaC.Value)
        {
            yield return new ValidationResult(
                "A temperatura mínima deve ser menor que a máxima.",
                [nameof(TemperaturaMinimaC), nameof(TemperaturaMaximaC)]);
        }

        if (OrigemMonitorada is not null
            && OrigemMonitorada is not (nameof(OrigemLeitura.Simulacao) or nameof(OrigemLeitura.Hardware)))
        {
            yield return new ValidationResult(
                "A origem monitorada deve ser exatamente Simulacao ou Hardware.", [nameof(OrigemMonitorada)]);
        }
    }
}
