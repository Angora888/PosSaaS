namespace PosSaaS.Api.Models
{
    public class Venta
    {
        public long Id { get; set; }

        public int TenantId { get; set; }

        public int SucursalId { get; set; }

        public long CajaSesionId { get; set; }

        public int UsuarioId { get; set; }

        public string NumeroVenta { get; set; } = string.Empty;

        public DateTime Fecha { get; set; } = DateTime.UtcNow;

        public decimal Subtotal { get; set; }

        public decimal Descuento { get; set; }

        public decimal Impuesto { get; set; }

        public decimal Total { get; set; }

        public string Estado { get; set; } = "COMPLETADA";

        public Tenant Tenant { get; set; } = null!;

        public Sucursal Sucursal { get; set; } = null!;

        public CajaSesion CajaSesion { get; set; } = null!;

        public Usuario Usuario { get; set; } = null!;

        public int? ClienteId { get; set; }

        public Cliente? Cliente { get; set; }

        public ICollection<VentaDetalle> Detalles { get; set; }
            = new List<VentaDetalle>();

        public ICollection<PagoVenta> Pagos { get; set; }
            = new List<PagoVenta>();
    }
}