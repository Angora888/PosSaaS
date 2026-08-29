namespace PosSaaS.Api.Models
{
    public class MovimientoCaja
    {
        public long Id { get; set; }

        public int TenantId { get; set; }

        public long CajaSesionId { get; set; }

        public int UsuarioId { get; set; }

        public string Tipo { get; set; } = string.Empty;

        public decimal Monto { get; set; }

        public string? Referencia { get; set; }

        public string? Observacion { get; set; }

        public DateTime Fecha { get; set; } = DateTime.UtcNow;

        public Tenant Tenant { get; set; } = null!;

        public CajaSesion CajaSesion { get; set; } = null!;

        public Usuario Usuario { get; set; } = null!;
    }
}