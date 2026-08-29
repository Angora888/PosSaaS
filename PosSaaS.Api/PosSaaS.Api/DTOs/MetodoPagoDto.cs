namespace PosSaaS.Api.DTOs
{
    public class MetodoPagoDto
    {
        public string Nombre { get; set; } = string.Empty;

        public string Tipo { get; set; } = string.Empty;

        public bool AfectaCaja { get; set; }
    }
}