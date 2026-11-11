using System.Globalization;
using System.Xml.Linq;
using PosSaaS.Api.Models;

namespace PosSaaS.Api.Services;

/// <summary>
/// EXPERIMENTAL v4.4 factory: never issues or reserves a fiscal key.
/// The returned XML must be checked against an installed official XSD
/// before it can be exposed by a diagnostic endpoint.
/// Covers only simple cash sales with a single IVA 13% rate.
/// </summary>
public static class FiscalXml44PreviewService
{
    private static readonly XNamespace Ns =
        "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica";
    private static string Amount(decimal value) =>
        value.ToString("0.00000", CultureInfo.InvariantCulture);
    private static string Quantity(decimal value) =>
        value.ToString("0.###", CultureInfo.InvariantCulture);

    public static string Generate(
        Venta sale, FiscalConfiguration issuer, Cliente receiver,
        IReadOnlyDictionary<int, Producto> products, string providerId,
        string consecutive, string key, DateTimeOffset issueDate)
    {
        if (string.IsNullOrWhiteSpace(providerId) ||
            providerId.Length > 20 || !providerId.All(char.IsAsciiDigit))
            throw new ArgumentException("La identificación del proveedor del sistema no está configurada.");
        if (sale.Detalles.Count == 0 || sale.Descuento != 0)
            throw new NotSupportedException("Solo se admiten ventas simples sin descuentos en esta fase.");
        if (issueDate.Offset != TimeSpan.FromHours(-6) ||
            consecutive.Length != 20 || key.Length != 50)
            throw new ArgumentException("Fecha, clave o consecutivo de prueba inválido.");
        if (string.IsNullOrWhiteSpace(receiver.Identificacion) ||
            receiver.TipoIdentificacion is not ("01" or "02" or "03" or "04"))
            throw new NotSupportedException("La factura requiere receptor identificado en esta fase.");
        if (issuer.ActividadEconomica.Length != 6 ||
            !issuer.ActividadEconomica.All(char.IsAsciiDigit))
            throw new ArgumentException("La actividad del emisor debe contener seis dígitos.");

        var lineElements = new List<XElement>();
        decimal taxable = 0m;
        decimal tax = 0m;
        var orderedLines = sale.Detalles.OrderBy(x => x.Id).ToList();
        for (var i = 0; i < orderedLines.Count; i++)
        {
            var line = orderedLines[i];
            if (!products.TryGetValue(line.ProductoId, out var product) ||
                product.CodigoCabys is null || product.CodigoCabys.Length != 13 ||
                !product.CodigoCabys.All(char.IsAsciiDigit) ||
                string.IsNullOrWhiteSpace(product.UnidadMedida) ||
                product.CodigoImpuesto != "01" || product.CodigoTarifaIva != "08" ||
                line.ImpuestoPorcentaje != 13m)
                throw new NotSupportedException(
                    "Vista previa limitada a productos con CABYS e IVA 13% (código 01, tarifa 08).");
            if (line.Cantidad <= 0 || line.Subtotal < 0 ||
                Math.Abs(line.Impuesto - line.Subtotal * 0.13m) > 0.02m ||
                Math.Abs(line.Total - line.Subtotal - line.Impuesto) > 0.01m)
                throw new InvalidOperationException("La línea no concilia con el IVA del 13%.");

            taxable += line.Subtotal;
            tax += line.Impuesto;
            lineElements.Add(new XElement(Ns + "LineaDetalle",
                new XElement(Ns + "NumeroLinea", i + 1),
                new XElement(Ns + "CodigoCABYS", product.CodigoCabys),
                new XElement(Ns + "Cantidad", Quantity(line.Cantidad)),
                new XElement(Ns + "UnidadMedida", product.UnidadMedida),
                new XElement(Ns + "Detalle", line.ProductoNombre),
                new XElement(Ns + "PrecioUnitario", Amount(line.PrecioUnitario)),
                new XElement(Ns + "MontoTotal", Amount(line.Subtotal)),
                new XElement(Ns + "SubTotal", Amount(line.Subtotal)),
                new XElement(Ns + "BaseImponible", Amount(line.Subtotal)),
                new XElement(Ns + "Impuesto",
                    new XElement(Ns + "Codigo", "01"),
                    new XElement(Ns + "CodigoTarifaIVA", "08"),
                    new XElement(Ns + "Tarifa", Amount(13m)),
                    new XElement(Ns + "Monto", Amount(line.Impuesto))),
                new XElement(Ns + "ImpuestoNeto", Amount(line.Impuesto)),
                new XElement(Ns + "MontoTotalLinea", Amount(line.Total))));
        }
        if (Math.Abs(taxable - sale.Subtotal) > 0.01m ||
            Math.Abs(tax - sale.Impuesto) > 0.01m ||
            Math.Abs(taxable + tax - sale.Total) > 0.01m)
            throw new InvalidOperationException("La venta no concilia con el resumen tributario.");

        // This is an unsigned, unreserved, simulated XML; the caller must
        // fail closed if the official XSD is missing or rejects the XML.
        var document = new XDocument(new XDeclaration("1.0", "utf-8", null),
            new XElement(Ns + "FacturaElectronica",
                new XElement(Ns + "Clave", key),
                new XElement(Ns + "ProveedorSistemas", providerId),
                new XElement(Ns + "CodigoActividadEmisor", issuer.ActividadEconomica),
                new XElement(Ns + "NumeroConsecutivo", consecutive),
                new XElement(Ns + "FechaEmision", issueDate.ToString("yyyy-MM-ddTHH:mm:sszzz", CultureInfo.InvariantCulture)),
                new XElement(Ns + "Emisor",
                    new XElement(Ns + "Nombre", issuer.RazonSocial),
                    new XElement(Ns + "Identificacion",
                        new XElement(Ns + "Tipo", issuer.TipoIdentificacion),
                        new XElement(Ns + "Numero", issuer.Identificacion.Replace("-", ""))),
                    new XElement(Ns + "Ubicacion",
                        new XElement(Ns + "Provincia", issuer.Provincia),
                        new XElement(Ns + "Canton", issuer.Canton),
                        new XElement(Ns + "Distrito", issuer.Distrito),
                        new XElement(Ns + "OtrasSenas", issuer.OtrasSenas)),
                    new XElement(Ns + "CorreoElectronico", issuer.Correo)),
                new XElement(Ns + "Receptor",
                    new XElement(Ns + "Nombre", receiver.Nombre),
                    new XElement(Ns + "Identificacion",
                        new XElement(Ns + "Tipo", receiver.TipoIdentificacion),
                        new XElement(Ns + "Numero", receiver.Identificacion.Replace("-", ""))),
                    string.IsNullOrWhiteSpace(receiver.Email) ? null :
                        new XElement(Ns + "CorreoElectronico", receiver.Email)),
                new XElement(Ns + "CondicionVenta", "01"),
                new XElement(Ns + "DetalleServicio", lineElements),
                new XElement(Ns + "ResumenFactura",
                    new XElement(Ns + "CodigoTipoMoneda",
                        new XElement(Ns + "CodigoMoneda", "CRC"),
                        new XElement(Ns + "TipoCambio", Amount(1m))),
                    new XElement(Ns + "TotalMercanciasGravadas", Amount(taxable)),
                    new XElement(Ns + "TotalGravado", Amount(taxable)),
                    new XElement(Ns + "TotalVenta", Amount(taxable)),
                    new XElement(Ns + "TotalVentaNeta", Amount(taxable)),
                    new XElement(Ns + "TotalDesgloseImpuesto",
                        new XElement(Ns + "Codigo", "01"),
                        new XElement(Ns + "CodigoTarifaIVA", "08"),
                        new XElement(Ns + "TotalMontoImpuesto", Amount(tax))),
                    new XElement(Ns + "TotalImpuesto", Amount(tax)),
                    new XElement(Ns + "MedioPago",
                        new XElement(Ns + "TipoMedioPago", "01")),
                    new XElement(Ns + "TotalComprobante", Amount(sale.Total)))));
        return document.Declaration + Environment.NewLine + document.ToString();
    }
}
