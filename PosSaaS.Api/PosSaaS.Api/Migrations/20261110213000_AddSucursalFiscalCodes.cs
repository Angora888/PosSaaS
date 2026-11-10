using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PosSaaS.Api.Data;

#nullable disable
namespace PosSaaS.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261110213000_AddSucursalFiscalCodes")]
public partial class AddSucursalFiscalCodes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "CodigoSucursalFiscal", table: "Sucursales",
            type: "character varying(3)", maxLength: 3, nullable: true);
        migrationBuilder.AddColumn<string>(name: "CodigoTerminalFiscal", table: "Sucursales",
            type: "character varying(5)", maxLength: 5, nullable: true);
        migrationBuilder.CreateIndex(
            name: "IX_Sucursales_TenantId_CodigoSucursalFiscal",
            table: "Sucursales",
            columns: new[] { "TenantId", "CodigoSucursalFiscal" }, unique: true);
        migrationBuilder.Sql("""
            ALTER TABLE "Sucursales"
              ADD CONSTRAINT "CK_Sucursales_CodigosFiscales"
              CHECK (
                ("CodigoSucursalFiscal" IS NULL AND "CodigoTerminalFiscal" IS NULL)
                OR (
                  "CodigoSucursalFiscal" ~ '^[0-9]{3}$'
                  AND "CodigoSucursalFiscal" <> '000'
                  AND "CodigoTerminalFiscal" ~ '^[0-9]{5}$'
                  AND "CodigoTerminalFiscal" <> '00000'
                )
              );
        """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("ALTER TABLE \"Sucursales\" DROP CONSTRAINT IF EXISTS \"CK_Sucursales_CodigosFiscales\";");
        migrationBuilder.DropIndex(name: "IX_Sucursales_TenantId_CodigoSucursalFiscal", table: "Sucursales");
        migrationBuilder.DropColumn(name: "CodigoSucursalFiscal", table: "Sucursales");
        migrationBuilder.DropColumn(name: "CodigoTerminalFiscal", table: "Sucursales");
    }
}
