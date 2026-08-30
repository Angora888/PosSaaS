using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PosSaaS.Api.Data;
using PosSaaS.Api.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace PosSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(
            AppDbContext context,
            IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var email = dto.Email.Trim().ToLower();

            var usuario = await _context.Usuarios
                .Include(x => x.Tenant)
                .FirstOrDefaultAsync(x =>
                    x.Email == email &&
                    x.Activo);

            if (usuario == null)
                return Unauthorized("Credenciales incorrectas.");

            if (!usuario.Tenant.Activo)
                return Unauthorized("El comercio se encuentra inactivo.");

            var passwordValido =
                BCrypt.Net.BCrypt.Verify(
                    dto.Password,
                    usuario.PasswordHash
                );

            if (!passwordValido)
                return Unauthorized("Credenciales incorrectas.");

            var claims = new List<Claim>
            {
                new Claim(
                    ClaimTypes.NameIdentifier,
                    usuario.Id.ToString()
                ),

                new Claim(
                    ClaimTypes.Email,
                    usuario.Email
                ),

                new Claim(
                    ClaimTypes.Name,
                    usuario.Nombre
                ),

                new Claim(
                    ClaimTypes.Role,
                    usuario.Rol
                ),

                new Claim(
                    "tenantId",
                    usuario.TenantId.ToString()
                )
            };

            if (usuario.SucursalId.HasValue)
            {
                claims.Add(
                    new Claim(
                        "sucursalId",
                        usuario.SucursalId.Value.ToString()
                    )
                );
            }

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    _configuration["Jwt:Key"]!
                )
            );

            var credentials = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256
            );

            var expiracion = DateTime.UtcNow.AddHours(8);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: expiracion,
                signingCredentials: credentials
            );

            var tokenString =
                new JwtSecurityTokenHandler()
                    .WriteToken(token);

            var nombreComercial =
                string.IsNullOrWhiteSpace(usuario.Tenant.NombreComercial)
                    ? usuario.Tenant.Nombre
                    : usuario.Tenant.NombreComercial;

            return Ok(new
            {
                token = tokenString,
                expiracion,

                usuario = new
                {
                    usuario.Id,
                    usuario.Nombre,
                    usuario.Email,
                    usuario.Rol,
                    usuario.TenantId,
                    usuario.SucursalId,

                    comercio = usuario.Tenant.Nombre,
                    nombreComercial
                }
            });
        }
    }
}