using System.Security.Cryptography;

namespace PosSaaS.Api.Services;

/// <summary>
/// Offline, fail-closed verifier for a future independently approved
/// Hacienda 4.4 XAdES policy. This service does NOT authorize fiscal signing.
/// Never downloads policy documents during requests.
/// </summary>
public sealed class FiscalSigningPolicyInspector
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public FiscalSigningPolicyInspector(IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _configuration = configuration;
        _environment = environment;
    }

    public FiscalPolicyInspection Inspect()
    {
        var url = _configuration["Fiscal:SigningPolicy:Url"];
        var expectedSha = _configuration["Fiscal:SigningPolicy:Sha256Hex"];
        var filename = _configuration["Fiscal:SigningPolicy:Filename"];
        // Operator approval is distinct from computing a hash; neither
        // a PDF URL nor a matching checksum proves Hacienda endorsement.
        var reviewed = _configuration.GetValue<bool>("Fiscal:SigningPolicy:ApprovedByOperator");

        if (!reviewed)
            return new(false, "La política oficial de firma 4.4 aún no está revisada y aprobada.");
        if (string.IsNullOrWhiteSpace(url) ||
            !Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps ||
            uri.UserInfo.Length > 0 ||
            uri.Host is not ("hacienda.go.cr" or "www.hacienda.go.cr"))
            return new(false, "Se necesita una URL HTTPS oficial de Hacienda, verificada por el administrador.");

        if (string.IsNullOrWhiteSpace(expectedSha) ||
            expectedSha.Length != 64 ||
            !expectedSha.All(Uri.IsHexDigit))
            return new(false, "Falta un SHA-256 esperado de 64 caracteres hexadecimales.");
        if (string.IsNullOrWhiteSpace(filename) ||
            filename != Path.GetFileName(filename) ||
            !filename.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return new(false, "El nombre del PDF local de la política no está configurado correctamente.");

        var dir = Path.Combine(_environment.ContentRootPath, "FiscalSchemas", "policies");
        var path = Path.Combine(dir, filename);
        try
        {
            var info = new FileInfo(path);
            if (!info.Exists || info.Length is < 16 or > 5_000_000)
                return new(false, "El PDF de política no existe o tiene un tamaño inválido.");
            using var file = File.OpenRead(path);
            Span<byte> header = stackalloc byte[5];
            if (file.Read(header) != header.Length || !header.SequenceEqual("%PDF-"u8))
                return new(false, "El archivo de política no tiene cabecera PDF.");
            file.Position = 0;
            var actualHash = SHA256.HashData(file);
            var pinnedHash = Convert.FromHexString(expectedSha);
            if (!CryptographicOperations.FixedTimeEquals(actualHash, pinnedHash))
                return new(false, "El PDF no coincide con la huella SHA-256 aprobada.");
            return new(true, "PDF local coincide con la referencia aprobada; firma y aceptación siguen deshabilitadas.");
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException)
        {
            return new(false, "No se pudo verificar el documento PDF de política.");
        }
    }
}

public sealed record FiscalPolicyInspection(bool ArchivoVerificado, string Detalle);
