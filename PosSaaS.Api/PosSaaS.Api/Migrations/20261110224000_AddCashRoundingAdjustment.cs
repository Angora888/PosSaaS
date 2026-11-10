using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PosSaaS.Api.Data;

#nullable disable

namespace PosSaaS.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261110224000_AddCashRoundingAdjustment")]
public partial class AddCashRoundingAdjustment : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<decimal>(
            name: "AjusteRedondeoEfectivo",
            table: "Ventas",
            type: "numeric(18,2)",
            nullable: false,
            defaultValue: 0m);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "AjusteRedondeoEfectivo",
            table: "Ventas");
    }
}
