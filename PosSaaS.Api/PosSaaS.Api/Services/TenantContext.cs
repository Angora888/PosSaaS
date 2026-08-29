using System.Security.Claims;

namespace PosSaaS.Api.Services
{
    public class TenantContext : ITenantContext
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public TenantContext(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public int TenantId
        {
            get
            {
                var value = _httpContextAccessor
                    .HttpContext?
                    .User
                    .FindFirst("tenantId")?
                    .Value;

                if (!int.TryParse(value, out var tenantId))
                    throw new UnauthorizedAccessException(
                        "No se pudo identificar el comercio."
                    );

                return tenantId;
            }
        }

        public int UsuarioId
        {
            get
            {
                var value = _httpContextAccessor
                    .HttpContext?
                    .User
                    .FindFirst(ClaimTypes.NameIdentifier)?
                    .Value;

                if (!int.TryParse(value, out var usuarioId))
                    throw new UnauthorizedAccessException(
                        "No se pudo identificar el usuario."
                    );

                return usuarioId;
            }
        }

        public int? SucursalId
        {
            get
            {
                var value = _httpContextAccessor
                    .HttpContext?
                    .User
                    .FindFirst("sucursalId")?
                    .Value;

                if (string.IsNullOrWhiteSpace(value))
                    return null;

                return int.TryParse(value, out var sucursalId)
                    ? sucursalId
                    : null;
            }
        }

        public string Rol
        {
            get
            {
                return _httpContextAccessor
                           .HttpContext?
                           .User
                           .FindFirst(ClaimTypes.Role)?
                           .Value
                       ?? string.Empty;
            }
        }
    }
}