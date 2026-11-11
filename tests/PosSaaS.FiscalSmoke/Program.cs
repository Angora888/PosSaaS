using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
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

// Physical colones: rounding affects cash settlement only, not fiscal totals.
Check(CashRounding.NearestTen(1412.50m) == 1410m, "₡1,412.50 rounds to ₡1,410 cash");
Check(CashRounding.NearestTen(1415m) == 1420m, "₡1,415 rounds to ₡1,420 cash");
Check(CashRounding.NearestTen(1405m) == 1410m, "Midpoint rounds away from zero");
Check(CashRounding.NearestTen(1400m) == 1400m, "Whole ten is unchanged");
Check(CashRounding.NearestTen(0m) == 0m, "Zero is unchanged");
MustThrow<ArgumentOutOfRangeException>(() => CashRounding.NearestTen(-1m), "Negative totals rejected");

var consecutivo = FiscalNumbering.Consecutivo(1, 1, "01", 1);
Check(consecutivo == "00100001010000000001", "Consecutivo 20 digits and expected prefix");
Check(consecutivo.Length == 20 && consecutivo.All(char.IsAsciiDigit), "Consecutivo numeric");
MustThrow<ArgumentOutOfRangeException>(() => FiscalNumbering.Consecutivo(0, 1, "01", 1), "Invalid branch rejected");
MustThrow<ArgumentOutOfRangeException>(() => FiscalNumbering.Consecutivo(1, 0, "01", 1), "Invalid terminal rejected");
MustThrow<ArgumentException>(() => FiscalNumbering.Consecutivo(1, 1, "99", 1), "Unknown document type rejected");

// Configured codes, not internal database IDs; preserve leading zeros.
Check(FiscalNumbering.ConsecutivoDesdeCodigos("001", "00001", "01", 1) ==
    "00100001010000000001", "Fiscal branch + terminal formatting");
Check(FiscalNumbering.ConsecutivoDesdeCodigos("002", "00123", "04", 42) ==
    "00200123040000000042", "Second branch and tiquete format");
MustThrow<ArgumentException>(() =>
    FiscalNumbering.ConsecutivoDesdeCodigos("000", "00001", "01", 1),
    "Fiscal branch zero rejected");
MustThrow<ArgumentException>(() =>
    FiscalNumbering.ConsecutivoDesdeCodigos("001", "00000", "01", 1),
    "Fiscal terminal zero rejected");
MustThrow<ArgumentException>(() =>
    FiscalNumbering.ConsecutivoDesdeCodigos("1", "00001", "01", 1),
    "Branch missing padding rejected");
MustThrow<ArgumentException>(() =>
    FiscalNumbering.ConsecutivoDesdeCodigos("001", "00001", "99", 1),
    "Unsupported document type rejected");
MustThrow<ArgumentOutOfRangeException>(() =>
    FiscalNumbering.ConsecutivoDesdeCodigos("001", "00001", "01", 0),
    "Zero sequence rejected");

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
var findings = FiscalSalePreflight.Check(sale, null, products);
Check(findings.Any(x => x.Contains("configuración fiscal", StringComparison.OrdinalIgnoreCase)),
    "Missing issuer config flagged");
Check(findings.Any(x => x.Contains("ubicación", StringComparison.OrdinalIgnoreCase)) == false,
    "No false missing-location warning when issuer null");
var issuer = new FiscalConfiguration {
    RazonSocial = "Prueba S.A.", Identificacion = "3101123456",
    ActividadEconomica = "620100", Correo = "prueba@example.com",
    Provincia = "2", Canton = "01", Distrito = "01"
};
var validPreflight = FiscalSalePreflight.Check(sale, issuer, products);
Check(validPreflight.Count == 0, "Balanced sale and populated metadata pass basic preflight");
sale.Impuesto = 12m;
Check(FiscalSalePreflight.Check(sale, issuer, products).Any(x => x.Contains("impuesto total")),
    "Mismatched tax is detected");
sale.Impuesto = 13m;
sale.Detalles.First().Total = 114m;
Check(FiscalSalePreflight.Check(sale, issuer, products).Any(x => x.Contains("subtotal + impuesto")),
    "Mismatched line total is detected");
sale.Detalles.First().Total = 113m;

// Experimental v4.4 shape check (NOT an XSD acceptance test).
var previewIssuer = new FiscalConfiguration {
    RazonSocial = "Negocio de Prueba", TipoIdentificacion = "02",
    Identificacion = "3101123456", ActividadEconomica = "620100",
    Provincia = "2", Canton = "01", Distrito = "01",
    OtrasSenas = "Dirección de prueba", Correo = "prueba@example.com"
};
var previewCustomer = new Cliente {
    Nombre = "Cliente de prueba", Identificacion = "2100042005", TipoIdentificacion = "02"
};
var previewDate = new DateTimeOffset(2026, 11, 10, 13, 0, 0, TimeSpan.FromHours(-6));
var previewXml = FiscalXml44PreviewService.Generate(sale, previewIssuer, previewCustomer,
    products, "3101123456", consecutivo,
    FiscalNumbering.Clave(previewDate, "3101123456", consecutivo, codigoSeguridad: "00000000"),
    previewDate);
var previewDoc = XDocument.Parse(previewXml);
Check(previewDoc.Root?.Name.NamespaceName ==
    "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica",
    "v4.4 preview uses official FE namespace");
Check(previewDoc.Root?.Element(previewDoc.Root.Name.Namespace + "ProveedorSistemas")?.Value == "3101123456",
    "v4.4 preview includes explicit provider ID");
Check(previewDoc.Root?.Descendants(previewDoc.Root.Name.Namespace + "CodigoCABYS").Count() == 1,
    "v4.4 preview includes CABYS per line");
MustThrow<ArgumentException>(() => FiscalXml44PreviewService.Generate(sale, previewIssuer,
    previewCustomer, products, "", consecutivo, clave, previewDate),
    "Unconfigured software provider must be rejected");

// Validate the unsigned sample against a SHA-256 pinned, official XSD.
// This verifies XML structure only; it does NOT authorize real fiscal issuance.
var xsdFile = Path.Combine("PosSaaS.Api", "PosSaaS.Api", "FiscalSchemas", "v4.4", "FacturaElectronica_V4.4.xsd");
if (File.Exists(xsdFile))
{
    var schemas = new XmlSchemaSet { XmlResolver = null };
    var signatureXsd = Path.Combine("PosSaaS.Api", "PosSaaS.Api", "FiscalSchemas",
        "v4.4", "xmldsig-core-schema.xsd");
    Check(File.Exists(signatureXsd), "W3C XMLDSIG signature schema installed with Hacienda XSD");
    using (var signReader = XmlReader.Create(signatureXsd, new XmlReaderSettings {
        DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null
    }))
        schemas.Add("http://www.w3.org/2000/09/xmldsig#", signReader);
    using (var schemaReader = XmlReader.Create(xsdFile, new XmlReaderSettings {
        DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null
    }))
        schemas.Add(null, schemaReader);
    schemas.Compile();
    var schemaIssues = new List<string>();
    var xmlSettings = new XmlReaderSettings {
        DtdProcessing = DtdProcessing.Prohibit,
        XmlResolver = null,
        ValidationType = ValidationType.Schema,
        ValidationFlags = XmlSchemaValidationFlags.ReportValidationWarnings
    };
    xmlSettings.Schemas.Add(schemas);
    xmlSettings.ValidationEventHandler += (_, e) => schemaIssues.Add(e.Message);
    using (var xmlReader = XmlReader.Create(new StringReader(previewXml), xmlSettings))
        while (xmlReader.Read()) { }
    Check(schemaIssues.Count == 0,
        "Experimental 4.4 FE XML passes the official XSD: " + string.Join(" | ", schemaIssues.Take(10)));

}
else
{
    Console.WriteLine("SKIPPED: Official XSD not accessible during this CI run; schema compliance NOT verified.");
}

sale.Detalles.Clear();
MustThrow<InvalidOperationException>(() => FiscalXmlDraftService.Generate(sale, null, null, products),
    "Empty sale rejected");

Console.WriteLine($"PASS: {checks} fiscal smoke checks (no real invoice issued).");
