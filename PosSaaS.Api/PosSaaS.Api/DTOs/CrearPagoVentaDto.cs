namespace PosSaaS.Api.DTOs
{
    public class CrearPagoVentaDto
    {
        public int MetodoPagoId { get; set; }

        public decimal Monto { get; set; }

        public string? Referencia { get; set; }
    }
}