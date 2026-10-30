"""Integração real TCP/TLS/HTTP, sem pacotes e sem alterar o banco normal."""
import argparse
import base64
import datetime as dt
import hashlib
import http.cookiejar
import json
import os
from pathlib import Path
import socket
import sqlite3
import ssl
import subprocess
import time
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser()
    for argument in ("config", "dotnet", "database", "evidence"):
        parser.add_argument("--" + argument, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    database = Path(args.database).resolve()
    if not database.is_relative_to(root / ".tools" / "verification"):
        raise ValueError("O banco de teste precisa estar dentro de .tools/verification")
    evidence = Path(args.evidence).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    config_path = Path(args.config).resolve()
    settings = json.loads(config_path.read_text(encoding="utf-8-sig"))["Mobile"]
    local = f'http://127.0.0.1:{settings["LocalPort"]}'
    secure = f'https://{settings["Address"]}:{settings["HttpsPort"]}'
    bootstrap = f'http://{settings["Address"]}:{settings["CertificatePort"]}'
    context = ssl.create_default_context(cafile=str(config_path.parent / "ICEPLAY-local.pem"))
    jar = http.cookiejar.CookieJar()
    client = urllib.request.build_opener(urllib.request.ProxyHandler({}),
        urllib.request.HTTPSHandler(context=context), urllib.request.HTTPCookieProcessor(jar))
    plain = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    report = {"result": "failed", "startedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "scope": "API móvel pela interface IPv4 local, TLS com CA explicitamente confiada e banco isolado; sem iPhone físico",
              "isolatedDatabase": str(database), "checks": [], "requests": [], "errors": []}
    process = None
    logs = []

    def check(condition, description):
        if not condition:
            raise AssertionError(description)
        report["checks"].append(description)
        print("PASSOU:", description)

    def request(base, path, expected, method="GET", body=None, headers=None, opener=None):
        data = None if body is None else json.dumps(body).encode()
        request_headers = dict(headers or {})
        if data is not None:
            request_headers["Content-Type"] = "application/json"
        item = urllib.request.Request(base + path, data=data, method=method, headers=request_headers)
        try:
            response = (opener or client).open(item, timeout=8)
        except urllib.error.HTTPError as error:
            response = error
        content = response.read()
        report["requests"].append({"method": method, "path": path,
            "transport": "HTTPS" if base.startswith("https:") else "HTTP", "status": response.status})
        check(response.status == expected, f"{method} {path} por {base.split(':')[0].upper()} retorna {expected}")
        value = json.loads(content) if "json" in response.headers.get("Content-Type", "") and content else content
        return value, response.headers

    def start(label, mobile=True, extra=None):
        nonlocal process
        env = os.environ.copy()
        env.update(ASPNETCORE_ENVIRONMENT="Development", DOTNET_ENVIRONMENT="Development",
                   ConnectionStrings__Iceplay=f"Data Source={database}")
        if mobile:
            env["ICEPLAY_MOBILE_CONFIG"] = str(config_path)
        else:
            env.pop("ICEPLAY_MOBILE_CONFIG", None)
        stdout = (evidence / f"mobile-{label}.stdout.log").open("w", encoding="utf-8")
        stderr = (evidence / f"mobile-{label}.stderr.log").open("w", encoding="utf-8")
        logs.extend([stdout, stderr])
        command = [args.dotnet, "run", "--project", "src/Iceplay.Api/Iceplay.Api.csproj", "--no-build", "--no-restore", "--no-launch-profile"]
        if extra:
            command += ["--"] + extra
        process = subprocess.Popen(command, cwd=root, env=env, stdout=stdout, stderr=stderr,
                                   creationflags=subprocess.CREATE_NO_WINDOW)
        deadline = time.monotonic() + 40
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError("Aplicação encerrou antes de responder: " + label)
            try:
                with plain.open(local + "/api/health", timeout=1) as response:
                    if response.status == 200:
                        return
            except (urllib.error.URLError, TimeoutError):
                time.sleep(0.1)
        raise TimeoutError("Aplicação não respondeu: " + label)

    def stop():
        nonlocal process
        if process is not None and process.poll() is None:
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True, check=True)
            process.wait(timeout=10)
        process = None
        for stream in logs:
            if not stream.closed:
                stream.close()

    try:
        start("startup")
        health, _ = request(local, "/api/health", 200)
        check(health["refrigeratorCount"] == 0, "Banco isolado inicia vazio, sem seed")
        page, _ = request(secure, "/", 200)
        check(b'id="acesso-movel"' in page and b'acesso.js?v=' in page, "HTML móvel oferece conexão e assets versionados")
        for asset in ("/acesso.js", "/styles.css", "/monitoramento.js", "/monitoramento-estado.mjs"):
            request(secure, asset, 200)
        for path, method in (("/api/health", "GET"), ("/api/geladeiras", "GET"), ("/api/geladeiras/1", "GET"),
                             ("/api/geladeiras", "POST"), ("/api/geladeiras/1", "PUT"), ("/api/geladeiras/1", "DELETE"),
                             ("/api/leituras", "POST"), ("/api/monitoramento?origem=Simulacao", "GET")):
            request(secure, path, 401, method)
        public_cert, _ = request(bootstrap, "/certificado.cer", 200, opener=plain)
        check(hashlib.sha256(public_cert).digest() == hashlib.sha256(Path(settings["PublicCertificatePath"]).read_bytes()).digest(), "Porta HTTP entrega somente o certificado público esperado")
        request(bootstrap, "/", 200, opener=plain)
        request(bootstrap, "/api/health", 404, opener=plain)
        request(bootstrap, "/api/acesso/entrar", 404, "POST", {"codigo": "nao-e-uma-credencial"}, opener=plain)
        request(secure, "/api/acesso", 400, headers={"Host": "host-nao-permitido.invalid"})
        try:
            with socket.create_connection((settings["Address"], settings["HttpsPort"]), timeout=5) as connection:
                with context.wrap_socket(connection, server_hostname="outro-host.invalid"):
                    raise AssertionError("Certificado aceitou hostname incorreto")
        except ssl.SSLCertVerificationError:
            check(True, "TLS rejeita hostname que não pertence ao certificado")
        try:
            with socket.create_connection((settings["Address"], settings["HttpsPort"]), timeout=5) as connection:
                with ssl.create_default_context().wrap_socket(connection, server_hostname=settings["Address"]):
                    raise AssertionError("CA local foi aceita sem confiança explícita")
        except ssl.SSLCertVerificationError:
            check(True, "TLS exige confiar explicitamente na CA local; não usa bypass de validação")
        session, response_headers = request(secure, "/api/acesso", 200)
        check(session["autenticacaoNecessaria"] and not session["autenticado"], "Acesso remoto inicia sem autenticação")
        csrf = {"X-ICEPLAY-CSRF": session["csrfToken"]}
        csrf_cookie = response_headers.get("Set-Cookie", "")
        check("secure" in csrf_cookie.lower() and "httponly" in csrf_cookie.lower() and "samesite=strict" in csrf_cookie.lower(), "Cookie antiforgery possui Secure, HttpOnly e SameSite Strict")
        request(secure, "/api/acesso/entrar", 400, "POST", {"codigo": settings["AccessCode"]})
        request(secure, "/api/acesso/entrar", 401, "POST", {"codigo": "codigo-incorreto"}, csrf)
        _, response_headers = request(secure, "/api/acesso/entrar", 204, "POST", {"codigo": settings["AccessCode"]}, csrf)
        cookie = response_headers.get("Set-Cookie", "").lower()
        check("__host-iceplay.mobile=" in cookie and "secure" in cookie and "httponly" in cookie and "samesite=strict" in cookie, "Login cria cookie de sessão protegido, sem token em URL")
        request(secure, "/api/geladeiras", 400, "POST", {"nome": "FIXTURE MOBILE TOKEN ANTIGO"}, csrf)
        session, _ = request(secure, "/api/acesso", 200)
        check(session["autenticado"], "Sessão é reconhecida e o token é renovado após login")
        csrf = {"X-ICEPLAY-CSRF": session["csrfToken"]}
        request(secure, "/api/geladeiras", 400, "POST", {"nome": "FIXTURE MOBILE SEM CSRF"})
        request(secure, "/api/geladeiras", 403, "POST", {"nome": "FIXTURE MOBILE ORIGEM"}, {**csrf, "Origin": "https://outro-host.invalid"})
        request(secure, "/api/geladeiras", 400, "POST", {"nome": " "}, csrf)
        refrigerator, _ = request(secure, "/api/geladeiras", 201, "POST", {"nome": "FIXTURE MOBILE PERSISTENCIA", "localizacao": "BANCO ISOLADO"}, csrf)
        parent = refrigerator["id"]
        request(secure, f"/api/geladeiras/{parent}", 200)
        request(secure, f"/api/geladeiras/{parent}", 200, "PUT", {"nome": "FIXTURE MOBILE EDITADA", "localizacao": "BANCO ISOLADO"}, csrf)
        reading = {"geladeiraId": parent, "temperaturaC": 0, "portaAberta": False,
                   "medidoEmUtc": (dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=2)).isoformat(timespec="seconds").replace("+00:00", "Z"), "origem": "Simulacao"}
        request(secure, "/api/leituras", 201, "POST", reading, csrf)
        snapshot, _ = request(secure, "/api/monitoramento?origem=Simulacao", 200)
        check(snapshot["geladeiras"][0]["ultimaLeitura"]["temperaturaC"] == 0 and snapshot["geladeiras"][0]["ultimaLeitura"]["portaAberta"] is False, "Painel autenticado preserva zero e porta fechada")
        simulator_script = """[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
& './tools/simulator/enviar-leituras.ps1' -GeladeiraId ([int]$env:ICEPLAY_TEST_PARENT) -ApiUrl $env:ICEPLAY_TEST_URL -TemperaturaC 4.25 -PortaAberta
"""
        simulator_env = {**os.environ, "ICEPLAY_TEST_PARENT": str(parent), "ICEPLAY_TEST_URL": local}
        simulator = subprocess.run(["pwsh", "-NoProfile", "-EncodedCommand",
            base64.b64encode(simulator_script.encode("utf-16-le")).decode("ascii")], cwd=root,
            env=simulator_env, capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
        (evidence / "simulador.log").write_text((simulator.stdout + simulator.stderr).decode("utf-8", errors="backslashreplace"), encoding="utf-8")
        check(simulator.returncode == 0, "Simulador existente envia pela API local da mesma instância")
        snapshot, _ = request(secure, "/api/monitoramento?origem=Simulacao", 200)
        last = snapshot["geladeiras"][0]["ultimaLeitura"]
        check(last["temperaturaC"] == 4.25 and last["portaAberta"] and last["origem"] == "Simulacao", "Consulta HTTPS enxerga a leitura persistida enviada pelo simulador")
        request(secure, f"/api/geladeiras/{parent}", 409, "DELETE", headers=csrf)
        empty, _ = request(secure, "/api/geladeiras", 201, "POST", {"nome": "FIXTURE MOBILE EXCLUIR"}, csrf)
        request(secure, f'/api/geladeiras/{empty["id"]}', 204, "DELETE", headers=csrf)
        request(secure, f'/api/geladeiras/{empty["id"]}', 404)
        request(secure, "/api/acesso/sair", 204, "POST", headers=csrf)
        request(secure, "/api/geladeiras", 401)
        session, _ = request(secure, "/api/acesso", 200)
        check(not session["autenticado"], "Saída remove a autenticação deste cliente")
        csrf = {"X-ICEPLAY-CSRF": session["csrfToken"]}
        request(secure, "/api/acesso/entrar", 204, "POST", {"codigo": settings["AccessCode"]}, csrf)
        stop()
        start("restart")
        request(secure, "/api/geladeiras", 401)
        check(True, "Reiniciar o servidor invalida a sessão anterior")
        session, _ = request(secure, "/api/acesso", 200)
        csrf = {"X-ICEPLAY-CSRF": session["csrfToken"]}
        request(secure, "/api/acesso/entrar", 204, "POST", {"codigo": settings["AccessCode"]}, csrf)
        persisted, _ = request(secure, f"/api/geladeiras/{parent}", 200)
        check(persisted["nome"] == "FIXTURE MOBILE EDITADA", "Cadastro editado permanece após reiniciar")
        snapshot, _ = request(secure, "/api/monitoramento?origem=Simulacao", 200)
        check(snapshot["geladeiras"][0]["ultimaLeitura"]["id"] == last["id"], "Última leitura permanece após reiniciar")
        request(secure, "/api/acesso/sair", 400, "POST", headers=csrf)
        session, _ = request(secure, "/api/acesso", 200)
        csrf = {"X-ICEPLAY-CSRF": session["csrfToken"]}
        request(secure, "/api/acesso/sair", 204, "POST", headers=csrf)
        session, _ = request(secure, "/api/acesso", 200)
        csrf = {"X-ICEPLAY-CSRF": session["csrfToken"]}
        for attempt in range(7):
            request(secure, "/api/acesso/entrar", 401, "POST", {"codigo": "incorreto"}, csrf)
        request(secure, "/api/acesso/entrar", 429, "POST", {"codigo": "incorreto"}, csrf)
        stop()
        # Mesmo um bind HTTP acidental fora do loopback deve falhar com o modo móvel desligado.
        accidental = f'http://{settings["Address"]}:{settings["LocalPort"]}'
        start("disabled", mobile=False, extra=["--urls", local + ";" + accidental,
              "--AllowedHosts", "127.0.0.1;" + settings["Address"]])
        request(accidental, "/api/health", 403, opener=plain)
        request(accidental, "/", 403, opener=plain)
        check(True, "Modo comum bloqueia acesso remoto mesmo se a URL for sobrescrita")
        stop()
        with sqlite3.connect(database.as_uri() + "?mode=ro", uri=True) as connection:
            check(connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok", "SQLite mantém integridade")
            check(not connection.execute("PRAGMA foreign_key_check").fetchall(), "SQLite mantém vínculos válidos")
            check(connection.execute("SELECT COUNT(*) FROM Geladeiras").fetchone()[0] == 1 and connection.execute("SELECT COUNT(*) FROM Leituras").fetchone()[0] == 2, "Somente uma geladeira e duas leituras fixture permanecem no banco isolado")
            check(connection.execute('SELECT COUNT(*) FROM "__EFMigrationsHistory"').fetchone()[0] == 2, "Duas migrations existentes, sem nova migration de autenticação")
        report["result"] = "passed"
    except Exception as error:
        report["errors"].append(type(error).__name__ + ": " + str(error))
        print("FALHOU:", report["errors"][-1])
    finally:
        stop()
        report["finishedAtUtc"] = dt.datetime.now(dt.timezone.utc).isoformat()
        report["checkCount"] = len(report["checks"])
        report["requestCount"] = len(report["requests"])
        (evidence / "mobile-api.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if report["result"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
