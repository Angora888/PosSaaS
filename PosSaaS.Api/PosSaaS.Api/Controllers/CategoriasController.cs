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
    public class CategoriasController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITenantContext _tenantContext;

        public CategoriasController(
            AppDbContext context,
            ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerTodas()
        {
            var categorias = await _context.Categorias
                .Where(x => x.TenantId == _tenantContext.TenantId)
                .OrderBy(x => x.Nombre)
                .Select(x => new
                {
                    x.Id,
                    x.Nombre,
                    x.Activa
                })
                .ToListAsync();

            return Ok(categorias);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> Crear(CategoriaDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nombre))
                return BadRequest("El nombre es obligatorio.");

            var nombre = dto.Nombre.Trim();

            var existe = await _context.Categorias.AnyAsync(x =>
                x.TenantId == _tenantContext.TenantId &&
                x.Nombre.ToLower() == nombre.ToLower());

            if (existe)
                return BadRequest("Ya existe una categoría con ese nombre.");

            var categoria = new Categoria
            {
                TenantId = _tenantContext.TenantId,
                Nombre = nombre
            };

            _context.Categorias.Add(categoria);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Categoría creada correctamente.",
                categoria.Id,
                categoria.Nombre
            });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> Actualizar(
            int id,
            CategoriaDto dto)
        {
            var categoria = await _context.Categorias
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.TenantId == _tenantContext.TenantId);

            if (categoria == null)
                return NotFound("Categoría no encontrada.");

            if (string.IsNullOrWhiteSpace(dto.Nombre))
                return BadRequest("El nombre es obligatorio.");

            var nombre = dto.Nombre.Trim();

            var existe = await _context.Categorias.AnyAsync(x =>
                x.Id != id &&
                x.TenantId == _tenantContext.TenantId &&
                x.Nombre.ToLower() == nombre.ToLower());

            if (existe)
                return BadRequest("Ya existe otra categoría con ese nombre.");

            categoria.Nombre = nombre;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Categoría actualizada correctamente."
            });
        }

        [HttpPatch("{id:int}/estado")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> CambiarEstado(
            int id,
            [FromQuery] bool activa)
        {
            var categoria = await _context.Categorias
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.TenantId == _tenantContext.TenantId);

            if (categoria == null)
                return NotFound("Categoría no encontrada.");

            categoria.Activa = activa;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = activa
                    ? "Categoría activada."
                    : "Categoría desactivada."
            });
        }
    }
}