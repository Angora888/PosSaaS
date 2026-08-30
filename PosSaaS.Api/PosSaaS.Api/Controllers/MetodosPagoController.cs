using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PosSaaS.Api.Data;
using PosSaaS.Api.DTOs;
using PosSaaS.Api.Models;
using PosSaaS.Api.Services;

namespace PosSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MetodosPagoController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITenantContext _tenantContext;

        public MetodosPagoController(
            AppDbContext context,
            ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        // ============================================================
        // LISTAR MÉTODOS DE PAGO
        // Admin / Supervisor / Cajero
        // ============================================================

        [HttpGet]
        [Authorize(Roles = "Admin,Supervisor,Cajero")]
        public async Task<IActionResult> ObtenerTodos()
        {
            var metodos =
                await _context.MetodosPago
                    .Where(x =>
                        x.TenantId ==
                            _tenantContext.TenantId)
                    .OrderBy(x =>
                        x.Nombre)
                    .Select(x => new
                    {
                        x.Id,
                        x.Nombre,
                        x.Tipo,
                        x.AfectaCaja,
                        x.Activo
                    })
                    .ToListAsync();

            return Ok(metodos);
        }

        // ============================================================
        // CREAR MÉTODO DE PAGO
        // Admin
        // ============================================================

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Crear(
            MetodoPagoDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nombre))
            {
                return BadRequest(
                    "El nombre es obligatorio.");
            }

            if (string.IsNullOrWhiteSpace(dto.Tipo))
            {
                return BadRequest(
                    "El tipo es obligatorio.");
            }

            var nombre =
                dto.Nombre.Trim();

            var tipo =
                dto.Tipo
                    .Trim()
                    .ToUpper();

            var existe =
                await _context.MetodosPago
                    .AnyAsync(x =>
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.Nombre.ToLower() ==
                            nombre.ToLower());

            if (existe)
            {
                return BadRequest(
                    "Ya existe un método de pago con ese nombre.");
            }

            var metodo =
                new MetodoPago
                {
                    TenantId =
                        _tenantContext.TenantId,

                    Nombre =
                        nombre,

                    Tipo =
                        tipo,

                    AfectaCaja =
                        dto.AfectaCaja,

                    Activo =
                        true
                };

            _context.MetodosPago.Add(metodo);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Método de pago creado correctamente.",

                metodo.Id,
                metodo.Nombre,
                metodo.Tipo,
                metodo.AfectaCaja
            });
        }

        // ============================================================
        // ACTUALIZAR MÉTODO DE PAGO
        // Admin
        // ============================================================

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Actualizar(
            int id,
            MetodoPagoDto dto)
        {
            var metodo =
                await _context.MetodosPago
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (metodo == null)
            {
                return NotFound(
                    "Método de pago no encontrado.");
            }

            if (string.IsNullOrWhiteSpace(dto.Nombre))
            {
                return BadRequest(
                    "El nombre es obligatorio.");
            }

            if (string.IsNullOrWhiteSpace(dto.Tipo))
            {
                return BadRequest(
                    "El tipo es obligatorio.");
            }

            var nombre =
                dto.Nombre.Trim();

            var tipo =
                dto.Tipo
                    .Trim()
                    .ToUpper();

            var existe =
                await _context.MetodosPago
                    .AnyAsync(x =>
                        x.Id != id &&
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.Nombre.ToLower() ==
                            nombre.ToLower());

            if (existe)
            {
                return BadRequest(
                    "Ya existe otro método de pago con ese nombre.");
            }

            metodo.Nombre =
                nombre;

            metodo.Tipo =
                tipo;

            metodo.AfectaCaja =
                dto.AfectaCaja;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Método de pago actualizado correctamente."
            });
        }

        // ============================================================
        // ACTIVAR / DESACTIVAR MÉTODO DE PAGO
        // Admin
        // ============================================================

        [HttpPatch("{id:int}/estado")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CambiarEstado(
            int id,
            [FromQuery] bool activo)
        {
            var metodo =
                await _context.MetodosPago
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (metodo == null)
            {
                return NotFound(
                    "Método de pago no encontrado.");
            }

            metodo.Activo =
                activo;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    activo
                        ? "Método de pago activado."
                        : "Método de pago desactivado."
            });
        }
    }
}