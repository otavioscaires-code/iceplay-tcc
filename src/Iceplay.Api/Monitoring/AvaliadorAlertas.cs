using Iceplay.Api.Data;
using Iceplay.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Iceplay.Api.Monitoring;

public sealed class AvaliadorAlertas(IceplayDbContext database, TimeProvider clock)
{
    public async Task AvaliarAsync(CancellationToken cancellationToken = default)
    {
        var ids = await database.ConfiguracoesGeladeiras.AsNoTracking()
            .Select(item => item.GeladeiraId).ToListAsync(cancellationToken);
        foreach (var id in ids)
        {
            await AvaliarGeladeiraAsync(id, cancellationToken);
            database.ChangeTracker.Clear();
        }
    }

    private async Task AvaliarGeladeiraAsync(int id, CancellationToken ct)
    {
        await using var transaction = await database.Database.BeginTransactionAsync(ct);
        var config = await database.ConfiguracoesGeladeiras.SingleOrDefaultAsync(c => c.GeladeiraId == id, ct);
        if (config is null) return;
        var agora = clock.GetUtcNow().UtcDateTime;
        var estado = await database.EstadosMonitoramento.SingleOrDefaultAsync(e => e.GeladeiraId == id, ct);
        var abertos = await database.Alertas.Where(a => a.GeladeiraId == id && a.EncerradoEmUtc == null).ToListAsync(ct);

        void Encerrar(TipoAlerta? tipo, MotivoEncerramento motivo)
        {
            foreach (var alerta in abertos.Where(a => a.EncerradoEmUtc == null && (tipo is null || a.Tipo == tipo)))
            {
                alerta.EncerradoEmUtc = agora;
                alerta.MotivoEncerramento = motivo;
            }
        }

        if (!config.MonitoramentoAtivo)
        {
            Encerrar(null, MotivoEncerramento.MonitoramentoDesativado);
            if (estado is not null) database.EstadosMonitoramento.Remove(estado);
            await database.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return;
        }

        if (estado is null || estado.ConfiguracaoEmUtc != config.AtualizadoEmUtc)
        {
            Encerrar(null, MotivoEncerramento.ConfiguracaoAlterada);
            estado ??= new EstadoMonitoramento { GeladeiraId = id };
            if (database.Entry(estado).State == EntityState.Detached) database.EstadosMonitoramento.Add(estado);
            estado.ConfiguracaoEmUtc = config.AtualizadoEmUtc;
            estado.UltimaMedicaoEmUtc = null;
            estado.UltimaLeituraId = 0;
            estado.InicioPortaAbertaEmUtc = null;
        }

        void Abrir(TipoAlerta tipo, DateTime inicio, DateTime evidencia, Leitura? leitura = null)
        {
            var existente = abertos.SingleOrDefault(a => a.EncerradoEmUtc == null && a.Tipo == tipo);
            if (existente is not null)
            {
                existente.UltimaEvidenciaEmUtc = evidencia;
                return;
            }
            var alerta = new Alerta
            {
                GeladeiraId = id, Origem = config.OrigemMonitorada, Tipo = tipo,
                Gravidade = tipo == TipoAlerta.TemperaturaForaFaixa ? GravidadeAlerta.Critico : GravidadeAlerta.Atencao,
                InicioCondicaoEmUtc = inicio, AbertoEmUtc = agora, UltimaEvidenciaEmUtc = evidencia,
                LeituraAberturaId = leitura?.Id, TemperaturaAberturaC = leitura?.TemperaturaC,
                TemperaturaMinimaC = config.TemperaturaMinimaC, TemperaturaMaximaC = config.TemperaturaMaximaC,
                ToleranciaPortaAbertaSegundos = config.ToleranciaPortaAbertaSegundos,
                AusenciaLeiturasSegundos = config.AusenciaLeiturasSegundos
            };
            abertos.Add(alerta);
            database.Alertas.Add(alerta);
        }

        var inicioJanela = config.AtualizadoEmUtc;
        var ultimoInstante = estado.UltimaMedicaoEmUtc;
        var ultimoId = estado.UltimaLeituraId;
        // Lote limitado evita carregar todo um histórico. O checkpoint somente
        // avança; inserções atrasadas permanecem no histórico, sem reverter regras.
        var novas = await database.Leituras.AsNoTracking().Where(l => l.GeladeiraId == id
                && l.Origem == config.OrigemMonitorada && l.MedidoEmUtc >= inicioJanela
                && (ultimoInstante == null || l.MedidoEmUtc > ultimoInstante
                    || (l.MedidoEmUtc == ultimoInstante && l.Id > ultimoId)))
            .OrderBy(l => l.MedidoEmUtc).ThenBy(l => l.Id).Take(500).ToListAsync(ct);
        foreach (var leitura in novas)
        {
            var lacuna = estado.UltimaMedicaoEmUtc.HasValue &&
                (leitura.MedidoEmUtc - estado.UltimaMedicaoEmUtc.Value).TotalSeconds >= config.AusenciaLeiturasSegundos;
            var antiga = (agora - leitura.MedidoEmUtc).TotalSeconds >= config.AusenciaLeiturasSegundos;
            if (lacuna || antiga)
            {
                Encerrar(TipoAlerta.PortaAberta, MotivoEncerramento.SemDadosRecentes);
                Encerrar(TipoAlerta.TemperaturaForaFaixa, MotivoEncerramento.SemDadosRecentes);
                estado.InicioPortaAbertaEmUtc = null;
            }
            if (!antiga)
            {
                if (leitura.TemperaturaC < config.TemperaturaMinimaC || leitura.TemperaturaC > config.TemperaturaMaximaC)
                    Abrir(TipoAlerta.TemperaturaForaFaixa, leitura.MedidoEmUtc, leitura.MedidoEmUtc, leitura);
                else Encerrar(TipoAlerta.TemperaturaForaFaixa, MotivoEncerramento.CondicaoNormalizada);

                if (leitura.PortaAberta)
                {
                    estado.InicioPortaAbertaEmUtc ??= leitura.MedidoEmUtc;
                    if ((leitura.MedidoEmUtc - estado.InicioPortaAbertaEmUtc.Value).TotalSeconds >= config.ToleranciaPortaAbertaSegundos)
                        Abrir(TipoAlerta.PortaAberta, estado.InicioPortaAbertaEmUtc.Value, leitura.MedidoEmUtc, leitura);
                }
                else
                {
                    estado.InicioPortaAbertaEmUtc = null;
                    Encerrar(TipoAlerta.PortaAberta, MotivoEncerramento.CondicaoNormalizada);
                }
            }
            estado.UltimaMedicaoEmUtc = leitura.MedidoEmUtc;
            estado.UltimaLeituraId = leitura.Id;
        }

        // Consulta independente do lote: backlog/recebimento atrasado não deve
        // transformar uma amostra antiga em prova de comunicação recente.
        var ultima = await database.Leituras.AsNoTracking().Where(l => l.GeladeiraId == id
                && l.Origem == config.OrigemMonitorada && l.MedidoEmUtc >= config.InicioMonitoramentoEmUtc)
            .OrderByDescending(l => l.MedidoEmUtc).ThenByDescending(l => l.Id)
            .Select(l => (DateTime?)l.MedidoEmUtc).FirstOrDefaultAsync(ct);
        var referencia = ultima ?? config.InicioMonitoramentoEmUtc!.Value;
        if ((agora - referencia).TotalSeconds >= config.AusenciaLeiturasSegundos)
        {
            Encerrar(TipoAlerta.PortaAberta, MotivoEncerramento.SemDadosRecentes);
            Encerrar(TipoAlerta.TemperaturaForaFaixa, MotivoEncerramento.SemDadosRecentes);
            estado.InicioPortaAbertaEmUtc = null;
            Abrir(TipoAlerta.AusenciaLeituras, referencia.AddSeconds(config.AusenciaLeiturasSegundos), referencia);
        }
        else Encerrar(TipoAlerta.AusenciaLeituras, MotivoEncerramento.CondicaoNormalizada);

        // Atualizar um episódio existente e abrir outro com a mesma chave no
        // mesmo ciclo exige que o encerramento seja persistido antes do insert.
        var novos = database.ChangeTracker.Entries<Alerta>().Where(e => e.State == EntityState.Added).ToList();
        foreach (var novo in novos) novo.State = EntityState.Detached;
        await database.SaveChangesAsync(ct);
        foreach (var novo in novos) database.Alertas.Add(novo.Entity);
        await database.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
