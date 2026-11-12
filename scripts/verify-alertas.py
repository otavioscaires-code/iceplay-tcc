"""Alertas com servidor real: upgrade, avaliacao sem POST, filtros e reinicio."""
import argparse
import datetime as dt
import sqlite3
import time
from verification_http import ApiVerification

parser = argparse.ArgumentParser()
for arg in ("dotnet", "database", "evidence"):
    parser.add_argument("--" + arg, required=True)
args = parser.parse_args()
test = ApiVerification(args.dotnet, args.database, args.evidence, "alertas")
error = None
try:
    with sqlite3.connect(test.database) as connection:
        connection.executescript((test.root / "docs/sql/iceplay-criacao-2026-11-09.sql").read_text(encoding="utf-8-sig"))
    test.start("antes-upgrade", "Production")
    fridge, _ = test.request("/api/geladeiras", 201, "POST", {"nome": "FIXTURE ALERTAS - BANCO ISOLADO"})
    test.request("/api/alertas", 503)
    before = test.inspect()
    test.stop()
    test.start("upgrade")
    after = test.inspect()
    test.check(all(after[n] == before[n] for n in ("Geladeiras", "Leituras", "ConfiguracoesGeladeiras")), "Upgrade preserva os dados anteriores")
    test.check(after["Alertas"] == [] and after["EstadosMonitoramento"] == [], "Migration nao cria ocorrencias nem estados sem configuracao")
    expected = sorted(p.stem for p in (test.root / "src/Iceplay.Api/Migrations").glob("[0-9]*.cs") if not p.name.endswith(".Designer.cs"))
    test.check([r[0] for r in after["__EFMigrationsHistory"]] == expected, "Todas as migrations reais estao aplicadas em ordem")
    for query in ("geladeiraId=0", "origem=", "origem=hardware", "tipo=Invalido", "gravidade=Alto", "situacao=Resolvido",
                  "inicioUtc=2026-11-12", "fimUtc=2026-11-12T12:00:00%2B00:00", "pagina=0", "tamanhoPagina=101",
                  "pagina=2147483647&tamanhoPagina=100", "inicioUtc=2026-12-01T00:00:00Z&fimUtc=2026-11-01T00:00:00Z"):
        test.request("/api/alertas?" + query, 400)
    test.request("/api/alertas?geladeiraId=2147483647", 404)
    test.request("/api/alertas/2147483647", 404)
    test.request("/api/alertas/resumo", 400)
    test.request("/api/alertas/resumo?origem=hardware", 400)
    empty, _ = test.request("/api/alertas")
    test.check(empty["totalItens"] == 0 and empty["itens"] == [], "Consulta vazia e real, sem seed")
    config = {"temperaturaMinimaC": 0, "temperaturaMaximaC": 5, "toleranciaPortaAbertaSegundos": 1,
              "ausenciaLeiturasSegundos": 4, "origemMonitorada": "Simulacao", "monitoramentoAtivo": True}
    path = f'/api/geladeiras/{fridge["id"]}/configuracao'
    test.request(path, 201, "PUT", config)

    def reading(temperature, door):
        stamp = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(milliseconds=50)).isoformat().replace("+00:00", "Z")
        return test.request("/api/leituras", 201, "POST", {"geladeiraId": fridge["id"], "temperaturaC": temperature,
                            "portaAberta": door, "origem": "Simulacao", "medidoEmUtc": stamp})[0]

    # Aguarda o instante de medicao ficar depois da configuracao, sem relogio artificial na API.
    time.sleep(.1)
    reading(9, True)
    page = test.wait_for("/api/alertas?tipo=TemperaturaForaFaixa&situacao=Aberto", lambda x: x["totalItens"] == 1, "Worker registra temperatura sem chamada de avaliacao pelo teste")
    temperature_id = page["itens"][0]["id"]
    time.sleep(1.1)
    reading(9, True)
    test.wait_for("/api/alertas?tipo=PortaAberta&situacao=Aberto", lambda x: x["totalItens"] == 1, "Amostras recentes confirmam porta aberta")
    current, _ = test.request("/api/alertas?tipo=TemperaturaForaFaixa&situacao=Aberto")
    test.check(current["itens"][0]["id"] == temperature_id and current["totalItens"] == 1, "HTTP confirma deduplicacao de temperatura")
    test.wait_for("/api/alertas?tipo=AusenciaLeituras&situacao=Aberto", lambda x: x["totalItens"] == 1, "Ausencia detectada com servidor sem novos POSTs", timeout=9)
    resolved, _ = test.request("/api/alertas?tipo=PortaAberta&situacao=Encerrado")
    test.check(resolved["itens"][0]["motivoEncerramento"] == "SemDadosRecentes", "HTTP distingue interrupcao de normalizacao")
    reading(4, False)
    test.wait_for("/api/alertas?tipo=AusenciaLeituras&situacao=Aberto", lambda x: x["totalItens"] == 0, "Nova leitura recente encerra ausencia")
    summary, _ = test.request("/api/alertas/resumo?origem=Simulacao")
    test.check(summary["abertos"] == 0 and summary["avaliador"]["saudavel"] and summary["equipamentosMonitorados"] == 1, "Resumo apresenta contagens reais e estado do avaliador")
    detail, _ = test.request(f"/api/alertas/{temperature_id}")
    test.check(detail["geladeiraNome"] == fridge["nome"] and detail["temperaturaAberturaC"] == 9, "Detalhe inclui equipamento, parametros e evidencia real da fixture")
    all_items, _ = test.request("/api/alertas?origem=Simulacao")
    first, _ = test.request("/api/alertas?tamanhoPagina=1")
    second, _ = test.request("/api/alertas?tamanhoPagina=1&pagina=2")
    test.check(first["itens"][0]["id"] == all_items["itens"][0]["id"] and second["itens"][0]["id"] == all_items["itens"][1]["id"], "Paginacao preserva ordem por abertura e ID")
    test.request(f'/api/geladeiras/{fridge["id"]}', 409, "DELETE")
    test.request(path, 200, "PUT", {**config, "monitoramentoAtivo": False})
    test.wait_for("/api/alertas/resumo?origem=Simulacao", lambda x: x["equipamentosMonitorados"] == 0, "Configuracao desativada refletida no resumo")
    test.stop()
    persisted = test.inspect()
    test.start("reinicio")
    restored, _ = test.request("/api/alertas")
    test.check(restored["totalItens"] == all_items["totalItens"], "Reinicio preserva episodios no arquivo SQLite")
    test.check(test.inspect()["Alertas"] == persisted["Alertas"], "Reinicio sem monitoramento ativo nao reabre nem modifica ocorrencias")
except Exception as caught:
    error = caught
finally:
    test.finish(error)
if error:
    raise error
