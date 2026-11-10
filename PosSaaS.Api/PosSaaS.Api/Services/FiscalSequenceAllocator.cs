using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using PosSaaS.Api.Data;

namespace PosSaaS.Api.Services;

/// <summary>
/// Low-level, concurrency-safe allocator for a FUTURE issuance pipeline.
/// Never call for previews. Caller MUST have started a relational transaction,
/// and MUST persist the corresponding document inside that SAME transaction.
/// No API currently invokes this service.
/// </summary>
public sealed class FiscalSequenceAllocator
{
    private readonly AppDbContext _db;

    public FiscalSequenceAllocator(AppDbContext db) => _db = db;

    public async Task<(long Numero, string Consecutivo)> ReserveInsideTransactionAsync(
        int tenantId, int sucursalId, string tipoDocumento, CancellationToken token = default)
    {
        if (tenantId <= 0 || sucursalId <= 0)
            throw new ArgumentOutOfRangeException(nameof(sucursalId), "Tenant y sucursal son obligatorios.");
        if (tipoDocumento is not ("01" or "04"))
            throw new ArgumentException("Tipo de comprobante no habilitado.", nameof(tipoDocumento));

        var currentTx = _db.Database.CurrentTransaction
            ?? throw new InvalidOperationException(
                "Reservar un consecutivo requiere una transacción activa compartida con el comprobante.");

        var branch = await _db.Sucursales.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.Id == sucursalId && x.Activa)
            .Select(x => new { x.CodigoSucursalFiscal, x.CodigoTerminalFiscal })
            .SingleOrDefaultAsync(token)
            ?? throw new InvalidOperationException("Sucursal no encontrada o inactiva para el comercio.");

        var terminal = branch.CodigoTerminalFiscal;
        var code = branch.CodigoSucursalFiscal;
        // Fail closed on invalid fiscal codes BEFORE touching the sequence table.
        FiscalNumbering.ConsecutivoDesdeCodigos(code ?? "", terminal ?? "", tipoDocumento, 1);

        var connection = _db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(token);

        await using var command = connection.CreateCommand();
        command.Transaction = currentTx.GetDbTransaction();
        command.CommandText = """
            INSERT INTO "FiscalSequences"
              ("TenantId", "SucursalId", "Terminal", "TipoDocumento", "UltimoNumero", "FechaActualizacion")
            VALUES (@tenant, @branch, @terminal, @type, 1, NOW())
            ON CONFLICT ("TenantId", "SucursalId", "Terminal", "TipoDocumento")
            DO UPDATE
              SET "UltimoNumero" = "FiscalSequences"."UltimoNumero" + 1,
                  "FechaActualizacion" = NOW()
            WHERE "FiscalSequences"."UltimoNumero" < 9999999999
            RETURNING "UltimoNumero";
            """;

        void Add(string name, object value)
        {
            var p = command.CreateParameter();
            p.ParameterName = name;
            p.Value = value;
            command.Parameters.Add(p);
        }
        Add("tenant", tenantId);
        Add("branch", sucursalId);
        Add("terminal", terminal!);
        Add("type", tipoDocumento);

        var result = await command.ExecuteScalarAsync(token);
        if (result == null || result == DBNull.Value)
            throw new InvalidOperationException("Límite de numeración alcanzado; se requiere revisión antes de continuar.");

        var number = Convert.ToInt64(result, System.Globalization.CultureInfo.InvariantCulture);
        return (number, FiscalNumbering.ConsecutivoDesdeCodigos(code!, terminal!, tipoDocumento, number));
    }
}
