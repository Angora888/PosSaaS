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

        [HttpGet]
        public async Task<IActionResult> ObtenerTodas()
        {
            var sucursales = await _context.Sucursales
                .Where(x => x.TenantId == _tenantContext.TenantId)
                .OrderBy(x => x.Nombre)
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

        [HttpGet("{id:int}")]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            var sucursal = await _context.Sucursales
                .Where(x =>
                    x.Id == id &&
                    x.TenantId == _tenantContext.TenantId)
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
                return NotFound("Sucursal no encontrada.");

            return Ok(sucursal);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Crear(SucursalDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nombre))
                return BadRequest("El nombre de la sucursal es obligatorio.");

            var nombre = dto.Nombre.Trim();

            var existe = await _context.Sucursales.AnyAsync(x =>
                x.TenantId == _tenantContext.TenantId &&
                x.Nombre.ToLower() == nombre.ToLower());

            if (existe)
                return BadRequest("Ya existe una sucursal con ese nombre.");

            var sucursal = new Sucursal
            {
                TenantId = _tenantContext.TenantId,
                Nombre = nombre,
                Telefono = dto.Telefono?.Trim(),
                Direccion = dto.Direccion?.Trim(),
                Activa = true,
                FechaCreacion = DateTime.UtcNow
            };

            _context.Sucursales.Add(sucursal);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Sucursal creada correctamente.",
                sucursal.Id,
                sucursal.Nombre
            });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Actualizar(
            int id,
            SucursalDto dto)
        {
            var sucursal = await _context.Sucursales
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.TenantId == _tenantContext.TenantId);

            if (sucursal == null)
                return NotFound("Sucursal no encontrada.");

            if (string.IsNullOrWhiteSpace(dto.Nombre))
                return BadRequest("El nombre de la sucursal es obligatorio.");

            var nombre = dto.Nombre.Trim();

            var existe = await _context.Sucursales.AnyAsync(x =>
                x.Id != id &&
                x.TenantId == _tenantContext.TenantId &&
                x.Nombre.ToLower() == nombre.ToLower());

            if (existe)
                return BadRequest("Ya existe otra sucursal con ese nombre.");

            sucursal.Nombre = nombre;
            sucursal.Telefono = dto.Telefono?.Trim();
            sucursal.Direccion = dto.Direccion?.Trim();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Sucursal actualizada correctamente."
            });
        }

        [HttpPatch("{id:int}/estado")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> CambiarEstado(
            int id,
            [FromQuery] bool activa)
        {
            var sucursal = await _context.Sucursales
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.TenantId == _tenantContext.TenantId);

            if (sucursal == null)
                return NotFound("Sucursal no encontrada.");

            sucursal.Activa = activa;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = activa
                    ? "Sucursal activada correctamente."
                    : "Sucursal desactivada correctamente."
            });
        }
    }
}