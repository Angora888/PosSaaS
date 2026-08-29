using Microsoft.EntityFrameworkCore;
using PosSaaS.Api.Models;

namespace PosSaaS.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Tenant> Tenants => Set<Tenant>();
        public DbSet<Sucursal> Sucursales => Set<Sucursal>();
        public DbSet<Usuario> Usuarios => Set<Usuario>();

        public DbSet<Categoria> Categorias => Set<Categoria>();
        public DbSet<Producto> Productos => Set<Producto>();

        public DbSet<Inventario> Inventarios => Set<Inventario>();

        public DbSet<MovimientoInventario> MovimientosInventario
            => Set<MovimientoInventario>();

        public DbSet<Caja> Cajas => Set<Caja>();

        public DbSet<CajaSesion> CajaSesiones
            => Set<CajaSesion>();

        public DbSet<MovimientoCaja> MovimientosCaja
            => Set<MovimientoCaja>();

        public DbSet<MetodoPago> MetodosPago => Set<MetodoPago>();

        public DbSet<Venta> Ventas => Set<Venta>();

        public DbSet<VentaDetalle> VentaDetalles
            => Set<VentaDetalle>();

        public DbSet<PagoVenta> PagosVenta
            => Set<PagoVenta>();

        public DbSet<Cliente> Clientes => Set<Cliente>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // TENANT
            modelBuilder.Entity<Tenant>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Nombre)
                    .IsRequired()
                    .HasMaxLength(150);

                entity.Property(x => x.NombreComercial)
                    .HasMaxLength(150);

                entity.Property(x => x.Identificacion)
                    .HasMaxLength(50);

                entity.Property(x => x.Email)
                    .HasMaxLength(150);

                entity.Property(x => x.Telefono)
                    .HasMaxLength(50);

                entity.HasIndex(x => x.Identificacion);
            });

            // SUCURSAL
            modelBuilder.Entity<Sucursal>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Nombre)
                    .IsRequired()
                    .HasMaxLength(150);

                entity.Property(x => x.Telefono)
                    .HasMaxLength(50);

                entity.Property(x => x.Direccion)
                    .HasMaxLength(500);

                entity.HasOne(x => x.Tenant)
                    .WithMany(x => x.Sucursales)
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);

                // No permite dos sucursales con el mismo nombre
                // dentro del mismo comercio.
                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.Nombre
                }).IsUnique();
            });

            // USUARIO
            modelBuilder.Entity<Usuario>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Nombre)
                    .IsRequired()
                    .HasMaxLength(150);

                entity.Property(x => x.Email)
                    .IsRequired()
                    .HasMaxLength(200);

                entity.Property(x => x.PasswordHash)
                    .IsRequired();

                entity.Property(x => x.Rol)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.HasOne(x => x.Tenant)
                    .WithMany(x => x.Usuarios)
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.Sucursal)
                    .WithMany(x => x.Usuarios)
                    .HasForeignKey(x => x.SucursalId)
                    .OnDelete(DeleteBehavior.SetNull);

                // El email debe ser único en toda la plataforma.
                entity.HasIndex(x => x.Email)
                    .IsUnique();
            });

            // CATEGORIA
            modelBuilder.Entity<Categoria>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Nombre)
                    .IsRequired()
                    .HasMaxLength(150);

                entity.HasOne(x => x.Tenant)
                    .WithMany(x => x.Categorias)
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.Nombre
                }).IsUnique();
            });


            // PRODUCTO
            modelBuilder.Entity<Producto>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Nombre)
                    .IsRequired()
                    .HasMaxLength(200);

                entity.Property(x => x.Descripcion)
                    .HasMaxLength(1000);

                entity.Property(x => x.SKU)
                    .HasMaxLength(100);

                entity.Property(x => x.CodigoBarras)
                    .HasMaxLength(100);

                entity.Property(x => x.Costo)
                    .HasPrecision(18, 2);

                entity.Property(x => x.Precio)
                    .HasPrecision(18, 2);

                entity.Property(x => x.ImpuestoPorcentaje)
                    .HasPrecision(5, 2);

                entity.HasOne(x => x.Tenant)
                    .WithMany(x => x.Productos)
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.Categoria)
                    .WithMany(x => x.Productos)
                    .HasForeignKey(x => x.CategoriaId)
                    .OnDelete(DeleteBehavior.Restrict);

                // SKU único dentro de cada comercio.
                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.SKU
                }).IsUnique();

                // Código de barras único dentro de cada comercio.
                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.CodigoBarras
                }).IsUnique();
            });

            // INVENTARIO
            modelBuilder.Entity<Inventario>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Cantidad)
                    .HasPrecision(18, 3);

                entity.Property(x => x.StockMinimo)
                    .HasPrecision(18, 3);

                entity.HasOne(x => x.Tenant)
                    .WithMany()
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.Sucursal)
                    .WithMany()
                    .HasForeignKey(x => x.SucursalId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.Producto)
                    .WithMany()
                    .HasForeignKey(x => x.ProductoId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Solo puede existir un inventario por
                // Producto + Sucursal.
                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.SucursalId,
                    x.ProductoId
                }).IsUnique();
            });


            // MOVIMIENTO INVENTARIO
            modelBuilder.Entity<MovimientoInventario>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Tipo)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(x => x.Cantidad)
                    .HasPrecision(18, 3);

                entity.Property(x => x.CantidadAnterior)
                    .HasPrecision(18, 3);

                entity.Property(x => x.CantidadNueva)
                    .HasPrecision(18, 3);

                entity.Property(x => x.Referencia)
                    .HasMaxLength(150);

                entity.Property(x => x.Observacion)
                    .HasMaxLength(500);

                entity.HasOne(x => x.Tenant)
                    .WithMany()
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.Sucursal)
                    .WithMany()
                    .HasForeignKey(x => x.SucursalId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.Producto)
                    .WithMany()
                    .HasForeignKey(x => x.ProductoId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.Usuario)
                    .WithMany()
                    .HasForeignKey(x => x.UsuarioId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Para consultar rápidamente el historial
                // de un producto.
                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.SucursalId,
                    x.ProductoId,
                    x.Fecha
                });
            });

            // CAJA
            modelBuilder.Entity<Caja>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Nombre)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.HasOne(x => x.Tenant)
                    .WithMany()
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.Sucursal)
                    .WithMany()
                    .HasForeignKey(x => x.SucursalId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.SucursalId,
                    x.Nombre
                }).IsUnique();
            });


            // CAJA SESION
            modelBuilder.Entity<CajaSesion>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.MontoApertura)
                    .HasPrecision(18, 2);

                entity.Property(x => x.MontoCierre)
                    .HasPrecision(18, 2);

                entity.Property(x => x.MontoEsperado)
                    .HasPrecision(18, 2);

                entity.Property(x => x.Diferencia)
                    .HasPrecision(18, 2);

                entity.Property(x => x.Estado)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.HasOne(x => x.Tenant)
                    .WithMany()
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.Caja)
                    .WithMany(x => x.Sesiones)
                    .HasForeignKey(x => x.CajaId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.UsuarioApertura)
                    .WithMany()
                    .HasForeignKey(x => x.UsuarioAperturaId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.UsuarioCierre)
                    .WithMany()
                    .HasForeignKey(x => x.UsuarioCierreId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.CajaId,
                    x.Estado
                });
            });


            // MOVIMIENTO CAJA
            modelBuilder.Entity<MovimientoCaja>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Tipo)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(x => x.Monto)
                    .HasPrecision(18, 2);

                entity.Property(x => x.Referencia)
                    .HasMaxLength(150);

                entity.Property(x => x.Observacion)
                    .HasMaxLength(500);

                entity.HasOne(x => x.Tenant)
                    .WithMany()
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.CajaSesion)
                    .WithMany()
                    .HasForeignKey(x => x.CajaSesionId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.Usuario)
                    .WithMany()
                    .HasForeignKey(x => x.UsuarioId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.CajaSesionId,
                    x.Fecha
                });
            });

            // METODO PAGO
            modelBuilder.Entity<MetodoPago>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Nombre)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(x => x.Tipo)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.HasOne(x => x.Tenant)
                    .WithMany()
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.Nombre
                }).IsUnique();
            });


            // VENTA
            modelBuilder.Entity<Venta>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.NumeroVenta)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(x => x.Estado)
                    .IsRequired()
                    .HasMaxLength(30);

                entity.Property(x => x.Subtotal)
                    .HasPrecision(18, 2);

                entity.Property(x => x.Descuento)
                    .HasPrecision(18, 2);

                entity.Property(x => x.Impuesto)
                    .HasPrecision(18, 2);

                entity.Property(x => x.Total)
                    .HasPrecision(18, 2);

                entity.HasOne(x => x.Tenant)
                    .WithMany()
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.Sucursal)
                    .WithMany()
                    .HasForeignKey(x => x.SucursalId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.CajaSesion)
                    .WithMany()
                    .HasForeignKey(x => x.CajaSesionId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.Usuario)
                    .WithMany()
                    .HasForeignKey(x => x.UsuarioId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.NumeroVenta
                }).IsUnique();

                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.Fecha
                });
                entity.HasOne(x => x.Cliente)
    .WithMany(x => x.Ventas)
    .HasForeignKey(x => x.ClienteId)
    .OnDelete(DeleteBehavior.SetNull);
            });


            // VENTA DETALLE
            modelBuilder.Entity<VentaDetalle>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.ProductoNombre)
                    .IsRequired()
                    .HasMaxLength(200);

                entity.Property(x => x.Cantidad)
                    .HasPrecision(18, 3);

                entity.Property(x => x.PrecioUnitario)
                    .HasPrecision(18, 2);

                entity.Property(x => x.CostoUnitario)
                    .HasPrecision(18, 2);

                entity.Property(x => x.ImpuestoPorcentaje)
                    .HasPrecision(5, 2);

                entity.Property(x => x.Subtotal)
                    .HasPrecision(18, 2);

                entity.Property(x => x.Impuesto)
                    .HasPrecision(18, 2);

                entity.Property(x => x.Total)
                    .HasPrecision(18, 2);

                entity.HasOne(x => x.Venta)
                    .WithMany(x => x.Detalles)
                    .HasForeignKey(x => x.VentaId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.Producto)
                    .WithMany()
                    .HasForeignKey(x => x.ProductoId)
                    .OnDelete(DeleteBehavior.Restrict);
            });


            // PAGO VENTA
            modelBuilder.Entity<PagoVenta>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Monto)
                    .HasPrecision(18, 2);

                entity.Property(x => x.Referencia)
                    .HasMaxLength(200);

                entity.HasOne(x => x.Venta)
                    .WithMany(x => x.Pagos)
                    .HasForeignKey(x => x.VentaId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.MetodoPago)
                    .WithMany()
                    .HasForeignKey(x => x.MetodoPagoId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // CLIENTE
            modelBuilder.Entity<Cliente>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Nombre)
                    .IsRequired()
                    .HasMaxLength(200);

                entity.Property(x => x.Identificacion)
                    .HasMaxLength(50);

                entity.Property(x => x.Telefono)
                    .HasMaxLength(50);

                entity.Property(x => x.Email)
                    .HasMaxLength(200);

                entity.Property(x => x.Direccion)
                    .HasMaxLength(500);

                entity.HasOne(x => x.Tenant)
                    .WithMany()
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.Identificacion
                });

                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.Telefono
                });

                entity.HasIndex(x => new
                {
                    x.TenantId,
                    x.Nombre
                });
            });
        }
    }
}