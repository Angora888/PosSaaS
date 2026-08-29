namespace PosSaaS.Api.Models
{
    public class Categoria
    {
        public int Id { get; set; }

        public int TenantId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public bool Activa { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public Tenant Tenant { get; set; } = null!;

        public ICollection<Producto> Productos { get; set; }
            = new List<Producto>();
    }
}