using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PosSaaS.Api.Data;
using PosSaaS.Api.Services;

namespace PosSaaS.Api.Controllers;

// Read-only diagnostics. No XML is issued, signed, or sent to Hacienda here.
[ApiController]
[Route("api/fiscal/diagnostics")]
[Authorize(Roles = "Admin")]
public sealed class FiscalDiagnosticsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _context;
    public FiscalDiagnosticsController(AppDbContext db, ITenantContext context)
    {
        _db = db;
        _context = context;
    }

    [HttpGet("sale/{id:long}")]
    public async Task<IActionResult> CheckSale(long id)
    {
        var tenantId = _context.TenantId;
        var venta = await _db.Ventas.AsNoTracking()
            .Include(v => v.Detalles)
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenantId);
        if (venta is null) return NotFound(new { mensaje = "Venta no encontrada." });

        var fiscal = await _db.FiscalConfigurations.AsNoTracking()
            .FirstOrDefaultAsync(x => x.TenantId == tenantId);
        var productIds = venta.Detalles.Select(d => d.ProductoId).Distinct().ToArray();
        var products = await _db.Productos.AsNoTracking()
            .Where(p => p.TenantId == tenantId && productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.CodigoCabys, p.UnidadMedida, p.CodigoImpuesto, p.CodigoTarifaIva })
            .ToListAsync();
        var warnings = new List<string>();
        if (fiscal == null || string.IsNullOrWhiteSpace(fiscal.Identificacion) ||
            string.IsNullOrWhiteSpace(fiscal.RazonSocial))
            warnings.Add("Configuración fiscal del emisor incompleta.");
        if (fiscal != null && string.IsNullOrWhiteSpace(fiscal.ActividadEconomica))
            warnings.Add("Falta actividad económica.");
        if (venta.Detalles.Count == 0) warnings.Add("Venta sin líneas.");
        if (venta.Estado != "COMPLETADA") warnings.Add("La venta no está completada.");
        foreach (var item in products)
        {
            if (string.IsNullOrWhiteSpace(item.CodigoCabys))
                warnings.Add($"Producto {item.Id}: falta código CABYS.");
            if (string.IsNullOrWhiteSpace(item.UnidadMedida))
                warnings.Add($"Producto {item.Id}: falta unidad de medida.");
            if (string.IsNullOrWhiteSpace(item.CodigoImpuesto) ||
                string.IsNullOrWhiteSpace(item.CodigoTarifaIva))
                warnings.Add($"Producto {item.Id}: clasificación tributaria pendiente.");
        }
        if (products.Count != productIds.Length) warnings.Add("Hay productos de la venta que ya no están disponibles.");

        return Ok(new
        {
            ventaId = id,
            tenantId,
            cantidadLineas = venta.Detalles.Count,
            total = venta.Total,
            emisionHabilitada = false,
            listoParaEmitir = false,
            esDiagnostico = true,
            observaciones = warnings
        });
    }
}
