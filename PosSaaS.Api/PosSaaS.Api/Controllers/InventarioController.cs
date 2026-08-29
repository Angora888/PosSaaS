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
    public class InventarioController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITenantContext _tenantContext;

        public InventarioController(
            AppDbContext context,
            ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        [HttpGet("sucursal/{sucursalId:int}")]
        public async Task<IActionResult> ObtenerInventario(
            int sucursalId)
        {
            var sucursalExiste =
                await _context.Sucursales.AnyAsync(x =>
                    x.Id == sucursalId &&
                    x.TenantId == _tenantContext.TenantId);

            if (!sucursalExiste)
                return NotFound("Sucursal no encontrada.");

            var inventario = await _context.Inventarios
                .Where(x =>
                    x.TenantId == _tenantContext.TenantId &&
                    x.SucursalId == sucursalId)
                .OrderBy(x => x.Producto.Nombre)
                .Select(x => new
                {
                    x.Id,
                    x.ProductoId,

                    producto = x.Producto.Nombre,

                    x.Producto.SKU,
                    x.Producto.CodigoBarras,

                    x.Cantidad,
                    x.StockMinimo,

                    stockBajo =
                        x.Cantidad <= x.StockMinimo,

                    x.FechaActualizacion
                })
                .ToListAsync();

            return Ok(inventario);
        }

        [HttpPost("entrada")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> Entrada(
            MovimientoInventarioDto dto)
        {
            return await RegistrarMovimiento(
                dto,
                "ENTRADA",
                dto.Cantidad
            );
        }

        [HttpPost("salida")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> Salida(
            MovimientoInventarioDto dto)
        {
            return await RegistrarMovimiento(
                dto,
                "SALIDA",
                -dto.Cantidad
            );
        }

        private async Task<IActionResult> RegistrarMovimiento(
            MovimientoInventarioDto dto,
            string tipo,
            decimal cambio)
        {
            if (dto.Cantidad <= 0)
                return BadRequest(
                    "La cantidad debe ser mayor que cero.");

            var sucursal = await _context.Sucursales
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.SucursalId &&
                    x.TenantId == _tenantContext.TenantId &&
                    x.Activa);

            if (sucursal == null)
                return BadRequest(
                    "La sucursal no existe o está inactiva.");

            var producto = await _context.Productos
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.ProductoId &&
                    x.TenantId == _tenantContext.TenantId &&
                    x.Activo);

            if (producto == null)
                return BadRequest(
                    "El producto no existe o está inactivo.");

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var inventario =
                    await _context.Inventarios
                        .FirstOrDefaultAsync(x =>
                            x.TenantId ==
                                _tenantContext.TenantId &&
                            x.SucursalId ==
                                dto.SucursalId &&
                            x.ProductoId ==
                                dto.ProductoId);

                if (inventario == null)
                {
                    inventario = new Inventario
                    {
                        TenantId =
                            _tenantContext.TenantId,

                        SucursalId =
                            dto.SucursalId,

                        ProductoId =
                            dto.ProductoId,

                        Cantidad = 0,

                        StockMinimo = 0
                    };

                    _context.Inventarios.Add(inventario);
                }

                var cantidadAnterior =
                    inventario.Cantidad;

                var cantidadNueva =
                    cantidadAnterior + cambio;

                if (cantidadNueva < 0)
                {
                    return BadRequest(
                        "No existe inventario suficiente.");
                }

                inventario.Cantidad =
                    cantidadNueva;

                inventario.FechaActualizacion =
                    DateTime.UtcNow;

                var movimiento =
                    new MovimientoInventario
                    {
                        TenantId =
                            _tenantContext.TenantId,

                        SucursalId =
                            dto.SucursalId,

                        ProductoId =
                            dto.ProductoId,

                        UsuarioId =
                            _tenantContext.UsuarioId,

                        Tipo = tipo,

                        Cantidad =
                            dto.Cantidad,

                        CantidadAnterior =
                            cantidadAnterior,

                        CantidadNueva =
                            cantidadNueva,

                        Referencia =
                            dto.Referencia?.Trim(),

                        Observacion =
                            dto.Observacion?.Trim(),

                        Fecha =
                            DateTime.UtcNow
                    };

                _context.MovimientosInventario
                    .Add(movimiento);

                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return Ok(new
                {
                    mensaje =
                        "Movimiento registrado correctamente.",

                    producto =
                        producto.Nombre,

                    cantidadAnterior,

                    movimiento =
                        cambio,

                    cantidadNueva
                });
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}