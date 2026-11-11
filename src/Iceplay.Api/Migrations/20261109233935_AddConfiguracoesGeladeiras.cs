using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iceplay.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddConfiguracoesGeladeiras : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ConfiguracoesGeladeiras",
                columns: table => new
                {
                    GeladeiraId = table.Column<int>(type: "INTEGER", nullable: false),
                    TemperaturaMinimaC = table.Column<double>(type: "REAL", nullable: false),
                    TemperaturaMaximaC = table.Column<double>(type: "REAL", nullable: false),
                    ToleranciaPortaAbertaSegundos = table.Column<int>(type: "INTEGER", nullable: false),
                    AusenciaLeiturasSegundos = table.Column<int>(type: "INTEGER", nullable: false),
                    OrigemMonitorada = table.Column<string>(type: "TEXT", nullable: false),
                    MonitoramentoAtivo = table.Column<bool>(type: "INTEGER", nullable: false),
                    InicioMonitoramentoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    AtualizadoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConfiguracoesGeladeiras", x => x.GeladeiraId);
                    table.CheckConstraint("CK_Configuracoes_AusenciaLeituras", "typeof(\"AusenciaLeiturasSegundos\") = 'integer' AND \"AusenciaLeiturasSegundos\" BETWEEN 1 AND 2147483647");
                    table.CheckConstraint("CK_Configuracoes_GeladeiraId", "\"GeladeiraId\" > 0");
                    table.CheckConstraint("CK_Configuracoes_Instantes", "julianday(\"AtualizadoEmUtc\") IS NOT NULL AND ((\"MonitoramentoAtivo\" = 0 AND \"InicioMonitoramentoEmUtc\" IS NULL) OR (\"MonitoramentoAtivo\" = 1 AND \"InicioMonitoramentoEmUtc\" IS NOT NULL AND julianday(\"InicioMonitoramentoEmUtc\") IS NOT NULL AND \"InicioMonitoramentoEmUtc\" <= \"AtualizadoEmUtc\"))");
                    table.CheckConstraint("CK_Configuracoes_MonitoramentoAtivo", "\"MonitoramentoAtivo\" IN (0, 1)");
                    table.CheckConstraint("CK_Configuracoes_Origem", "\"OrigemMonitorada\" IN ('Simulacao', 'Hardware')");
                    table.CheckConstraint("CK_Configuracoes_Temperaturas", "\"TemperaturaMinimaC\" BETWEEN -1.7976931348623157e308 AND 1.7976931348623157e308 AND \"TemperaturaMaximaC\" BETWEEN -1.7976931348623157e308 AND 1.7976931348623157e308 AND \"TemperaturaMinimaC\" < \"TemperaturaMaximaC\"");
                    table.CheckConstraint("CK_Configuracoes_ToleranciaPorta", "typeof(\"ToleranciaPortaAbertaSegundos\") = 'integer' AND \"ToleranciaPortaAbertaSegundos\" BETWEEN 1 AND 2147483647");
                    table.ForeignKey(
                        name: "FK_ConfiguracoesGeladeiras_Geladeiras_GeladeiraId",
                        column: x => x.GeladeiraId,
                        principalTable: "Geladeiras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConfiguracoesGeladeiras");
        }
    }
}
