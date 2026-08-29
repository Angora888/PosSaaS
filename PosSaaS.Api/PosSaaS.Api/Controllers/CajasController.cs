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
    public class CajasController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITenantContext _tenantContext;

        public CajasController(
            AppDbContext context,
            ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerTodas()
        {
            var cajas = await _context.Cajas
                .Where(x =>
                    x.TenantId == _tenantContext.TenantId)
                .OrderBy(x => x.Sucursal.Nombre)
                .ThenBy(x => x.Nombre)
                .Select(x => new
                {
                    x.Id,
                    x.Nombre,
                    x.Activa,
                    x.SucursalId,
                    sucursal = x.Sucursal.Nombre
                })
                .ToListAsync();

            return Ok(cajas);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> Crear(CajaDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nombre))
                return BadRequest(
                    "El nombre de la caja es obligatorio.");

            var sucursalExiste =
                await _context.Sucursales.AnyAsync(x =>
                    x.Id == dto.SucursalId &&
                    x.TenantId == _tenantContext.TenantId &&
                    x.Activa);

            if (!sucursalExiste)
                return BadRequest(
                    "La sucursal no existe o está inactiva.");

            var nombre = dto.Nombre.Trim();

            var existe = await _context.Cajas.AnyAsync(x =>
                x.TenantId == _tenantContext.TenantId &&
                x.SucursalId == dto.SucursalId &&
                x.Nombre.ToLower() == nombre.ToLower());

            if (existe)
                return BadRequest(
                    "Ya existe una caja con ese nombre.");

            var caja = new Caja
            {
                TenantId = _tenantContext.TenantId,
                SucursalId = dto.SucursalId,
                Nombre = nombre,
                Activa = true
            };

            _context.Cajas.Add(caja);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Caja creada correctamente.",
                caja.Id,
                caja.Nombre
            });
        }

        [HttpGet("sesion/{sesionId:long}/resumen")]
        public async Task<IActionResult> ObtenerResumenSesion(long sesionId)
        {
            var sesion = await _context.CajaSesiones
                .Where(x =>
                    x.Id == sesionId &&
                    x.TenantId == _tenantContext.TenantId)
                .Select(x => new
                {
                    x.Id,
                    x.Estado,
                    x.MontoApertura,
                    x.MontoCierre,
                    x.MontoEsperado,
                    x.Diferencia,
                    x.FechaApertura,
                    x.FechaCierre,

                    caja = x.Caja.Nombre,
                    sucursal = x.Caja.Sucursal.Nombre,

                    usuarioApertura =
                        x.UsuarioApertura.Nombre,

                    usuarioCierre =
                        x.UsuarioCierre != null
                            ? x.UsuarioCierre.Nombre
                            : null
                })
                .FirstOrDefaultAsync();

            if (sesion == null)
                return NotFound("Sesión de caja no encontrada.");

            var movimientos = await _context.MovimientosCaja
                .Where(x =>
                    x.TenantId == _tenantContext.TenantId &&
                    x.CajaSesionId == sesionId)
                .OrderBy(x => x.Fecha)
                .Select(x => new
                {
                    x.Id,
                    x.Tipo,
                    x.Monto,
                    x.Referencia,
                    x.Observacion,
                    x.Fecha,
                    usuario = x.Usuario.Nombre
                })
                .ToListAsync();

            var totalMovimientos =
                movimientos.Sum(x => x.Monto);

            var ventasEfectivo =
                movimientos
                    .Where(x => x.Tipo == "VENTA_EFECTIVO")
                    .Sum(x => x.Monto);

            var ingresosManuales =
                movimientos
                    .Where(x => x.Tipo == "INGRESO_MANUAL")
                    .Sum(x => x.Monto);

            var retiros =
                movimientos
                    .Where(x => x.Tipo == "RETIRO")
                    .Sum(x => x.Monto);

            var devoluciones =
                movimientos
                    .Where(x => x.Tipo == "DEVOLUCION")
                    .Sum(x => x.Monto);

            var esperadoActual =
                sesion.MontoApertura + totalMovimientos;

            return Ok(new
            {
                sesion,

                resumen = new
                {
                    montoApertura =
                        sesion.MontoApertura,

                    ventasEfectivo,

                    ingresosManuales,

                    retiros,

                    devoluciones,

                    totalMovimientos,

                    montoEsperado =
                        esperadoActual
                },

                movimientos
            });
        }

        [HttpPost("{sesionId:long}/ingreso")]
        [Authorize(Roles = "Admin,Supervisor,Cajero")]
        public async Task<IActionResult> RegistrarIngreso(
    long sesionId,
    MovimientoCajaDto dto)
        {
            if (dto.Monto <= 0)
                return BadRequest(
                    "El monto debe ser mayor que cero.");

            var sesion = await _context.CajaSesiones
                .FirstOrDefaultAsync(x =>
                    x.Id == sesionId &&
                    x.TenantId == _tenantContext.TenantId &&
                    x.Estado == "ABIERTA");

            if (sesion == null)
                return BadRequest(
                    "La sesión de caja no existe o está cerrada.");

            var movimiento = new MovimientoCaja
            {
                TenantId = _tenantContext.TenantId,
                CajaSesionId = sesion.Id,
                UsuarioId = _tenantContext.UsuarioId,

                Tipo = "INGRESO_MANUAL",

                Monto = dto.Monto,

                Referencia =
                    dto.Referencia?.Trim(),

                Observacion =
                    dto.Observacion?.Trim(),

                Fecha =
                    DateTime.UtcNow
            };

            _context.MovimientosCaja.Add(movimiento);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Ingreso de efectivo registrado correctamente.",

                movimiento.Id,
                movimiento.Monto
            });
        }

        [HttpPost("{sesionId:long}/retiro")]
        [Authorize(Roles = "Admin,Supervisor,Cajero")]
        public async Task<IActionResult> RegistrarRetiro(
    long sesionId,
    MovimientoCajaDto dto)
        {
            if (dto.Monto <= 0)
                return BadRequest(
                    "El monto debe ser mayor que cero.");

            var sesion = await _context.CajaSesiones
                .FirstOrDefaultAsync(x =>
                    x.Id == sesionId &&
                    x.TenantId == _tenantContext.TenantId &&
                    x.Estado == "ABIERTA");

            if (sesion == null)
                return BadRequest(
                    "La sesión de caja no existe o está cerrada.");

            var totalMovimientos =
                await _context.MovimientosCaja
                    .Where(x =>
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.CajaSesionId ==
                            sesion.Id)
                    .SumAsync(x =>
                        (decimal?)x.Monto)
                ?? 0;

            var efectivoEsperado =
                sesion.MontoApertura +
                totalMovimientos;

            if (dto.Monto > efectivoEsperado)
            {
                return BadRequest(new
                {
                    mensaje =
                        "El retiro supera el efectivo esperado en caja.",

                    disponible =
                        efectivoEsperado
                });
            }

            var movimiento = new MovimientoCaja
            {
                TenantId = _tenantContext.TenantId,
                CajaSesionId = sesion.Id,
                UsuarioId = _tenantContext.UsuarioId,

                Tipo = "RETIRO",

                // IMPORTANTE:
                // los retiros se almacenan negativos.
                Monto = -dto.Monto,

                Referencia =
                    dto.Referencia?.Trim(),

                Observacion =
                    dto.Observacion?.Trim(),

                Fecha =
                    DateTime.UtcNow
            };

            _context.MovimientosCaja.Add(movimiento);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Retiro registrado correctamente.",

                montoRetirado =
                    dto.Monto,

                efectivoEsperado =
                    efectivoEsperado - dto.Monto
            });
        }

        [HttpPost("abrir")]
        public async Task<IActionResult> Abrir(
            AbrirCajaDto dto)
        {
            if (dto.MontoApertura < 0)
                return BadRequest(
                    "El monto de apertura no puede ser negativo.");

            var caja = await _context.Cajas
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.CajaId &&
                    x.TenantId == _tenantContext.TenantId &&
                    x.Activa);

            if (caja == null)
                return BadRequest(
                    "La caja no existe o está inactiva.");

            var yaEstaAbierta =
                await _context.CajaSesiones.AnyAsync(x =>
                    x.TenantId == _tenantContext.TenantId &&
                    x.CajaId == dto.CajaId &&
                    x.Estado == "ABIERTA");

            if (yaEstaAbierta)
                return BadRequest(
                    "La caja ya tiene una sesión abierta.");

            var sesion = new CajaSesion
            {
                TenantId = _tenantContext.TenantId,
                CajaId = caja.Id,

                UsuarioAperturaId =
                    _tenantContext.UsuarioId,

                MontoApertura =
                    dto.MontoApertura,

                FechaApertura =
                    DateTime.UtcNow,

                Estado = "ABIERTA"
            };

            _context.CajaSesiones.Add(sesion);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Caja abierta correctamente.",

                cajaSesionId = sesion.Id,

                caja = caja.Nombre,

                montoApertura =
                    sesion.MontoApertura,

                fechaApertura =
                    sesion.FechaApertura
            });
        }

        [HttpGet("sesion-abierta/{cajaId:int}")]
        public async Task<IActionResult> ObtenerSesionAbierta(
            int cajaId)
        {
            var sesion = await _context.CajaSesiones
                .Where(x =>
                    x.TenantId == _tenantContext.TenantId &&
                    x.CajaId == cajaId &&
                    x.Estado == "ABIERTA")
                .Select(x => new
                {
                    x.Id,
                    x.CajaId,
                    caja = x.Caja.Nombre,
                    x.MontoApertura,
                    x.FechaApertura,
                    x.UsuarioAperturaId
                })
                .FirstOrDefaultAsync();

            if (sesion == null)
                return NotFound(
                    "No existe una sesión abierta.");

            return Ok(sesion);
        }

        [HttpPost("{sesionId:long}/cerrar")]
        public async Task<IActionResult> Cerrar(
            long sesionId,
            CerrarCajaDto dto)
        {
            if (dto.MontoContado < 0)
                return BadRequest(
                    "El monto contado no puede ser negativo.");

            var sesion = await _context.CajaSesiones
                .FirstOrDefaultAsync(x =>
                    x.Id == sesionId &&
                    x.TenantId == _tenantContext.TenantId &&
                    x.Estado == "ABIERTA");

            if (sesion == null)
                return NotFound(
                    "No existe una sesión abierta.");

            var movimientos =
                await _context.MovimientosCaja
                    .Where(x =>
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.CajaSesionId ==
                            sesion.Id)
                    .SumAsync(x => (decimal?)x.Monto)
                    ?? 0;

            var esperado =
                sesion.MontoApertura +
                movimientos;

            sesion.MontoEsperado =
                esperado;

            sesion.MontoCierre =
                dto.MontoContado;

            sesion.Diferencia =
                dto.MontoContado -
                esperado;

            sesion.UsuarioCierreId =
                _tenantContext.UsuarioId;

            sesion.FechaCierre =
                DateTime.UtcNow;

            sesion.Estado =
                "CERRADA";

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Caja cerrada correctamente.",

                montoApertura =
                    sesion.MontoApertura,

                movimientos,

                montoEsperado =
                    sesion.MontoEsperado,

                montoContado =
                    sesion.MontoCierre,

                diferencia =
                    sesion.Diferencia
            });
        }
    }
}