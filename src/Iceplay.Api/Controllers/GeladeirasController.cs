using Iceplay.Api.Contracts;
using Iceplay.Api.Data;
using Iceplay.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Iceplay.Api.Controllers;

[ApiController]
[Route("api/geladeiras")]
public sealed class GeladeirasController(IceplayDbContext database) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<GeladeiraResponse>>> Listar(CancellationToken cancellationToken)
    {
        var geladeiras = await database.Geladeiras
            .AsNoTracking()
            .OrderBy(item => item.Id)
            .Select(item => new GeladeiraResponse(item.Id, item.Nome, item.Localizacao, item.CriadoEmUtc))
            .ToListAsync(cancellationToken);

        return Ok(geladeiras);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<GeladeiraResponse>> ObterPorId(int id, CancellationToken cancellationToken)
    {
        var geladeira = await database.Geladeiras
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return geladeira is null ? GeladeiraNaoEncontrada() : Ok(ParaResposta(geladeira));
    }

    [HttpPost]
    public async Task<ActionResult<GeladeiraResponse>> Criar(
        SalvarGeladeiraRequest request,
        CancellationToken cancellationToken)
    {
        var geladeira = new Geladeira
        {
            Nome = request.Nome!.Trim(),
            Localizacao = NormalizarLocalizacao(request.Localizacao)
        };

        database.Geladeiras.Add(geladeira);
        await database.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(ObterPorId), new { id = geladeira.Id }, ParaResposta(geladeira));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<GeladeiraResponse>> Atualizar(
        int id,
        SalvarGeladeiraRequest request,
        CancellationToken cancellationToken)
    {
        var geladeira = await database.Geladeiras
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (geladeira is null)
        {
            return GeladeiraNaoEncontrada();
        }

        // Somente os campos editáveis são alterados; Id e criação pertencem ao servidor.
        database.Geladeiras.Attach(geladeira);
        geladeira.Nome = request.Nome!.Trim();
        geladeira.Localizacao = NormalizarLocalizacao(request.Localizacao);

        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await Existe(id, cancellationToken))
            {
                return GeladeiraNaoEncontrada();
            }

            throw;
        }

        return Ok(ParaResposta(geladeira));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id, CancellationToken cancellationToken)
    {
        var geladeira = await database.Geladeiras
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (geladeira is null)
        {
            return GeladeiraNaoEncontrada();
        }

        if (await database.Leituras.AsNoTracking().AnyAsync(item => item.GeladeiraId == id, cancellationToken))
        {
            return GeladeiraComLeituras();
        }

        database.Geladeiras.Remove(geladeira);

        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await Existe(id, cancellationToken))
            {
                return GeladeiraNaoEncontrada();
            }

            throw;
        }
        catch (DbUpdateException exception) when (
            exception.InnerException is SqliteException { SqliteExtendedErrorCode: 787 or 1811 })
        {
            // RESTRICT pode produzir o código de trigger (1811), além de FK (787).
            // Confirmar o vínculo evita traduzir outras falhas de trigger para 409.
            if (await database.Leituras.AsNoTracking().AnyAsync(item => item.GeladeiraId == id, cancellationToken))
            {
                return GeladeiraComLeituras();
            }

            throw;
        }

        return NoContent();
    }

    private Task<bool> Existe(int id, CancellationToken cancellationToken) =>
        database.Geladeiras.AsNoTracking().AnyAsync(item => item.Id == id, cancellationToken);

    private ObjectResult GeladeiraNaoEncontrada() => Problem(
        statusCode: StatusCodes.Status404NotFound,
        title: "Geladeira não encontrada.",
        detail: "Não existe uma geladeira com o identificador informado.");

    private ObjectResult GeladeiraComLeituras() => Problem(
        statusCode: StatusCodes.Status409Conflict,
        title: "Geladeira possui leituras.",
        detail: "O cadastro não pode ser excluído porque possui leituras armazenadas.");

    private static GeladeiraResponse ParaResposta(Geladeira geladeira) =>
        new(geladeira.Id, geladeira.Nome, geladeira.Localizacao, geladeira.CriadoEmUtc);

    private static string? NormalizarLocalizacao(string? localizacao) =>
        string.IsNullOrWhiteSpace(localizacao) ? null : localizacao.Trim();
}
