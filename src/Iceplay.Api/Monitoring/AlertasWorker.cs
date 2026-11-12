namespace Iceplay.Api.Monitoring;

public sealed class AlertasWorker(IServiceScopeFactory scopes, AvaliacaoStatus status,
    TimeProvider clock, ILogger<AlertasWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1), clock);
        DateTime? ultimoErro = null;
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<AvaliadorAlertas>().AvaliarAsync(stoppingToken);
                status.Concluiu(clock.GetUtcNow().UtcDateTime);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception)
            {
                status.Falhou();
                var agora = clock.GetUtcNow().UtcDateTime;
                if (ultimoErro is null || agora - ultimoErro >= TimeSpan.FromMinutes(1))
                {
                    logger.LogError(exception, "Falha na avaliação de alertas; nova tentativa no próximo ciclo.");
                    ultimoErro = agora;
                }
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
