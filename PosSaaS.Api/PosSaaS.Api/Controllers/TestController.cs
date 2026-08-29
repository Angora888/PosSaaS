using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosSaaS.Api.Services;

namespace PosSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TestController : ControllerBase
    {
        private readonly ITenantContext _tenantContext;

        public TestController(ITenantContext tenantContext)
        {
            _tenantContext = tenantContext;
        }

        [HttpGet("contexto")]
        public IActionResult ObtenerContexto()
        {
            return Ok(new
            {
                tenantId = _tenantContext.TenantId,
                usuarioId = _tenantContext.UsuarioId,
                sucursalId = _tenantContext.SucursalId,
                rol = _tenantContext.Rol
            });
        }
    }
}