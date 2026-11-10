namespace PosSaaS.Api.Models;

public class ElectronicDocument
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public int SucursalId { get; set; }
    public long? VentaId { get; set; }
    public string TipoDocumento { get; set; } = "01";
    public string Consecutivo { get; set; } = string.Empty;
    public string Clave { get; set; } = string.Empty;
    public string Estado { get; set; } = "BORRADOR";
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public string? XmlStoragePath { get; set; }
    public string? HaciendaResponsePath { get; set; }
    public string? UltimoError { get; set; }
}
