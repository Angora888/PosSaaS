using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using PosSaaS.Api.Data;
using PosSaaS.Api.Models;
using PosSaaS.Api.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// =====================================================
// CONTROLLERS
// =====================================================

builder.Services.AddControllers();

// =====================================================
// DATABASE
// =====================================================

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection no está configurado."
    );

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

// =====================================================
// CORS
// =====================================================

var configuredOrigins =
    builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
    ?? Array.Empty<string>();

var allowedOrigins = configuredOrigins
    .Append("http://localhost:5173")
    .Distinct()
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// =====================================================
// TENANT CONTEXT
// =====================================================

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantContext, TenantContext>();

// =====================================================
// JWT
// =====================================================

var jwtKey =
    builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "Jwt:Key no está configurado."
    );

var jwtIssuer =
    builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException(
        "Jwt:Issuer no está configurado."
    );

var jwtAudience =
    builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException(
        "Jwt:Audience no está configurado."
    );

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtKey)
                    ),
                ClockSkew = TimeSpan.Zero
            };
    });

builder.Services.AddAuthorization();

// =====================================================
// SWAGGER
// =====================================================

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Ingresa únicamente el token JWT."
        }
    );

    options.AddSecurityRequirement(document =>
        new OpenApiSecurityRequirement
        {
            [
                new OpenApiSecuritySchemeReference(
                    "Bearer",
                    document
                )
            ] = []
        }
    );
});

// =====================================================
// BUILD
// =====================================================

var app = builder.Build();

// =====================================================
// SUPERADMIN BOOTSTRAP
// =====================================================
//
// No existe un endpoint HTTP para crear SuperAdmins.
// La cuenta maestra se provisiona únicamente cuando las variables
// SuperAdmin__Email y SuperAdmin__Password existen en la configuración
// segura del servidor (por ejemplo, Azure App Settings).
//
// Si el correo ya pertenece a un usuario, se actualiza esa cuenta a
// SuperAdmin y se mantiene su TenantId actual. Esto evita migraciones y
// aprovecha el modelo existente.

await ProvisionSuperAdminAsync(app);

// =====================================================
// SWAGGER
// =====================================================

app.UseSwagger();
app.UseSwaggerUI();

// =====================================================
// MIDDLEWARE
// =====================================================

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

// =====================================================
// ENDPOINTS
// =====================================================

app.MapControllers();

// =====================================================
// RUN
// =====================================================

app.Run();

static async Task ProvisionSuperAdminAsync(WebApplication app)
{
    var email = app.Configuration["SuperAdmin:Email"]?.Trim().ToLowerInvariant();
    var password = app.Configuration["SuperAdmin:Password"];
    var nombre = app.Configuration["SuperAdmin:Nombre"]?.Trim();

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
    {
        app.Logger.LogInformation(
            "SuperAdmin bootstrap omitido: no hay credenciales configuradas."
        );
        return;
    }

    if (password.Length < 12)
    {
        app.Logger.LogError(
            "SuperAdmin bootstrap omitido: SuperAdmin:Password debe tener al menos 12 caracteres."
        );
        return;
    }

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    try
    {
        var usuario = await db.Usuarios
            .Include(x => x.Tenant)
            .FirstOrDefaultAsync(x => x.Email == email);

        if (usuario == null)
        {
            app.Logger.LogError(
                "SuperAdmin bootstrap omitido: el correo configurado no pertenece a un usuario existente. Primero crea una cuenta Admin normal y usa ese mismo correo en SuperAdmin:Email."
            );
            return;
        }

        var cambios = false;

        if (!string.Equals(usuario.Rol, "SuperAdmin", StringComparison.Ordinal))
        {
            usuario.Rol = "SuperAdmin";
            cambios = true;
        }

        if (!usuario.Activo)
        {
            usuario.Activo = true;
            cambios = true;
        }

        if (!usuario.Tenant.Activo)
        {
            usuario.Tenant.Activo = true;
            cambios = true;
        }

        if (!string.IsNullOrWhiteSpace(nombre) && usuario.Nombre != nombre)
        {
            usuario.Nombre = nombre;
            cambios = true;
        }

        if (!BCrypt.Net.BCrypt.Verify(password, usuario.PasswordHash))
        {
            usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            cambios = true;
        }

        if (cambios)
        {
            await db.SaveChangesAsync();
            app.Logger.LogInformation(
                "Cuenta SuperAdmin provisionada correctamente para {Email}.",
                email
            );
        }
        else
        {
            app.Logger.LogInformation(
                "La cuenta SuperAdmin {Email} ya estaba provisionada.",
                email
            );
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogError(
            ex,
            "No fue posible provisionar la cuenta SuperAdmin."
        );
    }
}