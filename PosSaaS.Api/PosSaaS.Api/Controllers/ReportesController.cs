using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PosSaaS.Api.Data;
using PosSaaS.Api.Services;

namespace PosSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Supervisor")]
    public class ReportesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITenantContext _tenantContext;

        public ReportesController(
            AppDbContext context,
            ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        [HttpGet("ventas")]
        public async Task<IActionResult> Ventas(
            [FromQuery] DateOnly? desde,
            [FromQuery] DateOnly? hasta)
        {
            var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
            var fechaDesde = desde ?? hoy.AddDays(-29);
            var fechaHasta = hasta ?? hoy;

            if (fechaDesde > fechaHasta)
            {
                return BadRequest(
                    "La fecha inicial no puede ser mayor que la fecha final.");
            }

            if (fechaHasta.DayNumber - fechaDesde.DayNumber > 365)
            {
                return BadRequest(
                    "El rango máximo permitido es de 366 días.");
            }

            var inicio = DateTime.SpecifyKind(
                fechaDesde.ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Utc);

            var finExclusivo = DateTime.SpecifyKind(
                fechaHasta.AddDays(1).ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Utc);

            var ventasQuery = _context.Ventas
                .AsNoTracking()
                .Where(x =>
                    x.TenantId == _tenantContext.TenantId &&
                    x.Estado == "COMPLETADA" &&
                    x.Fecha >= inicio &&
                    x.Fecha < finExclusivo);

            if (_tenantContext.SucursalId.HasValue)
            {
                var sucursalId = _tenantContext.SucursalId.Value;
                ventasQuery = ventasQuery.Where(x =>
                    x.SucursalId == sucursalId);
            }

            var resumen = await ventasQuery
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalVendido = g.Sum(x => x.Total),
                    CantidadVentas = g.Count(),
                    TicketPromedio = g.Average(x => x.Total),
                    Subtotal = g.Sum(x => x.Subtotal),
                    Impuesto = g.Sum(x => x.Impuesto),
                    Descuento = g.Sum(x => x.Descuento)
                })
                .FirstOrDefaultAsync();

            var ventasPorDia = await ventasQuery
                .GroupBy(x => x.Fecha.Date)
                .Select(g => new
                {
                    Fecha = g.Key,
                    Total = g.Sum(x => x.Total),
                    Cantidad = g.Count()
                })
                .OrderBy(x => x.Fecha)
                .ToListAsync();

            var ventasPorSucursal = await ventasQuery
                .GroupBy(x => new
                {
                    x.SucursalId,
                    x.Sucursal.Nombre
                })
                .Select(g => new
                {
                    SucursalId = g.Key.SucursalId,
                    Sucursal = g.Key.Nombre,
                    Total = g.Sum(x => x.Total),
                    CantidadVentas = g.Count()
                })
                .OrderByDescending(x => x.Total)
                .ToListAsync();

            var pagosQuery = _context.PagosVenta
                .AsNoTracking()
                .Where(x =>
                    x.Venta.TenantId == _tenantContext.TenantId &&
                    x.Venta.Estado == "COMPLETADA" &&
                    x.Venta.Fecha >= inicio &&
                    x.Venta.Fecha < finExclusivo);

            if (_tenantContext.SucursalId.HasValue)
            {
                var sucursalId = _tenantContext.SucursalId.Value;
                pagosQuery = pagosQuery.Where(x =>
                    x.Venta.SucursalId == sucursalId);
            }

            var metodosPago = await pagosQuery
                .GroupBy(x => new
                {
                    x.MetodoPagoId,
                    x.MetodoPago.Nombre,
                    x.MetodoPago.Tipo
                })
                .Select(g => new
                {
                    MetodoPagoId = g.Key.MetodoPagoId,
                    Nombre = g.Key.Nombre,
                    Tipo = g.Key.Tipo,
                    Total = g.Sum(x => x.Monto),
                    CantidadPagos = g.Count()
                })
                .OrderByDescending(x => x.Total)
                .ToListAsync();

            var detallesQuery = _context.VentaDetalles
                .AsNoTracking()
                .Where(x =>
                    x.Venta.TenantId == _tenantContext.TenantId &&
                    x.Venta.Estado == "COMPLETADA" &&
                    x.Venta.Fecha >= inicio &&
                    x.Venta.Fecha < finExclusivo);

            if (_tenantContext.SucursalId.HasValue)
            {
                var sucursalId = _tenantContext.SucursalId.Value;
                detallesQuery = detallesQuery.Where(x =>
                    x.Venta.SucursalId == sucursalId);
            }

            var productosMasVendidos = await detallesQuery
                .GroupBy(x => new
                {
                    x.ProductoId,
                    x.ProductoNombre
                })
                .Select(g => new
                {
                    ProductoId = g.Key.ProductoId,
                    Producto = g.Key.ProductoNombre,
                    Cantidad = g.Sum(x => x.Cantidad),
                    Total = g.Sum(x => x.Total)
                })
                .OrderByDescending(x => x.Cantidad)
                .ThenByDescending(x => x.Total)
                .Take(10)
                .ToListAsync();

            return Ok(new
            {
                Desde = fechaDesde,
                Hasta = fechaHasta,
                Resumen = resumen ?? new
                {
                    TotalVendido = 0m,
                    CantidadVentas = 0,
                    TicketPromedio = 0m,
                    Subtotal = 0m,
                    Impuesto = 0m,
                    Descuento = 0m
                },
                VentasPorDia = ventasPorDia,
                VentasPorSucursal = ventasPorSucursal,
                MetodosPago = metodosPago,
                ProductosMasVendidos = productosMasVendidos
            });
        }
    }
}