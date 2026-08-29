namespace PosSaaS.Api.DTOs
{
    public class ClienteDto
    {
        public string Nombre { get; set; } = string.Empty;

        public string? Identificacion { get; set; }

        public string? Telefono { get; set; }

        public string? Email { get; set; }

        public string? Direccion { get; set; }
    }
}