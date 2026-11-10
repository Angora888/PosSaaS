namespace PosSaaS.Api.DTOs
{
    public class SucursalDto
    {
        public string Nombre { get; set; } = string.Empty;
        public string? Telefono { get; set; }
        public string? Direccion { get; set; }
        public string? CodigoSucursalFiscal { get; set; }
        public string? CodigoTerminalFiscal { get; set; }
    }
}