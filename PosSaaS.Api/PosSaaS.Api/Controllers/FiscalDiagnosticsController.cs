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

    // Preview-only: never reserves a clave or consecutivo, signs, or sends documents.
    [HttpGet("sale/{id:long}/xml-draft")]
    public async Task<IActionResult> GetXmlDraft(long id)
    {
        var tenantId = _context.TenantId;
        var sale = await _db.Ventas.AsNoTracking()
            .Include(v => v.Detalles)
            .Include(v => v.Cliente)
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenantId);
        if (sale is null) return NotFound(new { mensaje = "Venta no encontrada." });
        if (sale.Estado != "COMPLETADA")
            return BadRequest(new { mensaje = "Solamente se puede revisar una venta completada." });

        var fiscal = await _db.FiscalConfigurations.AsNoTracking()
            .FirstOrDefaultAsync(x => x.TenantId == tenantId);
        var ids = sale.Detalles.Select(x => x.ProductoId).Distinct().ToArray();
        var products = await _db.Productos.AsNoTracking()
            .Where(x => x.TenantId == tenantId && ids.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id);
        var xml = FiscalXmlDraftService.Generate(sale, fiscal, sale.Cliente, products);
        Response.Headers["Cache-Control"] = "no-store";
        Response.Headers["X-Fiscal-Draft"] = "non-transmittable";
        return Content(xml, "application/xml; charset=utf-8");
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
            .ToDictionaryAsync(p => p.Id);
        var warnings = FiscalSalePreflight.Check(venta, fiscal, products).ToList();
        var branch = await _db.Sucursales.AsNoTracking()
            .Where(x => x.Id == venta.SucursalId && x.TenantId == tenantId)
            .Select(x => new { x.CodigoSucursalFiscal, x.CodigoTerminalFiscal })
            .FirstOrDefaultAsync();
        if (branch is null || string.IsNullOrWhiteSpace(branch.CodigoSucursalFiscal) ||
            string.IsNullOrWhiteSpace(branch.CodigoTerminalFiscal))
            warnings.Add("Faltan los códigos fiscales de sucursal y terminal.");


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
