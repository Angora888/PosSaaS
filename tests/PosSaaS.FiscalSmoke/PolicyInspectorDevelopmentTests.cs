using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using PosSaaS.Api.Services;

namespace PosSaaS.FiscalSmoke;

/// <summary>Only tests the fail-closed policy gate with fabricated metadata.</summary>
internal static class PolicyInspectorDevelopmentTests
{
    public static void Run(Action<bool, string> check)
    {
        var temp = Path.Combine(Path.GetTempPath(), "possaas-policy-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(temp, "FiscalSchemas", "policies"));
        try
        {
            FiscalPolicyInspection Inspect(Dictionary<string, string?> config) =>
                new FiscalSigningPolicyInspector(
                    new ConfigurationBuilder().AddInMemoryCollection(config).Build(),
                    new TestEnvironment(temp)).Inspect();

            check(!Inspect(new()).ArchivoVerificado,
                "Unconfigured Hacienda signature policy is fail-closed");
            check(!Inspect(new()
            {
                ["Fiscal:SigningPolicy:ApprovedByOperator"] = "true",
                ["Fiscal:SigningPolicy:Url"] = "URLXXXXV4.4"
            }).ArchivoVerificado, "Placeholder URLXXXXV4.4 rejected");

            var fakePdf = Path.Combine(temp, "FiscalSchemas", "policies", "test.pdf");
            File.WriteAllBytes(fakePdf, "%PDF-1.7\nLOCAL DEVELOPMENT ONLY - NOT A POLICY"u8.ToArray());
            var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(fakePdf)));
            var options = new Dictionary<string, string?>
            {
                ["Fiscal:SigningPolicy:ApprovedByOperator"] = "true",
                ["Fiscal:SigningPolicy:Url"] = "https://www.hacienda.go.cr/docs/development-example.pdf",
                ["Fiscal:SigningPolicy:Sha256Hex"] = hash,
                ["Fiscal:SigningPolicy:Filename"] = "test.pdf"
            };
            check(Inspect(options).ArchivoVerificado,
                "Pin and compare SHA-256 for a fabricated local PDF (not official approval)");
            File.AppendAllText(fakePdf, "TAMPERED");
            check(!Inspect(options).ArchivoVerificado,
                "Altered policy PDF must fail digest verification");
            options["Fiscal:SigningPolicy:Url"] = "https://example.invalid/test.pdf";
            check(!Inspect(options).ArchivoVerificado,
                "Reject non-Hacienda policy hosts");
            options["Fiscal:SigningPolicy:Url"] = "https://www.hacienda.go.cr/docs/example.pdf";
            options["Fiscal:SigningPolicy:ApprovedByOperator"] = "false";
            check(!Inspect(options).ArchivoVerificado,
                "Reject unapproved policy even when a file exists");
        }
        finally
        {
            Directory.Delete(temp, recursive: true);
        }
    }

    private sealed class TestEnvironment(string root) : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "PosSaaS.FiscalSmoke";
        public string ContentRootPath { get; set; } = root;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = root;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    }
}
