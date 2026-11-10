namespace PosSaaS.Api.DTOs
{
    public class CrearVentaDto
    {
        public long CajaSesionId { get; set; }

        public int? ClienteId { get; set; }

        // Only allowed for a single EFECTIVO payment. Verified by the server.
        public bool AplicarRedondeoEfectivo { get; set; }

        public List<CrearVentaDetalleDto> Productos { get; set; }
            = new();

        public List<CrearPagoVentaDto> Pagos { get; set; }
            = new();
    }
}