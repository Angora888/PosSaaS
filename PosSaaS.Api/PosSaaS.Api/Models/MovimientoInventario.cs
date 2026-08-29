namespace PosSaaS.Api.Models
{
    public class MovimientoInventario
    {
        public long Id { get; set; }

        public int TenantId { get; set; }

        public int SucursalId { get; set; }

        public int ProductoId { get; set; }

        public int UsuarioId { get; set; }

        public string Tipo { get; set; } = string.Empty;

        public decimal Cantidad { get; set; }

        public decimal CantidadAnterior { get; set; }

        public decimal CantidadNueva { get; set; }

        public string? Referencia { get; set; }

        public string? Observacion { get; set; }

        public DateTime Fecha { get; set; } = DateTime.UtcNow;

        public Tenant Tenant { get; set; } = null!;

        public Sucursal Sucursal { get; set; } = null!;

        public Producto Producto { get; set; } = null!;

        public Usuario Usuario { get; set; } = null!;
    }
}