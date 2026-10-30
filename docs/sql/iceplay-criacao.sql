CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
    "ProductVersion" TEXT NOT NULL
);

BEGIN TRANSACTION;
CREATE TABLE "Geladeiras" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Geladeiras" PRIMARY KEY AUTOINCREMENT,
    "Nome" TEXT NOT NULL,
    "Localizacao" TEXT NULL,
    "CriadoEmUtc" TEXT NOT NULL,
    CONSTRAINT "CK_Geladeiras_Localizacao" CHECK ("Localizacao" IS NULL OR length("Localizacao") <= 200),
    CONSTRAINT "CK_Geladeiras_Nome" CHECK (length(trim("Nome")) >= 1 AND length("Nome") <= 100)
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261013172101_InitialCreate', '10.0.12');

COMMIT;

BEGIN TRANSACTION;
CREATE TABLE "Leituras" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Leituras" PRIMARY KEY AUTOINCREMENT,
    "GeladeiraId" INTEGER NOT NULL,
    "TemperaturaC" REAL NOT NULL,
    "PortaAberta" INTEGER NOT NULL,
    "MedidoEmUtc" TEXT NOT NULL,
    "RecebidoEmUtc" TEXT NOT NULL,
    "Origem" TEXT NOT NULL,
    CONSTRAINT "CK_Leituras_GeladeiraId" CHECK ("GeladeiraId" > 0),
    CONSTRAINT "CK_Leituras_Instantes" CHECK (julianday("MedidoEmUtc") IS NOT NULL AND julianday("RecebidoEmUtc") IS NOT NULL AND "MedidoEmUtc" <= "RecebidoEmUtc"),
    CONSTRAINT "CK_Leituras_Origem" CHECK ("Origem" IN ('Simulacao', 'Hardware')),
    CONSTRAINT "CK_Leituras_PortaAberta" CHECK ("PortaAberta" IN (0, 1)),
    CONSTRAINT "CK_Leituras_TemperaturaFinita" CHECK ("TemperaturaC" BETWEEN -1.7976931348623157e308 AND 1.7976931348623157e308),
    CONSTRAINT "FK_Leituras_Geladeiras_GeladeiraId" FOREIGN KEY ("GeladeiraId") REFERENCES "Geladeiras" ("Id") ON DELETE RESTRICT
);

CREATE INDEX "IX_Leituras_GeladeiraId_MedidoEmUtc_Id" ON "Leituras" ("GeladeiraId", "MedidoEmUtc", "Id");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261018023456_AddLeituras', '10.0.12');

COMMIT;

