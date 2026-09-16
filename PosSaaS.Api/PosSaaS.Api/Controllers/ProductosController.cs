using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PosSaaS.Api.Data;
using PosSaaS.Api.DTOs;
using PosSaaS.Api.Models;
using PosSaaS.Api.Services;
using System.Globalization;

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

        // =========================================================
        // GET: api/Productos
        // Admin / Supervisor / Cajero
        // =========================================================

        [HttpGet]
        [Authorize(Roles = "Admin,Supervisor,Cajero")]
        public async Task<IActionResult> ObtenerTodos()
        {
            var productos = await _context.Productos
                .Where(x =>
                    x.TenantId == _tenantContext.TenantId)
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

        // =========================================================
        // GET: api/Productos/5
        // Admin / Supervisor / Cajero
        // =========================================================

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,Supervisor,Cajero")]
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
                return NotFound(
                    "Producto no encontrado.");

            return Ok(producto);
        }

        // =========================================================
        // GET: api/Productos/codigo/123456
        // Admin / Supervisor / Cajero
        // =========================================================

        [HttpGet("codigo/{codigo}")]
        [Authorize(Roles = "Admin,Supervisor,Cajero")]
        public async Task<IActionResult> ObtenerPorCodigo(
            string codigo)
        {
            if (string.IsNullOrWhiteSpace(codigo))
                return BadRequest(
                    "El código es obligatorio.");

            codigo = codigo.Trim();

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
                return NotFound(
                    "Producto no encontrado.");

            return Ok(producto);
        }

        // =========================================================
        // POST: api/Productos
        // SOLO ADMIN
        // =========================================================

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Crear(
            ProductoDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nombre))
                return BadRequest(
                    "El nombre es obligatorio.");

            if (dto.Costo < 0)
                return BadRequest(
                    "El costo no puede ser negativo.");

            if (dto.Precio < 0)
                return BadRequest(
                    "El precio no puede ser negativo.");

            if (dto.ImpuestoPorcentaje < 0)
                return BadRequest(
                    "El impuesto no puede ser negativo.");

            var categoriaExiste =
                await _context.Categorias.AnyAsync(x =>
                    x.Id == dto.CategoriaId &&
                    x.TenantId == _tenantContext.TenantId &&
                    x.Activa);

            if (!categoriaExiste)
                return BadRequest(
                    "La categoría no existe o se encuentra inactiva.");

            var sku =
                string.IsNullOrWhiteSpace(dto.SKU)
                    ? null
                    : dto.SKU.Trim();

            var codigo =
                string.IsNullOrWhiteSpace(dto.CodigoBarras)
                    ? null
                    : dto.CodigoBarras.Trim();

            if (sku != null)
            {
                var skuExiste =
                    await _context.Productos.AnyAsync(x =>
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.SKU == sku);

                if (skuExiste)
                    return BadRequest(
                        "El SKU ya está registrado.");
            }

            if (codigo != null)
            {
                var codigoExiste =
                    await _context.Productos.AnyAsync(x =>
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.CodigoBarras == codigo);

                if (codigoExiste)
                    return BadRequest(
                        "El código de barras ya está registrado.");
            }

            var producto = new Producto
            {
                TenantId =
                    _tenantContext.TenantId,

                CategoriaId =
                    dto.CategoriaId,

                Nombre =
                    dto.Nombre.Trim(),

                Descripcion =
                    string.IsNullOrWhiteSpace(
                        dto.Descripcion)
                        ? null
                        : dto.Descripcion.Trim(),

                SKU =
                    sku,

                CodigoBarras =
                    codigo,

                Costo =
                    dto.Costo,

                Precio =
                    dto.Precio,

                ImpuestoPorcentaje =
                    dto.ImpuestoPorcentaje,

                Activo =
                    true
            };

            _context.Productos.Add(producto);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Producto creado correctamente.",

                producto.Id,
                producto.Nombre
            });
        }

        // =========================================================
        // POST: api/Productos/importar-excel/vista-previa
        // SOLO ADMIN
        //
        // Lee el Excel y valida los datos, pero NO modifica la BD.
        // =========================================================

        [HttpPost("importar-excel/vista-previa")]
        [Authorize(Roles = "Admin")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> VistaPreviaImportacion(
            IFormFile archivo)
        {
            var validacion = ValidarArchivoExcel(archivo);

            if (validacion != null)
                return BadRequest(validacion);

            try
            {
                var lectura = LeerProductosExcel(archivo);

                if (lectura.Errores.Count > 0)
                {
                    return BadRequest(new
                    {
                        mensaje =
                            "El archivo contiene errores y no puede importarse.",
                        totalErrores = lectura.Errores.Count,
                        errores = lectura.Errores
                    });
                }

                if (lectura.Productos.Count == 0)
                {
                    return BadRequest(new
                    {
                        mensaje =
                            "No se encontraron productos válidos en el archivo."
                    });
                }

                var tenantId = _tenantContext.TenantId;

                var skus =
                    lectura.Productos
                        .Select(x => x.SKU)
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();

                var skusExistentes =
                    await _context.Productos
                        .Where(x =>
                            x.TenantId == tenantId &&
                            x.SKU != null &&
                            skus.Contains(x.SKU))
                        .Select(x => x.SKU!)
                        .ToListAsync();

                var skuExistentesSet =
                    skusExistentes.ToHashSet(
                        StringComparer.OrdinalIgnoreCase);

                var categoriasExistentes =
                    await _context.Categorias
                        .Where(x => x.TenantId == tenantId)
                        .Select(x => x.Nombre)
                        .ToListAsync();

                var categoriasExistentesSet =
                    categoriasExistentes.ToHashSet(
                        StringComparer.OrdinalIgnoreCase);

                var categoriasArchivo =
                    lectura.Productos
                        .Select(x => x.Categoria)
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .OrderBy(x => x)
                        .ToList();

                var categoriasNuevas =
                    categoriasArchivo
                        .Where(x =>
                            !categoriasExistentesSet.Contains(x))
                        .ToList();

                var nuevos =
                    lectura.Productos.Count(x =>
                        !skuExistentesSet.Contains(x.SKU));

                var actualizar =
                    lectura.Productos.Count - nuevos;

                return Ok(new
                {
                    archivo = archivo.FileName,
                    totalProductos = lectura.Productos.Count,
                    productosNuevos = nuevos,
                    productosActualizar = actualizar,
                    totalCategorias = categoriasArchivo.Count,
                    categoriasNuevas = categoriasNuevas.Count,
                    nombresCategoriasNuevas = categoriasNuevas,
                    errores = 0,
                    listoParaImportar = true
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    mensaje =
                        "No fue posible leer el archivo Excel.",
                    detalle = ex.Message
                });
            }
        }

        // =========================================================
        // POST: api/Productos/importar-excel
        // SOLO ADMIN
        //
        // Crea categorías faltantes.
        // Crea productos nuevos.
        // Actualiza productos existentes por Tenant + SKU.
        // Todo se ejecuta dentro de una transacción.
        // =========================================================

        [HttpPost("importar-excel")]
        [Authorize(Roles = "Admin")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ImportarExcel(
            IFormFile archivo)
        {
            var validacion = ValidarArchivoExcel(archivo);

            if (validacion != null)
                return BadRequest(validacion);

            LecturaExcelResultado lectura;

            try
            {
                lectura = LeerProductosExcel(archivo);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    mensaje =
                        "No fue posible leer el archivo Excel.",
                    detalle = ex.Message
                });
            }

            if (lectura.Errores.Count > 0)
            {
                return BadRequest(new
                {
                    mensaje =
                        "El archivo contiene errores y no se realizó ningún cambio.",
                    totalErrores = lectura.Errores.Count,
                    errores = lectura.Errores
                });
            }

            if (lectura.Productos.Count == 0)
            {
                return BadRequest(new
                {
                    mensaje =
                        "No se encontraron productos válidos en el archivo."
                });
            }

            var tenantId = _tenantContext.TenantId;

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var categorias =
                    await _context.Categorias
                        .Where(x => x.TenantId == tenantId)
                        .ToListAsync();

                var categoriasPorNombre =
                    categorias.ToDictionary(
                        x => x.Nombre.Trim(),
                        x => x,
                        StringComparer.OrdinalIgnoreCase);

                var categoriasCreadas = 0;

                foreach (var nombreCategoria in
                    lectura.Productos
                        .Select(x => x.Categoria)
                        .Distinct(StringComparer.OrdinalIgnoreCase))
                {
                    if (categoriasPorNombre.TryGetValue(
                        nombreCategoria,
                        out var categoriaExistente))
                    {
                        // Si la categoría existía inactiva, la reactivamos
                        // porque el archivo contiene productos para ella.
                        if (!categoriaExistente.Activa)
                            categoriaExistente.Activa = true;

                        continue;
                    }

                    var categoria = new Categoria
                    {
                        TenantId = tenantId,
                        Nombre = nombreCategoria,
                        Activa = true,
                        FechaCreacion = DateTime.UtcNow
                    };

                    _context.Categorias.Add(categoria);

                    categoriasPorNombre[nombreCategoria] =
                        categoria;

                    categoriasCreadas++;
                }

                // Guardamos primero para obtener los Id de categorías nuevas.
                await _context.SaveChangesAsync();

                var skus =
                    lectura.Productos
                        .Select(x => x.SKU)
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();

                var productosExistentes =
                    await _context.Productos
                        .Where(x =>
                            x.TenantId == tenantId &&
                            x.SKU != null &&
                            skus.Contains(x.SKU))
                        .ToListAsync();

                var productosPorSku =
                    productosExistentes.ToDictionary(
                        x => x.SKU!,
                        x => x,
                        StringComparer.OrdinalIgnoreCase);

                var productosCreados = 0;
                var productosActualizados = 0;

                foreach (var fila in lectura.Productos)
                {
                    var categoria =
                        categoriasPorNombre[fila.Categoria];

                    if (productosPorSku.TryGetValue(
                        fila.SKU,
                        out var producto))
                    {
                        producto.CategoriaId = categoria.Id;
                        producto.Nombre = fila.Nombre;
                        producto.Costo = fila.Costo;
                        producto.Precio = fila.Precio;
                        producto.ImpuestoPorcentaje =
                            fila.ImpuestoPorcentaje;

                        // No modificamos CodigoBarras, Descripcion
                        // ni Activo en una actualización masiva.
                        productosActualizados++;
                    }
                    else
                    {
                        producto = new Producto
                        {
                            TenantId = tenantId,
                            CategoriaId = categoria.Id,
                            Nombre = fila.Nombre,
                            SKU = fila.SKU,
                            CodigoBarras = null,
                            Descripcion = null,
                            Costo = fila.Costo,
                            Precio = fila.Precio,
                            ImpuestoPorcentaje =
                                fila.ImpuestoPorcentaje,
                            Activo = true,
                            FechaCreacion = DateTime.UtcNow
                        };

                        _context.Productos.Add(producto);

                        productosPorSku[fila.SKU] =
                            producto;

                        productosCreados++;
                    }
                }

                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return Ok(new
                {
                    mensaje =
                        "Importación completada correctamente.",
                    totalProcesados = lectura.Productos.Count,
                    productosCreados,
                    productosActualizados,
                    categoriasCreadas
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        mensaje =
                            "Ocurrió un error durante la importación. No se guardó ningún cambio.",
                        detalle = ex.Message
                    });
            }
        }

        // =========================================================
        // PUT: api/Productos/5
        // SOLO ADMIN
        // =========================================================

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Actualizar(
            int id,
            ProductoDto dto)
        {
            var producto =
                await _context.Productos
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (producto == null)
                return NotFound(
                    "Producto no encontrado.");

            if (string.IsNullOrWhiteSpace(dto.Nombre))
                return BadRequest(
                    "El nombre es obligatorio.");

            if (dto.Costo < 0)
                return BadRequest(
                    "El costo no puede ser negativo.");

            if (dto.Precio < 0)
                return BadRequest(
                    "El precio no puede ser negativo.");

            if (dto.ImpuestoPorcentaje < 0)
                return BadRequest(
                    "El impuesto no puede ser negativo.");

            var categoriaExiste =
                await _context.Categorias.AnyAsync(x =>
                    x.Id == dto.CategoriaId &&
                    x.TenantId ==
                        _tenantContext.TenantId &&
                    x.Activa);

            if (!categoriaExiste)
                return BadRequest(
                    "La categoría no existe o se encuentra inactiva.");

            var sku =
                string.IsNullOrWhiteSpace(dto.SKU)
                    ? null
                    : dto.SKU.Trim();

            var codigo =
                string.IsNullOrWhiteSpace(
                    dto.CodigoBarras)
                    ? null
                    : dto.CodigoBarras.Trim();

            if (sku != null)
            {
                var existe =
                    await _context.Productos.AnyAsync(x =>
                        x.Id != id &&
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.SKU == sku);

                if (existe)
                    return BadRequest(
                        "El SKU ya está registrado.");
            }

            if (codigo != null)
            {
                var existe =
                    await _context.Productos.AnyAsync(x =>
                        x.Id != id &&
                        x.TenantId ==
                            _tenantContext.TenantId &&
                        x.CodigoBarras == codigo);

                if (existe)
                    return BadRequest(
                        "El código de barras ya está registrado.");
            }

            producto.CategoriaId =
                dto.CategoriaId;

            producto.Nombre =
                dto.Nombre.Trim();

            producto.Descripcion =
                string.IsNullOrWhiteSpace(
                    dto.Descripcion)
                    ? null
                    : dto.Descripcion.Trim();

            producto.SKU =
                sku;

            producto.CodigoBarras =
                codigo;

            producto.Costo =
                dto.Costo;

            producto.Precio =
                dto.Precio;

            producto.ImpuestoPorcentaje =
                dto.ImpuestoPorcentaje;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje =
                    "Producto actualizado correctamente."
            });
        }

        // =========================================================
        // PATCH: api/Productos/5/estado?activo=false
        // SOLO ADMIN
        // =========================================================

        [HttpPatch("{id:int}/estado")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CambiarEstado(
            int id,
            [FromQuery] bool activo)
        {
            var producto =
                await _context.Productos
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.TenantId ==
                            _tenantContext.TenantId);

            if (producto == null)
                return NotFound(
                    "Producto no encontrado.");

            producto.Activo =
                activo;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = activo
                    ? "Producto activado."
                    : "Producto desactivado."
            });
        }

        // =========================================================
        // HELPERS IMPORTACIÓN EXCEL
        // =========================================================

        private static object? ValidarArchivoExcel(
            IFormFile archivo)
        {
            if (archivo == null || archivo.Length == 0)
            {
                return new
                {
                    mensaje =
                        "Debes seleccionar un archivo Excel."
                };
            }

            var extension =
                Path.GetExtension(archivo.FileName);

            if (!extension.Equals(
                    ".xlsx",
                    StringComparison.OrdinalIgnoreCase))
            {
                return new
                {
                    mensaje =
                        "El archivo debe tener formato .xlsx."
                };
            }

            const long maximoBytes =
                10 * 1024 * 1024;

            if (archivo.Length > maximoBytes)
            {
                return new
                {
                    mensaje =
                        "El archivo no puede superar 10 MB."
                };
            }

            return null;
        }

        private static LecturaExcelResultado LeerProductosExcel(
            IFormFile archivo)
        {
            using var stream =
                archivo.OpenReadStream();

            using var workbook =
                new XLWorkbook(stream);

            var worksheet =
                workbook.Worksheets.FirstOrDefault();

            if (worksheet == null)
            {
                throw new InvalidOperationException(
                    "El archivo no contiene hojas.");
            }

            var resultado =
                new LecturaExcelResultado();

            // Buscamos la fila de encabezados en vez de depender
            // únicamente de que siempre sea la fila 4.
            var filaEncabezados = BuscarFilaEncabezados(
                worksheet);

            if (filaEncabezados == 0)
            {
                resultado.Errores.Add(
                    "No se encontraron los encabezados requeridos: SKU / Código, Producto, IVA, Costo, Precio y Categoría.");

                return resultado;
            }

            var columnas =
                ObtenerColumnas(
                    worksheet,
                    filaEncabezados);

            var ultimaFila =
                worksheet.LastRowUsed()?.RowNumber()
                ?? filaEncabezados;

            var skusArchivo =
                new HashSet<string>(
                    StringComparer.OrdinalIgnoreCase);

            for (
                var numeroFila = filaEncabezados + 1;
                numeroFila <= ultimaFila;
                numeroFila++)
            {
                var fila =
                    worksheet.Row(numeroFila);

                var sku =
                    LeerTexto(
                        fila.Cell(columnas.Sku));

                var nombre =
                    LeerTexto(
                        fila.Cell(columnas.Producto));

                var categoria =
                    LeerTexto(
                        fila.Cell(columnas.Categoria));

                // Ignorar filas completamente vacías.
                if (string.IsNullOrWhiteSpace(sku) &&
                    string.IsNullOrWhiteSpace(nombre) &&
                    string.IsNullOrWhiteSpace(categoria))
                {
                    continue;
                }

                // Ignorar la fila de totales del reporte.
                if (EsFilaTotales(sku) ||
                    EsFilaTotales(nombre))
                {
                    continue;
                }

                var erroresFila =
                    new List<string>();

                if (string.IsNullOrWhiteSpace(sku))
                    erroresFila.Add(
                        "SKU / Código vacío.");

                if (string.IsNullOrWhiteSpace(nombre))
                    erroresFila.Add(
                        "Producto vacío.");

                if (string.IsNullOrWhiteSpace(categoria))
                    erroresFila.Add(
                        "Categoría vacía.");

                if (!string.IsNullOrWhiteSpace(sku) &&
                    !skusArchivo.Add(sku))
                {
                    erroresFila.Add(
                        $"SKU duplicado en el archivo: {sku}.");
                }

                var ivaValido =
                    TryLeerDecimal(
                        fila.Cell(columnas.Iva),
                        out var iva);

                var costoValido =
                    TryLeerDecimal(
                        fila.Cell(columnas.Costo),
                        out var costo);

                var precioValido =
                    TryLeerDecimal(
                        fila.Cell(columnas.Precio),
                        out var precio);

                if (!ivaValido)
                    erroresFila.Add(
                        "IVA inválido.");

                if (!costoValido)
                    erroresFila.Add(
                        "Costo inválido.");

                if (!precioValido)
                    erroresFila.Add(
                        "Precio inválido.");

                if (ivaValido && iva < 0)
                    erroresFila.Add(
                        "IVA no puede ser negativo.");

                if (costoValido && costo < 0)
                    erroresFila.Add(
                        "Costo no puede ser negativo.");

                if (precioValido && precio < 0)
                    erroresFila.Add(
                        "Precio no puede ser negativo.");

                if (erroresFila.Count > 0)
                {
                    resultado.Errores.Add(
                        $"Fila {numeroFila}: {string.Join(" ", erroresFila)}");

                    continue;
                }

                resultado.Productos.Add(
                    new ProductoExcelFila
                    {
                        Fila = numeroFila,
                        SKU = sku,
                        Nombre = nombre,
                        ImpuestoPorcentaje = iva,
                        Costo = costo,
                        Precio = precio,
                        Categoria = categoria
                    });
            }

            return resultado;
        }

        private static int BuscarFilaEncabezados(
            IXLWorksheet worksheet)
        {
            var ultimaFilaBusqueda =
                Math.Min(
                    worksheet.LastRowUsed()?.RowNumber() ?? 0,
                    25);

            for (
                var numeroFila = 1;
                numeroFila <= ultimaFilaBusqueda;
                numeroFila++)
            {
                var valores =
                    worksheet.Row(numeroFila)
                        .CellsUsed()
                        .Select(x =>
                            NormalizarEncabezado(
                                x.GetFormattedString()))
                        .Where(x =>
                            !string.IsNullOrWhiteSpace(x))
                        .ToList();

                var tieneSku =
                    valores.Any(EsEncabezadoSku);

                var tieneProducto =
                    valores.Any(x =>
                        x == "producto");

                var tieneIva =
                    valores.Any(x =>
                        x == "iva");

                var tieneCosto =
                    valores.Any(x =>
                        x == "costo");

                var tienePrecio =
                    valores.Any(x =>
                        x == "precio");

                var tieneCategoria =
                    valores.Any(x =>
                        x == "categoria");

                if (tieneSku &&
                    tieneProducto &&
                    tieneIva &&
                    tieneCosto &&
                    tienePrecio &&
                    tieneCategoria)
                {
                    return numeroFila;
                }
            }

            return 0;
        }

        private static ColumnasExcel ObtenerColumnas(
            IXLWorksheet worksheet,
            int filaEncabezados)
        {
            var resultado =
                new ColumnasExcel();

            foreach (var celda in
                worksheet.Row(filaEncabezados).CellsUsed())
            {
                var encabezado =
                    NormalizarEncabezado(
                        celda.GetFormattedString());

                if (EsEncabezadoSku(encabezado))
                    resultado.Sku =
                        celda.Address.ColumnNumber;

                else if (encabezado == "producto")
                    resultado.Producto =
                        celda.Address.ColumnNumber;

                else if (encabezado == "iva")
                    resultado.Iva =
                        celda.Address.ColumnNumber;

                else if (encabezado == "costo")
                    resultado.Costo =
                        celda.Address.ColumnNumber;

                else if (encabezado == "precio")
                    resultado.Precio =
                        celda.Address.ColumnNumber;

                else if (encabezado == "categoria")
                    resultado.Categoria =
                        celda.Address.ColumnNumber;
            }

            if (resultado.Sku == 0 ||
                resultado.Producto == 0 ||
                resultado.Iva == 0 ||
                resultado.Costo == 0 ||
                resultado.Precio == 0 ||
                resultado.Categoria == 0)
            {
                throw new InvalidOperationException(
                    "No fue posible identificar todas las columnas requeridas.");
            }

            return resultado;
        }

        private static string LeerTexto(
            IXLCell celda)
        {
            return celda
                .GetFormattedString()
                .Trim();
        }

        private static bool TryLeerDecimal(
            IXLCell celda,
            out decimal valor)
        {
            if (celda.TryGetValue<decimal>(
                out valor))
            {
                return true;
            }

            var texto =
                celda.GetFormattedString().Trim();

            if (string.IsNullOrWhiteSpace(texto))
            {
                valor = 0;
                return false;
            }

            texto = texto
                .Replace("₡", "")
                .Replace("$", "")
                .Trim();

            if (decimal.TryParse(
                texto,
                NumberStyles.Number |
                NumberStyles.AllowCurrencySymbol,
                CultureInfo.GetCultureInfo("es-CR"),
                out valor))
            {
                return true;
            }

            if (decimal.TryParse(
                texto,
                NumberStyles.Number |
                NumberStyles.AllowCurrencySymbol,
                CultureInfo.InvariantCulture,
                out valor))
            {
                return true;
            }

            valor = 0;
            return false;
        }

        private static bool EsFilaTotales(
            string valor)
        {
            return valor
                .Trim()
                .StartsWith(
                    "TOTALES GENERALES",
                    StringComparison.OrdinalIgnoreCase);
        }

        private static bool EsEncabezadoSku(
            string encabezado)
        {
            return encabezado == "sku / codigo" ||
                   encabezado == "sku/codigo" ||
                   encabezado == "sku" ||
                   encabezado == "codigo";
        }

        private static string NormalizarEncabezado(
            string valor)
        {
            var texto =
                valor.Trim().ToLowerInvariant();

            texto = texto
                .Replace("á", "a")
                .Replace("é", "e")
                .Replace("í", "i")
                .Replace("ó", "o")
                .Replace("ú", "u");

            while (texto.Contains("  "))
                texto = texto.Replace("  ", " ");

            return texto;
        }

        private sealed class LecturaExcelResultado
        {
            public List<ProductoExcelFila> Productos { get; set; }
                = new();

            public List<string> Errores { get; set; }
                = new();
        }

        private sealed class ProductoExcelFila
        {
            public int Fila { get; set; }

            public string SKU { get; set; }
                = string.Empty;

            public string Nombre { get; set; }
                = string.Empty;

            public decimal ImpuestoPorcentaje { get; set; }

            public decimal Costo { get; set; }

            public decimal Precio { get; set; }

            public string Categoria { get; set; }
                = string.Empty;
        }

        private sealed class ColumnasExcel
        {
            public int Sku { get; set; }

            public int Producto { get; set; }

            public int Iva { get; set; }

            public int Costo { get; set; }

            public int Precio { get; set; }

            public int Categoria { get; set; }
        }
    }
}
