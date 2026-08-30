namespace PosSaaS.Api.DTOs
{
    public class ActualizarUsuarioDto
    {
        public string Nombre { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Rol { get; set; } = "Cajero";

        public int? SucursalId { get; set; }
    }
}