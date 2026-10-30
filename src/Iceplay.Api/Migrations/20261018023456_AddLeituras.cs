using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iceplay.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLeituras : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Leituras",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    GeladeiraId = table.Column<int>(type: "INTEGER", nullable: false),
                    TemperaturaC = table.Column<double>(type: "REAL", nullable: false),
                    PortaAberta = table.Column<bool>(type: "INTEGER", nullable: false),
                    MedidoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    RecebidoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Origem = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Leituras", x => x.Id);
                    table.CheckConstraint("CK_Leituras_GeladeiraId", "\"GeladeiraId\" > 0");
                    table.CheckConstraint("CK_Leituras_Instantes", "julianday(\"MedidoEmUtc\") IS NOT NULL AND julianday(\"RecebidoEmUtc\") IS NOT NULL AND \"MedidoEmUtc\" <= \"RecebidoEmUtc\"");
                    table.CheckConstraint("CK_Leituras_Origem", "\"Origem\" IN ('Simulacao', 'Hardware')");
                    table.CheckConstraint("CK_Leituras_PortaAberta", "\"PortaAberta\" IN (0, 1)");
                    table.CheckConstraint("CK_Leituras_TemperaturaFinita", "\"TemperaturaC\" BETWEEN -1.7976931348623157e308 AND 1.7976931348623157e308");
                    table.ForeignKey(
                        name: "FK_Leituras_Geladeiras_GeladeiraId",
                        column: x => x.GeladeiraId,
                        principalTable: "Geladeiras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Leituras_GeladeiraId_MedidoEmUtc_Id",
                table: "Leituras",
                columns: new[] { "GeladeiraId", "MedidoEmUtc", "Id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Leituras");
        }
    }
}
