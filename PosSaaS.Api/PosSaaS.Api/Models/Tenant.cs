namespace PosSaaS.Api.Models
{
    public class Tenant
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string? NombreComercial { get; set; }

        public string? Identificacion { get; set; }

        public string? Email { get; set; }

        public string? Telefono { get; set; }

        public bool Activo { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public ICollection<Sucursal> Sucursales { get; set; } = new List<Sucursal>();

        public ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();

        public ICollection<Categoria> Categorias { get; set; }  = new List<Categoria>();

        public ICollection<Producto> Productos { get; set; } = new List<Producto>();
    }
}