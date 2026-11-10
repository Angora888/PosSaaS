using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Net;
using System.Text.Json;

namespace PosSaaS.Api.Controllers;

[ApiController]
[Route("api/cabys")]
[Authorize(Roles = "Admin,Supervisor")]
public sealed class CabysController : ControllerBase
{
    private readonly IHttpClientFactory _clients;
    private readonly IMemoryCache _cache;
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static DateTimeOffset _lastRequest = DateTimeOffset.MinValue;

    public CabysController(IHttpClientFactory clients, IMemoryCache cache)
    {
        _clients = clients;
        _cache = cache;
    }

    [HttpGet("buscar")]
    public async Task<IActionResult> Buscar([FromQuery] string? q, CancellationToken ct)
    {
        q = q?.Trim();
        if (string.IsNullOrWhiteSpace(q) || q.Length < 3 || q.Length > 100)
            return BadRequest(new { mensaje = "Ingresá entre 3 y 100 caracteres." });

        var exactCode = q.Length == 13 && q.All(c => c is >= '0' and <= '9');
        var cacheKey = "cabys:" + q.ToLowerInvariant();
        if (_cache.TryGetValue(cacheKey, out string? saved) && saved != null)
            return Content(saved, "application/json");

        await Gate.WaitAsync(ct);
        try
        {
            if (_cache.TryGetValue(cacheKey, out saved) && saved != null)
                return Content(saved, "application/json");

            var elapsed = DateTimeOffset.UtcNow - _lastRequest;
            if (elapsed < TimeSpan.FromSeconds(1))
                await Task.Delay(TimeSpan.FromSeconds(1) - elapsed, ct);

            var url = exactCode
                ? "fe/cabys?codigo=" + Uri.EscapeDataString(q)
                : "fe/cabys?q=" + Uri.EscapeDataString(q) + "&top=15";

            using var client = _clients.CreateClient("HaciendaPublica");
            using var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
            _lastRequest = DateTimeOffset.UtcNow;

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
                return StatusCode(503, new { mensaje = "Hacienda está limitando las consultas. Intentá nuevamente más tarde." });
            if (response.StatusCode == HttpStatusCode.NotFound)
                return Ok(new { cabys = Array.Empty<object>() });
            if (!response.IsSuccessStatusCode)
                return StatusCode(502, new { mensaje = "Hacienda no pudo completar la búsqueda CABYS." });

            // Limit response body size before parsing upstream JSON.
            var body = await response.Content.ReadAsStringAsync(ct);
            if (body.Length > 250_000)
                return StatusCode(502, new { mensaje = "La respuesta de CABYS supera el tamaño permitido." });
            using var json = JsonDocument.Parse(body);
            if (json.RootElement.ValueKind != JsonValueKind.Object)
                return StatusCode(502, new { mensaje = "Hacienda devolvió un formato CABYS no reconocido." });

            // Preserve upstream catalog fields (including tax information) unchanged.
            _cache.Set(cacheKey, body, TimeSpan.FromHours(12));
            return Content(body, "application/json");
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return StatusCode(504, new { mensaje = "Hacienda tardó demasiado en responder." });
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { mensaje = "No fue posible conectarse con Hacienda." });
        }
        catch (JsonException)
        {
            return StatusCode(502, new { mensaje = "Hacienda devolvió una respuesta inválida." });
        }
        finally
        {
            Gate.Release();
        }
    }
}
