using System.Text.Json;
using System.Text.RegularExpressions;
using Iceplay.Api.Mobile;

internal static class PairingChecks
{
    public static void Run()
    {
        var checks = new List<string>();
        void Check(bool condition, string name)
        {
            if (!condition) throw new InvalidOperationException("FALHOU: " + name);
            checks.Add(name);
        }
        var clock = new PairingClock();
        var service = new MobilePairing(clock);
        Check(!service.TryConsume(new string('a', 43)), "Sem convite, token nao autentica");
        var first = service.Issue();
        Check(Regex.IsMatch(first.Token, "^[A-Za-z0-9_-]{43}$"), "Convite tem 256 bits em base64url");
        Check(first.ExpiresAt == clock.GetUtcNow().AddSeconds(120), "Validade definida em 120 segundos");
        Check(!service.TryConsume(new string('a', 43)), "Token incorreto nao autentica");
        Check(service.TryConsume(first.Token), "Token incorreto nao consome o convite correto");
        Check(!service.TryConsume(first.Token), "Reutilizacao rejeitada");
        first = service.Issue();
        var second = service.Issue();
        Check(first.Token != second.Token && !service.TryConsume(first.Token), "Novo convite invalida o anterior e gera segredo diferente");
        Check(service.TryConsume(second.Token), "Convite substituto funciona");
        first = service.Issue();
        clock.Advance(119);
        Check(service.TryConsume(first.Token), "Convite funciona antes do limite");
        first = service.Issue();
        clock.Advance(120);
        Check(!service.TryConsume(first.Token), "Convite expira exatamente no limite");
        first = service.Issue();
        service.Revoke();
        service.Revoke();
        Check(!service.TryConsume(first.Token), "Cancelamento idempotente invalida o convite");
        first = service.Issue();
        Check(!new MobilePairing(clock).TryConsume(first.Token), "Nova instancia nao preserva convite anterior");
        var token = first.Token;
        var accepted = 0;
        Parallel.For(0, 24, _ => { if (service.TryConsume(token)) Interlocked.Increment(ref accepted); });
        Check(accepted == 1, "Consumo concorrente aceita exatamente uma requisicao");
        Console.WriteLine(JsonSerializer.Serialize(new { result = "passed", assertions = checks.Count, checks,
            scope = "Convites em memoria e relogio controlado; sem celular fisico ou alteracao do SQLite" }));
    }

    private sealed class PairingClock : TimeProvider
    {
        private DateTimeOffset now = new(2026, 11, 14, 4, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => now;
        public void Advance(int seconds) => now = now.AddSeconds(seconds);
    }
}
