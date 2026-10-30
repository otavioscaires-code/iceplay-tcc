using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.RateLimiting;

namespace Iceplay.Api.Mobile;

public static class MobileAccessExtensions
{
    public static void AddMobileAccess(this WebApplicationBuilder builder)
    {
        var settings = builder.Configuration.GetSection("Mobile").Get<MobileAccessSettings>() ?? new();
        settings.Validate();
        builder.Services.AddSingleton(settings);
        // A sessão é local e temporária: reiniciar a aplicação invalida cookies e tokens.
        builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
        builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
        {
            options.Cookie.Name = "__Host-Iceplay.Mobile";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.Path = "/";
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = false;
            options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
            options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; };
        });
        builder.Services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-ICEPLAY-CSRF";
            options.Cookie.Name = "__Host-Iceplay.Csrf";
            options.Cookie.Path = "/";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Strict;
        });
        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddFixedWindowLimiter("mobile-login", limiter =>
            {
                limiter.PermitLimit = 8;
                limiter.Window = TimeSpan.FromMinutes(1);
                limiter.QueueLimit = 0;
            });
        });
        if (!settings.Enabled) return;
        // IP específico e hosts explícitos evitam expor todas as interfaces por conveniência.
        builder.Configuration["AllowedHosts"] = $"localhost;127.0.0.1;[::1];{settings.Address}";
        builder.WebHost.ConfigureKestrel(server =>
        {
            server.ListenLocalhost(settings.LocalPort);
            server.Listen(IPAddress.Parse(settings.Address), settings.HttpsPort,
                endpoint => endpoint.UseHttps(settings.CertificatePath, settings.CertificatePassword));
            server.Listen(IPAddress.Parse(settings.Address), settings.CertificatePort);
        });
    }
}
