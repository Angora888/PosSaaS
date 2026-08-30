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
    [Authorize(Roles = "Admin")]
    public class UsuariosController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITenantContext _tenantContext;

        public UsuariosController(
            AppDbContext context,
            ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        // =========================================================
        // GET: api/Usuarios
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> ObtenerTodos(
            [FromQuery] string? buscar)
        {
            var query = _context.Usuarios
                .Where(x =>
                    x.TenantId == _tenantContext.TenantId);

            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var texto = buscar.Trim().ToLower();

                query = query.Where(x =>
                    x.Nombre.ToLower().Contains(texto) ||
                    x.Email.ToLower().Contains(texto) ||
                    x.Rol.ToLower().Contains(texto));
            }

            var usuarios = await query
                .OrderBy(x => x.Nombre)
                .Select(x => new
                {
                    x.Id,
                    x.Nombre,
                    x.Email,
                    x.Rol,
                    x.SucursalId,

                    Sucursal = x.Sucursal != null
                        ? x.Sucursal.Nombre
                        : null,

                    x.Activo,
                    x.FechaCreacion
                })
                .ToListAsync();

            return Ok(usuarios);
        }

        // =========================================================
        // GET: api/Usuarios/5
        // =========================================================

        [HttpGet("{id:int}")]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            var usuario = await _context.Usuarios
                .Where(x =>
                    x.Id == id &&
                    x.TenantId == _tenantContext.TenantId)
                .Select(x => new
                {
                    x.Id,
                    x.Nombre,
                    x.Email,
                    x.Rol,
                    x.SucursalId,

                    Sucursal = x.Sucursal != null
                        ? x.Sucursal.Nombre
                        : null,

                    x.Activo,
                    x.FechaCreacion
                })
                .FirstOrDefaultAsync();

            if (usuario == null)
                return NotFound(
                    "Usuario no encontrado.");

            return Ok(usuario);
        }

        // =========================================================
        // POST: api/Usuarios
        // =========================================================

        [HttpPost]
        public async Task<IActionResult> Crear(
            CrearUsuarioDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nombre))
            {
                return BadRequest(
                    "El nombre del usuario es obligatorio.");
            }

            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(
                    "El correo electrónico es obligatorio.");
            }

            if (string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(
                    "La contraseña es obligatoria.");
            }

            if (dto.Password.Length < 6)
            {
                return BadRequest(
                    "La contraseña debe tener al menos 6 caracteres.");
            }

            var rol = NormalizarRol(dto.Rol);

            if (rol == null)
            {
                return BadRequest(
                    "El rol debe ser Admin, Supervisor o Cajero.");
            }

            var email =
                dto.Email.Trim().ToLower();

            // El email es único globalmente.
            var emailExiste =
                await _context.Usuarios.AnyAsync(x =>
                    x.Email == email);

            if (emailExiste)
            {
                return BadRequest(
                    "Ya existe un usuario con ese correo electrónico.");
            }

            // Validamos la sucursal.
            if (dto.SucursalId.HasValue)
            {
                var sucursalExiste =
                    await _context.Sucursales.AnyAsync(x =>
                        x.Id == dto.SucursalId.Value &&
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.Activa);

                if (!sucursalExiste)
                {
                    return BadRequest(
                        "La sucursal seleccionada no existe o se encuentra inactiva.");
                }
            }

            var usuario = new Usuario
            {
                TenantId =
                    _tenantContext.TenantId,

                SucursalId =
                    dto.SucursalId,

                Nombre =
                    dto.Nombre.Trim(),

                Email =
                    email,

                PasswordHash =
                    BCrypt.Net.BCrypt.HashPassword(
                        dto.Password),

                Rol =
                    rol,

                Activo =
                    true,

                FechaCreacion =
                    DateTime.UtcNow
            };

            _context.Usuarios.Add(usuario);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Usuario creado correctamente.",

                usuario.Id,
                usuario.Nombre,
                usuario.Email,
                usuario.Rol
            });
        }

        // =========================================================
        // PUT: api/Usuarios/5
        // =========================================================

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Actualizar(
            int id,
            ActualizarUsuarioDto dto)
        {
            var usuario =
                await _context.Usuarios
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (usuario == null)
            {
                return NotFound(
                    "Usuario no encontrado.");
            }

            if (string.IsNullOrWhiteSpace(dto.Nombre))
            {
                return BadRequest(
                    "El nombre del usuario es obligatorio.");
            }

            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(
                    "El correo electrónico es obligatorio.");
            }

            var rol = NormalizarRol(dto.Rol);

            if (rol == null)
            {
                return BadRequest(
                    "El rol debe ser Admin, Supervisor o Cajero.");
            }

            var email =
                dto.Email.Trim().ToLower();

            var emailExiste =
                await _context.Usuarios.AnyAsync(x =>
                    x.Id != id &&
                    x.Email == email);

            if (emailExiste)
            {
                return BadRequest(
                    "Ya existe otro usuario con ese correo electrónico.");
            }

            if (dto.SucursalId.HasValue)
            {
                var sucursalExiste =
                    await _context.Sucursales.AnyAsync(x =>
                        x.Id == dto.SucursalId.Value &&
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.Activa);

                if (!sucursalExiste)
                {
                    return BadRequest(
                        "La sucursal seleccionada no existe o se encuentra inactiva.");
                }
            }

            usuario.Nombre =
                dto.Nombre.Trim();

            usuario.Email =
                email;

            usuario.Rol =
                rol;

            usuario.SucursalId =
                dto.SucursalId;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Usuario actualizado correctamente."
            });
        }

        // =========================================================
        // PATCH: api/Usuarios/5/estado?activo=false
        // =========================================================

        [HttpPatch("{id:int}/estado")]
        public async Task<IActionResult> CambiarEstado(
            int id,
            [FromQuery] bool activo)
        {
            var usuario =
                await _context.Usuarios
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (usuario == null)
            {
                return NotFound(
                    "Usuario no encontrado.");
            }

            // Evitamos que el usuario se desactive a sí mismo.
            if (usuario.Id ==
                _tenantContext.UsuarioId &&
                !activo)
            {
                return BadRequest(
                    "No puedes desactivar tu propio usuario.");
            }

            usuario.Activo =
                activo;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = activo
                    ? "Usuario activado correctamente."
                    : "Usuario desactivado correctamente."
            });
        }

        // =========================================================
        // PATCH: api/Usuarios/5/password
        // =========================================================

        [HttpPatch("{id:int}/password")]
        public async Task<IActionResult> CambiarPassword(
            int id,
            CambiarPasswordUsuarioDto dto)
        {
            var usuario =
                await _context.Usuarios
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (usuario == null)
            {
                return NotFound(
                    "Usuario no encontrado.");
            }

            if (string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(
                    "La nueva contraseña es obligatoria.");
            }

            if (dto.Password.Length < 6)
            {
                return BadRequest(
                    "La contraseña debe tener al menos 6 caracteres.");
            }

            usuario.PasswordHash =
                BCrypt.Net.BCrypt.HashPassword(
                    dto.Password);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Contraseña actualizada correctamente."
            });
        }

        // =========================================================
        // NORMALIZAR ROL
        // =========================================================

        private static string? NormalizarRol(
            string? rol)
        {
            if (string.IsNullOrWhiteSpace(rol))
                return null;

            return rol.Trim().ToLower() switch
            {
                "admin" => "Admin",
                "supervisor" => "Supervisor",
                "cajero" => "Cajero",
                _ => null
            };
        }
    }
}