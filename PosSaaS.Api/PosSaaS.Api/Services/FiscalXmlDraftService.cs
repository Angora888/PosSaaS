using System.Globalization;
using System.Xml.Linq;
using PosSaaS.Api.Models;

namespace PosSaaS.Api.Services;

/// <summary>
/// INTERNAL, UNSIGNED, NON-FISCAL DRAFT. Never transmit this XML to Hacienda.
/// Not an implementation of the Hacienda v4.4 XSD.
/// </summary>
public static class FiscalXmlDraftService
{
    private static readonly XNamespace Ns = "urn:possaas:internal:fiscal-draft:1";
    private static string Money(decimal value) => value.ToString("0.00", CultureInfo.InvariantCulture);
    private static string Quantity(decimal value) => value.ToString("0.###", CultureInfo.InvariantCulture);

    public static string Generate(Venta venta, FiscalConfiguration? emisor, Cliente? cliente,
        IReadOnlyDictionary<int, Producto> products)
    {
        ArgumentNullException.ThrowIfNull(venta);
        if (venta.Detalles.Count == 0)
            throw new InvalidOperationException("La venta no tiene líneas.");
        if (venta.Detalles.Any(x => x.Cantidad <= 0 || x.Total < 0))
            throw new InvalidOperationException("La venta contiene líneas inválidas.");

        var taxLines = venta.Detalles.Select((line, index) =>
        {
            products.TryGetValue(line.ProductoId, out var product);
            return new XElement(Ns + "Linea",
                new XAttribute("numero", index + 1),
                new XElement(Ns + "ProductoId", line.ProductoId),
                new XElement(Ns + "Nombre", line.ProductoNombre),
                new XElement(Ns + "Cabys", product?.CodigoCabys ?? ""),
                new XElement(Ns + "UnidadMedida", product?.UnidadMedida ?? ""),
                new XElement(Ns + "Cantidad", Quantity(line.Cantidad)),
                new XElement(Ns + "PrecioUnitario", Money(line.PrecioUnitario)),
                new XElement(Ns + "Subtotal", Money(line.Subtotal)),
                new XElement(Ns + "CodigoImpuesto", product?.CodigoImpuesto ?? ""),
                new XElement(Ns + "CodigoTarifaIva", product?.CodigoTarifaIva ?? ""),
                new XElement(Ns + "ImpuestoPorcentaje", Money(line.ImpuestoPorcentaje)),
                new XElement(Ns + "MontoImpuesto", Money(line.Impuesto)),
                new XElement(Ns + "TotalLinea", Money(line.Total)));
        }).ToList();

        var doc = new XDocument(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(Ns + "BorradorFiscal",
                new XAttribute("sistema", "POS SaaS"),
                new XAttribute("esComprobanteHacienda", "false"),
                new XAttribute("firmado", "false"),
                new XAttribute("transmitible", "false"),
                new XElement(Ns + "Advertencia",
                    "BORRADOR INTERNO: No corresponde al XSD 4.4, no es factura y no tiene validez tributaria."),
                new XElement(Ns + "Venta",
                    new XElement(Ns + "Id", venta.Id),
                    new XElement(Ns + "NumeroInterno", venta.NumeroVenta),
                    new XElement(Ns + "FechaUtc", venta.Fecha.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture)),
                    new XElement(Ns + "TenantId", venta.TenantId),
                    new XElement(Ns + "SucursalId", venta.SucursalId)),
                new XElement(Ns + "Emisor",
                    new XElement(Ns + "RazonSocial", emisor?.RazonSocial ?? ""),
                    new XElement(Ns + "TipoIdentificacion", emisor?.TipoIdentificacion ?? ""),
                    new XElement(Ns + "Identificacion", emisor?.Identificacion ?? ""),
                    new XElement(Ns + "ActividadEconomica", emisor?.ActividadEconomica ?? ""),
                    new XElement(Ns + "Correo", emisor?.Correo ?? "")),
                new XElement(Ns + "Receptor",
                    new XElement(Ns + "Nombre", cliente?.Nombre ?? ""),
                    new XElement(Ns + "TipoIdentificacion", cliente?.TipoIdentificacion ?? ""),
                    new XElement(Ns + "Identificacion", cliente?.Identificacion ?? ""),
                    new XElement(Ns + "Correo", cliente?.Email ?? "")),
                new XElement(Ns + "DetalleServicio", taxLines),
                new XElement(Ns + "Totales",
                    new XElement(Ns + "Subtotal", Money(venta.Subtotal)),
                    new XElement(Ns + "Descuento", Money(venta.Descuento)),
                    new XElement(Ns + "Impuesto", Money(venta.Impuesto)),
                    new XElement(Ns + "Total", Money(venta.Total)))));
        return doc.Declaration + Environment.NewLine + doc.ToString(SaveOptions.None);
    }
}
