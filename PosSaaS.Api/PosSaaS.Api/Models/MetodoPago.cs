namespace PosSaaS.Api.Models
{
    public class MetodoPago
    {
        public int Id { get; set; }

        public int TenantId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string Tipo { get; set; } = string.Empty;

        public bool AfectaCaja { get; set; }

        public bool Activo { get; set; } = true;

        public Tenant Tenant { get; set; } = null!;
    }
}