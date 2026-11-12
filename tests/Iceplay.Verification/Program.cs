using System.Text.Json;
using Iceplay.Api.Data;
using Iceplay.Api.Models;
using Iceplay.Api.Monitoring;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

// Verificação executável sem biblioteca adicional. O relógio controlado existe
// apenas neste processo de testes; a API não oferece rota para alterar o tempo.
var path = Path.GetFullPath(args.Single());
var verificationRoot = Path.GetFullPath(".tools/verification") + Path.DirectorySeparatorChar;
if (!path.StartsWith(verificationRoot, StringComparison.OrdinalIgnoreCase) || File.Exists(path))
    throw new ArgumentException("Use um banco novo dentro de .tools/verification.");
Directory.CreateDirectory(Path.GetDirectoryName(path)!);
var options = new DbContextOptionsBuilder<IceplayDbContext>().UseSqlite($"Data Source={path}").Options;
var clock = new ControlledClock(new DateTimeOffset(2026, 11, 12, 12, 0, 0, TimeSpan.Zero));
var checks = new List<string>();
IceplayDbContext Open() => new(options);
void Check(bool condition, string name)
{
    if (!condition) throw new InvalidOperationException("FALHOU: " + name);
    checks.Add(name);
    Console.WriteLine("PASSOU: " + name);
}
async Task Step()
{
    await using var database = Open();
    await new AvaliadorAlertas(database, clock).AvaliarAsync();
}
async Task<List<Alerta>> Alerts()
{
    await using var database = Open();
    return await database.Alertas.AsNoTracking().OrderBy(a => a.Id).ToListAsync();
}
async Task<Alerta?> Active(TipoAlerta type) => (await Alerts()).SingleOrDefault(a => a.Tipo == type && a.EncerradoEmUtc == null);
async Task Reading(double temperature = 4, bool door = false, OrigemLeitura origin = OrigemLeitura.Simulacao, DateTime? stamp = null)
{
    await using var database = Open();
    database.Leituras.Add(new Leitura { GeladeiraId = 1, TemperaturaC = temperature, PortaAberta = door,
        Origem = origin, MedidoEmUtc = stamp ?? clock.GetUtcNow().UtcDateTime, RecebidoEmUtc = clock.GetUtcNow().UtcDateTime });
    await database.SaveChangesAsync();
    await Step();
}
async Task Configure(Action<ConfiguracaoGeladeira> edit)
{
    clock.Advance(1);
    await using var database = Open();
    var config = await database.ConfiguracoesGeladeiras.SingleAsync(c => c.GeladeiraId == 1);
    edit(config);
    config.AtualizadoEmUtc = clock.GetUtcNow().UtcDateTime;
    await database.SaveChangesAsync();
    await Step();
}

await using (var database = Open())
{
    await database.Database.MigrateAsync();
    database.Geladeiras.AddRange(new Geladeira { Nome = "FIXTURE REGRAS", CriadoEmUtc = clock.GetUtcNow().UtcDateTime },
        new Geladeira { Nome = "SEM CONFIGURACAO", CriadoEmUtc = clock.GetUtcNow().UtcDateTime });
    await database.SaveChangesAsync();
    database.ConfiguracoesGeladeiras.Add(new ConfiguracaoGeladeira { GeladeiraId = 1, TemperaturaMinimaC = 0,
        TemperaturaMaximaC = 5, ToleranciaPortaAbertaSegundos = 5, AusenciaLeiturasSegundos = 20,
        MonitoramentoAtivo = true, OrigemMonitorada = OrigemLeitura.Simulacao,
        InicioMonitoramentoEmUtc = clock.GetUtcNow().UtcDateTime, AtualizadoEmUtc = clock.GetUtcNow().UtcDateTime });
    await database.SaveChangesAsync();
}
await Step();
Check((await Alerts()).Count == 0, "Ativacao nao cria alertas antes do prazo nem para equipamento sem configuracao");
await Reading(0);
clock.Advance(1);
await Reading(5);
Check((await Alerts()).Count == 0, "Temperaturas exatamente nos limites inclusivos, zero e porta fechada sao normais");
clock.Advance(1);
await Reading(5.01);
var temp = (await Active(TipoAlerta.TemperaturaForaFaixa))!;
Check(temp.Gravidade == GravidadeAlerta.Critico && temp.TemperaturaAberturaC == 5.01, "Excesso abre episodio com parametros e leitura de evidencia");
clock.Advance(1);
await Reading(-1);
Check((await Active(TipoAlerta.TemperaturaForaFaixa))!.Id == temp.Id && (await Alerts()).Count == 1, "Anormalidade repetida e troca alto/baixo nao duplicam episodio");
await Step();
Check((await Alerts()).Count == 1, "Novo contexto e novo ciclo preservam deduplicacao no SQLite");
clock.Advance(1);
await Reading(4);
Check((await Active(TipoAlerta.TemperaturaForaFaixa)) is null && (await Alerts())[0].MotivoEncerramento == MotivoEncerramento.CondicaoNormalizada,
    "Leitura normal encerra com motivo de normalizacao");
clock.Advance(1);
await Reading(8, true);
Check((await Active(TipoAlerta.TemperaturaForaFaixa))!.Id != temp.Id, "Nova anormalidade depois de recuperacao abre novo episodio");
Check(await Active(TipoAlerta.PortaAberta) is null, "Primeiro estado aberto nao inventa duracao anterior");
clock.Advance(5);
await Step();
Check(await Active(TipoAlerta.PortaAberta) is null, "Tempo sem nova medicao nao comprova porta continuamente aberta");
await Reading(8, true);
var door = (await Active(TipoAlerta.PortaAberta))!;
Check(door is not null && door.InicioCondicaoEmUtc == clock.GetUtcNow().UtcDateTime.AddSeconds(-5), "Segunda medicao confirma porta no limiar exato de tolerancia");
clock.Advance(1);
await Reading(4, false, stamp: clock.GetUtcNow().UtcDateTime.AddSeconds(-3));
Check((await Active(TipoAlerta.PortaAberta))!.Id == door!.Id, "Amostra atrasada fica no banco mas nao retrocede o estado da porta");
clock.Advance(1);
await Reading(4, false, OrigemLeitura.Hardware);
Check((await Active(TipoAlerta.PortaAberta))!.Id == door.Id, "Origem Hardware nao encerra episodio de Simulacao");
clock.Advance(18);
await Step();
var absence = (await Active(TipoAlerta.AusenciaLeituras))!;
Check(absence is not null && absence.LeituraAberturaId is null, "Ausencia abre sem POST no limiar exato, sem inventar leitura");
Check(await Active(TipoAlerta.TemperaturaForaFaixa) is null && await Active(TipoAlerta.PortaAberta) is null,
    "Falta de dados encerra temperatura e porta em vez de indicar estado atual conhecido");
Check((await Alerts()).Single(a => a.Id == door.Id).MotivoEncerramento == MotivoEncerramento.SemDadosRecentes, "Interrupcao e distinta de normalizacao");
await Step();
Check((await Active(TipoAlerta.AusenciaLeituras))!.Id == absence!.Id, "Reiniciar contexto nao duplica ausencia");
await Reading(4, stamp: clock.GetUtcNow().UtcDateTime.AddSeconds(-21));
Check((await Active(TipoAlerta.AusenciaLeituras))!.Id == absence.Id, "Upload de medicao antiga nao renova prazo de ausencia");
await Reading(4, true);
Check(await Active(TipoAlerta.AusenciaLeituras) is null && await Active(TipoAlerta.PortaAberta) is null,
    "Recuperacao recente encerra ausencia e comeca nova sequencia de porta");
clock.Advance(21);
await Reading(4, true);
Check(await Active(TipoAlerta.PortaAberta) is null, "Lacuna entre amostras abertas quebra continuidade mesmo sem ciclo intermediario");
clock.Advance(5);
await Reading(4, true);
Check(await Active(TipoAlerta.PortaAberta) is not null, "Depois da lacuna nova sequencia pode confirmar duracao");
var beforeEdit = (await Active(TipoAlerta.PortaAberta))!.Id;
await Configure(c => c.TemperaturaMaximaC = 6);
Check(await Active(TipoAlerta.PortaAberta) is null && (await Alerts()).Single(a => a.Id == beforeEdit).MotivoEncerramento == MotivoEncerramento.ConfiguracaoAlterada,
    "Editar parametros encerra episodio com motivo e nao reaplica porta anterior");
await Reading(9);
await Configure(c => { c.MonitoramentoAtivo = false; c.InicioMonitoramentoEmUtc = null; });
Check((await Alerts()).All(a => a.EncerradoEmUtc.HasValue), "Desativar encerra todos os episodios");
Check((await Alerts()).Last().MotivoEncerramento == MotivoEncerramento.MonitoramentoDesativado, "Desativacao possui motivo proprio");
clock.Advance(30);
await Step();
Check((await Alerts()).All(a => a.EncerradoEmUtc.HasValue), "Equipamento inativo nao gera ausencia");
await Configure(c => { c.MonitoramentoAtivo = true; c.OrigemMonitorada = OrigemLeitura.Hardware; c.InicioMonitoramentoEmUtc = clock.GetUtcNow().UtcDateTime; });
await Reading(9, origin: OrigemLeitura.Simulacao);
Check((await Alerts()).All(a => a.EncerradoEmUtc.HasValue), "Troca de origem nao herda leituras da outra origem");
clock.Advance(20);
await Step();
Check((await Active(TipoAlerta.AusenciaLeituras))!.Origem == OrigemLeitura.Hardware, "Sem leitura da nova origem usa inicio do acompanhamento");
await Reading(9, origin: OrigemLeitura.Hardware);
Check((await Active(TipoAlerta.TemperaturaForaFaixa))!.Origem == OrigemLeitura.Hardware, "Nova origem avalia somente sua propria medicao");
await Reading(6, origin: OrigemLeitura.Hardware);
Check(await Active(TipoAlerta.TemperaturaForaFaixa) is null, "Empate de timestamp usa maior ID e permite recuperacao");
await using (var database = Open())
{
    Check(await database.EstadosMonitoramento.CountAsync() == 1 && await database.ConfiguracoesGeladeiras.CountAsync() == 1,
        "Avaliador nao cria configuracoes para outros equipamentos");
    var readingCount = await database.Leituras.CountAsync();
    await new AvaliadorAlertas(database, clock).AvaliarAsync();
    Check(await database.Leituras.CountAsync() == readingCount, "Regras nunca fabricam medicoes");
    var migrationCount = (await database.Database.GetAppliedMigrationsAsync()).Count();
    Check(migrationCount >= 4, "Banco de testes usa migrations reais incluindo alertas");
}
Console.WriteLine(JsonSerializer.Serialize(new { result = "passed", assertions = checks.Count, checks,
    scope = "Software com relogio controlado e SQLite isolado; nao comprova hardware", database = path }));

sealed class ControlledClock(DateTimeOffset initial) : TimeProvider
{
    private DateTimeOffset now = initial;
    public override DateTimeOffset GetUtcNow() => now;
    public void Advance(int seconds) => now = now.AddSeconds(seconds);
}
