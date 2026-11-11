using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PosSaaS.Api.Data;
using PosSaaS.Api.Services;

namespace PosSaaS.Api.Controllers;

/// <summary>
/// Read-only readiness report per tenant. This is NOT an authorization or
/// technical confirmation that a fiscal document can be issued.
/// </summary>
[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/fiscal/readiness")]
public sealed class FiscalReadinessController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly FiscalSchemaValidator _schema;

    public FiscalReadinessController(AppDbContext db, ITenantContext tenant, FiscalSchemaValidator schema)
    {
        _db = db;
        _tenant = tenant;
        _schema = schema;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken token)
    {
        var tenantId = _tenant.TenantId;
        var issuer = await _db.FiscalConfigurations.AsNoTracking()
            .FirstOrDefaultAsync(x => x.TenantId == tenantId, token);

        static bool Code(string? text, int width) =>
            text?.Length == width && text.All(c => c is >= '0' and <= '9');

        var issuerComplete = issuer is not null
            && !string.IsNullOrWhiteSpace(issuer.RazonSocial)
            && !string.IsNullOrWhiteSpace(issuer.Identificacion)
            && issuer.TipoIdentificacion is "01" or "02" or "03" or "04"
            && !string.IsNullOrWhiteSpace(issuer.ActividadEconomica)
            && !string.IsNullOrWhiteSpace(issuer.Correo)
            && Code(issuer.Provincia, 1)
            && Code(issuer.Canton, 2)
            && Code(issuer.Distrito, 2);

        var branches = await _db.Sucursales.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.Activa)
            .Select(x => new { x.Nombre, x.CodigoSucursalFiscal, x.CodigoTerminalFiscal })
            .ToListAsync(token);
        var incompleteBranches = branches
            .Where(x => !Code(x.CodigoSucursalFiscal, 3) || x.CodigoSucursalFiscal == "000"
                || !Code(x.CodigoTerminalFiscal, 5) || x.CodigoTerminalFiscal == "00000")
            .Select(x => x.Nombre)
            .ToArray();

        var products = await _db.Productos.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.Activo)
            .Select(x => new { x.CodigoCabys, x.UnidadMedida, x.CodigoImpuesto, x.CodigoTarifaIva })
            .ToListAsync(token);
        var missingProductData = products.Count(x =>
            !Code(x.CodigoCabys, 13) || string.IsNullOrWhiteSpace(x.UnidadMedida)
            || string.IsNullOrWhiteSpace(x.CodigoImpuesto) || string.IsNullOrWhiteSpace(x.CodigoTarifaIva));

        var checks = new[]
        {
            new Step("emisor", "Datos tributarios del emisor",
                issuerComplete, issuerComplete ? "Identidad, actividad y ubicación registradas."
                    : "Completá razón social, cédula, actividad, correo y ubicación."),
            new Step("sucursales", "Sucursales y terminales fiscales",
                branches.Count > 0 && incompleteBranches.Length == 0,
                branches.Count == 0 ? "No hay sucursales activas."
                : incompleteBranches.Length > 0
                    ? $"{incompleteBranches.Length} sucursal(es) activa(s) sin códigos fiscales completos."
                    : $"{branches.Count} sucursal(es) con códigos fiscales."),
            new Step("productos", "Datos fiscales de productos",
                products.Count > 0 && missingProductData == 0,
                products.Count == 0 ? "No hay productos activos."
                : missingProductData > 0 ? $"{missingProductData} de {products.Count} producto(s) requieren CABYS o datos tributarios."
                : $"{products.Count} producto(s) con datos fiscales básicos."),
            new Step("xsdFactura", "XSD oficial de factura 4.4", _schema.IsConfigured("01"),
                "Debe estar instalado y verificado en la API. Disponer del archivo no garantiza un XML válido."),
            new Step("xsdTiquete", "XSD oficial de tiquete 4.4", _schema.IsConfigured("04"),
                "Debe estar instalado y verificado en la API. Disponer del archivo no garantiza un XML válido."),
            new Step("xmlFiscal", "Generador fiscal 4.4 y validación real", false,
                "Solo existe un borrador XML interno, no un comprobante fiscal."),
            new Step("firma", "Certificado y firma XAdES-EPES", false,
                "Aún no se implementa la firma fiscal."),
            new Step("hacienda", "Autenticación, envío y respuesta de Hacienda", false,
                "Aún no se implementa el flujo de recepción ni consulta de resultados.")
        };

        Response.Headers.CacheControl = "no-store";
        return Ok(new
        {
            version = "4.4",
            esDiagnostico = true,
            listoParaEmitir = false,
            emisionHabilitada = false,
            pasosCompletos = checks.Count(x => x.Completo),
            totalPasos = checks.Length,
            pasos = checks,
            nota = "Preparación técnica. No emite, firma, reserva consecutivos ni envía documentos."
        });
    }

    private sealed record Step(string Codigo, string Nombre, bool Completo, string Detalle);
}
