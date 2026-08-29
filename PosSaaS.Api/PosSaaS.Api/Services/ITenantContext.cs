namespace PosSaaS.Api.Services
{
    public interface ITenantContext
    {
        int TenantId { get; }
        int UsuarioId { get; }
        int? SucursalId { get; }
        string Rol { get; }
    }
}