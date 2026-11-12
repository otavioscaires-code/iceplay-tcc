using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iceplay.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDispositivos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DispositivoId",
                table: "Leituras",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MedicaoId",
                table: "Leituras",
                type: "TEXT",
                maxLength: 36,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Dispositivos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    GeladeiraId = table.Column<int>(type: "INTEGER", nullable: false),
                    Nome = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    CredencialHash = table.Column<byte[]>(type: "BLOB", nullable: false),
                    CriadoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    RevogadoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dispositivos", x => x.Id);
                    table.CheckConstraint("CK_Dispositivos_Hash", "typeof(\"CredencialHash\") = 'blob' AND length(\"CredencialHash\") = 32");
                    table.CheckConstraint("CK_Dispositivos_Instantes", "julianday(\"CriadoEmUtc\") IS NOT NULL AND (\"RevogadoEmUtc\" IS NULL OR (julianday(\"RevogadoEmUtc\") IS NOT NULL AND \"RevogadoEmUtc\" >= \"CriadoEmUtc\"))");
                    table.CheckConstraint("CK_Dispositivos_Nome", "length(trim(\"Nome\")) BETWEEN 1 AND 100");
                    table.ForeignKey(
                        name: "FK_Dispositivos_Geladeiras_GeladeiraId",
                        column: x => x.GeladeiraId,
                        principalTable: "Geladeiras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Leituras_DispositivoId_MedicaoId",
                table: "Leituras",
                columns: new[] { "DispositivoId", "MedicaoId" },
                unique: true,
                filter: "\"DispositivoId\" IS NOT NULL AND \"MedicaoId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Dispositivos_GeladeiraId",
                table: "Dispositivos",
                column: "GeladeiraId",
                unique: true,
                filter: "\"RevogadoEmUtc\" IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Leituras_Dispositivos_DispositivoId",
                table: "Leituras",
                column: "DispositivoId",
                principalTable: "Dispositivos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Leituras_Dispositivos_DispositivoId",
                table: "Leituras");

            migrationBuilder.DropTable(
                name: "Dispositivos");

            migrationBuilder.DropIndex(
                name: "IX_Leituras_DispositivoId_MedicaoId",
                table: "Leituras");

            migrationBuilder.DropColumn(
                name: "DispositivoId",
                table: "Leituras");

            migrationBuilder.DropColumn(
                name: "MedicaoId",
                table: "Leituras");
        }
    }
}
