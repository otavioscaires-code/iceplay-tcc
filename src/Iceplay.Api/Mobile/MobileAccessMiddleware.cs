using System.Security.Cryptography;
using Microsoft.AspNetCore.Antiforgery;

namespace Iceplay.Api.Mobile;

public sealed class MobileAccessMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, MobileAccessSettings settings, IAntiforgery antiforgery)
    {
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["Referrer-Policy"] = "same-origin";
        if (!settings.Allows(context.Connection.RemoteIpAddress))
        {
            await Reject(context, 403, "Acesso permitido somente pelo computador ou pela rede local configurada.");
            return;
        }
        if (settings.Enabled && context.Connection.LocalPort == settings.CertificatePort)
        {
            // Esta porta HTTP distribui somente o certificado público e instruções, nunca a API.
            if (HttpMethods.IsGet(context.Request.Method) && context.Request.Path == "/certificado.cer")
            {
                await Results.File(settings.PublicCertificatePath, "application/x-x509-ca-cert", "ICEPLAY-local.cer").ExecuteAsync(context);
            }
            else if (HttpMethods.IsGet(context.Request.Method) && context.Request.Path == "/")
            {
                var fingerprint = Convert.ToHexString(SHA256.HashData(await File.ReadAllBytesAsync(settings.PublicCertificatePath)));
                await Results.Content($"""
                    <!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
                    <title>ICEPLAY — Preparar iPhone</title><h1>ICEPLAY na rede local</h1>
                    <p>Este endereço entrega somente o certificado público de teste. Confira no computador o SHA-256 antes de confiar nele.</p>
                    <p><a href="/certificado.cer">1. Baixar certificado ICEPLAY</a></p>
                    <p>2. No iPhone: Ajustes → Geral → VPN e Gerenciamento de Dispositivo. Instale o perfil baixado.</p>
                    <p>3. Ajustes → Geral → Sobre → Certificados Confiáveis. Ative confiança total somente para ICEPLAY Local.</p>
                    <p><a href="{settings.HttpsUrl}/#acesso-movel">4. Abrir ICEPLAY por HTTPS</a></p>
                    <p>Use o código de acesso guardado no computador. Caso apareça um aviso de certificado, confira a instalação; não ignore o aviso.</p>
                    <p>SHA-256 do certificado: <code style="overflow-wrap:anywhere">{fingerprint}</code></p>
                    <p>Certificado exclusivo de desenvolvimento local. Ao encerrar os testes, remova o perfil do iPhone.</p></html>
                    """, "text/html; charset=utf-8").ExecuteAsync(context);
            }
            else await Reject(context, 404, "Esta porta oferece somente as instruções e o certificado público.");
            return;
        }
        var local = settings.IsLocal(context);
        if (!local && !context.Request.IsHttps)
        {
            await Reject(context, 400, "O acesso móvel exige HTTPS.");
            return;
        }
        context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.Headers.CacheControl = "no-store";
            var path = context.Request.Path.Value ?? "";
            var accessEndpoint = path.Equals("/api/acesso", StringComparison.OrdinalIgnoreCase)
                || path.Equals("/api/acesso/entrar", StringComparison.OrdinalIgnoreCase);
            if (!local && !accessEndpoint && context.User.Identity?.IsAuthenticated != true)
            {
                await Reject(context, 401, "Conecte este dispositivo com o código de acesso.");
                return;
            }
            if (!local && !HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method))
            {
                if (context.Request.Headers.Origin.Count > 0
                    && context.Request.Headers.Origin.ToString() != $"{context.Request.Scheme}://{context.Request.Host}")
                {
                    await Reject(context, 403, "A alteração precisa partir da própria página do ICEPLAY.");
                    return;
                }
                try { await antiforgery.ValidateRequestAsync(context); }
                catch (AntiforgeryValidationException)
                {
                    await Reject(context, 400, "Sessão de formulário inválida. Atualize a página antes de tentar novamente.");
                    return;
                }
            }
        }
        await next(context);
    }

    private static Task Reject(HttpContext context, int status, string detail) =>
        Results.Problem(statusCode: status, detail: detail).ExecuteAsync(context);
}
