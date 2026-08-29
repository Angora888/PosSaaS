using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using PosSaaS.Api.Data;
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

// Orígenes configurados desde appsettings o variables de entorno.
//
// Azure:
// Cors__AllowedOrigins__0=https://tu-app.vercel.app
//
// Localhost se mantiene permitido para desarrollo.

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
// SWAGGER
// =====================================================

// Lo dejamos disponible también en Azure por ahora
// para poder probar la API una vez desplegada.
//
// Más adelante podemos restringirlo solamente
// a Development.

app.UseSwagger();

app.UseSwaggerUI();


// =====================================================
// MIDDLEWARE
// =====================================================

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// CORS debe ejecutarse antes de Authentication y Authorization.

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