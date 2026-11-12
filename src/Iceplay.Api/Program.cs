using Iceplay.Api.Data;
using Iceplay.Api.Mobile;
using Iceplay.Api.Monitoring;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var mobileConfiguration = Environment.GetEnvironmentVariable("ICEPLAY_MOBILE_CONFIG");
if (!string.IsNullOrWhiteSpace(mobileConfiguration))
{
    // O arquivo local contém credenciais e fica fora do Git. O modo comum não o carrega.
    builder.Configuration.AddJsonFile(Path.GetFullPath(mobileConfiguration), optional: false, reloadOnChange: false);
}
builder.AddMobileAccess();

// Logs no terminal mantêm a execução local independente de permissões no
// Windows Event Log, inclusive ao verificar falhas de banco fora de Development.
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

var configuredConnection = builder.Configuration.GetConnectionString("Iceplay");
if (string.IsNullOrWhiteSpace(configuredConnection))
{
    throw new InvalidOperationException(
        "Configure a conexão SQLite em ConnectionStrings:Iceplay antes de iniciar a API.");
}

var connectionBuilder = new SqliteConnectionStringBuilder(configuredConnection);
if (string.IsNullOrWhiteSpace(connectionBuilder.DataSource))
{
    throw new InvalidOperationException("A conexão SQLite precisa definir Data Source.");
}

// O caminho depende da pasta do projeto, não da pasta em que o comando foi executado.
var databasePath = Path.GetFullPath(connectionBuilder.DataSource, builder.Environment.ContentRootPath);
connectionBuilder.DataSource = databasePath;
Directory.CreateDirectory(Path.GetDirectoryName(databasePath)!);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DatabaseExceptionHandler>();
builder.Services.AddDbContext<IceplayDbContext>(options =>
    options.UseSqlite(connectionBuilder.ToString()));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<AvaliacaoStatus>();
builder.Services.AddScoped<AvaliadorAlertas>();
builder.Services.AddHostedService<AlertasWorker>();

var app = builder.Build();

// Esta base local executa uma única instância. A implantação futura deverá aplicar
// migrations em uma etapa controlada, em vez de concorrer entre instâncias da API.
if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    var database = scope.ServiceProvider.GetRequiredService<IceplayDbContext>();
    await database.Database.MigrateAsync();
}

app.UseExceptionHandler();
app.UseRouting();
app.UseAuthentication();
app.UseMiddleware<MobileAccessMiddleware>();
app.UseRateLimiter();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();

// Cada URL entrega seu próprio documento HTML. Não há fallback de SPA:
// rotas desconhecidas, inclusive da API, continuam retornando 404.
foreach (var (route, file) in new[]
{
    ("/dashboard", "index.html"), ("/geladeiras", "geladeiras.html"),
    ("/historico", "historico.html"), ("/alertas", "alertas.html"),
    ("/configuracoes", "configuracoes.html"), ("/acesso", "acesso.html"),
    ("/sobre", "sobre.html")
})
{
    var documentPath = Path.Combine(app.Environment.WebRootPath, file);
    app.MapGet(route, () => Results.File(documentPath, "text/html; charset=utf-8"));
}

app.Run();
