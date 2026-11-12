namespace Iceplay.Api.Monitoring;

public sealed record SituacaoAvaliador(DateTime? UltimoSucessoEmUtc, bool Saudavel);

public sealed class AvaliacaoStatus
{
    private readonly object gate = new();
    private DateTime? ultimoSucesso;
    private bool falhou;

    public void Concluiu(DateTime agora) { lock (gate) { ultimoSucesso = agora; falhou = false; } }
    public void Falhou() { lock (gate) falhou = true; }
    public SituacaoAvaliador Obter(DateTime agora)
    {
        lock (gate) return new(ultimoSucesso, !falhou && ultimoSucesso.HasValue
            && agora - ultimoSucesso.Value < TimeSpan.FromSeconds(10));
    }
}
