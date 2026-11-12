using Iceplay.Api.Contracts;
using Iceplay.Api.Data;
using Iceplay.Api.Models;
using Iceplay.Api.Monitoring;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Iceplay.Api.Controllers;

[ApiController]
[Route("api/alertas")]
public sealed class AlertasController(IceplayDbContext database, AvaliacaoStatus status, TimeProvider clock) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AlertasResponse>> Listar([FromQuery] ConsultarAlertasRequest request, CancellationToken ct)
    {
        await database.Database.OpenConnectionAsync(ct);
        await using var transaction = ((SqliteConnection)database.Database.GetDbConnection()).BeginTransaction(deferred: true);
        await using var efTransaction = await database.Database.UseTransactionAsync(transaction, ct);
        if (request.GeladeiraId.HasValue && !await database.Geladeiras.AnyAsync(g => g.Id == request.GeladeiraId.Value, ct))
            return Problem(statusCode: 404, title: "Geladeira não encontrada.");
        var query = database.Alertas.AsNoTracking().AsQueryable();
        if (request.GeladeiraId.HasValue) query = query.Where(a => a.GeladeiraId == request.GeladeiraId.Value);
        if (request.Origem is not null) { var origem = Enum.Parse<OrigemLeitura>(request.Origem); query = query.Where(a => a.Origem == origem); }
        if (request.Tipo is not null) { var tipo = Enum.Parse<TipoAlerta>(request.Tipo); query = query.Where(a => a.Tipo == tipo); }
        if (request.Gravidade is not null) { var gravidade = Enum.Parse<GravidadeAlerta>(request.Gravidade); query = query.Where(a => a.Gravidade == gravidade); }
        if (request.Situacao == "Aberto") query = query.Where(a => a.EncerradoEmUtc == null);
        if (request.Situacao == "Encerrado") query = query.Where(a => a.EncerradoEmUtc != null);
        var inicio = request.ObterInicioUtc();
        var fim = request.ObterFimUtc();
        if (inicio.HasValue) query = query.Where(a => a.AbertoEmUtc >= inicio.Value);
        if (fim.HasValue) query = query.Where(a => a.AbertoEmUtc <= fim.Value);
        var total = await query.LongCountAsync(ct);
        var itens = await ComNomes(query.OrderByDescending(a => a.AbertoEmUtc).ThenByDescending(a => a.Id)
            .Skip(checked((int)((request.Pagina - 1L) * request.TamanhoPagina))).Take(request.TamanhoPagina), ct);
        await transaction.CommitAsync(ct);
        return Ok(new AlertasResponse(request.GeladeiraId, request.Origem, request.Tipo, request.Gravidade,
            request.Situacao, inicio, fim, request.Pagina, request.TamanhoPagina, total,
            (total + request.TamanhoPagina - 1) / request.TamanhoPagina, itens));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AlertaResponse>> Obter(int id, CancellationToken ct)
    {
        var itens = await ComNomes(database.Alertas.AsNoTracking().Where(a => a.Id == id), ct);
        return itens.Count == 0 ? Problem(statusCode: 404, title: "Alerta não encontrado.") : Ok(itens[0]);
    }

    [HttpGet("resumo")]
    public async Task<IActionResult> Resumo([FromQuery] string? origem, CancellationToken ct)
    {
        if (origem is not ("Simulacao" or "Hardware"))
            return Problem(statusCode: 400, title: "Informe exatamente Simulacao ou Hardware.");
        var selecionada = Enum.Parse<OrigemLeitura>(origem);
        await database.Database.OpenConnectionAsync(ct);
        await using var transaction = ((SqliteConnection)database.Database.GetDbConnection()).BeginTransaction(deferred: true);
        await using var efTransaction = await database.Database.UseTransactionAsync(transaction, ct);
        var query = database.Alertas.AsNoTracking().Where(a => a.Origem == selecionada);
        var abertos = await query.CountAsync(a => a.EncerradoEmUtc == null, ct);
        var criticos = await query.CountAsync(a => a.EncerradoEmUtc == null && a.Gravidade == GravidadeAlerta.Critico, ct);
        var monitoradas = await database.ConfiguracoesGeladeiras.CountAsync(c => c.MonitoramentoAtivo && c.OrigemMonitorada == selecionada, ct);
        var total = await database.Geladeiras.CountAsync(ct);
        var recentes = await ComNomes(query.OrderByDescending(a => a.AbertoEmUtc).ThenByDescending(a => a.Id).Take(5), ct);
        await transaction.CommitAsync(ct);
        var agora = clock.GetUtcNow().UtcDateTime;
        return Ok(new { origem, consultadoEmUtc = agora, abertos, criticos, equipamentosMonitorados = monitoradas,
            equipamentosSemMonitoramentoNestaOrigem = total - monitoradas, avaliador = status.Obter(agora), recentes });
    }

    private async Task<List<AlertaResponse>> ComNomes(IQueryable<Alerta> query, CancellationToken ct)
    {
        var values = await (from alerta in query join geladeira in database.Geladeiras.AsNoTracking()
            on alerta.GeladeiraId equals geladeira.Id select new { Alerta = alerta, geladeira.Nome }).ToListAsync(ct);
        return values.Select(v => new AlertaResponse(v.Alerta.Id, v.Alerta.GeladeiraId, v.Nome, v.Alerta.Origem.ToString(),
            v.Alerta.Tipo.ToString(), v.Alerta.Gravidade.ToString(), v.Alerta.EncerradoEmUtc is null ? "Aberto" : "Encerrado",
            v.Alerta.InicioCondicaoEmUtc, v.Alerta.AbertoEmUtc, v.Alerta.UltimaEvidenciaEmUtc, v.Alerta.EncerradoEmUtc,
            v.Alerta.MotivoEncerramento?.ToString(), v.Alerta.LeituraAberturaId, v.Alerta.TemperaturaAberturaC,
            v.Alerta.TemperaturaMinimaC, v.Alerta.TemperaturaMaximaC, v.Alerta.ToleranciaPortaAbertaSegundos,
            v.Alerta.AusenciaLeiturasSegundos)).ToList();
    }
}
