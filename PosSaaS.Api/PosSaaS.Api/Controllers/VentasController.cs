using System.Data;
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
    public class VentasController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITenantContext _tenantContext;

        public VentasController(
            AppDbContext context,
            ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        // ============================================================
        // CREAR VENTA
        // ============================================================

        [HttpPost]
        [Authorize(Roles = "Admin,Supervisor,Cajero")]
        public async Task<IActionResult> CrearVenta(
            CrearVentaDto dto)
        {
            if (dto.CajaSesionId <= 0)
                return BadRequest(
                    "La sesión de caja es obligatoria.");

            if (dto.Productos == null ||
                dto.Productos.Count == 0)
            {
                return BadRequest(
                    "La venta debe contener al menos un producto.");
            }

            if (dto.Pagos == null ||
                dto.Pagos.Count == 0)
            {
                return BadRequest(
                    "Debe registrar al menos un pago.");
            }

            if (dto.Productos.Any(x => x.Cantidad <= 0))
            {
                return BadRequest(
                    "Las cantidades deben ser mayores que cero.");
            }

            if (dto.Pagos.Any(x => x.Monto <= 0))
            {
                return BadRequest(
                    "Los montos de pago deben ser mayores que cero.");
            }

            // Serializable ayuda a evitar problemas cuando
            // dos cajas intentan vender el mismo stock a la vez.
            await using var transaction =
                await _context.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable);

            try
            {
                // ====================================================
                // VALIDAR SESIÓN DE CAJA
                // ====================================================

                var sesion = await _context.CajaSesiones
                    .Include(x => x.Caja)
                    .FirstOrDefaultAsync(x =>
                        x.Id == dto.CajaSesionId &&
                        x.TenantId == _tenantContext.TenantId &&
                        x.Estado == "ABIERTA");

                if (sesion == null)
                {
                    return BadRequest(
                        "La sesión de caja no existe o se encuentra cerrada.");
                }

                if (!sesion.Caja.Activa)
                {
                    return BadRequest(
                        "La caja se encuentra inactiva.");
                }

                var sucursalId =
                    sesion.Caja.SucursalId;

                // Si el usuario está asignado a una sucursal específica,
                // solamente puede vender desde esa sucursal.
                if (_tenantContext.SucursalId.HasValue &&
                    _tenantContext.SucursalId.Value != sucursalId)
                {
                    return Forbid();
                }

                // ====================================================
                // VALIDAR CLIENTE
                // ====================================================

                Cliente? cliente = null;

                if (dto.ClienteId.HasValue)
                {
                    cliente = await _context.Clientes
                        .FirstOrDefaultAsync(x =>
                            x.Id == dto.ClienteId.Value &&
                            x.TenantId == _tenantContext.TenantId &&
                            x.Activo);

                    if (cliente == null)
                    {
                        return BadRequest(
                            "El cliente no existe o está inactivo.");
                    }
                }

                // ====================================================
                // AGRUPAR PRODUCTOS REPETIDOS
                // ====================================================

                var productosSolicitados =
                    dto.Productos
                        .GroupBy(x => x.ProductoId)
                        .Select(x => new
                        {
                            ProductoId = x.Key,
                            Cantidad = x.Sum(y => y.Cantidad)
                        })
                        .ToList();

                var productoIds =
                    productosSolicitados
                        .Select(x => x.ProductoId)
                        .ToList();

                // ====================================================
                // OBTENER PRODUCTOS DEL TENANT
                // ====================================================

                var productos = await _context.Productos
                    .Where(x =>
                        x.TenantId == _tenantContext.TenantId &&
                        productoIds.Contains(x.Id) &&
                        x.Activo)
                    .ToListAsync();

                if (productos.Count != productoIds.Count)
                {
                    return BadRequest(
                        "Uno o más productos no existen o están inactivos.");
                }

                // ====================================================
                // OBTENER INVENTARIO
                // ====================================================

                var inventarios = await _context.Inventarios
                    .Where(x =>
                        x.TenantId == _tenantContext.TenantId &&
                        x.SucursalId == sucursalId &&
                        productoIds.Contains(x.ProductoId))
                    .ToListAsync();

                // ====================================================
                // CALCULAR VENTA
                // ====================================================

                decimal subtotalVenta = 0;
                decimal impuestoVenta = 0;
                decimal totalVenta = 0;

                var detallesCalculados =
                    new List<VentaDetalle>();

                foreach (var solicitado in productosSolicitados)
                {
                    var producto = productos
                        .First(x =>
                            x.Id == solicitado.ProductoId);

                    var inventario = inventarios
                        .FirstOrDefault(x =>
                            x.ProductoId == solicitado.ProductoId);

                    if (inventario == null)
                    {
                        return BadRequest(
                            $"El producto '{producto.Nombre}' no tiene inventario en esta sucursal.");
                    }

                    if (inventario.Cantidad <
                        solicitado.Cantidad)
                    {
                        return BadRequest(
                            $"Inventario insuficiente para '{producto.Nombre}'. " +
                            $"Disponible: {inventario.Cantidad}.");
                    }

                    // Actualmente Producto.Precio se considera
                    // precio SIN impuesto.

                    var subtotal =
                        Math.Round(
                            producto.Precio *
                            solicitado.Cantidad,
                            2);

                    var impuesto =
                        Math.Round(
                            subtotal *
                            (producto.ImpuestoPorcentaje / 100m),
                            2);

                    var total =
                        subtotal + impuesto;

                    subtotalVenta += subtotal;
                    impuestoVenta += impuesto;
                    totalVenta += total;

                    detallesCalculados.Add(
                        new VentaDetalle
                        {
                            ProductoId = producto.Id,

                            ProductoNombre =
                                producto.Nombre,

                            Cantidad =
                                solicitado.Cantidad,

                            PrecioUnitario =
                                producto.Precio,

                            CostoUnitario =
                                producto.Costo,

                            ImpuestoPorcentaje =
                                producto.ImpuestoPorcentaje,

                            Subtotal =
                                subtotal,

                            Impuesto =
                                impuesto,

                            Total =
                                total
                        });
                }

                subtotalVenta =
                    Math.Round(subtotalVenta, 2);

                impuestoVenta =
                    Math.Round(impuestoVenta, 2);

                totalVenta =
                    Math.Round(totalVenta, 2);

                // ====================================================
                // VALIDAR MÉTODOS DE PAGO
                // ====================================================

                var metodoPagoIds =
                    dto.Pagos
                        .Select(x => x.MetodoPagoId)
                        .Distinct()
                        .ToList();

                var metodosPago =
                    await _context.MetodosPago
                        .Where(x =>
                            x.TenantId ==
                                _tenantContext.TenantId &&
                            metodoPagoIds.Contains(x.Id) &&
                            x.Activo)
                        .ToListAsync();

                if (metodosPago.Count !=
                    metodoPagoIds.Count)
                {
                    return BadRequest(
                        "Uno o más métodos de pago no son válidos.");
                }

                var totalPagado =
                    Math.Round(
                        dto.Pagos.Sum(x => x.Monto),
                        2);

                if (totalPagado != totalVenta)
                {
                    return BadRequest(new
                    {
                        mensaje =
                            "El total de los pagos debe ser igual al total de la venta.",

                        totalVenta,

                        totalPagado,

                        diferencia =
                            totalPagado - totalVenta
                    });
                }

                // ====================================================
                // CREAR VENTA
                // ====================================================

                var numeroVenta =
                    $"V-{DateTime.UtcNow:yyyyMMddHHmmss}-" +
                    $"{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

                var venta = new Venta
                {
                    TenantId =
                        _tenantContext.TenantId,

                    SucursalId =
                        sucursalId,

                    CajaSesionId =
                        sesion.Id,

                    UsuarioId =
                        _tenantContext.UsuarioId,

                    ClienteId =
                        cliente?.Id,

                    NumeroVenta =
                        numeroVenta,

                    Fecha =
                        DateTime.UtcNow,

                    Subtotal =
                        subtotalVenta,

                    Descuento =
                        0,

                    Impuesto =
                        impuestoVenta,

                    Total =
                        totalVenta,

                    Estado =
                        "COMPLETADA"
                };

                _context.Ventas.Add(venta);

                // Necesitamos Venta.Id antes de crear
                // detalles, pagos y referencias.
                await _context.SaveChangesAsync();

                // ====================================================
                // CREAR DETALLES
                // ====================================================

                foreach (var detalle in detallesCalculados)
                {
                    detalle.VentaId =
                        venta.Id;

                    _context.VentaDetalles.Add(detalle);
                }

                // ====================================================
                // DESCONTAR INVENTARIO
                // ====================================================

                foreach (var solicitado in productosSolicitados)
                {
                    var producto =
                        productos.First(x =>
                            x.Id == solicitado.ProductoId);

                    var inventario =
                        inventarios.First(x =>
                            x.ProductoId ==
                                solicitado.ProductoId);

                    var cantidadAnterior =
                        inventario.Cantidad;

                    var cantidadNueva =
                        cantidadAnterior -
                        solicitado.Cantidad;

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
                                sucursalId,

                            ProductoId =
                                producto.Id,

                            UsuarioId =
                                _tenantContext.UsuarioId,

                            Tipo =
                                "VENTA",

                            Cantidad =
                                solicitado.Cantidad,

                            CantidadAnterior =
                                cantidadAnterior,

                            CantidadNueva =
                                cantidadNueva,

                            Referencia =
                                venta.NumeroVenta,

                            Observacion =
                                $"Venta #{venta.NumeroVenta}",

                            Fecha =
                                DateTime.UtcNow
                        };

                    _context.MovimientosInventario
                        .Add(movimiento);
                }

                // ====================================================
                // REGISTRAR PAGOS
                // ====================================================

                foreach (var pagoDto in dto.Pagos)
                {
                    var metodo =
                        metodosPago.First(x =>
                            x.Id ==
                            pagoDto.MetodoPagoId);

                    var pago =
                        new PagoVenta
                        {
                            VentaId =
                                venta.Id,

                            MetodoPagoId =
                                metodo.Id,

                            Monto =
                                pagoDto.Monto,

                            Referencia =
                                pagoDto.Referencia?.Trim()
                        };

                    _context.PagosVenta.Add(pago);

                    // Solamente los métodos que afectan
                    // efectivo físico modifican la caja.
                    if (metodo.AfectaCaja)
                    {
                        var movimientoCaja =
                            new MovimientoCaja
                            {
                                TenantId =
                                    _tenantContext.TenantId,

                                CajaSesionId =
                                    sesion.Id,

                                UsuarioId =
                                    _tenantContext.UsuarioId,

                                Tipo =
                                    "VENTA_EFECTIVO",

                                Monto =
                                    pagoDto.Monto,

                                Referencia =
                                    venta.NumeroVenta,

                                Observacion =
                                    $"Venta #{venta.NumeroVenta}",

                                Fecha =
                                    DateTime.UtcNow
                            };

                        _context.MovimientosCaja
                            .Add(movimientoCaja);
                    }
                }

                // ====================================================
                // GUARDAR TODO
                // ====================================================

                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return Ok(new
                {
                    mensaje =
                        "Venta registrada correctamente.",

                    ventaId =
                        venta.Id,

                    venta.NumeroVenta,

                    venta.Fecha,

                    cliente = cliente == null
                        ? null
                        : new
                        {
                            cliente.Id,
                            cliente.Nombre,
                            cliente.Identificacion,
                            cliente.Telefono
                        },

                    subtotal =
                        subtotalVenta,

                    impuesto =
                        impuestoVenta,

                    descuento =
                        0,

                    total =
                        totalVenta,

                    pagos =
                        dto.Pagos.Select(x =>
                        {
                            var metodo =
                                metodosPago.First(m =>
                                    m.Id ==
                                    x.MetodoPagoId);

                            return new
                            {
                                metodo =
                                    metodo.Nombre,

                                x.Monto,

                                x.Referencia
                            };
                        })
                });
            }
            catch
            {
                await transaction.RollbackAsync();

                throw;
            }
        }

        // ============================================================
        // OBTENER VENTA
        // ============================================================

        [HttpGet("{id:long}")]
        public async Task<IActionResult> ObtenerPorId(long id)
        {
            var venta = await _context.Ventas
                .Where(x =>
                    x.Id == id &&
                    x.TenantId ==
                        _tenantContext.TenantId)
                .Select(x => new
                {
                    x.Id,
                    x.NumeroVenta,
                    x.Fecha,
                    x.Estado,

                    x.Subtotal,
                    x.Descuento,
                    x.Impuesto,
                    x.Total,

                    sucursal =
                        x.Sucursal.Nombre,

                    caja =
                        x.CajaSesion.Caja.Nombre,

                    usuario =
                        x.Usuario.Nombre,

                    cliente = x.Cliente == null
                        ? null
                        : new
                        {
                            x.Cliente.Id,
                            x.Cliente.Nombre,
                            x.Cliente.Identificacion,
                            x.Cliente.Telefono,
                            x.Cliente.Email,
                            x.Cliente.Direccion
                        },

                    productos =
                        x.Detalles.Select(d =>
                            new
                            {
                                d.ProductoId,
                                d.ProductoNombre,
                                d.Cantidad,
                                d.PrecioUnitario,
                                d.ImpuestoPorcentaje,
                                d.Subtotal,
                                d.Impuesto,
                                d.Total
                            }),

                    pagos =
                        x.Pagos.Select(p =>
                            new
                            {
                                metodo =
                                    p.MetodoPago.Nombre,

                                p.Monto,
                                p.Referencia
                            })
                })
                .FirstOrDefaultAsync();

            if (venta == null)
            {
                return NotFound(
                    "Venta no encontrada.");
            }

            return Ok(venta);
        }

        // ============================================================
        // LISTAR VENTAS
        // ============================================================

        [HttpGet]
        public async Task<IActionResult> ObtenerVentas(
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta)
        {
            var query =
                _context.Ventas
                    .Where(x =>
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (_tenantContext.SucursalId.HasValue)
            {
                query = query.Where(x =>
                    x.SucursalId ==
                    _tenantContext.SucursalId.Value);
            }

            if (desde.HasValue)
            {
                query = query.Where(x =>
                    x.Fecha >= desde.Value);
            }

            if (hasta.HasValue)
            {
                query = query.Where(x =>
                    x.Fecha <= hasta.Value);
            }

            var ventas = await query
                .OrderByDescending(x => x.Fecha)
                .Select(x => new
                {
                    x.Id,
                    x.NumeroVenta,
                    x.Fecha,

                    cliente = x.Cliente != null
                        ? x.Cliente.Nombre
                        : null,

                    sucursal =
                        x.Sucursal.Nombre,

                    caja =
                        x.CajaSesion.Caja.Nombre,

                    usuario =
                        x.Usuario.Nombre,

                    x.Total,
                    x.Estado
                })
                .ToListAsync();

            return Ok(ventas);
        }
    }
}