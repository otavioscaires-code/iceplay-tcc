"""Credenciais e ingestao idempotente; fixtures Hardware nao sao sensores fisicos."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
import hashlib
import re
import sqlite3
import uuid
from verification_http import ApiVerification

parser = argparse.ArgumentParser()
for arg in ("dotnet", "database", "evidence"):
    parser.add_argument("--" + arg, required=True)
args = parser.parse_args()
test = ApiVerification(args.dotnet, args.database, args.evidence, "dispositivos")
error = None
try:
    with sqlite3.connect(test.database) as connection:
        connection.executescript((test.root / "docs/sql/iceplay-criacao-2026-11-12-alertas.sql").read_text(encoding="utf-8-sig"))
        stamp = "2026-11-01 12:00:00"
        connection.execute('INSERT INTO Geladeiras (Id,Nome,CriadoEmUtc) VALUES (7,?,?)', ("FIXTURE HISTORICA DISPOSITIVOS", stamp))
        connection.execute('INSERT INTO Leituras (Id,GeladeiraId,TemperaturaC,PortaAberta,MedidoEmUtc,RecebidoEmUtc,Origem) VALUES (9,7,9,0,?,?,?)', (stamp, stamp, "Simulacao"))
        connection.execute('INSERT INTO Alertas (Id,GeladeiraId,Origem,Tipo,Gravidade,InicioCondicaoEmUtc,AbertoEmUtc,UltimaEvidenciaEmUtc,LeituraAberturaId,TemperaturaAberturaC,TemperaturaMinimaC,TemperaturaMaximaC,ToleranciaPortaAbertaSegundos,AusenciaLeiturasSegundos) VALUES (3,7,?,?,?,?,?,?,9,9,0,5,30,60)',
                           ("Simulacao", "TemperaturaForaFaixa", "Critico", stamp, stamp, stamp))
    before = test.inspect()
    test.start("upgrade")
    after = test.inspect()
    test.check(before["Geladeiras"] == after["Geladeiras"] and before["Alertas"] == after["Alertas"], "Upgrade preserva geladeira e episodio historicos com vinculo de leitura")
    with sqlite3.connect(test.database) as connection:
        preserved = connection.execute('SELECT Id,GeladeiraId,TemperaturaC,PortaAberta,MedidoEmUtc,RecebidoEmUtc,Origem,DispositivoId,MedicaoId FROM Leituras WHERE Id=9').fetchone()
    test.check(preserved[:7] == before["Leituras"][0] and preserved[7:] == (None, None), "Upgrade preserva os sete campos antigos e acrescenta metadados nulos")
    test.check(after["Dispositivos"] == [], "Nenhuma identidade ou credencial criada automaticamente")
    legacy, _ = test.request("/api/leituras/9")
    test.check(legacy["dispositivoId"] is None and legacy["medicaoId"] is None and legacy["id"] == 9, "Contrato antigo continua consultavel com campos novos nulos")
    test.request("/api/alertas/3")
    fridge, _ = test.request("/api/geladeiras", 201, "POST", {"nome": "FIXTURE EMISSOR - BANCO ISOLADO"})
    other, _ = test.request("/api/geladeiras", 201, "POST", {"nome": "FIXTURE OUTRO - BANCO ISOLADO"})
    route = f'/api/geladeiras/{fridge["id"]}/dispositivos'
    for invalid in ({}, {"nome": None}, {"nome": ""}, {"nome": "   "}, {"nome": "X" * 101}, {"nome": 12}):
        test.request(route, 400, "POST", invalid)
    test.request("/api/geladeiras/2147483647/dispositivos", 404)
    test.request("/api/geladeiras/2147483647/dispositivos", 404, "POST", {"nome": "FIXTURE"})
    created, headers = test.request(route, 201, "POST", {"nome": "  ESP32 FIXTURE  "})
    credential, device = created["credencial"], created["dispositivo"]
    test.check(re.fullmatch(r"icp_\d+_[0-9a-f]{64}", credential) is not None and device["nome"] == "ESP32 FIXTURE", "Credencial usa segredo aleatorio de 256 bits e nome normalizado")
    test.request(route, 409, "POST", {"nome": "SEGUNDO ATIVO"})
    metadata, _ = test.request(route)
    test.check(len(metadata) == 1 and set(metadata[0]) == {"id", "geladeiraId", "nome", "criadoEmUtc", "revogadoEmUtc"}, "Listagem nao revela segredo ou hash")
    detail = route + f'/{device["id"]}'
    test.check(headers["Location"].endswith(detail), "Location permite consultar so metadados")
    test.request(detail)
    test.request(f'/api/geladeiras/{other["id"]}/dispositivos/{device["id"]}', 404)
    test.request(route + "/2147483647/revogar", 404, "POST")
    with sqlite3.connect(test.database) as connection:
        saved_hash = connection.execute("SELECT CredencialHash FROM Dispositivos WHERE Id=?", (device["id"],)).fetchone()[0]
        test.check(saved_hash == hashlib.sha256(credential.rsplit("_", 1)[1].encode()).digest() and credential.encode() not in test.database.read_bytes(), "Banco conserva somente hash do segredo, sem token em texto")
    auth = {"Authorization": "Bearer " + credential}
    stamp = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=1)).isoformat().replace("+00:00", "Z")
    body = {"geladeiraId": fridge["id"], "temperaturaC": 0, "portaAberta": False, "medidoEmUtc": stamp,
            "origem": "Hardware", "medicaoId": str(uuid.uuid4()), "dispositivoId": 2147483647}
    for bad in ("Bearer invalido", "Basic usuario", "Bearer " + credential[:-1] + ("0" if credential[-1] != "0" else "1")):
        test.request("/api/leituras", 401, "POST", body, {"Authorization": bad})
    for path, method in (("/api/health", "GET"), (route, "GET"), (route, "POST"), ("/api/geladeiras", "POST"), ("/api/leituras", "GET")):
        test.request(path, 403, method, headers=auth)
    test.request("/api/leituras", 403, "POST", {**body, "geladeiraId": other["id"]}, auth)
    test.request("/api/leituras", 403, "POST", {**body, "origem": "Simulacao"}, auth)
    test.request("/api/leituras", 400, "POST", {k: v for k, v in body.items() if k != "medicaoId"}, auth)
    for invalid in ("", "invalido", 123, "{" + body["medicaoId"] + "}"):
        test.request("/api/leituras", 400, "POST", {**body, "medicaoId": invalid}, auth)
    first, first_headers = test.request("/api/leituras", 201, "POST", body, auth)
    test.check(first["dispositivoId"] == device["id"] and first["medicaoId"] == body["medicaoId"] and first["temperaturaC"] == 0 and first["portaAberta"] is False,
               "Servidor vincula emissor autenticado e preserva zero/false, ignorando ID injetado")
    repeated, repeat_headers = test.request("/api/leituras", 200, "POST", {**body, "medicaoId": body["medicaoId"].upper()}, auth)
    test.check(first == repeated and repeat_headers["Location"].endswith(first_headers["Location"].split(test.base)[-1]), "Reenvio retorna mesmo registro e recebimento sem duplicar")
    test.request("/api/leituras", 409, "POST", {**body, "temperaturaC": 1}, auth)
    concurrent_body = {**body, "medicaoId": str(uuid.uuid4())}
    request_start = len(test.report["requests"])
    with ThreadPoolExecutor(max_workers=2) as pool:
        copies = list(pool.map(lambda _: test.request("/api/leituras", (200, 201), "POST", concurrent_body, auth)[0], range(2)))
    test.check(sorted(r["actualStatus"] for r in test.report["requests"][request_start:]) == [200, 201] and copies[0] == copies[1], "Reenvios concorrentes produzem exatamente uma criacao")
    count_before = len(test.inspect()["Leituras"])
    test.stop()
    test.start("reinicio")
    restored, _ = test.request("/api/leituras", 200, "POST", body, auth)
    test.check(restored == first and len(test.inspect()["Leituras"]) == count_before, "Reinicio preserva hash e idempotencia da medicao")
    revoked, _ = test.request(detail + "/revogar", 200, "POST")
    revoked_again, _ = test.request(detail + "/revogar", 200, "POST")
    test.check(revoked == revoked_again and revoked["revogadoEmUtc"] is not None, "Revogacao idempotente preserva instante")
    test.request("/api/leituras", 401, "POST", body, auth)
    replacement, _ = test.request(route, 201, "POST", {"nome": "NOVA CREDENCIAL FIXTURE"})
    test.check(replacement["credencial"] != credential and replacement["dispositivo"]["id"] != device["id"], "Nova identidade tem segredo independente")
    test.request("/api/leituras", 201, "POST", body, {"Authorization": "Bearer " + replacement["credencial"]})
    unbound, _ = test.request("/api/leituras", 201, "POST", {**body, "origem": "Simulacao"})
    test.check(unbound["dispositivoId"] is None, "Operador/simulador conserva contrato anterior, sem falsificar identidade autenticada")
    config = {"temperaturaMinimaC": 1, "temperaturaMaximaC": 5, "toleranciaPortaAbertaSegundos": 30,
              "ausenciaLeiturasSegundos": 60, "origemMonitorada": "Hardware", "monitoramentoAtivo": True}
    config_route = f'/api/geladeiras/{fridge["id"]}/configuracao'
    test.request(config_route, 201, "PUT", config)
    pipeline_body = {**body, "temperaturaC": 9, "medicaoId": str(uuid.uuid4()),
                     "medidoEmUtc": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")}
    pipeline_reading, _ = test.request("/api/leituras", 201, "POST", pipeline_body, {"Authorization": "Bearer " + replacement["credencial"]})
    pipeline_alerts = test.wait_for(f'/api/alertas?geladeiraId={fridge["id"]}&origem=Hardware&tipo=TemperaturaForaFaixa&situacao=Aberto',
                                   lambda x: x["totalItens"] == 1, "Fluxo configurar -> emissor autenticado -> SQLite -> alerta executado com fixture de software")
    test.check(pipeline_alerts["itens"][0]["leituraAberturaId"] == pipeline_reading["id"], "Alerta vincula a leitura autenticada correta")
    panel, _ = test.request("/api/monitoramento?origem=Hardware")
    selected = next(g for g in panel["geladeiras"] if g["id"] == fridge["id"])
    test.check(selected["ultimaLeitura"]["id"] == pipeline_reading["id"] and selected["ultimaLeitura"]["dispositivoId"] == replacement["dispositivo"]["id"], "Painel consulta mesma leitura autenticada e seus metadados")
    test.request(config_route, 200, "PUT", {**config, "monitoramentoAtivo": False})
    concurrent_route = f'/api/geladeiras/{other["id"]}/dispositivos'
    request_start = len(test.report["requests"])
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda _: test.request(concurrent_route, (201, 409), "POST", {"nome": "FIXTURE CONCORRENTE"}), range(2)))
    test.check(sorted(r["actualStatus"] for r in test.report["requests"][request_start:]) == [201, 409], "Duas emissoes concorrentes conservam um unico dispositivo ativo")
    test.request(f'/api/geladeiras/{other["id"]}', 204, "DELETE")
    test.request(f'/api/geladeiras/{fridge["id"]}', 409, "DELETE")
    test.inspect()
except Exception as caught:
    error = caught
finally:
    test.finish(error)
if error:
    raise error
