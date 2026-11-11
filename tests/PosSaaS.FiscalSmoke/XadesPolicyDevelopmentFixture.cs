using System.Globalization;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Xml.Linq;

namespace PosSaaS.FiscalSmoke;

/// <summary>
/// Non-production XAdES-EPES property construction exercise.
/// Policy URL/digest must be supplied from independently verified bytes;
/// this class does NOT produce an XAdES-EPES signature.
/// Only instantiated from fiscal smoke tests, never in the API.
/// </summary>
internal static class XadesPolicyDevelopmentFixture
{
    private static readonly XNamespace Xades = "http://uri.etsi.org/01903/v1.3.2#";
    private static readonly XNamespace Ds = "http://www.w3.org/2000/09/xmldsig#";
    internal const string Sha256 = "http://www.w3.org/2001/04/xmlenc#sha256";

    internal static string HashPolicy(ReadOnlySpan<byte> bytes)
    {
        if (bytes.IsEmpty) throw new ArgumentException("Policy file must not be empty.");
        return Convert.ToBase64String(SHA256.HashData(bytes));
    }

    internal static XElement BuildSignedProperties(
        X509Certificate2 certificate, string signatureId, string policyUri,
        string verifiedPolicyHash, DateTimeOffset signingTime)
    {
        ArgumentNullException.ThrowIfNull(certificate);
        if (!certificate.HasPrivateKey && certificate.RawData.Length == 0)
            throw new ArgumentException("Certificate is empty.");
        if (string.IsNullOrWhiteSpace(signatureId) ||
            !signatureId.All(c => char.IsLetterOrDigit(c) || c is '-' or '_'))
            throw new ArgumentException("Signature ID must be a safe XML identifier.");
        if (!Uri.TryCreate(policyUri, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
            throw new ArgumentException("Signing policy must use an absolute HTTPS URL.");
        byte[] digest;
        try { digest = Convert.FromBase64String(verifiedPolicyHash); }
        catch (FormatException ex) { throw new ArgumentException("Invalid signing policy digest.", ex); }
        if (digest.Length != 32)
            throw new ArgumentException("Policy digest must be SHA-256 (32 bytes).");
        if (signingTime.Offset != TimeSpan.Zero)
            throw new ArgumentException("Signing time must be supplied in UTC.");

        // ETSI SigningCertificate references the exact DER bytes of the signing certificate.
        var certificateDigest = Convert.ToBase64String(SHA256.HashData(certificate.RawData));
        return new XElement(Xades + "SignedProperties",
            new XAttribute("Id", "SignedProperties-" + signatureId),
            new XElement(Xades + "SignedSignatureProperties",
                new XElement(Xades + "SigningTime",
                    signingTime.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)),
                new XElement(Xades + "SigningCertificate",
                    new XElement(Xades + "Cert",
                        new XElement(Xades + "CertDigest",
                            new XElement(Ds + "DigestMethod", new XAttribute("Algorithm", Sha256)),
                            new XElement(Ds + "DigestValue", certificateDigest)),
                        new XElement(Xades + "IssuerSerial",
                            new XElement(Ds + "X509IssuerName", certificate.Issuer),
                            new XElement(Ds + "X509SerialNumber",
                                new System.Numerics.BigInteger(
                                    certificate.GetSerialNumber(), isUnsigned: true, isBigEndian: false)
                                    .ToString(CultureInfo.InvariantCulture))))),
                new XElement(Xades + "SignaturePolicyIdentifier",
                    new XElement(Xades + "SignaturePolicyId",
                        new XElement(Xades + "SigPolicyId",
                            new XElement(Xades + "Identifier", uri.AbsoluteUri)),
                        new XElement(Xades + "SigPolicyHash",
                            new XElement(Ds + "DigestMethod", new XAttribute("Algorithm", Sha256)),
                            new XElement(Ds + "DigestValue", verifiedPolicyHash))))));
    }

    internal static bool VerifyPolicyBinding(XElement signedProperties, string expectedPolicyUrl,
        ReadOnlySpan<byte> expectedPolicyBytes, X509Certificate2 expectedCertificate)
    {
        if (expectedPolicyBytes.IsEmpty) return false;
        var url = signedProperties.Descendants(Xades + "SigPolicyId")
            .Elements(Xades + "Identifier").SingleOrDefault()?.Value;
        var hash = signedProperties.Descendants(Xades + "SigPolicyHash")
            .Elements(Ds + "DigestValue").SingleOrDefault()?.Value;
        var certHash = signedProperties.Descendants(Xades + "CertDigest")
            .Elements(Ds + "DigestValue").SingleOrDefault()?.Value;
        return string.Equals(url, expectedPolicyUrl, StringComparison.Ordinal) &&
               string.Equals(hash, HashPolicy(expectedPolicyBytes), StringComparison.Ordinal) &&
               string.Equals(certHash,
                   Convert.ToBase64String(SHA256.HashData(expectedCertificate.RawData)),
                   StringComparison.Ordinal);
    }
}
