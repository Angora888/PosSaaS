namespace PosSaaS.Api.Models
{
    public class Inventario
    {
        public int Id { get; set; }

        public int TenantId { get; set; }

        public int SucursalId { get; set; }

        public int ProductoId { get; set; }

        public decimal Cantidad { get; set; }

        public decimal StockMinimo { get; set; }

        public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;

        public Tenant Tenant { get; set; } = null!;

        public Sucursal Sucursal { get; set; } = null!;

        public Producto Producto { get; set; } = null!;
    }
}