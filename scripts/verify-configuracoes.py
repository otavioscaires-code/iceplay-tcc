"""Contrato HTTP, upgrade e persistência de configurações; somente banco isolado."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import time
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser()
    for name in ("dotnet", "database", "evidence"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    database = Path(args.database).resolve()
    if not database.is_relative_to(root / ".tools/verification") or database.exists():
        raise ValueError("Use um banco novo dentro de .tools/verification; nunca o banco de uso.")
    database.parent.mkdir(parents=True, exist_ok=True)
    evidence = Path(args.evidence).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    report = {"result": "failed", "startedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "scope": "Software HTTP/SQLite em banco isolado; sem hardware ou renderizacao de navegador",
              "isolatedDatabase": str(database), "checks": [], "requests": [], "errors": []}
    process = None
    streams = []
    base = ""
    client = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def check(condition, description):
        if not condition:
            raise AssertionError(description)
        report["checks"].append(description)
        print("PASSOU:", description, flush=True)

    def request(path, expected, method="GET", body=None, raw=None):
        data = raw.encode() if raw is not None else None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(base + path, data=data, method=method,
                                     headers={"Content-Type": "application/json"} if data is not None else {})
        try:
            response = client.open(req, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            content = response.read().decode("utf-8")
            status, headers = response.status, response.headers
        report["requests"].append({"method": method, "path": path, "expectedStatus": expected,
                                   "actualStatus": status, "requestBody": raw if raw is not None else body,
                                   "responseBody": content})
        check(status == expected, f"{method} {path} retorna {expected}")
        value = json.loads(content) if content and "json" in headers.get("Content-Type", "") else content
        return value, headers

    def start(label, environment):
        nonlocal process, base
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        base = f"http://127.0.0.1:{port}"
        env = os.environ.copy()
        env.pop("ICEPLAY_MOBILE_CONFIG", None)
        env.update(ASPNETCORE_ENVIRONMENT=environment, DOTNET_ENVIRONMENT=environment,
                   ConnectionStrings__Iceplay=f"Data Source={database}")
        streams.extend([(evidence / f"configuracoes-{label}.stdout.log").open("w", encoding="utf-8"),
                        (evidence / f"configuracoes-{label}.stderr.log").open("w", encoding="utf-8")])
        process = subprocess.Popen([args.dotnet, str(root / "src/Iceplay.Api/bin/Debug/net10.0/Iceplay.Api.dll"),
                                    "--urls", base], cwd=root / "src/Iceplay.Api", env=env,
                                   stdout=streams[-2], stderr=streams[-1], creationflags=subprocess.CREATE_NO_WINDOW)
        deadline = time.monotonic() + 40
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError("API encerrou antes de responder: " + label)
            try:
                with client.open(base + "/api/health", timeout=1) as response:
                    if response.status == 200:
                        return
            except (urllib.error.URLError, TimeoutError):
                time.sleep(.1)
        raise TimeoutError("API nao iniciou: " + label)

    def stop():
        nonlocal process
        if process is not None and process.poll() is None:
            process.terminate()
            process.wait(timeout=10)
        process = None
        for stream in streams:
            if not stream.closed:
                stream.close()

    def snapshot(include_config=True):
        connection = sqlite3.connect(database.as_uri() + "?mode=ro", uri=True)
        try:
            check(connection.execute("PRAGMA integrity_check").fetchall() == [("ok",)], "SQLite isolado integro")
            check(not connection.execute("PRAGMA foreign_key_check").fetchall(), "SQLite sem violacoes de chave estrangeira")
            names = ["Geladeiras", "Leituras"] + (["ConfiguracoesGeladeiras"] if include_config else [])
            rows = {name: connection.execute('SELECT * FROM "' + name + '" ORDER BY 1').fetchall() for name in names}
            digest = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()
            return {"counts": {name: len(values) for name, values in rows.items()}, "sha256": digest,
                    "migrations": [r[0] for r in connection.execute('SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId')]}
        finally:
            connection.close()

    def utc(value):
        check(isinstance(value, str) and value.endswith("Z"), "Instante retornado possui sufixo UTC Z")
        return dt.datetime.fromisoformat(value[:-1] + "+00:00")

    try:
        # SQL histórico das duas migrations existentes; o upgrade usa a migration nova real.
        with sqlite3.connect(database) as connection:
            connection.executescript((root / "docs/sql/iceplay-criacao.sql").read_text(encoding="utf-8-sig"))
        start("antes-upgrade", "Production")
        parent, _ = request("/api/geladeiras", 201, "POST", {"nome": "FIXTURE CONFIG - UPGRADE", "localizacao": "BANCO ISOLADO"})
        stamp = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=5)).isoformat().replace("+00:00", "Z")
        reading, _ = request("/api/leituras", 201, "POST", {"geladeiraId": parent["id"], "temperaturaC": 0,
                                                              "portaAberta": False, "medidoEmUtc": stamp, "origem": "Simulacao"})
        path = f'/api/geladeiras/{parent["id"]}/configuracao'
        missing_schema, _ = request(path, 503)
        check(missing_schema["status"] == 503 and "sqlite" not in json.dumps(missing_schema).lower(), "Schema antigo retorna 503 generico sem detalhes internos")
        before = snapshot(False)
        check(len(before["migrations"]) == 2, "Fixture anterior ao upgrade possui exatamente as duas migrations historicas")
        stop()
        start("upgrade", "Development")
        after = snapshot(False)
        check(before["sha256"] == after["sha256"], "Upgrade preserva todos os campos de geladeira e leitura anteriores")
        check(len(after["migrations"]) == 3 and after["migrations"][:2] == before["migrations"]
              and after["migrations"][-1].endswith("_AddConfiguracoesGeladeiras"), "Upgrade aplica somente a migration aditiva esperada")
        empty, _ = request(path, 200)
        check(empty == {"geladeiraId": parent["id"], "configuracao": None}, "Equipamento existente permanece explicitamente sem configuracao; nenhum seed")
        check(snapshot()["counts"]["ConfiguracoesGeladeiras"] == 0, "Upgrade nao cria parametros automaticamente")
        valid = {"temperaturaMinimaC": -2.5, "temperaturaMaximaC": 5.25, "toleranciaPortaAbertaSegundos": 90,
                 "ausenciaLeiturasSegundos": 60, "origemMonitorada": "Simulacao", "monitoramentoAtivo": False}
        for item in (0, -1, 2147483647):
            request(f"/api/geladeiras/{item}/configuracao", 404)
            request(f"/api/geladeiras/{item}/configuracao", 404, "PUT", valid)
        request(path, 405, "POST", valid)
        created, headers = request(path, 201, "PUT", {**valid, "geladeiraId": 999, "inicioMonitoramentoEmUtc": "2000-01-01T00:00:00Z",
                                                      "atualizadoEmUtc": "2000-01-01T00:00:00Z"})
        check(headers.get("Location", "").endswith(path), "Criacao informa Location consultavel")
        config = created["configuracao"]
        check(created["geladeiraId"] == parent["id"] and all(config[k] == v for k, v in valid.items()), "Resposta preserva exatamente os parametros solicitados")
        check(config["inicioMonitoramentoEmUtc"] is None and utc(config["atualizadoEmUtc"]).year >= 2026, "Inativo nao possui inicio e cliente nao determina timestamps")
        saved, _ = request(path, 200)
        check(saved == created, "GET consulta configuracao gravada no SQLite")
        stable = snapshot()["sha256"]
        invalid = [{}]
        for key in valid:
            invalid.extend([{field: value for field, value in valid.items() if field != key}, {**valid, key: None}])
        for change in ({"temperaturaMinimaC": 5.25}, {"temperaturaMinimaC": 6}, {"temperaturaMinimaC": "-2.5"},
                       {"temperaturaMaximaC": "5.25"}, {"temperaturaMaximaC": True}, {"temperaturaMinimaC": 1e308, "temperaturaMaximaC": 1e307},
                       {"toleranciaPortaAbertaSegundos": 0}, {"toleranciaPortaAbertaSegundos": -1}, {"toleranciaPortaAbertaSegundos": 1.5},
                       {"toleranciaPortaAbertaSegundos": "90"}, {"ausenciaLeiturasSegundos": 0}, {"ausenciaLeiturasSegundos": 2147483648},
                       {"ausenciaLeiturasSegundos": False}, {"origemMonitorada": "hardware"}, {"origemMonitorada": 0},
                       {"origemMonitorada": ""}, {"origemMonitorada": " Hardware "}, {"monitoramentoAtivo": "false"}, {"monitoramentoAtivo": 0}):
            invalid.append({**valid, **change})
        for body in invalid:
            problem, _ = request(path, 400, "PUT", body)
            check(problem["status"] == 400 and bool(problem.get("errors")), "Entrada invalida retorna erros de validacao")
        for body in ("{", "null", "[]", '{"temperaturaMinimaC":-1e400}', '{"temperaturaMaximaC":1e400}'):
            request(path, 400, "PUT", raw=body)
        check(snapshot()["sha256"] == stable, "Entradas invalidas nao alteram registros nem configuracao")
        active, _ = request(path, 200, "PUT", {**valid, "monitoramentoAtivo": True})
        beginning = active["configuracao"]["inicioMonitoramentoEmUtc"]
        check(utc(beginning) == utc(active["configuracao"]["atualizadoEmUtc"]), "Ativar inicia acompanhamento no instante do servidor")
        edited_body = {**valid, "monitoramentoAtivo": True, "temperaturaMaximaC": 6}
        edited, _ = request(path, 200, "PUT", edited_body)
        check(edited["configuracao"]["inicioMonitoramentoEmUtc"] == beginning, "Editar limites ativos nao reinicia acompanhamento")
        same, _ = request(path, 200, "PUT", edited_body)
        check(same["configuracao"]["inicioMonitoramentoEmUtc"] == beginning, "Repetir PUT com mesma origem nao reinicia acompanhamento")
        switched_body = {**edited_body, "origemMonitorada": "Hardware"}
        switched, _ = request(path, 200, "PUT", switched_body)
        check(utc(switched["configuracao"]["inicioMonitoramentoEmUtc"]) > utc(beginning)
              and switched["configuracao"]["inicioMonitoramentoEmUtc"] == switched["configuracao"]["atualizadoEmUtc"], "Trocar origem ativa inicia novo acompanhamento sem misturar historicos")
        paused, _ = request(path, 200, "PUT", {**switched_body, "monitoramentoAtivo": False})
        check(paused["configuracao"]["inicioMonitoramentoEmUtc"] is None, "Desabilitar remove inicio de acompanhamento")
        expected, _ = request(path, 200, "PUT", switched_body)
        check(utc(expected["configuracao"]["inicioMonitoramentoEmUtc"]) > utc(switched["configuracao"]["inicioMonitoramentoEmUtc"]), "Reativacao define novo inicio")
        # Segundo equipamento verifica vinculo, isolamento e duas criacoes concorrentes.
        other, _ = request("/api/geladeiras", 201, "POST", {"nome": "FIXTURE CONFIG - SEM LEITURAS"})
        other_path = f'/api/geladeiras/{other["id"]}/configuracao'
        with ThreadPoolExecutor(max_workers=2) as pool:
            def concurrent_put():
                req = urllib.request.Request(base + other_path, data=json.dumps(valid).encode(), method="PUT", headers={"Content-Type": "application/json"})
                isolated_client = urllib.request.build_opener(urllib.request.ProxyHandler({}))
                with isolated_client.open(req, timeout=15) as response:
                    return response.status, json.load(response)
            concurrent = list(pool.map(lambda _: concurrent_put(), range(2)))
        report["concurrentPutStatuses"] = sorted(item[0] for item in concurrent)
        check(report["concurrentPutStatuses"] == [200, 201], "PUTs concorrentes criam uma unica configuracao e atualizam sem erro de chave")
        other_config, _ = request(other_path, 200)
        check(other_config["configuracao"]["monitoramentoAtivo"] is False, "Configuracoes de equipamentos permanecem independentes")
        # Verifica restricoes reais no banco, sem conservar a alteracao invalida.
        with sqlite3.connect(database) as connection:
            connection.execute("PRAGMA foreign_keys=ON")
            for column, value in (("TemperaturaMinimaC", 100), ("ToleranciaPortaAbertaSegundos", 0),
                                  ("AusenciaLeiturasSegundos", 0), ("OrigemMonitorada", "Desconhecida"), ("MonitoramentoAtivo", 2),
                                  ("InicioMonitoramentoEmUtc", None)):
                try:
                    connection.execute(f'UPDATE ConfiguracoesGeladeiras SET "{column}"=? WHERE GeladeiraId=?', (value, parent["id"]))
                except sqlite3.IntegrityError:
                    connection.rollback()
                    check(True, "SQLite rejeita violacao de configuracao: " + column)
                else:
                    connection.rollback()
                    raise AssertionError("Restricao ausente: " + column)
        before_gets = snapshot()
        request(path, 200)
        request("/configuracoes", 200)
        request(f'/api/leituras?geladeiraId={parent["id"]}&origem=Simulacao', 200)
        request("/api/monitoramento?origem=Simulacao", 200)
        check(snapshot()["sha256"] == before_gets["sha256"], "Consultas e pagina nao modificam configuracoes ou medicoes")
        stop()
        start("reinicio", "Development")
        persisted, _ = request(path, 200)
        check(persisted == expected and snapshot()["sha256"] == before_gets["sha256"], "Reinicio real preserva parametros, origem e instantes")
        persisted_reading, _ = request(f'/api/leituras/{reading["id"]}', 200)
        check(persisted_reading["temperaturaC"] == 0 and persisted_reading["portaAberta"] is False, "Leitura anterior permanece intacta apos upgrade e reinicio")
        request(f'/api/geladeiras/{parent["id"]}', 409, "DELETE")
        request(f'/api/geladeiras/{other["id"]}', 204, "DELETE")
        request(other_path, 404)
        final = snapshot()
        check(final["counts"] == {"Geladeiras": 1, "Leituras": 1, "ConfiguracoesGeladeiras": 1}, "Exclusao remove so configuracao dependente do equipamento vazio")
        report["beforeUpgrade"] = before
        report["afterUpgrade"] = after
        report["finalDatabase"] = final
        report["result"] = "passed"
    except Exception as error:
        report["errors"].append(f"{type(error).__name__}: {error}")
        raise
    finally:
        try:
            stop()
        finally:
            report["finishedAtUtc"] = dt.datetime.now(dt.timezone.utc).isoformat()
            report["checkCount"] = len(report["checks"])
            report["requestCount"] = len(report["requests"])
            (evidence / "configuracoes-api.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
