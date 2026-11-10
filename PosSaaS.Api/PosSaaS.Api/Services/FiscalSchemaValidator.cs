using System.Xml;
using System.Xml.Schema;

namespace PosSaaS.Api.Services;

/// <summary>
/// Offline, fail-closed schema validator. Official Hacienda v4.4 XSD files must
/// be supplied by a trusted administrator as local, versioned deployment assets.
/// Validation is not equivalent to approval, signature or successful submission.
/// </summary>
public sealed class FiscalSchemaValidator
{
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _environment;
    public FiscalSchemaValidator(IConfiguration config, IWebHostEnvironment environment)
    {
        _config = config;
        _environment = environment;
    }

    public bool IsConfigured(string type)
    {
        var filename = SchemaFilename(type);
        return filename != null && File.Exists(SchemaPath(filename));
    }

    public FiscalValidationResult Validate(string type, string xml)
    {
        var filename = SchemaFilename(type);
        if (filename == null)
            return new(false, new[] { "Solo se admiten FE (01) y TE (04) en esta fase." });
        if (string.IsNullOrWhiteSpace(xml) || xml.Length > 2_000_000)
            return new(false, new[] { "XML vacío o superior a 2 MB." });
        var schemaPath = SchemaPath(filename);
        if (!File.Exists(schemaPath))
            throw new FileNotFoundException("El esquema oficial 4.4 no está instalado en el servidor.");
        // A valid XML must use the *exact* official root and schema namespace.
        // Validating an unknown root against a set of schemas can otherwise
        // produce only warnings, which must never be mistaken for success.
        var expectedRoot = type == "01" ? "FacturaElectronica" : "TiqueteElectronico";
        var errors = new List<string>();
        var settings = new XmlReaderSettings
        {
            DtdProcessing = DtdProcessing.Prohibit,
            XmlResolver = null,
            MaxCharactersInDocument = 2_000_000,
            ValidationType = ValidationType.Schema,
            ValidationFlags = XmlSchemaValidationFlags.ReportValidationWarnings
        };
        using (var schemaReader = XmlReader.Create(schemaPath, new XmlReaderSettings
        {
            DtdProcessing = DtdProcessing.Prohibit,
            XmlResolver = null
        }))
            settings.Schemas.Add(null, schemaReader);
        settings.Schemas.XmlResolver = null;
        settings.Schemas.Compile();
        var schemaNamespaces = settings.Schemas.Schemas()
            .Cast<XmlSchema>().Select(x => x.TargetNamespace)
            .Where(x => !string.IsNullOrWhiteSpace(x)).ToHashSet();
        settings.ValidationEventHandler += (_, e) =>
        {
            if (errors.Count < 30)
                errors.Add(e.Message);
        };
        try
        {
            using (var rootReader = XmlReader.Create(new StringReader(xml),
                new XmlReaderSettings
                {
                    DtdProcessing = DtdProcessing.Prohibit,
                    XmlResolver = null,
                    MaxCharactersInDocument = 2_000_000
                }))
            {
                rootReader.MoveToContent();
                if (rootReader.LocalName != expectedRoot ||
                    !schemaNamespaces.Contains(rootReader.NamespaceURI))
                    return new(false, new[] { "Elemento raíz o namespace incompatible con el XSD oficial." });
            }

            using var stringReader = new StringReader(xml);
            using var reader = XmlReader.Create(stringReader, settings);
            while (reader.Read()) { }
        }
        catch (XmlException e)
        {
            errors.Add("XML mal formado: " + e.Message);
        }
        catch (XmlSchemaException e)
        {
            errors.Add("Esquema inválido: " + e.Message);
        }
        return new(errors.Count == 0, errors);
    }

    private string SchemaPath(string file) =>
        Path.Combine(_environment.ContentRootPath,
            _config["Fiscal:SchemaDirectory"] ?? "FiscalSchemas/v4.4", file);

    private static string? SchemaFilename(string type) => type switch
    {
        "01" => "FacturaElectronica_V4.4.xsd",
        "04" => "TiqueteElectronico_V4.4.xsd",
        _ => null
    };
}

public sealed record FiscalValidationResult(bool Valido, IReadOnlyList<string> Errores);
