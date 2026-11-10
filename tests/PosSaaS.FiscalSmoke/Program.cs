using System.Xml.Linq;
using PosSaaS.Api.Models;
using PosSaaS.Api.Services;

var checks = 0;
void Check(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException("FAIL: " + message);
    checks++;
}
void MustThrow<T>(Action action, string message) where T : Exception
{
    try { action(); }
    catch (T) { checks++; return; }
    throw new InvalidOperationException("FAIL: " + message);
}

var consecutivo = FiscalNumbering.Consecutivo(1, 1, "01", 1);
Check(consecutivo == "00100001010000000001", "Consecutivo 20 digits and expected prefix");
Check(consecutivo.Length == 20 && consecutivo.All(char.IsAsciiDigit), "Consecutivo numeric");
MustThrow<ArgumentOutOfRangeException>(() => FiscalNumbering.Consecutivo(0, 1, "01", 1), "Invalid branch rejected");
MustThrow<ArgumentOutOfRangeException>(() => FiscalNumbering.Consecutivo(1, 0, "01", 1), "Invalid terminal rejected");
MustThrow<ArgumentException>(() => FiscalNumbering.Consecutivo(1, 1, "99", 1), "Unknown document type rejected");

var date = new DateTimeOffset(2026, 11, 10, 10, 30, 0, TimeSpan.FromHours(-6));
var clave = FiscalNumbering.Clave(date, "3-101-123456", consecutivo, codigoSeguridad: "12345678");
Check(clave.Length == 50 && clave.All(char.IsAsciiDigit), "50 numeric digits");
Check(clave == "50610112600310112345600100001010000000001112345678",
    "Correct key composition with padded issuer");
MustThrow<ArgumentException>(() => FiscalNumbering.Clave(date, "abc123", consecutivo), "Invalid issuer rejected");
MustThrow<ArgumentException>(() => FiscalNumbering.Clave(date.ToOffset(TimeSpan.Zero), "3101123456", consecutivo), "Incorrect timezone rejected");
MustThrow<ArgumentException>(() => FiscalNumbering.Clave(date, "3101123456", consecutivo, codigoSeguridad: "123"), "Invalid security code rejected");
MustThrow<ArgumentException>(() => FiscalNumbering.Clave(date, "3101123456", "no"), "Invalid consecutive rejected");

var sale = new Venta
{
    Id = 42, TenantId = 7, SucursalId = 2,
    NumeroVenta = "V-TEST-42", Fecha = DateTime.UtcNow,
    Subtotal = 100m, Impuesto = 13m, Total = 113m,
    Detalles = new List<VentaDetalle>
    {
        new() { ProductoId = 5, ProductoNombre = "Café & Té", Cantidad = 1,
            PrecioUnitario = 100m, Subtotal = 100m,
            ImpuestoPorcentaje = 13m, Impuesto = 13m, Total = 113m }
    }
};
var products = new Dictionary<int, Producto>
{
    [5] = new() { Id = 5, CodigoCabys = "1234567890123",
        UnidadMedida = "Unid", CodigoImpuesto = "01", CodigoTarifaIva = "08" }
};
var draft = FiscalXmlDraftService.Generate(sale, null, null, products);
var xml = XDocument.Parse(draft);
Check(xml.Root?.Name.LocalName == "BorradorFiscal", "Internal draft root");
Check(xml.Root?.Name.NamespaceName == "urn:possaas:internal:fiscal-draft:1",
    "Draft cannot be mistaken for Hacienda XML namespace");
Check(xml.Root?.Attribute("transmitible")?.Value == "false", "Non-transmittable explicit flag");
Check(draft.Contains("Café &amp; Té"), "XML escapes product name safely");
Check(draft.Contains("1234567890123"), "Product CABYS snapshot appears");
sale.Detalles.Clear();
MustThrow<InvalidOperationException>(() => FiscalXmlDraftService.Generate(sale, null, null, products),
    "Empty sale rejected");

Console.WriteLine($"PASS: {checks} fiscal smoke checks (no real invoice issued).");
