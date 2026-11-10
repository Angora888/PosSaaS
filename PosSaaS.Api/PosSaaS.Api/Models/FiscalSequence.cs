namespace PosSaaS.Api.Models;

// Counter is allocated only by the future transactional issuance flow.
// Never use this table for a preview or for normal POS sales.
public class FiscalSequence
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public int SucursalId { get; set; }
    public string Terminal { get; set; } = "00001";
    public string TipoDocumento { get; set; } = "01";
    public long UltimoNumero { get; set; }
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;
}
