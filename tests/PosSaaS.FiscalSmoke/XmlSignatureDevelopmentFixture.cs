using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Security.Cryptography.Xml;
using System.Xml;

namespace PosSaaS.FiscalSmoke;

/// <summary>
/// LOCAL DEVELOPMENT TEST ONLY. This creates an ephemeral, self-signed certificate,
/// verifies basic enveloped XMLDSIG signatures, and detects tampering.
/// This is NOT XAdES-EPES and MUST NOT sign legal fiscal documents.
/// There is no API endpoint, no persistence, no merchant certificate or private-key upload.
/// </summary>
internal static class XmlSignatureDevelopmentFixture
{
    public static (string Xml, X509Certificate2 Certificate) SignEphemeral(string unsignedXml)
    {
        using var key = RSA.Create(2048);
        var req = new CertificateRequest(
            "CN=POS SaaS XMLDSIG TEST ONLY",
            key,
            HashAlgorithmName.SHA256,
            RSASignaturePadding.Pkcs1);
        using var certificate = req.CreateSelfSigned(
            DateTimeOffset.UtcNow.AddMinutes(-5),
            DateTimeOffset.UtcNow.AddHours(1));

        var doc = LoadSafe(unsignedXml);
        var signer = new SignedXml(doc) { SigningKey = key };
        signer.SignedInfo.CanonicalizationMethod = SignedXml.XmlDsigExcC14NTransformUrl;
        signer.SignedInfo.SignatureMethod = SignedXml.XmlDsigRSASHA256Url;

        var reference = new Reference { Uri = "", DigestMethod = SignedXml.XmlDsigSHA256Url };
        reference.AddTransform(new XmlDsigEnvelopedSignatureTransform());
        reference.AddTransform(new XmlDsigExcC14NTransform());
        signer.AddReference(reference);

        var keyInfo = new KeyInfo();
        keyInfo.AddClause(new KeyInfoX509Data(certificate));
        signer.KeyInfo = keyInfo;
        signer.ComputeSignature();

        // The official FE 4.4 XSD requires ds:Signature as the last root child.
        doc.DocumentElement!.AppendChild(doc.ImportNode(signer.GetXml(), true));
        var signed = doc.OuterXml;

        // Expose public certificate only, detached from any temporary private key.
        var publicCertificate = new X509Certificate2(certificate.Export(X509ContentType.Cert));
        return (signed, publicCertificate);
    }

    public static bool VerifyWithPinnedCertificate(string xml, X509Certificate2 publicCertificate)
    {
        var doc = LoadSafe(xml);
        var elements = doc.GetElementsByTagName("Signature", SignedXml.XmlDsigNamespaceUrl);
        if (elements.Count != 1 || elements[0] is not XmlElement signature)
            return false;

        var verifier = new SignedXml(doc);
        verifier.LoadXml(signature);
        // Do not trust a public key included inside the document. The verifier
        // explicitly pins the certificate supplied by the caller.
        using var publicKey = publicCertificate.GetRSAPublicKey();
        return publicKey is not null && verifier.CheckSignature(publicKey);
    }

    private static XmlDocument LoadSafe(string xml)
    {
        var settings = new XmlReaderSettings
        {
            DtdProcessing = DtdProcessing.Prohibit,
            XmlResolver = null,
            MaxCharactersInDocument = 2_000_000
        };
        var doc = new XmlDocument { PreserveWhitespace = true, XmlResolver = null };
        using var reader = XmlReader.Create(new StringReader(xml), settings);
        doc.Load(reader);
        return doc;
    }
}
