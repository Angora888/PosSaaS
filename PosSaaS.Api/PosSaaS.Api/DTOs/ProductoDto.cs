namespace PosSaaS.Api.DTOs
{
    public class ProductoDto
    {
        public int CategoriaId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string? Descripcion { get; set; }

        public string? SKU { get; set; }

        public string? CodigoBarras { get; set; }

        public decimal Costo { get; set; }

        public decimal Precio { get; set; }

        public decimal ImpuestoPorcentaje { get; set; }
    }
}