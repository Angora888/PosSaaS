using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosSaaS.Api.Services;

namespace PosSaaS.Api.Controllers;

[ApiController]
[Route("api/fiscal/schema")]
[Authorize(Roles = "Admin")]
public sealed class FiscalSchemaController : ControllerBase
{
    private readonly FiscalSchemaValidator _validator;
    public FiscalSchemaController(FiscalSchemaValidator validator) => _validator = validator;

    [HttpGet("status")]
    public IActionResult Status() => Ok(new
    {
        version = "4.4",
        facturaElectronica = _validator.IsConfigured("01"),
        tiqueteElectronico = _validator.IsConfigured("04"),
        emisionHabilitada = false,
        nota = "El esquema debe instalarse localmente y verificarse antes de validar comprobantes."
    });

    [HttpPost("validate")]
    [RequestSizeLimit(2_200_000)]
    public IActionResult Validate([FromBody] ValidateXmlRequest request)
    {
        if (request.TipoDocumento is not ("01" or "04"))
            return BadRequest(new { mensaje = "Tipo no soportado; solamente 01 y 04." });
        if (!_validator.IsConfigured(request.TipoDocumento))
            return StatusCode(503, new { mensaje = "No se ha instalado el XSD oficial para este tipo de documento." });
        try
        {
            return Ok(_validator.Validate(request.TipoDocumento, request.Xml));
        }
        catch (Exception ex) when (ex is System.Xml.XmlException or System.Xml.Schema.XmlSchemaException)
        {
            return BadRequest(new { mensaje = "No se pudo interpretar el XML o su esquema." });
        }
    }
}
public sealed class ValidateXmlRequest
{
    [Required, MaxLength(2)] public string TipoDocumento { get; set; } = "";
    [Required] public string Xml { get; set; } = "";
}
