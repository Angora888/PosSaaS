namespace PosSaaS.Api.Services;

/// <summary>
/// Costa Rican cash coin rounding (₡10 is the lowest denomination since July 2026).
/// This does not alter invoice amounts or tax calculations.
/// </summary>
public static class CashRounding
{
    public static decimal NearestTen(decimal exactTotal)
    {
        if (exactTotal < 0m)
            throw new ArgumentOutOfRangeException(nameof(exactTotal));
        return Math.Round(exactTotal / 10m, 0, MidpointRounding.AwayFromZero) * 10m;
    }
}
