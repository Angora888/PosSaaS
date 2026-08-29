namespace PosSaaS.Api.DTOs
{
    public class RegistrarTenantDto
    {
        public string NombreComercio { get; set; } = string.Empty;
        public string? NombreComercial { get; set; }
        public string? Identificacion { get; set; }
        public string? Telefono { get; set; }

        public string NombreAdmin { get; set; } = string.Empty;
        public string EmailAdmin { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}