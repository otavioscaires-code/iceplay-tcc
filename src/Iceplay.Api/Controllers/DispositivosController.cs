using Iceplay.Api.Contracts;
using Iceplay.Api.Data;
using Iceplay.Api.Devices;
using Iceplay.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Iceplay.Api.Controllers;

[ApiController]
[Route("api/geladeiras/{geladeiraId:int}/dispositivos")]
public sealed class DispositivosController(IceplayDbContext database, TimeProvider clock) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<DispositivoResponse>>> Listar(int geladeiraId, CancellationToken ct)
    {
        if (!await database.Geladeiras.AnyAsync(g => g.Id == geladeiraId, ct)) return NaoEncontrado();
        return Ok((await database.Dispositivos.AsNoTracking().Where(d => d.GeladeiraId == geladeiraId)
            .OrderByDescending(d => d.Id).ToListAsync(ct)).Select(Resposta).ToList());
    }

    [HttpGet("{dispositivoId:int}")]
    public async Task<ActionResult<DispositivoResponse>> Obter(int geladeiraId, int dispositivoId, CancellationToken ct)
    {
        var device = await database.Dispositivos.AsNoTracking().SingleOrDefaultAsync(d => d.Id == dispositivoId && d.GeladeiraId == geladeiraId, ct);
        return device is null ? NaoEncontrado() : Ok(Resposta(device));
    }

    [HttpPost]
    public async Task<ActionResult<EmitirCredencialResponse>> Criar(int geladeiraId, CriarDispositivoRequest request, CancellationToken ct)
    {
        await using var transaction = await database.Database.BeginTransactionAsync(ct);
        if (!await database.Geladeiras.AnyAsync(g => g.Id == geladeiraId, ct)) return NaoEncontrado();
        if (await database.Dispositivos.AnyAsync(d => d.GeladeiraId == geladeiraId && d.RevogadoEmUtc == null, ct))
            return Problem(statusCode: 409, title: "Já existe dispositivo ativo.", detail: "Revogue a credencial anterior antes de emitir outra.");
        var segredo = DispositivoCredentials.NovoSegredo();
        var device = new Dispositivo { GeladeiraId = geladeiraId, Nome = request.Nome!.Trim(), CriadoEmUtc = clock.GetUtcNow().UtcDateTime,
            CredencialHash = DispositivoCredentials.Hash(segredo) };
        database.Dispositivos.Add(device);
        await database.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return CreatedAtAction(nameof(Obter), new { geladeiraId, dispositivoId = device.Id },
            new EmitirCredencialResponse(Resposta(device), $"icp_{device.Id}_{segredo}"));
    }

    [HttpPost("{dispositivoId:int}/revogar")]
    public async Task<ActionResult<DispositivoResponse>> Revogar(int geladeiraId, int dispositivoId, CancellationToken ct)
    {
        await using var transaction = await database.Database.BeginTransactionAsync(ct);
        var device = await database.Dispositivos.SingleOrDefaultAsync(d => d.Id == dispositivoId && d.GeladeiraId == geladeiraId, ct);
        if (device is null) return NaoEncontrado();
        device.RevogadoEmUtc ??= clock.GetUtcNow().UtcDateTime;
        await database.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(Resposta(device));
    }

    private ObjectResult NaoEncontrado() => Problem(statusCode: 404, title: "Geladeira ou dispositivo não encontrado.");
    private static DispositivoResponse Resposta(Dispositivo device) => new(device.Id, device.GeladeiraId, device.Nome, device.CriadoEmUtc, device.RevogadoEmUtc);
}
