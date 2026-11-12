namespace Iceplay.Api.Models;

public enum TipoAlerta { TemperaturaForaFaixa, PortaAberta, AusenciaLeituras }
public enum GravidadeAlerta { Atencao, Critico }
public enum MotivoEncerramento { CondicaoNormalizada, SemDadosRecentes, ConfiguracaoAlterada, MonitoramentoDesativado }

public sealed class Alerta
{
    public int Id { get; set; }
    public int GeladeiraId { get; set; }
    public OrigemLeitura Origem { get; set; }
    public TipoAlerta Tipo { get; set; }
    public GravidadeAlerta Gravidade { get; set; }
    public DateTime InicioCondicaoEmUtc { get; set; }
    public DateTime AbertoEmUtc { get; set; }
    public DateTime UltimaEvidenciaEmUtc { get; set; }
    public DateTime? EncerradoEmUtc { get; set; }
    public MotivoEncerramento? MotivoEncerramento { get; set; }
    public int? LeituraAberturaId { get; set; }
    public double? TemperaturaAberturaC { get; set; }
    public double TemperaturaMinimaC { get; set; }
    public double TemperaturaMaximaC { get; set; }
    public int ToleranciaPortaAbertaSegundos { get; set; }
    public int AusenciaLeiturasSegundos { get; set; }
}
