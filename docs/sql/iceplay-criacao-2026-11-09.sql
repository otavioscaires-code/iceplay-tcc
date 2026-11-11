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

BEGIN TRANSACTION;
CREATE TABLE "ConfiguracoesGeladeiras" (
    "GeladeiraId" INTEGER NOT NULL CONSTRAINT "PK_ConfiguracoesGeladeiras" PRIMARY KEY,
    "TemperaturaMinimaC" REAL NOT NULL,
    "TemperaturaMaximaC" REAL NOT NULL,
    "ToleranciaPortaAbertaSegundos" INTEGER NOT NULL,
    "AusenciaLeiturasSegundos" INTEGER NOT NULL,
    "OrigemMonitorada" TEXT NOT NULL,
    "MonitoramentoAtivo" INTEGER NOT NULL,
    "InicioMonitoramentoEmUtc" TEXT NULL,
    "AtualizadoEmUtc" TEXT NOT NULL,
    CONSTRAINT "CK_Configuracoes_AusenciaLeituras" CHECK (typeof("AusenciaLeiturasSegundos") = 'integer' AND "AusenciaLeiturasSegundos" BETWEEN 1 AND 2147483647),
    CONSTRAINT "CK_Configuracoes_GeladeiraId" CHECK ("GeladeiraId" > 0),
    CONSTRAINT "CK_Configuracoes_Instantes" CHECK (julianday("AtualizadoEmUtc") IS NOT NULL AND (("MonitoramentoAtivo" = 0 AND "InicioMonitoramentoEmUtc" IS NULL) OR ("MonitoramentoAtivo" = 1 AND "InicioMonitoramentoEmUtc" IS NOT NULL AND julianday("InicioMonitoramentoEmUtc") IS NOT NULL AND "InicioMonitoramentoEmUtc" <= "AtualizadoEmUtc"))),
    CONSTRAINT "CK_Configuracoes_MonitoramentoAtivo" CHECK ("MonitoramentoAtivo" IN (0, 1)),
    CONSTRAINT "CK_Configuracoes_Origem" CHECK ("OrigemMonitorada" IN ('Simulacao', 'Hardware')),
    CONSTRAINT "CK_Configuracoes_Temperaturas" CHECK ("TemperaturaMinimaC" BETWEEN -1.7976931348623157e308 AND 1.7976931348623157e308 AND "TemperaturaMaximaC" BETWEEN -1.7976931348623157e308 AND 1.7976931348623157e308 AND "TemperaturaMinimaC" < "TemperaturaMaximaC"),
    CONSTRAINT "CK_Configuracoes_ToleranciaPorta" CHECK (typeof("ToleranciaPortaAbertaSegundos") = 'integer' AND "ToleranciaPortaAbertaSegundos" BETWEEN 1 AND 2147483647),
    CONSTRAINT "FK_ConfiguracoesGeladeiras_Geladeiras_GeladeiraId" FOREIGN KEY ("GeladeiraId") REFERENCES "Geladeiras" ("Id") ON DELETE CASCADE
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261109233935_AddConfiguracoesGeladeiras', '10.0.12');

COMMIT;
