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
public sealed class AcessoController(MobileAccessSettings settings, IAntiforgery antiforgery, MobilePairing pairing) : ControllerBase
{
    [HttpGet]
    public IActionResult Consultar()
    {
        var required = !settings.IsLocal(HttpContext);
        var token = required ? antiforgery.GetAndStoreTokens(HttpContext).RequestToken : null;
        return Ok(new { modoMovel = settings.Enabled, pareamentoDisponivel = settings.Enabled && !required, autenticacaoNecessaria = required,
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
        await SignIn();
        return NoContent();
    }

    [HttpPost("pareamento")]
    public IActionResult CriarPareamento()
    {
        if (!settings.Enabled) return NotFound();
        if (!CanManagePairing()) return StatusCode(403);
        var invitation = pairing.Issue();
        return Ok(new { url = $"{settings.HttpsUrl}/acesso#parear={invitation.Token}",
            expiraEmUtc = invitation.ExpiresAt, validadeSegundos = MobilePairing.LifetimeSeconds });
    }

    [HttpDelete("pareamento")]
    public IActionResult CancelarPareamento()
    {
        if (!settings.Enabled) return NotFound();
        if (!CanManagePairing()) return StatusCode(403);
        pairing.Revoke();
        return NoContent();
    }

    [HttpPost("pareamento/entrar")]
    [EnableRateLimiting("mobile-pairing")]
    public async Task<IActionResult> EntrarPorPareamento(PareamentoRequest request)
    {
        if (!settings.Enabled) return NotFound();
        if (!Request.IsHttps) return Problem(statusCode: 400, detail: "Use o endereço HTTPS do celular.");
        if (!pairing.TryConsume(request.Token))
            return Problem(statusCode: 401, detail: "QR Code inválido, expirado ou já utilizado. Gere outro no computador.");
        await SignIn();
        return NoContent();
    }

    // O computador já é o operador local. O cabeçalho próprio exige preflight
    // de sites externos; a origem exata também impede emissão/cancelamento por CSRF.
    private bool CanManagePairing() => settings.IsLocal(HttpContext)
        && Request.Headers.Origin.ToString() == $"{Request.Scheme}://{Request.Host}"
        && Request.Headers["X-ICEPLAY-LOCAL"].ToString() == "1";

    private Task SignIn()
    {
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "operador-local") },
            CookieAuthenticationDefaults.AuthenticationScheme);
        return HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity), new AuthenticationProperties { IsPersistent = false });
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

public sealed class PareamentoRequest
{
    [Required, RegularExpression("^[A-Za-z0-9_-]{43}$"), StringLength(43)]
    public string Token { get; init; } = "";
}
