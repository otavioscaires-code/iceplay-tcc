using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Iceplay.Api.Mobile;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Iceplay.Api.Controllers;

[ApiController]
[Route("api/acesso")]
public sealed class AcessoController(MobileAccessSettings settings, IAntiforgery antiforgery) : ControllerBase
{
    [HttpGet]
    public IActionResult Consultar()
    {
        var required = !settings.IsLocal(HttpContext);
        var token = required ? antiforgery.GetAndStoreTokens(HttpContext).RequestToken : null;
        return Ok(new { modoMovel = settings.Enabled, autenticacaoNecessaria = required,
            autenticado = !required || User.Identity?.IsAuthenticated == true, csrfToken = token });
    }

    [HttpPost("entrar")]
    [EnableRateLimiting("mobile-login")]
    public async Task<IActionResult> Entrar(CodigoAcessoRequest request)
    {
        if (!settings.Enabled) return NotFound();
        if (!Request.IsHttps) return Problem(statusCode: 400, detail: "Use o endereço HTTPS do celular.");
        if (!settings.MatchesCode(request.Codigo))
            return Problem(statusCode: 401, detail: "Código de acesso inválido.");
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "operador-local") },
            CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity), new AuthenticationProperties { IsPersistent = false });
        return NoContent();
    }

    [HttpPost("sair")]
    public async Task<IActionResult> Sair()
    {
        if (!settings.Enabled) return NotFound();
        if (!Request.IsHttps) return Problem(statusCode: 400, detail: "Use o endereço HTTPS do celular.");
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }
}

public sealed class CodigoAcessoRequest
{
    [Required, StringLength(128)]
    public string Codigo { get; init; } = "";
}
