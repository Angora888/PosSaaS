using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PosSaaS.Api.Data;
using PosSaaS.Api.DTOs;
using PosSaaS.Api.Models;

namespace PosSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TenantsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TenantsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("registrar")]
        [AllowAnonymous]
        public async Task<IActionResult> Registrar(RegistrarTenantDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NombreComercio))
                return BadRequest("El nombre del comercio es obligatorio.");

            if (string.IsNullOrWhiteSpace(dto.NombreAdmin))
                return BadRequest("El nombre del administrador es obligatorio.");

            if (string.IsNullOrWhiteSpace(dto.EmailAdmin))
                return BadRequest("El email del administrador es obligatorio.");

            if (string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("La contraseña es obligatoria.");

            if (dto.Password.Length < 6)
                return BadRequest("La contraseña debe tener al menos 6 caracteres.");

            var email = dto.EmailAdmin.Trim().ToLower();

            var emailExiste = await _context.Usuarios.AnyAsync(x => x.Email == email);
            if (emailExiste)
                return BadRequest("Ya existe un usuario con ese correo electrónico.");

            var existeIdentificacion =
                !string.IsNullOrWhiteSpace(dto.Identificacion) &&
                await _context.Tenants.AnyAsync(x => x.Identificacion == dto.Identificacion);

            if (existeIdentificacion)
                return BadRequest("Ya existe un comercio con esa identificación.");

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var tenant = new Tenant
                {
                    Nombre = dto.NombreComercio.Trim(),
                    NombreComercial = dto.NombreComercial?.Trim(),
                    Identificacion = dto.Identificacion?.Trim(),
                    Email = email,
                    Telefono = dto.Telefono?.Trim(),
                    Activo = true,
                    FechaCreacion = DateTime.UtcNow
                };

                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync();

                var usuario = new Usuario
                {
                    TenantId = tenant.Id,
                    SucursalId = null,
                    Nombre = dto.NombreAdmin.Trim(),
                    Email = email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Rol = "Admin",
                    Activo = true,
                    FechaCreacion = DateTime.UtcNow
                };

                _context.Usuarios.Add(usuario);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    mensaje = "Comercio creado correctamente.",
                    tenantId = tenant.Id,
                    usuarioId = usuario.Id,
                    tenant = tenant.Nombre,
                    admin = usuario.Nombre
                });
            }
            catch
            {
                await transaction.RollbackAsync();
                return StatusCode(StatusCodes.Status500InternalServerError,
                    "Ocurrió un error creando el comercio.");
            }
        }

        [HttpGet("plataforma/resumen")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> ObtenerResumenPlataforma()
        {
            var hoy = DateTime.UtcNow.Date;
            var inicioMes = new DateTime(hoy.Year, hoy.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var resumen = new
            {
                tenants = await _context.Tenants.CountAsync(),
                tenantsActivos = await _context.Tenants.CountAsync(x => x.Activo),
                tenantsInactivos = await _context.Tenants.CountAsync(x => !x.Activo),
                nuevosEsteMes = await _context.Tenants.CountAsync(x => x.FechaCreacion >= inicioMes),
                usuarios = await _context.Usuarios.CountAsync(),
                usuariosActivos = await _context.Usuarios.CountAsync(x => x.Activo),
                sucursales = await _context.Sucursales.CountAsync(),
                sucursalesActivas = await _context.Sucursales.CountAsync(x => x.Activa),
                ventas = await _context.Ventas.CountAsync(x => x.Estado == "COMPLETADA"),
                ventasEsteMes = await _context.Ventas.CountAsync(x =>
                    x.Estado == "COMPLETADA" && x.Fecha >= inicioMes),
                volumenEsteMes = await _context.Ventas
                    .Where(x => x.Estado == "COMPLETADA" && x.Fecha >= inicioMes)
                    .SumAsync(x => (decimal?)x.Total) ?? 0
            };

            return Ok(resumen);
        }

        [HttpGet("plataforma")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> ObtenerTenantsPlataforma()
        {
            var tenants = await _context.Tenants
                .AsNoTracking()
                .OrderByDescending(x => x.FechaCreacion)
                .Select(x => new
                {
                    x.Id,
                    x.Nombre,
                    x.NombreComercial,
                    x.Identificacion,
                    x.Email,
                    x.Telefono,
                    x.Activo,
                    x.FechaCreacion,
                    sucursales = x.Sucursales.Count,
                    sucursalesActivas = x.Sucursales.Count(s => s.Activa),
                    usuarios = x.Usuarios.Count,
                    usuariosActivos = x.Usuarios.Count(u => u.Activo),
                    administradores = x.Usuarios.Count(u => u.Rol == "Admin" && u.Activo),
                    ventas = _context.Ventas.Count(v =>
                        v.TenantId == x.Id && v.Estado == "COMPLETADA"),
                    totalVendido = _context.Ventas
                        .Where(v => v.TenantId == x.Id && v.Estado == "COMPLETADA")
                        .Sum(v => (decimal?)v.Total) ?? 0
                })
                .ToListAsync();

            return Ok(tenants);
        }

        [HttpGet("plataforma/{id:int}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> ObtenerTenantPlataforma(int id)
        {
            var tenant = await _context.Tenants
                .AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new
                {
                    x.Id,
                    x.Nombre,
                    x.NombreComercial,
                    x.Identificacion,
                    x.Email,
                    x.Telefono,
                    x.Activo,
                    x.FechaCreacion,
                    sucursales = x.Sucursales
                        .OrderBy(s => s.Nombre)
                        .Select(s => new { s.Id, s.Nombre, s.Telefono, s.Direccion, s.Activa })
                        .ToList(),
                    usuarios = x.Usuarios
                        .OrderBy(u => u.Nombre)
                        .Select(u => new
                        {
                            u.Id,
                            u.Nombre,
                            u.Email,
                            u.Rol,
                            u.Activo,
                            u.FechaCreacion,
                            sucursal = u.Sucursal != null ? u.Sucursal.Nombre : null
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (tenant == null)
                return NotFound("Comercio no encontrado.");

            return Ok(tenant);
        }

        [HttpPatch("plataforma/{id:int}/estado")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> CambiarEstadoTenant(int id, [FromQuery] bool activo)
        {
            var tenant = await _context.Tenants.FirstOrDefaultAsync(x => x.Id == id);
            if (tenant == null)
                return NotFound("Comercio no encontrado.");

            tenant.Activo = activo;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = activo
                    ? "Comercio activado correctamente."
                    : "Comercio suspendido correctamente.",
                tenant.Id,
                tenant.Activo
            });
        }
    }
}