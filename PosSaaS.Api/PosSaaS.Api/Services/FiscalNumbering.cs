using System.Globalization;
using System.Security.Cryptography;

namespace PosSaaS.Api.Services;

public static class FiscalNumbering
{
    // Costa Rica: 3 branch digits, 5 terminal, 2 type, 10 sequential.
    public static string Consecutivo(int sucursal, int terminal, string tipo, long numero)
    {
        if (sucursal is < 1 or > 999) throw new ArgumentOutOfRangeException(nameof(sucursal));
        if (terminal is < 1 or > 99999) throw new ArgumentOutOfRangeException(nameof(terminal));
        if (!new[] { "01", "02", "03", "04", "08", "09", "10" }.Contains(tipo))
            throw new ArgumentException("Tipo de documento inválido.", nameof(tipo));
        if (numero is < 1 or > 9999999999L) throw new ArgumentOutOfRangeException(nameof(numero));
        return $"{sucursal:D3}{terminal:D5}{tipo}{numero:D10}";
    }

    // Build a consecutive from already-configured fiscal codes without relying on
    // database IDs. Never reserves the number. This is safe for diagnostics only.
    public static string ConsecutivoDesdeCodigos(
        string codigoSucursal, string codigoTerminal, string tipo, long numero)
    {
        if (codigoSucursal is null || codigoSucursal.Length != 3 ||
            !codigoSucursal.All(IsAsciiDigit) || codigoSucursal == "000")
            throw new ArgumentException("Código fiscal de sucursal inválido.", nameof(codigoSucursal));
        if (codigoTerminal is null || codigoTerminal.Length != 5 ||
            !codigoTerminal.All(IsAsciiDigit) || codigoTerminal == "00000")
            throw new ArgumentException("Código fiscal de terminal inválido.", nameof(codigoTerminal));
        return Consecutivo(int.Parse(codigoSucursal, CultureInfo.InvariantCulture),
            int.Parse(codigoTerminal, CultureInfo.InvariantCulture), tipo, numero);
    }

    // 506 + ddMMyy + 12-digit issuer + 20-digit consecutive + situation + 8-digit security.
    // Caller must persist uniqueness atomically before producing a fiscal document.
    private static bool IsAsciiDigit(char c) => c is >= '0' and <= '9';

    public static string Clave(DateTimeOffset fechaCostaRica, string identificacion,
        string consecutivo, string situacion = "1", string? codigoSeguridad = null)
    {
        if (fechaCostaRica.Offset != TimeSpan.FromHours(-6))
            throw new ArgumentException("La fecha debe indicarse en horario de Costa Rica (UTC-06:00).", nameof(fechaCostaRica));

        var input = (identificacion ?? "").Trim();
        if (input.Any(c => !(c is >= '0' and <= '9') && c != '-'))
            throw new ArgumentException("Identificación solo puede contener dígitos ASCII y guiones.", nameof(identificacion));

        var cedula = input.Replace("-", "");
        if (cedula.Length is < 9 or > 12 || !cedula.All(IsAsciiDigit))
            throw new ArgumentException("Identificación debe contener entre 9 y 12 dígitos.", nameof(identificacion));
        if (consecutivo is null || consecutivo.Length != 20 || !consecutivo.All(IsAsciiDigit))
            throw new ArgumentException("Consecutivo debe contener 20 dígitos.", nameof(consecutivo));
        if (!new[] { "1", "2", "3" }.Contains(situacion))
            throw new ArgumentException("Situación inválida.", nameof(situacion));

        var security = codigoSeguridad ?? RandomNumberGenerator.GetInt32(0, 100000000)
            .ToString("D8", CultureInfo.InvariantCulture);
        if (security.Length != 8 || !security.All(IsAsciiDigit))
            throw new ArgumentException("Código de seguridad debe tener 8 dígitos.", nameof(codigoSeguridad));

        return "506" + fechaCostaRica.ToString("ddMMyy", CultureInfo.InvariantCulture) +
               cedula.PadLeft(12, '0') + consecutivo + situacion + security;
    }
}
