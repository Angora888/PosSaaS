namespace PosSaaS.Api.DTOs
{
    public class MovimientoCajaDto
    {
        public decimal Monto { get; set; }

        public string? Referencia { get; set; }

        public string? Observacion { get; set; }
    }
}