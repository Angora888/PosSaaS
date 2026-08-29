namespace PosSaaS.Api.DTOs
{
    public class CrearVentaDto
    {
        public long CajaSesionId { get; set; }

        public int? ClienteId { get; set; }

        public List<CrearVentaDetalleDto> Productos { get; set; }
            = new();

        public List<CrearPagoVentaDto> Pagos { get; set; }
            = new();
    }
}