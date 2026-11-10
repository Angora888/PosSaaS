using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PosSaaS.Api.Data;
using PosSaaS.Api.Services;

namespace PosSaaS.Api.Controllers;

/// <summary>
/// READ-ONLY PREVIEW ONLY. No sequence increment or fiscal issuance occurs.
/// </summary>
[ApiController]
[Route("api/fiscal/numbering")]
[Authorize(Roles = "Admin")]
public sealed class FiscalNumberingController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public FiscalNumberingController(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet("preview")]
    public async Task<IActionResult> Preview([FromQuery] int sucursalId,
        [FromQuery] string tipoDocumento = "01", CancellationToken cancellationToken = default)
    {
        if (sucursalId <= 0)
            return BadRequest(new { mensaje = "Seleccioná una sucursal." });
        if (tipoDocumento is not ("01" or "04"))
            return BadRequest(new { mensaje = "La vista previa solo admite factura (01) y tiquete (04)." });

        var tenantId = _tenant.TenantId;
        var branch = await _db.Sucursales.AsNoTracking()
            .Where(x => x.Id == sucursalId && x.TenantId == tenantId)
            .Select(x => new {
                x.Id, x.Nombre, x.Activa, x.CodigoSucursalFiscal, x.CodigoTerminalFiscal
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (branch is null) return NotFound(new { mensaje = "Sucursal no encontrada en este comercio." });
        if (!branch.Activa)
            return BadRequest(new { mensaje = "La sucursal está inactiva." });
        if (string.IsNullOrWhiteSpace(branch.CodigoSucursalFiscal) ||
            string.IsNullOrWhiteSpace(branch.CodigoTerminalFiscal))
            return BadRequest(new { mensaje = "Configurá el código fiscal de sucursal y terminal antes de consultar." });

        // Sequence table holds a string terminal, not the database Caja.Id.
        var ultimo = await _db.FiscalSequences.AsNoTracking()
            .Where(x => x.TenantId == tenantId &&
                x.SucursalId == sucursalId &&
                x.Terminal == branch.CodigoTerminalFiscal &&
                x.TipoDocumento == tipoDocumento)
            .Select(x => (long?)x.UltimoNumero)
            .FirstOrDefaultAsync(cancellationToken) ?? 0L;

        if (ultimo >= 9_999_999_999L)
            return Conflict(new { mensaje = "Se alcanzó el límite de numeración. Se requiere revisión fiscal antes de continuar." });

        string ejemplo;
        try
        {
            ejemplo = FiscalNumbering.ConsecutivoDesdeCodigos(
                branch.CodigoSucursalFiscal, branch.CodigoTerminalFiscal,
                tipoDocumento, ultimo + 1);
        }
        catch (ArgumentException)
        {
            return BadRequest(new { mensaje = "Los códigos fiscales de esta sucursal son inválidos." });
        }

        Response.Headers.CacheControl = "no-store";
        return Ok(new {
            sucursalId = branch.Id,
            sucursal = branch.Nombre,
            codigoSucursalFiscal = branch.CodigoSucursalFiscal,
            codigoTerminalFiscal = branch.CodigoTerminalFiscal,
            tipoDocumento,
            ultimoNumeroRegistrado = ultimo,
            siguienteNumeroEstimado = ultimo + 1,
            ejemploConsecutivo = ejemplo,
            esVistaPrevia = true,
            reservado = false,
            emisionHabilitada = false,
            aviso = "Solo estimación actual. Puede cambiar por concurrencia; no consume numeración ni genera comprobantes."
        });
    }
}
