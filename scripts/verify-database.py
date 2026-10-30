"""Verifica SQLite com uma fixture de software; nunca representa medição de sensor."""

import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path


FIXTURE_NAME = "FIXTURE DE TESTE - NAO E CADASTRO REAL"
INSERT_SQL = (
    'INSERT INTO "Geladeiras" ("Nome", "Localizacao", "CriadoEmUtc") '
    "VALUES (?, ?, ?)"
)


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def connect_existing(database_path):
    # mode=rw impede que um erro no caminho crie silenciosamente um banco novo.
    return sqlite3.connect(database_path.as_uri() + "?mode=rw", uri=True)


def expect_constraint_rejection(connection, values, label, checks):
    # Mesmo que uma constraint esteja ausente, o insert inválido será revertido.
    connection.execute("SAVEPOINT constraint_test")
    try:
        try:
            connection.execute(INSERT_SQL, values)
        except sqlite3.IntegrityError:
            checks.append(label)
        else:
            raise AssertionError(f"O banco aceitou dados inválidos: {label}.")
    finally:
        connection.execute("ROLLBACK TO SAVEPOINT constraint_test")
        connection.execute("RELEASE SAVEPOINT constraint_test")


def validate_path(argument):
    repository = Path(__file__).resolve().parent.parent
    allowed_directory = (repository / ".tools" / "verification").resolve(strict=True)
    require(allowed_directory.is_dir(), "A pasta de verificação não é um diretório.")
    require(
        allowed_directory.is_relative_to(repository),
        "A pasta de verificação aponta para fora do projeto.",
    )
    database_path = Path(argument).resolve(strict=True)
    require(database_path.is_file(), "O caminho informado não é um arquivo de banco existente.")
    require(
        database_path.is_relative_to(allowed_directory),
        "Só é permitido verificar bancos em <repo>/.tools/verification/.",
    )
    return repository, database_path


def verify(database_path, report):
    checks = report["checksPassed"]
    connection = None
    fixture_id = None
    try:
        connection = connect_existing(database_path)
        integrity = connection.execute("PRAGMA integrity_check").fetchall()
        require(integrity == [("ok",)], f"Falha no integrity_check: {integrity}.")
        checks.append("PRAGMA integrity_check retornou ok")

        columns = {
            row[1]: row for row in connection.execute('PRAGMA table_info("Geladeiras")')
        }
        require(
            set(columns) == {"Id", "Nome", "Localizacao", "CriadoEmUtc"},
            "O esquema da tabela Geladeiras difere do modelo inicial.",
        )
        require(columns["Id"][2].upper() == "INTEGER" and columns["Id"][5] == 1,
                "Id deve ser chave primária INTEGER.")
        for column_name in ("Nome", "Localizacao", "CriadoEmUtc"):
            require(columns[column_name][2].upper() == "TEXT",
                    f"A coluna {column_name} deve ter tipo TEXT.")
        require(columns["Nome"][3] == 1 and columns["CriadoEmUtc"][3] == 1,
                "Nome e CriadoEmUtc devem ser NOT NULL.")
        require(columns["Localizacao"][3] == 0, "Localizacao deve aceitar NULL.")
        checks.append("Esquema Geladeiras: chave, quatro colunas, tipos e nulabilidade")

        migration_directory = Path(__file__).resolve().parent.parent / "src/Iceplay.Api/Migrations"
        expected_migrations = sorted(
            path.stem for path in migration_directory.glob("*.cs")
            if path.name[:14].isdigit() and not path.name.endswith(".Designer.cs")
        )
        applied_migrations = [row[0] for row in connection.execute(
            'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId"'
        )]
        require(expected_migrations and expected_migrations[0] == "20261013172101_InitialCreate"
                and applied_migrations == expected_migrations,
                "O banco deve conter a migration inicial e todas as evoluções do projeto aplicadas.")
        checks.append("Histórico EF Core contém a migration inicial e todas as evoluções aplicadas")

        initial_count = connection.execute('SELECT COUNT(*) FROM "Geladeiras"').fetchone()[0]
        require(initial_count == 0, "O banco de verificação precisa começar sem geladeiras.")
        checks.append("Banco inicial vazio, sem cadastros reais")

        # A coluna segue o contrato UTC do backend; o valor de teste é o horário
        # real desta execução de software, sem qualquer coleta de sensor.
        created_at_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")
        fixture_values = (FIXTURE_NAME, "LOCALIZACAO DE TESTE", created_at_utc)
        cursor = connection.execute(INSERT_SQL, fixture_values)
        fixture_id = cursor.lastrowid
        require(fixture_id is not None, "O banco não retornou o Id da fixture.")
        connection.commit()
        connection.close()
        connection = None

        connection = connect_existing(database_path)
        actual_values = connection.execute(
            'SELECT "Nome", "Localizacao", "CriadoEmUtc" FROM "Geladeiras" WHERE "Id" = ?',
            (fixture_id,),
        ).fetchone()
        require(actual_values == fixture_values,
                "A fixture não foi persistida integralmente após fechar e reabrir a conexão.")
        checks.append("Insert/commit/leitura persistente após fechar e reabrir a conexão")

        invalid_cases = [
            (("", "TESTE", created_at_utc), "Nome vazio rejeitado"),
            (("   ", "TESTE", created_at_utc), "Nome com apenas espaços rejeitado"),
            (("N" * 101, "TESTE", created_at_utc), "Nome com 101 caracteres rejeitado"),
            (("TESTE", "L" * 201, created_at_utc), "Localizacao com 201 caracteres rejeitada"),
            ((None, "TESTE", created_at_utc), "Nome NULL rejeitado"),
            (("TESTE", "TESTE", None), "CriadoEmUtc NULL rejeitado"),
        ]
        for values, label in invalid_cases:
            expect_constraint_rejection(connection, values, label, checks)
    except (AssertionError, sqlite3.Error, OSError) as error:
        report["errors"].append(str(error))
    finally:
        try:
            if connection is not None:
                connection.rollback()
            if fixture_id is not None:
                if connection is None:
                    connection = connect_existing(database_path)
                # Remove exclusivamente o Id criado por esta execução. A condição
                # no nome protege contra remover um registro alterado externamente.
                connection.execute(
                    'DELETE FROM "Geladeiras" WHERE "Id" = ? AND "Nome" = ?',
                    (fixture_id, FIXTURE_NAME),
                )
                connection.commit()
                final_count = connection.execute(
                    'SELECT COUNT(*) FROM "Geladeiras"'
                ).fetchone()[0]
                report["finalRefrigeratorCount"] = final_count
                require(final_count == 0, "O banco não ficou vazio após remover a fixture.")
                checks.append("Somente a fixture foi removida; contagem final igual a zero")
        except (AssertionError, sqlite3.Error, OSError) as error:
            report["errors"].append(f"Falha na limpeza da fixture: {error}")
        finally:
            if connection is not None:
                connection.close()


def main():
    # JSON redirecionado para arquivo deve manter acentos também no Windows.
    sys.stdout.reconfigure(encoding="utf-8")
    report = {
        "status": "failed",
        "scope": "verificacao de software com fixture; sem hardware ou sensores",
        "pythonVersion": sys.version.split()[0],
        "sqliteVersion": sqlite3.sqlite_version,
        "startedAtUtc": utc_now(),
        "checksPassed": [],
        "errors": [],
    }
    try:
        require(len(sys.argv) == 2,
                "Uso: python scripts/verify-database.py <banco em .tools/verification/>")
        repository, database_path = validate_path(sys.argv[1])
        report["database"] = database_path.relative_to(repository).as_posix()
        verify(database_path, report)
    except (AssertionError, OSError, ValueError) as error:
        report["errors"].append(str(error))

    report["finishedAtUtc"] = utc_now()
    if not report["errors"]:
        report["status"] = "passed"
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
