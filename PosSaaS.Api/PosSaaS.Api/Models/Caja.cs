namespace PosSaaS.Api.Models
{
    public class Caja
    {
        public int Id { get; set; }

        public int TenantId { get; set; }

        public int SucursalId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public bool Activa { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public Tenant Tenant { get; set; } = null!;

        public Sucursal Sucursal { get; set; } = null!;

        public ICollection<CajaSesion> Sesiones { get; set; }
            = new List<CajaSesion>();
    }
}