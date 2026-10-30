using Iceplay.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Iceplay.Api.Data;

public sealed class IceplayDbContext(DbContextOptions<IceplayDbContext> options) : DbContext(options)
{
    public DbSet<Geladeira> Geladeiras => Set<Geladeira>();
    public DbSet<Leitura> Leituras => Set<Leitura>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var geladeira = modelBuilder.Entity<Geladeira>();

        // SQLite não impõe o tamanho máximo declarado no tipo da coluna.
        geladeira.ToTable("Geladeiras", table =>
        {
            table.HasCheckConstraint("CK_Geladeiras_Nome", "length(trim(\"Nome\")) >= 1 AND length(\"Nome\") <= 100");
            table.HasCheckConstraint("CK_Geladeiras_Localizacao", "\"Localizacao\" IS NULL OR length(\"Localizacao\") <= 200");
        });

        geladeira.HasKey(item => item.Id);
        geladeira.Property(item => item.Id).ValueGeneratedOnAdd();
        geladeira.Property(item => item.Nome).IsRequired().HasMaxLength(100);
        geladeira.Property(item => item.Localizacao).HasMaxLength(200);

        // SQLite preserva o valor da data, mas não o DateTimeKind. O contrato desta
        // coluna é UTC; a conversão reconstitui essa informação ao ler o banco.
        geladeira.Property(item => item.CriadoEmUtc)
            .IsRequired()
            .HasConversion(
                value => value,
                value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

        var leitura = modelBuilder.Entity<Leitura>();
        leitura.ToTable("Leituras", table =>
        {
            table.HasCheckConstraint("CK_Leituras_GeladeiraId", "\"GeladeiraId\" > 0");
            table.HasCheckConstraint("CK_Leituras_Origem", "\"Origem\" IN ('Simulacao', 'Hardware')");
            table.HasCheckConstraint("CK_Leituras_PortaAberta", "\"PortaAberta\" IN (0, 1)");
            table.HasCheckConstraint("CK_Leituras_Instantes",
                "julianday(\"MedidoEmUtc\") IS NOT NULL AND julianday(\"RecebidoEmUtc\") IS NOT NULL AND \"MedidoEmUtc\" <= \"RecebidoEmUtc\"");

            // Estes são os limites de representação finita do double, não uma
            // faixa física de temperatura nem limites para futuros alertas.
            table.HasCheckConstraint("CK_Leituras_TemperaturaFinita",
                "\"TemperaturaC\" BETWEEN -1.7976931348623157e308 AND 1.7976931348623157e308");
        });

        leitura.HasKey(item => item.Id);
        leitura.Property(item => item.Id).ValueGeneratedOnAdd();
        leitura.Property(item => item.GeladeiraId).IsRequired();
        leitura.Property(item => item.TemperaturaC).IsRequired();
        leitura.Property(item => item.PortaAberta).IsRequired();
        leitura.Property(item => item.Origem).HasConversion<string>().IsRequired();
        leitura.Property(item => item.MedidoEmUtc)
            .IsRequired()
            .HasConversion(value => value, value => DateTime.SpecifyKind(value, DateTimeKind.Utc));
        leitura.Property(item => item.RecebidoEmUtc)
            .IsRequired()
            .HasConversion(value => value, value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

        leitura.HasOne<Geladeira>()
            .WithMany()
            .HasForeignKey(item => item.GeladeiraId)
            .OnDelete(DeleteBehavior.Restrict);
        leitura.HasIndex(item => new { item.GeladeiraId, item.MedidoEmUtc, item.Id });
    }
}
