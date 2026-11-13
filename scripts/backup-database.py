"""Backup consistente SQLite, somente leitura da origem; sem substituir banco de uso."""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import sqlite3
import uuid


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default=str(root / "src/Iceplay.Api/data/iceplay.db"))
    args = parser.parse_args()
    source = Path(args.database).resolve(strict=True)
    if not source.is_relative_to(root) or source.suffix != ".db":
        raise ValueError("Use um banco existente dentro deste projeto.")
    folder = root / ".tools/backups"
    folder.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = folder / f"iceplay-{stamp}-{uuid.uuid4().hex[:8]}.db"
    # A API de backup inclui as transacoes confirmadas no WAL, sem copiar um
    # arquivo parcialmente atualizado. A origem e aberta em mode=ro.
    with sqlite3.connect(source.as_uri() + "?mode=ro", uri=True) as original:
        with sqlite3.connect(target) as backup:
            original.backup(backup)
    with sqlite3.connect(target.as_uri() + "?mode=ro", uri=True) as checked:
        if checked.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
            raise ValueError("O backup nao passou na integridade; preserve a origem.")
        if checked.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("O backup possui violacoes de FK; preserve a origem.")
        tables = {r[0] for r in checked.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        counts = {name: checked.execute('SELECT COUNT(*) FROM "' + name + '"').fetchone()[0]
                  for name in ("Geladeiras", "Leituras", "ConfiguracoesGeladeiras", "Alertas", "EstadosMonitoramento", "Dispositivos") if name in tables}
        old_rows = {name: checked.execute(sql).fetchall() for name, sql in {
            "Geladeiras": "SELECT Id,Nome,Localizacao,CriadoEmUtc FROM Geladeiras ORDER BY Id",
            "Leituras": "SELECT Id,GeladeiraId,TemperaturaC,PortaAberta,MedidoEmUtc,RecebidoEmUtc,Origem FROM Leituras ORDER BY Id",
            "ConfiguracoesGeladeiras": "SELECT * FROM ConfiguracoesGeladeiras ORDER BY GeladeiraId"}.items() if name in tables}
        migrations = [r[0] for r in checked.execute("SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId")]
    report = {"result": "passed", "scope": "Backup privado consistente; nao e prova de hardware", "createdAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "source": str(source), "backup": str(target), "integrity": "ok", "foreignKeyViolations": 0,
              "counts": counts, "migrations": migrations,
              "historicalFieldsSha256": hashlib.sha256(json.dumps(old_rows, sort_keys=True).encode()).hexdigest()}
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
