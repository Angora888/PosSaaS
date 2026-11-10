using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PosSaaS.Api.Data;
using PosSaaS.Api.Models;
using PosSaaS.Api.Services;
using System.ComponentModel.DataAnnotations;

namespace PosSaaS.Api.Controllers;

[ApiController]
[Route("api/fiscal")]
[Authorize(Roles = "Admin")]
public class FiscalController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;
    public FiscalController(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        var item = await _db.FiscalConfigurations.AsNoTracking()
            .FirstOrDefaultAsync(x => x.TenantId == _tenant.TenantId);
        return Ok(item is null ? null : ToResponse(item));
    }

    [HttpPut("config")]
    public async Task<IActionResult> SaveConfig([FromBody] FiscalConfigRequest input)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (!new[] { "01", "02", "03", "04" }.Contains(input.TipoIdentificacion))
            return BadRequest(new { mensaje = "Tipo de identificación no válido." });
        if (string.IsNullOrWhiteSpace(input.RazonSocial) ||
            string.IsNullOrWhiteSpace(input.Identificacion) ||
            string.IsNullOrWhiteSpace(input.Correo))
            return BadRequest(new { mensaje = "Razón social, identificación y correo son obligatorios." });

        var item = await _db.FiscalConfigurations
            .FirstOrDefaultAsync(x => x.TenantId == _tenant.TenantId);
        if (item is null)
        {
            item = new FiscalConfiguration { TenantId = _tenant.TenantId };
            _db.FiscalConfigurations.Add(item);
        }
        item.RazonSocial = input.RazonSocial.Trim();
        item.TipoIdentificacion = input.TipoIdentificacion;
        item.Identificacion = input.Identificacion.Trim();
        item.ActividadEconomica = (input.ActividadEconomica ?? "").Trim();
        item.Correo = input.Correo.Trim();
        item.Telefono = (input.Telefono ?? "").Trim();
        item.Provincia = (input.Provincia ?? "").Trim();
        item.Canton = (input.Canton ?? "").Trim();
        item.Distrito = (input.Distrito ?? "").Trim();
        item.OtrasSenas = (input.OtrasSenas ?? "").Trim();
        item.Ambiente = "pruebas";
        item.EmisionHabilitada = false; // No hay firma/transmisión implementadas todavía.
        item.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToResponse(item));
    }

    private static object ToResponse(FiscalConfiguration x) => new
    {
        x.RazonSocial, x.TipoIdentificacion, x.Identificacion,
        x.ActividadEconomica, x.Correo, x.Telefono, x.Provincia,
        x.Canton, x.Distrito, x.OtrasSenas, x.Ambiente,
        x.EmisionHabilitada, x.FechaActualizacion
    };
}

public sealed class FiscalConfigRequest
{
    [Required, MaxLength(200)] public string RazonSocial { get; set; } = "";
    [Required, MaxLength(2)] public string TipoIdentificacion { get; set; } = "02";
    [Required, MaxLength(30)] public string Identificacion { get; set; } = "";
    [MaxLength(20)] public string? ActividadEconomica { get; set; }
    [Required, EmailAddress, MaxLength(200)] public string Correo { get; set; } = "";
    [MaxLength(30)] public string? Telefono { get; set; }
    [MaxLength(2)] public string? Provincia { get; set; }
    [MaxLength(2)] public string? Canton { get; set; }
    [MaxLength(2)] public string? Distrito { get; set; }
    [MaxLength(500)] public string? OtrasSenas { get; set; }
}
