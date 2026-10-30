using System.Data.Common;
using Iceplay.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Iceplay.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController(
    IceplayDbContext database,
    ILogger<HealthController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        try
        {
            // Consultar a tabela verifica conexão e schema, mesmo sem cadastros.
            var refrigeratorCount = await database.Geladeiras.CountAsync(cancellationToken);

            return Ok(new
            {
                status = "healthy",
                database = "connected",
                refrigeratorCount,
                checkedAtUtc = DateTime.UtcNow
            });
        }
        catch (Exception exception) when (exception is DbException or IOException or InvalidOperationException)
        {
            logger.LogError(exception, "A verificação de saúde não conseguiu consultar o banco de dados.");

            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                status = "unhealthy",
                database = "unavailable",
                checkedAtUtc = DateTime.UtcNow
            });
        }
    }
}
