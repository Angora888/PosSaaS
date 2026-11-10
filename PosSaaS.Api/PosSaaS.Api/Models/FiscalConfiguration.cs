namespace PosSaaS.Api.Models;

public class FiscalConfiguration
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string RazonSocial { get; set; } = string.Empty;
    public string TipoIdentificacion { get; set; } = "02";
    public string Identificacion { get; set; } = string.Empty;
    public string ActividadEconomica { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Provincia { get; set; } = string.Empty;
    public string Canton { get; set; } = string.Empty;
    public string Distrito { get; set; } = string.Empty;
    public string OtrasSenas { get; set; } = string.Empty;
    public string Ambiente { get; set; } = "pruebas";
    public bool EmisionHabilitada { get; set; } = false;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;
    public Tenant Tenant { get; set; } = null!;
}
