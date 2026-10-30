using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Iceplay.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Geladeiras",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Nome = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Localizacao = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    CriadoEmUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Geladeiras", x => x.Id);
                    table.CheckConstraint("CK_Geladeiras_Localizacao", "\"Localizacao\" IS NULL OR length(\"Localizacao\") <= 200");
                    table.CheckConstraint("CK_Geladeiras_Nome", "length(trim(\"Nome\")) >= 1 AND length(\"Nome\") <= 100");
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Geladeiras");
        }
    }
}
