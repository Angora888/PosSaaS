namespace PosSaaS.Api.DTOs
{
    public class ProductoDto
    {
        public int CategoriaId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string? Descripcion { get; set; }

        public string? SKU { get; set; }

        public string? CodigoBarras { get; set; }

        public string? CodigoCabys { get; set; }
        public string? UnidadMedida { get; set; }
        public string? CodigoImpuesto { get; set; }
        public string? CodigoTarifaIva { get; set; }

        public decimal Costo { get; set; }

        public decimal Precio { get; set; }

        public decimal ImpuestoPorcentaje { get; set; }
    }
}