using System.ComponentModel.DataAnnotations;
using Iceplay.Api.Contracts;
using Iceplay.Api.Data;
using Iceplay.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Iceplay.Api.Controllers;

[ApiController]
[Route("api/monitoramento")]
public sealed class MonitoramentoController(IceplayDbContext database) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<MonitoramentoResponse>> Consultar(
        [FromQuery, Required] string? origem,
        CancellationToken cancellationToken)
    {
        if (origem is not (nameof(OrigemLeitura.Simulacao) or nameof(OrigemLeitura.Hardware)))
        {
            ModelState.AddModelError(nameof(origem), "Informe exatamente Simulacao ou Hardware.");
            return ValidationProblem(ModelState);
        }

        var origemSelecionada = origem == nameof(OrigemLeitura.Simulacao)
            ? OrigemLeitura.Simulacao
            : OrigemLeitura.Hardware;

        // A subconsulta retorna somente um ID por geladeira. O LEFT JOIN também
        // mantém equipamentos sem leituras, sem carregar o histórico na memória.
        var linhas = await (
            from geladeira in database.Geladeiras.AsNoTracking()
            join leitura in database.Leituras.AsNoTracking()
                on database.Leituras
                    .Where(item => item.GeladeiraId == geladeira.Id && item.Origem == origemSelecionada)
                    .OrderByDescending(item => item.MedidoEmUtc)
                    .ThenByDescending(item => item.Id)
                    .Select(item => (int?)item.Id)
                    .FirstOrDefault()
                equals (int?)leitura.Id into correspondencias
            from leitura in correspondencias.DefaultIfEmpty()
            orderby geladeira.Id
            select new { Geladeira = geladeira, Leitura = leitura }
        ).ToListAsync(cancellationToken);

        var geladeiras = linhas.Select(linha => new MonitoramentoGeladeiraResponse(
            linha.Geladeira.Id,
            linha.Geladeira.Nome,
            linha.Geladeira.Localizacao,
            linha.Leitura is null ? null : new LeituraResponse(
                linha.Leitura.Id,
                linha.Leitura.GeladeiraId,
                linha.Leitura.TemperaturaC,
                linha.Leitura.PortaAberta,
                linha.Leitura.MedidoEmUtc,
                linha.Leitura.RecebidoEmUtc,
                linha.Leitura.Origem.ToString())
        )).ToList();

        return Ok(new MonitoramentoResponse(DateTime.UtcNow, origem, geladeiras));
    }
}
