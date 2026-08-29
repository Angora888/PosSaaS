namespace PosSaaS.Api.Models
{
    public class PagoVenta
    {
        public long Id { get; set; }

        public long VentaId { get; set; }

        public int MetodoPagoId { get; set; }

        public decimal Monto { get; set; }

        public string? Referencia { get; set; }

        public Venta Venta { get; set; } = null!;

        public MetodoPago MetodoPago { get; set; } = null!;
    }
}