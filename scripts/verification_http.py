"""Apoio aos novos verificadores: processo real da API e banco descartável isolado."""
import datetime as dt
import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import time
import urllib.error
import urllib.request


class ApiVerification:
    def __init__(self, dotnet, database, evidence, name):
        self.root = Path(__file__).resolve().parents[1]
        self.database = Path(database).resolve()
        if not self.database.is_relative_to(self.root / ".tools/verification") or self.database.exists():
            raise ValueError("Use banco novo dentro de .tools/verification, nunca o banco de uso.")
        self.database.parent.mkdir(parents=True, exist_ok=True)
        self.evidence = Path(evidence).resolve()
        self.evidence.mkdir(parents=True, exist_ok=True)
        self.dotnet, self.name, self.process, self.streams = dotnet, name, None, []
        self.client = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        self.report = {"result": "failed", "startedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
                       "scope": "Software HTTP/SQLite isolado; nao comprova hardware nem Safari", "checks": [], "requests": []}

    def check(self, condition, description):
        if not condition:
            raise AssertionError(description)
        self.report["checks"].append(description)
        print("PASSOU:", description, flush=True)

    def request(self, path, expected=200, method="GET", body=None, headers=None):
        data = None if body is None else json.dumps(body).encode()
        request_headers = {"Content-Type": "application/json"} if data else {}
        request_headers.update(headers or {})
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=request_headers)
        try:
            response = self.client.open(req, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            content, actual, response_headers = response.read().decode(), response.status, dict(response.headers)
        value = json.loads(content) if content and "json" in response_headers.get("Content-Type", "") else content
        # Nunca registrar credenciais nos relatórios, inclusive nos futuros testes de dispositivo.
        safe_body = {k: ("[REDACTED]" if k.lower() in ("credencial", "codigo", "token") else v) for k, v in body.items()} if isinstance(body, dict) else body
        safe_value = {k: ("[REDACTED]" if k.lower() in ("credencial", "codigo", "token") else v) for k, v in value.items()} if isinstance(value, dict) else value
        self.report["requests"].append({"method": method, "path": path, "expectedStatus": expected,
                                        "actualStatus": actual, "requestBody": safe_body, "responseBody": safe_value})
        self.check(actual == expected, f"{method} {path} retorna {expected} (real: {actual})")
        return value, response_headers

    def start(self, label, environment="Development"):
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            self.base = f"http://127.0.0.1:{listener.getsockname()[1]}"
        env = os.environ.copy()
        env.pop("ICEPLAY_MOBILE_CONFIG", None)
        env.update(ASPNETCORE_ENVIRONMENT=environment, DOTNET_ENVIRONMENT=environment,
                   ConnectionStrings__Iceplay=f"Data Source={self.database}")
        self.streams = [(self.evidence / f"{self.name}-{label}.{suffix}.log").open("w", encoding="utf-8") for suffix in ("stdout", "stderr")]
        self.process = subprocess.Popen([self.dotnet, str(self.root / "src/Iceplay.Api/bin/Debug/net10.0/Iceplay.Api.dll"), "--urls", self.base],
                                        cwd=self.root / "src/Iceplay.Api", env=env, stdout=self.streams[0], stderr=self.streams[1],
                                        creationflags=subprocess.CREATE_NO_WINDOW)
        deadline = time.monotonic() + 40
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                raise RuntimeError("A API encerrou antes de responder: " + label)
            try:
                with self.client.open(self.base + "/api/health", timeout=1) as response:
                    if response.status == 200:
                        return
            except (urllib.error.URLError, TimeoutError):
                time.sleep(.1)
        raise TimeoutError("A API nao iniciou: " + label)

    def stop(self):
        if self.process is not None and self.process.poll() is None:
            self.process.terminate()
            self.process.wait(timeout=10)
        self.process = None
        for stream in self.streams:
            stream.close()

    def wait_for(self, path, predicate, description, timeout=10):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            value, _ = self.request(path)
            if predicate(value):
                self.check(True, description)
                return value
            time.sleep(.2)
        raise AssertionError(description + " (timeout)")

    def inspect(self):
        with sqlite3.connect(self.database.as_uri() + "?mode=ro", uri=True) as connection:
            self.check(connection.execute("PRAGMA integrity_check").fetchall() == [("ok",)], "SQLite integro")
            self.check(not connection.execute("PRAGMA foreign_key_check").fetchall(), "Chaves estrangeiras integras")
            names = [r[0] for r in connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
            return {name: connection.execute('SELECT * FROM "' + name + '" ORDER BY 1').fetchall() for name in names}

    def finish(self, error=None):
        self.stop()
        self.report.update(result="failed" if error else "passed", assertions=len(self.report["checks"]),
                           finishedAtUtc=dt.datetime.now(dt.timezone.utc).isoformat())
        if error:
            self.report["error"] = str(error)
        (self.evidence / (self.name + "-api.json")).write_text(json.dumps(self.report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f'{self.report["result"]}: {self.report["assertions"]} verificacoes; {len(self.report["requests"])} requisicoes', flush=True)
