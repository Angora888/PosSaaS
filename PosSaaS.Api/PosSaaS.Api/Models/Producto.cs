namespace PosSaaS.Api.Models
{
    public class Producto
    {
        public int Id { get; set; }

        public int TenantId { get; set; }

        public int CategoriaId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string? Descripcion { get; set; }

        public string? SKU { get; set; }

        public string? CodigoBarras { get; set; }

        public decimal Costo { get; set; }

        public decimal Precio { get; set; }

        // Ejemplo: 13 = 13%
        public decimal ImpuestoPorcentaje { get; set; }

        public bool Activo { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public Tenant Tenant { get; set; } = null!;

        public Categoria Categoria { get; set; } = null!;
    }
}