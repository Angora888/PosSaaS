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

            // Evitamos crear accidentalmente el mismo comercio/admin dos veces.
            var existeIdentificacion =
                !string.IsNullOrWhiteSpace(dto.Identificacion) &&
                await _context.Tenants.AnyAsync(x =>
                    x.Identificacion == dto.Identificacion);

            if (existeIdentificacion)
                return BadRequest("Ya existe un comercio con esa identificación.");

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

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

                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    "Ocurrió un error creando el comercio."
                );
            }
        }
    }
}