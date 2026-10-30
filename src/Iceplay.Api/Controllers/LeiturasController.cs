using Iceplay.Api.Contracts;
using Iceplay.Api.Data;
using Iceplay.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Iceplay.Api.Controllers;

[ApiController]
[Route("api/leituras")]
public sealed class LeiturasController(IceplayDbContext database) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<LeituraResponse>> Criar(
        CriarLeituraRequest request,
        CancellationToken cancellationToken)
    {
        var recebidoEmUtc = DateTime.UtcNow;

        if (!request.TentarObterMedidoEmUtc(out var medidoEmUtc))
        {
            ModelState.AddModelError(nameof(request.MedidoEmUtc), "Informe um instante válido em UTC com sufixo Z.");
            return ValidationProblem(ModelState);
        }

        if (medidoEmUtc > recebidoEmUtc)
        {
            ModelState.AddModelError(nameof(request.MedidoEmUtc), "O instante da medição não pode ser posterior ao recebimento pela API.");
            return ValidationProblem(ModelState);
        }

        var geladeiraId = request.GeladeiraId!.Value;
        if (!await database.Geladeiras.AsNoTracking().AnyAsync(item => item.Id == geladeiraId, cancellationToken))
        {
            return GeladeiraNaoEncontrada();
        }

        var leitura = new Leitura
        {
            GeladeiraId = geladeiraId,
            TemperaturaC = request.TemperaturaC!.Value,
            PortaAberta = request.PortaAberta!.Value,
            MedidoEmUtc = medidoEmUtc,
            RecebidoEmUtc = recebidoEmUtc,
            Origem = request.Origem == nameof(OrigemLeitura.Simulacao)
                ? OrigemLeitura.Simulacao
                : OrigemLeitura.Hardware
        };

        database.Leituras.Add(leitura);
        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (
            exception.InnerException is SqliteException { SqliteExtendedErrorCode: 787 })
        {
            // A geladeira pode ser excluída depois da consulta e antes do insert.
            if (!await database.Geladeiras.AsNoTracking().AnyAsync(item => item.Id == geladeiraId, cancellationToken))
            {
                return GeladeiraNaoEncontrada();
            }

            throw;
        }

        return CreatedAtAction(nameof(ObterPorId), new { id = leitura.Id }, ParaResposta(leitura));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<LeituraResponse>> ObterPorId(int id, CancellationToken cancellationToken)
    {
        var leitura = await database.Leituras
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return leitura is null
            ? Problem(statusCode: StatusCodes.Status404NotFound, title: "Leitura não encontrada.",
                detail: "Não existe uma leitura com o identificador informado.")
            : Ok(ParaResposta(leitura));
    }

    private ObjectResult GeladeiraNaoEncontrada() => Problem(
        statusCode: StatusCodes.Status404NotFound,
        title: "Geladeira não encontrada.",
        detail: "Não existe uma geladeira com o identificador informado para registrar a leitura.");

    private static LeituraResponse ParaResposta(Leitura leitura) => new(
        leitura.Id,
        leitura.GeladeiraId,
        leitura.TemperaturaC,
        leitura.PortaAberta,
        leitura.MedidoEmUtc,
        leitura.RecebidoEmUtc,
        leitura.Origem.ToString());
}
