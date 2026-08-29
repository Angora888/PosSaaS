namespace PosSaaS.Api.Models
{
    public class Usuario
    {
        public int Id { get; set; }

        public int TenantId { get; set; }

        public int? SucursalId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public string Rol { get; set; } = "Cajero";

        public bool Activo { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public Tenant Tenant { get; set; } = null!;

        public Sucursal? Sucursal { get; set; }
    }
}