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
    private readonly FiscalSchemaValidator _validator;
    private readonly IConfiguration _settings;
    public FiscalDiagnosticsController(AppDbContext db, ITenantContext context,
        FiscalSchemaValidator validator, IConfiguration settings)
    {
        _db = db;
        _context = context;
        _validator = validator;
        _settings = settings;
    }

    // Strictly experimental; only expose XML if it passes the installed official XSD.
    // Never consumes a consecutive, stores a document, signs or sends to Hacienda.
    [HttpGet("sale/{id:long}/xml-v44-preview")]
    public async Task<IActionResult> GetV44Preview(long id, CancellationToken token)
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers["X-Fiscal-Preview"] = "unsigned-unreserved-not-for-transmission";

        if (!_validator.IsConfigured("01"))
            return StatusCode(503, new { mensaje = "No está instalado el XSD oficial de Factura Electrónica 4.4. No se puede certificar ni mostrar esta vista previa." });

        var providerId = _settings["Fiscal:ProveedorSistemasIdentificacion"];
        if (string.IsNullOrWhiteSpace(providerId))
            return StatusCode(503, new { mensaje = "Falta configurar Fiscal:ProveedorSistemasIdentificacion con la identificación verificada del proveedor de POS SaaS." });

        var tenantId = _context.TenantId;
        var sale = await _db.Ventas.AsNoTracking()
            .Include(x => x.Cliente)
            .Include(x => x.Detalles)
            .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == tenantId, token);
        if (sale is null) return NotFound(new { mensaje = "Venta no encontrada." });
        var issuer = await _db.FiscalConfigurations.AsNoTracking()
            .FirstOrDefaultAsync(x => x.TenantId == tenantId, token);
        if (issuer is null || sale.Cliente is null)
            return BadRequest(new { mensaje = "Falta emisor configurado o receptor identificado." });

        var productIds = sale.Detalles.Select(x => x.ProductoId).Distinct().ToArray();
        var products = await _db.Productos.AsNoTracking()
            .Where(x => x.TenantId == tenantId && productIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, token);
        var findings = FiscalSalePreflight.Check(sale, issuer, products);
        if (findings.Count > 0)
            return UnprocessableEntity(new { mensaje = "La venta no superó el diagnóstico fiscal.", observaciones = findings });

        var branch = await _db.Sucursales.AsNoTracking()
            .Where(x => x.Id == sale.SucursalId && x.TenantId == tenantId && x.Activa)
            .Select(x => new { x.CodigoSucursalFiscal, x.CodigoTerminalFiscal })
            .FirstOrDefaultAsync(token);
        if (branch?.CodigoSucursalFiscal is null || branch.CodigoTerminalFiscal is null)
            return BadRequest(new { mensaje = "La sucursal necesita códigos fiscales completos." });

        // A hypothetical number and key: NOT reserved and NOT valid for issuance.
        var last = await _db.FiscalSequences.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.SucursalId == sale.SucursalId
                && x.Terminal == branch.CodigoTerminalFiscal && x.TipoDocumento == "01")
            .Select(x => (long?)x.UltimoNumero).FirstOrDefaultAsync(token) ?? 0;
        if (last >= 9999999999L)
            return Conflict(new { mensaje = "Numeración agotada." });
        try
        {
            var when = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(-6));
            var consecutive = FiscalNumbering.ConsecutivoDesdeCodigos(
                branch.CodigoSucursalFiscal, branch.CodigoTerminalFiscal, "01", last + 1);
            var key = FiscalNumbering.Clave(when, issuer.Identificacion, consecutive, "1", "00000000");
            var xml = FiscalXml44PreviewService.Generate(sale, issuer, sale.Cliente,
                products, providerId, consecutive, key, when);
            var validation = _validator.Validate("01", xml);
            if (!validation.Valido)
                return UnprocessableEntity(new {
                    mensaje = "El XML experimental no pasó el esquema oficial 4.4.",
                    erroresXsd = validation.Errores,
                    validoParaEmision = false
                });
            return Ok(new {
                xml,
                validoContraXsd = true,
                firmado = false,
                reservado = false,
                validoParaEmision = false,
                advertencia = "Vista previa experimental. La clave y el consecutivo son simulados; PROHIBIDO transmitir."
            });
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException
            or NotSupportedException or System.Xml.XmlException or System.Xml.Schema.XmlSchemaException)
        {
            return UnprocessableEntity(new { mensaje = ex.Message, validoParaEmision = false });
        }
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
