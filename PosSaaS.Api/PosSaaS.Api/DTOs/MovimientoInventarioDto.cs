namespace PosSaaS.Api.DTOs
{
    public class MovimientoInventarioDto
    {
        public int SucursalId { get; set; }

        public int ProductoId { get; set; }

        public decimal Cantidad { get; set; }

        public string? Referencia { get; set; }

        public string? Observacion { get; set; }
    }
}