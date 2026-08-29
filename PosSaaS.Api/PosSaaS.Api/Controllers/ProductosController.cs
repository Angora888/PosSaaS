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
    public class ProductosController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITenantContext _tenantContext;

        public ProductosController(
            AppDbContext context,
            ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerTodos()
        {
            var productos = await _context.Productos
                .Where(x => x.TenantId == _tenantContext.TenantId)
                .OrderBy(x => x.Nombre)
                .Select(x => new
                {
                    x.Id,
                    x.Nombre,
                    x.Descripcion,
                    x.SKU,
                    x.CodigoBarras,
                    x.Costo,
                    x.Precio,
                    x.ImpuestoPorcentaje,
                    x.Activo,

                    categoria = new
                    {
                        x.Categoria.Id,
                        x.Categoria.Nombre
                    }
                })
                .ToListAsync();

            return Ok(productos);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            var producto = await _context.Productos
                .Where(x =>
                    x.Id == id &&
                    x.TenantId == _tenantContext.TenantId)
                .Select(x => new
                {
                    x.Id,
                    x.Nombre,
                    x.Descripcion,
                    x.SKU,
                    x.CodigoBarras,
                    x.Costo,
                    x.Precio,
                    x.ImpuestoPorcentaje,
                    x.Activo,
                    x.CategoriaId,

                    Categoria = x.Categoria.Nombre
                })
                .FirstOrDefaultAsync();

            if (producto == null)
                return NotFound("Producto no encontrado.");

            return Ok(producto);
        }

        [HttpGet("codigo/{codigo}")]
        public async Task<IActionResult> ObtenerPorCodigo(
            string codigo)
        {
            var producto = await _context.Productos
                .Where(x =>
                    x.TenantId == _tenantContext.TenantId &&
                    x.CodigoBarras == codigo &&
                    x.Activo)
                .Select(x => new
                {
                    x.Id,
                    x.Nombre,
                    x.CodigoBarras,
                    x.Precio,
                    x.ImpuestoPorcentaje
                })
                .FirstOrDefaultAsync();

            if (producto == null)
                return NotFound("Producto no encontrado.");

            return Ok(producto);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> Crear(ProductoDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nombre))
                return BadRequest("El nombre es obligatorio.");

            if (dto.Costo < 0)
                return BadRequest("El costo no puede ser negativo.");

            if (dto.Precio < 0)
                return BadRequest("El precio no puede ser negativo.");

            if (dto.ImpuestoPorcentaje < 0)
                return BadRequest("El impuesto no puede ser negativo.");

            var categoriaExiste =
                await _context.Categorias.AnyAsync(x =>
                    x.Id == dto.CategoriaId &&
                    x.TenantId == _tenantContext.TenantId &&
                    x.Activa);

            if (!categoriaExiste)
                return BadRequest("La categoría no existe.");

            var sku = string.IsNullOrWhiteSpace(dto.SKU)
                ? null
                : dto.SKU.Trim();

            var codigo = string.IsNullOrWhiteSpace(dto.CodigoBarras)
                ? null
                : dto.CodigoBarras.Trim();

            if (sku != null)
            {
                var skuExiste = await _context.Productos.AnyAsync(x =>
                    x.TenantId == _tenantContext.TenantId &&
                    x.SKU == sku);

                if (skuExiste)
                    return BadRequest("El SKU ya está registrado.");
            }

            if (codigo != null)
            {
                var codigoExiste = await _context.Productos.AnyAsync(x =>
                    x.TenantId == _tenantContext.TenantId &&
                    x.CodigoBarras == codigo);

                if (codigoExiste)
                    return BadRequest(
                        "El código de barras ya está registrado.");
            }

            var producto = new Producto
            {
                TenantId = _tenantContext.TenantId,
                CategoriaId = dto.CategoriaId,
                Nombre = dto.Nombre.Trim(),
                Descripcion = dto.Descripcion?.Trim(),
                SKU = sku,
                CodigoBarras = codigo,
                Costo = dto.Costo,
                Precio = dto.Precio,
                ImpuestoPorcentaje = dto.ImpuestoPorcentaje,
                Activo = true
            };

            _context.Productos.Add(producto);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Producto creado correctamente.",
                producto.Id,
                producto.Nombre
            });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> Actualizar(
            int id,
            ProductoDto dto)
        {
            var producto = await _context.Productos
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.TenantId == _tenantContext.TenantId);

            if (producto == null)
                return NotFound("Producto no encontrado.");

            if (string.IsNullOrWhiteSpace(dto.Nombre))
                return BadRequest("El nombre es obligatorio.");

            var categoriaExiste =
                await _context.Categorias.AnyAsync(x =>
                    x.Id == dto.CategoriaId &&
                    x.TenantId == _tenantContext.TenantId);

            if (!categoriaExiste)
                return BadRequest("La categoría no existe.");

            var sku = string.IsNullOrWhiteSpace(dto.SKU)
                ? null
                : dto.SKU.Trim();

            var codigo = string.IsNullOrWhiteSpace(dto.CodigoBarras)
                ? null
                : dto.CodigoBarras.Trim();

            if (sku != null)
            {
                var existe = await _context.Productos.AnyAsync(x =>
                    x.Id != id &&
                    x.TenantId == _tenantContext.TenantId &&
                    x.SKU == sku);

                if (existe)
                    return BadRequest("El SKU ya está registrado.");
            }

            if (codigo != null)
            {
                var existe = await _context.Productos.AnyAsync(x =>
                    x.Id != id &&
                    x.TenantId == _tenantContext.TenantId &&
                    x.CodigoBarras == codigo);

                if (existe)
                    return BadRequest(
                        "El código de barras ya está registrado.");
            }

            producto.CategoriaId = dto.CategoriaId;
            producto.Nombre = dto.Nombre.Trim();
            producto.Descripcion = dto.Descripcion?.Trim();
            producto.SKU = sku;
            producto.CodigoBarras = codigo;
            producto.Costo = dto.Costo;
            producto.Precio = dto.Precio;
            producto.ImpuestoPorcentaje = dto.ImpuestoPorcentaje;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Producto actualizado correctamente."
            });
        }

        [HttpPatch("{id:int}/estado")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> CambiarEstado(
            int id,
            [FromQuery] bool activo)
        {
            var producto = await _context.Productos
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.TenantId == _tenantContext.TenantId);

            if (producto == null)
                return NotFound("Producto no encontrado.");

            producto.Activo = activo;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = activo
                    ? "Producto activado."
                    : "Producto desactivado."
            });
        }
    }
}