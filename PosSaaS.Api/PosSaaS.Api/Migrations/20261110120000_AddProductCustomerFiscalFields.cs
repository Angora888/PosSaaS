using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PosSaaS.Api.Data;

#nullable disable

namespace PosSaaS.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261110120000_AddProductCustomerFiscalFields")]
public partial class AddProductCustomerFiscalFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "CodigoCabys", table: "Productos", type: "character varying(13)", maxLength: 13, nullable: true);
        migrationBuilder.AddColumn<string>(name: "UnidadMedida", table: "Productos", type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Unid");
        migrationBuilder.AddColumn<string>(name: "CodigoImpuesto", table: "Productos", type: "character varying(2)", maxLength: 2, nullable: true);
        migrationBuilder.AddColumn<string>(name: "CodigoTarifaIva", table: "Productos", type: "character varying(2)", maxLength: 2, nullable: true);
        migrationBuilder.AddColumn<string>(name: "TipoIdentificacion", table: "Clientes", type: "character varying(2)", maxLength: 2, nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "CodigoCabys", table: "Productos");
        migrationBuilder.DropColumn(name: "UnidadMedida", table: "Productos");
        migrationBuilder.DropColumn(name: "CodigoImpuesto", table: "Productos");
        migrationBuilder.DropColumn(name: "CodigoTarifaIva", table: "Productos");
        migrationBuilder.DropColumn(name: "TipoIdentificacion", table: "Clientes");
    }
}
