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
    public class SucursalesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITenantContext _tenantContext;

        public SucursalesController(
            AppDbContext context,
            ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        // ============================================================
        // LISTAR SUCURSALES
        //
        // Admin / SuperAdmin sin SucursalId:
        //     Puede consultar todas las sucursales del Tenant.
        //
        // Supervisor / Cajero con SucursalId:
        //     Solamente puede consultar su propia sucursal.
        // ============================================================

        [HttpGet]
        [Authorize(Roles = "Admin,SuperAdmin,Supervisor,Cajero")]
        public async Task<IActionResult> ObtenerTodas()
        {
            var query =
                _context.Sucursales
                    .Where(x =>
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (_tenantContext.SucursalId.HasValue)
            {
                query = query.Where(x =>
                    x.Id ==
                        _tenantContext.SucursalId.Value);
            }

            var sucursales =
                await query
                    .OrderBy(x =>
                        x.Nombre)
                    .Select(x => new
                    {
                        x.Id,
                        x.Nombre,
                        x.Telefono,
                        x.Direccion,
                        x.Activa,
                        x.FechaCreacion
                    })
                    .ToListAsync();

            return Ok(sucursales);
        }

        // ============================================================
        // OBTENER SUCURSAL POR ID
        //
        // Usuario con SucursalId:
        //     solamente puede consultar su sucursal.
        // ============================================================

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,SuperAdmin,Supervisor,Cajero")]
        public async Task<IActionResult> ObtenerPorId(
            int id)
        {
            if (!PuedeAccederSucursal(id))
            {
                return Forbid();
            }

            var sucursal =
                await _context.Sucursales
                    .Where(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId)
                    .Select(x => new
                    {
                        x.Id,
                        x.Nombre,
                        x.Telefono,
                        x.Direccion,
                        x.Activa,
                        x.FechaCreacion
                    })
                    .FirstOrDefaultAsync();

            if (sucursal == null)
            {
                return NotFound(
                    "Sucursal no encontrada.");
            }

            return Ok(sucursal);
        }

        // ============================================================
        // CREAR SUCURSAL
        // Admin / SuperAdmin
        // ============================================================

        [HttpPost]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Crear(
            SucursalDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nombre))
            {
                return BadRequest(
                    "El nombre de la sucursal es obligatorio.");
            }

            var nombre =
                dto.Nombre.Trim();

            var existe =
                await _context.Sucursales
                    .AnyAsync(x =>
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.Nombre.ToLower() ==
                            nombre.ToLower());

            if (existe)
            {
                return BadRequest(
                    "Ya existe una sucursal con ese nombre.");
            }

            var telefono =
                string.IsNullOrWhiteSpace(
                    dto.Telefono)
                    ? null
                    : dto.Telefono.Trim();

            var direccion =
                string.IsNullOrWhiteSpace(
                    dto.Direccion)
                    ? null
                    : dto.Direccion.Trim();

            var sucursal =
                new Sucursal
                {
                    TenantId =
                        _tenantContext.TenantId,

                    Nombre =
                        nombre,

                    Telefono =
                        telefono,

                    Direccion =
                        direccion,

                    Activa =
                        true,

                    FechaCreacion =
                        DateTime.UtcNow
                };

            _context.Sucursales.Add(sucursal);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Sucursal creada correctamente.",

                sucursal.Id,
                sucursal.Nombre
            });
        }

        // ============================================================
        // ACTUALIZAR SUCURSAL
        // Admin / SuperAdmin
        // ============================================================

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Actualizar(
            int id,
            SucursalDto dto)
        {
            var sucursal =
                await _context.Sucursales
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (sucursal == null)
            {
                return NotFound(
                    "Sucursal no encontrada.");
            }

            if (string.IsNullOrWhiteSpace(dto.Nombre))
            {
                return BadRequest(
                    "El nombre de la sucursal es obligatorio.");
            }

            var nombre =
                dto.Nombre.Trim();

            var existe =
                await _context.Sucursales
                    .AnyAsync(x =>
                        x.Id != id &&
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.Nombre.ToLower() ==
                            nombre.ToLower());

            if (existe)
            {
                return BadRequest(
                    "Ya existe otra sucursal con ese nombre.");
            }

            sucursal.Nombre =
                nombre;

            sucursal.Telefono =
                string.IsNullOrWhiteSpace(
                    dto.Telefono)
                    ? null
                    : dto.Telefono.Trim();

            sucursal.Direccion =
                string.IsNullOrWhiteSpace(
                    dto.Direccion)
                    ? null
                    : dto.Direccion.Trim();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Sucursal actualizada correctamente."
            });
        }

        // ============================================================
        // ACTIVAR / DESACTIVAR SUCURSAL
        // Admin / SuperAdmin
        // ============================================================

        [HttpPatch("{id:int}/estado")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> CambiarEstado(
            int id,
            [FromQuery] bool activa)
        {
            var sucursal =
                await _context.Sucursales
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (sucursal == null)
            {
                return NotFound(
                    "Sucursal no encontrada.");
            }

            sucursal.Activa =
                activa;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    activa
                        ? "Sucursal activada correctamente."
                        : "Sucursal desactivada correctamente."
            });
        }

        // ============================================================
        // SEGURIDAD DE SUCURSAL
        // ============================================================

        private bool PuedeAccederSucursal(
            int sucursalId)
        {
            if (!_tenantContext.SucursalId.HasValue)
            {
                return true;
            }

            return _tenantContext.SucursalId.Value ==
                   sucursalId;
        }
    }
}