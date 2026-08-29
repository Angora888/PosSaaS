namespace PosSaaS.Api.Models
{
    public class VentaDetalle
    {
        public long Id { get; set; }

        public long VentaId { get; set; }

        public int ProductoId { get; set; }

        public string ProductoNombre { get; set; } = string.Empty;

        public decimal Cantidad { get; set; }

        public decimal PrecioUnitario { get; set; }

        public decimal CostoUnitario { get; set; }

        public decimal ImpuestoPorcentaje { get; set; }

        public decimal Subtotal { get; set; }

        public decimal Impuesto { get; set; }

        public decimal Total { get; set; }

        public Venta Venta { get; set; } = null!;

        public Producto Producto { get; set; } = null!;
    }
}