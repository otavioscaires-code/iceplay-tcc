using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iceplay.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAlertas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Alertas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    GeladeiraId = table.Column<int>(type: "INTEGER", nullable: false),
                    Origem = table.Column<string>(type: "TEXT", nullable: false),
                    Tipo = table.Column<string>(type: "TEXT", nullable: false),
                    Gravidade = table.Column<string>(type: "TEXT", nullable: false),
                    InicioCondicaoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AbertoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UltimaEvidenciaEmUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EncerradoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    MotivoEncerramento = table.Column<string>(type: "TEXT", nullable: true),
                    LeituraAberturaId = table.Column<int>(type: "INTEGER", nullable: true),
                    TemperaturaAberturaC = table.Column<double>(type: "REAL", nullable: true),
                    TemperaturaMinimaC = table.Column<double>(type: "REAL", nullable: false),
                    TemperaturaMaximaC = table.Column<double>(type: "REAL", nullable: false),
                    ToleranciaPortaAbertaSegundos = table.Column<int>(type: "INTEGER", nullable: false),
                    AusenciaLeiturasSegundos = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Alertas", x => x.Id);
                    table.CheckConstraint("CK_Alertas_Encerramento", "(\"EncerradoEmUtc\" IS NULL AND \"MotivoEncerramento\" IS NULL) OR (\"EncerradoEmUtc\" IS NOT NULL AND julianday(\"EncerradoEmUtc\") IS NOT NULL AND \"EncerradoEmUtc\" >= \"AbertoEmUtc\" AND \"MotivoEncerramento\" IS NOT NULL AND \"MotivoEncerramento\" IN ('CondicaoNormalizada', 'SemDadosRecentes', 'ConfiguracaoAlterada', 'MonitoramentoDesativado'))");
                    table.CheckConstraint("CK_Alertas_Gravidade", "\"Gravidade\" IN ('Atencao', 'Critico')");
                    table.CheckConstraint("CK_Alertas_Instantes", "julianday(\"InicioCondicaoEmUtc\") IS NOT NULL AND julianday(\"AbertoEmUtc\") IS NOT NULL AND julianday(\"UltimaEvidenciaEmUtc\") IS NOT NULL AND \"InicioCondicaoEmUtc\" <= \"AbertoEmUtc\" AND (\"EncerradoEmUtc\" IS NULL OR \"UltimaEvidenciaEmUtc\" <= \"EncerradoEmUtc\")");
                    table.CheckConstraint("CK_Alertas_Origem", "\"Origem\" IN ('Simulacao', 'Hardware')");
                    table.CheckConstraint("CK_Alertas_Tipo", "\"Tipo\" IN ('TemperaturaForaFaixa', 'PortaAberta', 'AusenciaLeituras')");
                    table.ForeignKey(
                        name: "FK_Alertas_Geladeiras_GeladeiraId",
                        column: x => x.GeladeiraId,
                        principalTable: "Geladeiras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Alertas_Leituras_LeituraAberturaId",
                        column: x => x.LeituraAberturaId,
                        principalTable: "Leituras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EstadosMonitoramento",
                columns: table => new
                {
                    GeladeiraId = table.Column<int>(type: "INTEGER", nullable: false),
                    ConfiguracaoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UltimaMedicaoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    UltimaLeituraId = table.Column<int>(type: "INTEGER", nullable: false),
                    InicioPortaAbertaEmUtc = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EstadosMonitoramento", x => x.GeladeiraId);
                    table.ForeignKey(
                        name: "FK_EstadosMonitoramento_ConfiguracoesGeladeiras_GeladeiraId",
                        column: x => x.GeladeiraId,
                        principalTable: "ConfiguracoesGeladeiras",
                        principalColumn: "GeladeiraId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Alertas_AbertoEmUtc_Id",
                table: "Alertas",
                columns: new[] { "AbertoEmUtc", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_Alertas_GeladeiraId_Origem_Tipo",
                table: "Alertas",
                columns: new[] { "GeladeiraId", "Origem", "Tipo" },
                unique: true,
                filter: "\"EncerradoEmUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Alertas_LeituraAberturaId",
                table: "Alertas",
                column: "LeituraAberturaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Alertas");

            migrationBuilder.DropTable(
                name: "EstadosMonitoramento");
        }
    }
}
