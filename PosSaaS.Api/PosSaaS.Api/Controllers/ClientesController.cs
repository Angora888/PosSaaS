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
    public class ClientesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITenantContext _tenantContext;

        public ClientesController(
            AppDbContext context,
            ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        // ============================================================
        // LISTAR CLIENTES
        // Admin / Supervisor / Cajero
        // ============================================================

        [HttpGet]
        [Authorize(Roles = "Admin,Supervisor,Cajero")]
        public async Task<IActionResult> ObtenerTodos(
            [FromQuery] string? buscar)
        {
            var query =
                _context.Clientes
                    .Where(x =>
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var texto =
                    buscar.Trim().ToLower();

                query = query.Where(x =>
                    x.Nombre.ToLower().Contains(texto) ||

                    (x.Identificacion != null &&
                     x.Identificacion
                        .ToLower()
                        .Contains(texto)) ||

                    (x.Telefono != null &&
                     x.Telefono
                        .ToLower()
                        .Contains(texto)) ||

                    (x.Email != null &&
                     x.Email
                        .ToLower()
                        .Contains(texto)));
            }

            var clientes =
                await query
                    .OrderBy(x =>
                        x.Nombre)
                    .Select(x => new
                    {
                        x.Id,
                        x.Nombre,
                        x.Identificacion,
                        x.Telefono,
                        x.Email,
                        x.Direccion,
                        x.Activo
                    })
                    .ToListAsync();

            return Ok(clientes);
        }

        // ============================================================
        // OBTENER CLIENTE
        // Admin / Supervisor / Cajero
        // ============================================================

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,Supervisor,Cajero")]
        public async Task<IActionResult> ObtenerPorId(
            int id)
        {
            var cliente =
                await _context.Clientes
                    .Where(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId)
                    .Select(x => new
                    {
                        x.Id,
                        x.Nombre,
                        x.Identificacion,
                        x.Telefono,
                        x.Email,
                        x.Direccion,
                        x.Activo,
                        x.FechaCreacion
                    })
                    .FirstOrDefaultAsync();

            if (cliente == null)
            {
                return NotFound(
                    "Cliente no encontrado.");
            }

            return Ok(cliente);
        }

        // ============================================================
        // CREAR CLIENTE
        // Admin / Supervisor / Cajero
        // ============================================================

        [HttpPost]
        [Authorize(Roles = "Admin,Supervisor,Cajero")]
        public async Task<IActionResult> Crear(
            ClienteDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nombre))
            {
                return BadRequest(
                    "El nombre del cliente es obligatorio.");
            }

            var identificacion =
                string.IsNullOrWhiteSpace(
                    dto.Identificacion)
                    ? null
                    : dto.Identificacion.Trim();

            var telefono =
                string.IsNullOrWhiteSpace(
                    dto.Telefono)
                    ? null
                    : dto.Telefono.Trim();

            var email =
                string.IsNullOrWhiteSpace(
                    dto.Email)
                    ? null
                    : dto.Email
                        .Trim()
                        .ToLower();

            var direccion =
                string.IsNullOrWhiteSpace(
                    dto.Direccion)
                    ? null
                    : dto.Direccion.Trim();

            // --------------------------------------------------------
            // VALIDAR IDENTIFICACIÓN
            // --------------------------------------------------------

            if (identificacion != null)
            {
                var existe =
                    await _context.Clientes
                        .AnyAsync(x =>
                            x.TenantId ==
                                _tenantContext.TenantId &&
                            x.Identificacion ==
                                identificacion &&
                            x.Activo);

                if (existe)
                {
                    return BadRequest(
                        "Ya existe un cliente con esa identificación.");
                }
            }

            var cliente =
                new Cliente
                {
                    TenantId =
                        _tenantContext.TenantId,

                    Nombre =
                        dto.Nombre.Trim(),

                    Identificacion =
                        identificacion,

                    Telefono =
                        telefono,

                    Email =
                        email,

                    Direccion =
                        direccion,

                    Activo =
                        true,

                    FechaCreacion =
                        DateTime.UtcNow
                };

            _context.Clientes.Add(cliente);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Cliente creado correctamente.",

                cliente.Id,
                cliente.Nombre
            });
        }

        // ============================================================
        // ACTUALIZAR CLIENTE
        // Admin / Supervisor / Cajero
        // ============================================================

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Supervisor,Cajero")]
        public async Task<IActionResult> Actualizar(
            int id,
            ClienteDto dto)
        {
            var cliente =
                await _context.Clientes
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (cliente == null)
            {
                return NotFound(
                    "Cliente no encontrado.");
            }

            if (string.IsNullOrWhiteSpace(dto.Nombre))
            {
                return BadRequest(
                    "El nombre del cliente es obligatorio.");
            }

            var identificacion =
                string.IsNullOrWhiteSpace(
                    dto.Identificacion)
                    ? null
                    : dto.Identificacion.Trim();

            var telefono =
                string.IsNullOrWhiteSpace(
                    dto.Telefono)
                    ? null
                    : dto.Telefono.Trim();

            var email =
                string.IsNullOrWhiteSpace(
                    dto.Email)
                    ? null
                    : dto.Email
                        .Trim()
                        .ToLower();

            var direccion =
                string.IsNullOrWhiteSpace(
                    dto.Direccion)
                    ? null
                    : dto.Direccion.Trim();

            // --------------------------------------------------------
            // VALIDAR IDENTIFICACIÓN
            // --------------------------------------------------------

            if (identificacion != null)
            {
                var existe =
                    await _context.Clientes
                        .AnyAsync(x =>
                            x.Id != id &&
                            x.TenantId ==
                                _tenantContext.TenantId &&
                            x.Identificacion ==
                                identificacion &&
                            x.Activo);

                if (existe)
                {
                    return BadRequest(
                        "Ya existe otro cliente con esa identificación.");
                }
            }

            cliente.Nombre =
                dto.Nombre.Trim();

            cliente.Identificacion =
                identificacion;

            cliente.Telefono =
                telefono;

            cliente.Email =
                email;

            cliente.Direccion =
                direccion;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Cliente actualizado correctamente."
            });
        }

        // ============================================================
        // ACTIVAR / DESACTIVAR CLIENTE
        // Admin / Supervisor
        // ============================================================

        [HttpPatch("{id:int}/estado")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> CambiarEstado(
            int id,
            [FromQuery] bool activo)
        {
            var cliente =
                await _context.Clientes
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (cliente == null)
            {
                return NotFound(
                    "Cliente no encontrado.");
            }

            cliente.Activo =
                activo;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    activo
                        ? "Cliente activado."
                        : "Cliente desactivado."
            });
        }
    }
}