using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Security.Cryptography.Xml;
using System.Xml;
using System.Xml.Linq;

namespace PosSaaS.FiscalSmoke;

/// <summary>
/// EXPERIMENTAL development-only XAdES-EPES shape and cryptographic integrity.
/// Uses an ephemeral self-signed cert and a NON-HACIENDA dummy policy.
/// Not exposed from API; must never be used to issue actual tax receipts.
/// </summary>
internal static class XadesSignedDevelopmentFixture
{
    private const string XadesNamespace = "http://uri.etsi.org/01903/v1.3.2#";
    private const string SignedPropertiesReferenceType = "http://uri.etsi.org/01903#SignedProperties";

    internal static (string Xml, X509Certificate2 PublicCertificate) Sign(
        string unsignedXml, ReadOnlySpan<byte> policy, string policyUri)
    {
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest("CN=POS SAAS XADES DEVELOPMENT TEST ONLY",
            rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        using var cert = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-5),
            DateTimeOffset.UtcNow.AddHours(1));

        var doc = Load(unsignedXml);
        var signatureId = "DevSignature1";
        var props = XadesPolicyDevelopmentFixture.BuildSignedProperties(cert, signatureId,
            policyUri, XadesPolicyDevelopmentFixture.HashPolicy(policy),
            DateTimeOffset.UtcNow);
        var xades = XNamespace.Get(XadesNamespace);
        var qualifyingProperties = new XElement(xades + "QualifyingProperties",
            new XAttribute("Target", "#" + signatureId), props);
        var objectXml = new XmlDocument { PreserveWhitespace = true, XmlResolver = null };
        objectXml.LoadXml(qualifyingProperties.ToString(SaveOptions.DisableFormatting));

        var signer = new SignedXmlWithObjectIds(doc) { SigningKey = rsa };
        signer.Signature.Id = signatureId;
        signer.SignedInfo.CanonicalizationMethod = SignedXml.XmlDsigExcC14NTransformUrl;
        signer.SignedInfo.SignatureMethod = SignedXml.XmlDsigRSASHA256Url;

        var fiscalRef = new Reference { Uri = "", DigestMethod = SignedXml.XmlDsigSHA256Url };
        fiscalRef.AddTransform(new XmlDsigEnvelopedSignatureTransform());
        fiscalRef.AddTransform(new XmlDsigExcC14NTransform());
        signer.AddReference(fiscalRef);

        // XAdES mandates a separate ds:Reference covering SignedProperties.
        var propertyRef = new Reference {
            Uri = "#SignedProperties-" + signatureId,
            Type = SignedPropertiesReferenceType,
            DigestMethod = SignedXml.XmlDsigSHA256Url
        };
        propertyRef.AddTransform(new XmlDsigExcC14NTransform());
        signer.AddReference(propertyRef);

        var keyInfo = new KeyInfo();
        keyInfo.AddClause(new KeyInfoX509Data(cert));
        signer.KeyInfo = keyInfo;

        var data = new DataObject { Id = "XadesObject-" + signatureId };
        data.Data = objectXml.ChildNodes;
        signer.AddObject(data);
        signer.ComputeSignature();

        doc.DocumentElement!.AppendChild(doc.ImportNode(signer.GetXml(), true));
        return (doc.OuterXml, new X509Certificate2(cert.Export(X509ContentType.Cert)));
    }

    internal static bool Verify(string signedXml, X509Certificate2 pinnedCertificate,
        string expectedPolicyUrl, ReadOnlySpan<byte> expectedPolicyBytes)
    {
        var doc = Load(signedXml);
        var signatures = doc.GetElementsByTagName("Signature", SignedXml.XmlDsigNamespaceUrl);
        if (signatures.Count != 1 || signatures[0] is not XmlElement signature)
            return false;
        var allProps = doc.GetElementsByTagName("SignedProperties", XadesNamespace);
        if (allProps.Count != 1 || allProps[0] is not XmlElement propElement)
            return false;
        var references = signature.GetElementsByTagName("Reference", SignedXml.XmlDsigNamespaceUrl);
        if (references.Count != 2) return false;
        var propertiesId = propElement.GetAttribute("Id");
        var propsRef = references.Cast<XmlNode>().OfType<XmlElement>()
            .SingleOrDefault(x => x.GetAttribute("Type") == SignedPropertiesReferenceType);
        if (propsRef?.GetAttribute("URI") != "#" + propertiesId) return false;
        if (!XadesPolicyDevelopmentFixture.VerifyPolicyBinding(
            XElement.Parse(propElement.OuterXml), expectedPolicyUrl,
            expectedPolicyBytes, pinnedCertificate))
            return false;

        var verifier = new SignedXmlWithObjectIds(doc);
        verifier.LoadXml(signature);
        using var rsa = pinnedCertificate.GetRSAPublicKey();
        return rsa is not null && verifier.CheckSignature(rsa);
    }

    private static XmlDocument Load(string xml)
    {
        var doc = new XmlDocument { PreserveWhitespace = true, XmlResolver = null };
        using var reader = XmlReader.Create(new StringReader(xml), new XmlReaderSettings {
            DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null,
            MaxCharactersInDocument = 2_000_000
        });
        doc.Load(reader);
        return doc;
    }

    // Do NOT resolve arbitrary fragment URIs: only the unique SignedProperties
    // element inside this signature's own ds:Object can be referenced.
    private sealed class SignedXmlWithObjectIds : SignedXml
    {
        public SignedXmlWithObjectIds(XmlDocument document) : base(document) { }

        public override XmlElement? GetIdElement(XmlDocument document, string idValue)
        {
            if (!idValue.StartsWith("SignedProperties-", StringComparison.Ordinal))
                return base.GetIdElement(document, idValue);

            var matches = new List<XmlElement>();
            var signatureElements = document.GetElementsByTagName("Signature", XmlDsigNamespaceUrl);
            foreach (XmlElement sig in signatureElements)
            {
                foreach (XmlElement child in sig.GetElementsByTagName("SignedProperties", XadesNamespace))
                    if (child.GetAttribute("Id") == idValue)
                        matches.Add(child);
            }
            // While computing, the XML signature isn't attached to the doc yet.
            foreach (DataObject obj in Signature.ObjectList)
            {
                var objectElement = obj.GetXml();
                foreach (XmlElement child in objectElement.GetElementsByTagName("SignedProperties", XadesNamespace))
                    if (child.GetAttribute("Id") == idValue)
                        matches.Add(child);
            }
            if (matches.Count != 1)
                throw new CryptographicException("Missing or ambiguous SignedProperties reference.");
            return matches[0];
        }
    }
}
