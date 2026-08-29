namespace PosSaaS.Api.Models
{
    public class CajaSesion
    {
        public long Id { get; set; }

        public int TenantId { get; set; }

        public int CajaId { get; set; }

        public int UsuarioAperturaId { get; set; }

        public int? UsuarioCierreId { get; set; }

        public decimal MontoApertura { get; set; }

        public decimal? MontoCierre { get; set; }

        public decimal? MontoEsperado { get; set; }

        public decimal? Diferencia { get; set; }

        public DateTime FechaApertura { get; set; } = DateTime.UtcNow;

        public DateTime? FechaCierre { get; set; }

        public string Estado { get; set; } = "ABIERTA";

        public Caja Caja { get; set; } = null!;

        public Tenant Tenant { get; set; } = null!;

        public Usuario UsuarioApertura { get; set; } = null!;

        public Usuario? UsuarioCierre { get; set; }
    }
}