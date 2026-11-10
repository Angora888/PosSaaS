using PosSaaS.Api.Models;

namespace PosSaaS.Api.Services;

/// <summary>
/// Read-only fiscal readiness checks. These checks are necessary but NOT
/// sufficient for issuing a legal Costa Rican electronic receipt.
/// </summary>
public static class FiscalSalePreflight
{
    public static IReadOnlyList<string> Check(
        Venta sale, FiscalConfiguration? issuer, IReadOnlyDictionary<int, Producto> products)
    {
        ArgumentNullException.ThrowIfNull(sale);
        ArgumentNullException.ThrowIfNull(products);
        var findings = new List<string>();

        if (sale.Estado != "COMPLETADA")
            findings.Add("La venta no está completada.");
        if (issuer == null)
            findings.Add("Falta configuración fiscal del emisor.");
        else
        {
            if (string.IsNullOrWhiteSpace(issuer.RazonSocial) ||
                string.IsNullOrWhiteSpace(issuer.Identificacion))
                findings.Add("Razón social o identificación del emisor incompleta.");
            if (string.IsNullOrWhiteSpace(issuer.ActividadEconomica))
                findings.Add("Falta actividad económica del emisor.");
            if (string.IsNullOrWhiteSpace(issuer.Correo))
                findings.Add("Falta correo tributario del emisor.");
            if (string.IsNullOrWhiteSpace(issuer.Provincia) ||
                string.IsNullOrWhiteSpace(issuer.Canton) ||
                string.IsNullOrWhiteSpace(issuer.Distrito))
                findings.Add("Faltan códigos de ubicación del emisor.");
        }

        if (sale.Detalles.Count == 0)
            findings.Add("La venta no tiene líneas.");

        decimal sumSubtotal = 0, sumTaxes = 0, sumTotal = 0;
        foreach (var line in sale.Detalles)
        {
            if (line.Cantidad <= 0 || line.PrecioUnitario < 0 ||
                line.ImpuestoPorcentaje < 0 || line.ImpuestoPorcentaje > 100 ||
                line.Subtotal < 0 || line.Impuesto < 0 || line.Total < 0)
                findings.Add($"Línea {line.Id}: cantidades o importes inválidos.");

            if (!products.TryGetValue(line.ProductoId, out var product))
            {
                findings.Add($"Producto {line.ProductoId}: no está disponible para diagnóstico.");
            }
            else
            {
                if (string.IsNullOrWhiteSpace(product.CodigoCabys) ||
                    product.CodigoCabys.Length != 13 ||
                    !product.CodigoCabys.All(c => c is >= '0' and <= '9'))
                    findings.Add($"Producto {product.Id}: CABYS debe contener 13 dígitos.");
                if (string.IsNullOrWhiteSpace(product.UnidadMedida))
                    findings.Add($"Producto {product.Id}: falta unidad de medida.");
                if (string.IsNullOrWhiteSpace(product.CodigoImpuesto) ||
                    string.IsNullOrWhiteSpace(product.CodigoTarifaIva))
                    findings.Add($"Producto {product.Id}: falta clasificación de impuestos.");
            }

            if (Math.Abs((line.Subtotal + line.Impuesto) - line.Total) > 0.01m)
                findings.Add($"Línea {line.Id}: subtotal + impuesto no coincide con total.");

            sumSubtotal += line.Subtotal;
            sumTaxes += line.Impuesto;
            sumTotal += line.Total;
        }

        if (Math.Abs(sale.Subtotal - sumSubtotal) > 0.01m)
            findings.Add("El subtotal de la venta no coincide con sus líneas.");
        if (Math.Abs(sale.Impuesto - sumTaxes) > 0.01m)
            findings.Add("El impuesto total no coincide con las líneas.");
        if (Math.Abs(sale.Total - sumTotal + sale.Descuento) > 0.01m)
            findings.Add("El total de la venta no concilia con las líneas y el descuento.");
        if (sale.Descuento < 0)
            findings.Add("Descuento negativo.");

        // Do NOT label a sale ready for issuance: signature, valid XSD,
        // tax catalog verification, receiver rules, and authorization are missing.
        return findings.Distinct().ToArray();
    }
}
