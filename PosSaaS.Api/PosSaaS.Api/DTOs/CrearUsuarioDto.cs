namespace PosSaaS.Api.DTOs
{
    public class CrearUsuarioDto
    {
        public string Nombre { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public string Rol { get; set; } = "Cajero";

        public int? SucursalId { get; set; }
    }
}