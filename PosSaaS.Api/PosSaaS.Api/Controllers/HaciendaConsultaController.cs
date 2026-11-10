using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace PosSaaS.Api.Controllers;

/// <summary>
/// Public contributor lookup proxy. This NEVER creates or sends fiscal documents.
/// Fixed Hacienda host, manual requests only, shared in-process cache and throttle.
/// </summary>
[ApiController]
[Route("api/hacienda")]
[Authorize(Roles = "Admin,Supervisor,Cajero")]
public sealed class HaciendaConsultaController : ControllerBase
{
    private readonly IHttpClientFactory _clients;
    private readonly IMemoryCache _cache;
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static DateTimeOffset _lastCall = DateTimeOffset.MinValue;

    public HaciendaConsultaController(IHttpClientFactory clients, IMemoryCache cache)
    {
        _clients = clients;
        _cache = cache;
    }

    [HttpGet("contribuyente")]
    public async Task<IActionResult> Consultar([FromQuery] string? identificacion,
        CancellationToken cancellationToken)
    {
        var clean = (identificacion ?? "").Trim().Replace("-", "").Replace(" ", "");
        if (clean.Length is < 9 or > 12 || !clean.All(c => c is >= '0' and <= '9'))
            return BadRequest(new { mensaje = "Ingresá una identificación numérica de 9 a 12 dígitos." });

        Response.Headers.CacheControl = "no-store";
        var key = "hacienda:contribuyente:" + clean;
        if (_cache.TryGetValue<ContribuyenteResult>(key, out var saved) && saved is not null)
            return Ok(saved);

        await Gate.WaitAsync(cancellationToken);
        try
        {
            // Double-check cache after waiting: simultaneous tenants share a single lookup.
            if (_cache.TryGetValue<ContribuyenteResult>(key, out saved) && saved is not null)
                return Ok(saved);

            var elapsed = DateTimeOffset.UtcNow - _lastCall;
            if (elapsed < TimeSpan.FromSeconds(1))
                await Task.Delay(TimeSpan.FromSeconds(1) - elapsed, cancellationToken);

            using var client = _clients.CreateClient("HaciendaPublica");
            using var response = await client.GetAsync(
                "fe/ae?identificacion=" + clean, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            _lastCall = DateTimeOffset.UtcNow;

            if (response.StatusCode == HttpStatusCode.NotFound)
                return NotFound(new { mensaje = "Hacienda no encontró información para esa identificación." });
            if ((int)response.StatusCode == 429)
                return StatusCode(503, new { mensaje = "Hacienda está limitando consultas. Intentá nuevamente más tarde." });
            if (!response.IsSuccessStatusCode)
                return StatusCode(502, new { mensaje = "Hacienda no pudo atender la consulta. Podés completar el cliente manualmente." });

            // Hard cap remote response size; no arbitrary URLs or untrusted redirect hosts.
            if (response.Content.Headers.ContentLength is > 131072)
                return StatusCode(502, new { mensaje = "Respuesta de Hacienda demasiado grande." });
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream,
                new JsonDocumentOptions { MaxDepth = 16 }, cancellationToken);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object ||
                !root.TryGetProperty("nombre", out var nameJson) ||
                nameJson.ValueKind != JsonValueKind.String)
                return StatusCode(502, new { mensaje = "Hacienda devolvió datos incompletos. Completá el cliente manualmente." });

            var nombre = (nameJson.GetString() ?? "").Trim();
            if (nombre.Length is < 1 or > 250)
                return StatusCode(502, new { mensaje = "El nombre recibido no es válido." });

            string? tipo = null;
            if (root.TryGetProperty("tipoIdentificacion", out var typeJson) &&
                typeJson.ValueKind == JsonValueKind.String)
            {
                var type = typeJson.GetString();
                if (type is "01" or "02" or "03" or "04") tipo = type;
            }

            var result = new ContribuyenteResult(clean, nombre, tipo);
            _cache.Set(key, result, TimeSpan.FromHours(12));
            return Ok(result);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(504, new { mensaje = "Hacienda tardó demasiado en responder. Podés ingresar los datos manualmente." });
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { mensaje = "No se pudo contactar a Hacienda. Podés ingresar los datos manualmente." });
        }
        catch (JsonException)
        {
            return StatusCode(502, new { mensaje = "Hacienda respondió con información inválida." });
        }
        finally
        {
            Gate.Release();
        }
    }

    private sealed record ContribuyenteResult(string Identificacion, string Nombre, string? TipoIdentificacion);
}
