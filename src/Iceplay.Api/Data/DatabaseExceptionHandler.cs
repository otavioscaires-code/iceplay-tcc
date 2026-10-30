using System.Data.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Iceplay.Api.Data;

public sealed class DatabaseExceptionHandler(ILogger<DatabaseExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not (DbException or DbUpdateException or IOException))
        {
            return false;
        }

        logger.LogError(exception, "Não foi possível concluir uma operação de banco de dados.");
        httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status503ServiceUnavailable,
            Type = "https://tools.ietf.org/html/rfc9110#section-15.6.4",
            Title = "Banco de dados indisponível.",
            Detail = "Não foi possível concluir a operação. Tente novamente em instantes."
        };

        await httpContext.Response.WriteAsJsonAsync(
            problem,
            options: null,
            contentType: "application/problem+json",
            cancellationToken: cancellationToken);
        return true;
    }
}
