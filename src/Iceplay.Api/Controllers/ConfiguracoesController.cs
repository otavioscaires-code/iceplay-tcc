using Iceplay.Api.Contracts;
using Iceplay.Api.Data;
using Iceplay.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Iceplay.Api.Controllers;

[ApiController]
[Route("api/geladeiras/{id:int}/configuracao")]
public sealed class ConfiguracoesController(IceplayDbContext database) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ConfiguracaoGeladeiraResponse>> Obter(int id, CancellationToken cancellationToken)
    {
        // Uma consulta distingue equipamento inexistente de equipamento sem parâmetros,
        // sem inserir valores ao consultar e sem corrida entre duas consultas separadas.
        var result = await (
            from geladeira in database.Geladeiras.AsNoTracking()
            where geladeira.Id == id
            join configuracao in database.ConfiguracoesGeladeiras.AsNoTracking()
                on geladeira.Id equals configuracao.GeladeiraId into configuracoes
            from configuracao in configuracoes.DefaultIfEmpty()
            select new { geladeira.Id, Configuracao = configuracao })
            .SingleOrDefaultAsync(cancellationToken);

        return result is null
            ? GeladeiraNaoEncontrada()
            : Ok(ParaResposta(result.Id, result.Configuracao));
    }

    [HttpPut]
    public async Task<ActionResult<ConfiguracaoGeladeiraResponse>> Salvar(
        int id, SalvarConfiguracaoRequest request, CancellationToken cancellationToken)
    {
        // A transação de escrita SQLite serializa o ciclo consultar/criar/atualizar.
        // Assim, dois primeiros PUTs não disputam a mesma chave e a geladeira não
        // pode desaparecer entre a verificação do vínculo e a gravação.
        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        if (!await database.Geladeiras.AsNoTracking().AnyAsync(item => item.Id == id, cancellationToken))
        {
            return GeladeiraNaoEncontrada();
        }

        var configuracao = await database.ConfiguracoesGeladeiras
            .SingleOrDefaultAsync(item => item.GeladeiraId == id, cancellationToken);
        var criada = configuracao is null;
        configuracao ??= new ConfiguracaoGeladeira { GeladeiraId = id };
        var origem = Enum.Parse<OrigemLeitura>(request.OrigemMonitorada!);
        var agora = DateTime.UtcNow;

        // Editar os limites não adia o futuro prazo de ausência de leituras.
        // Ativar ou mudar a origem inicia um acompanhamento novo, sem herdar
        // o tempo de outra origem. Inativo não possui início de acompanhamento.
        configuracao.InicioMonitoramentoEmUtc = !request.MonitoramentoAtivo!.Value
            ? null
            : !configuracao.MonitoramentoAtivo || configuracao.OrigemMonitorada != origem
                ? agora
                : configuracao.InicioMonitoramentoEmUtc;
        configuracao.TemperaturaMinimaC = request.TemperaturaMinimaC!.Value;
        configuracao.TemperaturaMaximaC = request.TemperaturaMaximaC!.Value;
        configuracao.ToleranciaPortaAbertaSegundos = request.ToleranciaPortaAbertaSegundos!.Value;
        configuracao.AusenciaLeiturasSegundos = request.AusenciaLeiturasSegundos!.Value;
        configuracao.OrigemMonitorada = origem;
        configuracao.MonitoramentoAtivo = request.MonitoramentoAtivo.Value;
        configuracao.AtualizadoEmUtc = agora;
        if (criada) database.ConfiguracoesGeladeiras.Add(configuracao);

        await database.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        var resposta = ParaResposta(id, configuracao);
        return criada ? CreatedAtAction(nameof(Obter), new { id }, resposta) : Ok(resposta);
    }

    private ObjectResult GeladeiraNaoEncontrada() => Problem(
        statusCode: StatusCodes.Status404NotFound,
        title: "Geladeira não encontrada.",
        detail: "Não existe uma geladeira com o identificador informado.");

    private static ConfiguracaoGeladeiraResponse ParaResposta(int id, ConfiguracaoGeladeira? configuracao) =>
        new(id, configuracao is null ? null : new ParametrosMonitoramentoResponse(
            configuracao.TemperaturaMinimaC, configuracao.TemperaturaMaximaC,
            configuracao.ToleranciaPortaAbertaSegundos, configuracao.AusenciaLeiturasSegundos,
            configuracao.OrigemMonitorada.ToString(), configuracao.MonitoramentoAtivo,
            configuracao.InicioMonitoramentoEmUtc, configuracao.AtualizadoEmUtc));
}
