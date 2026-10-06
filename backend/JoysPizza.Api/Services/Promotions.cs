using JoysPizza.Api.Domain;

namespace JoysPizza.Api.Services;

/// <summary>
/// "Buy 2 Large Cheese Pizzas, Get 1 Medium FREE".
/// For every 2 Large Cheese Pizzas in the order, one Medium Cheese Pizza is free.
/// The customer adds the Medium to the cart; the server prices it at $0.
/// Keep in sync with frontend/src/lib/promo.ts.
/// </summary>
public static class Promotions
{
    public const string CheesePizzaId = "pz-cheese";
    public const string Title = "Buy 2 Large Cheese Pizzas, Get 1 Medium FREE";
    public const int LargesPerFreeMedium = 2;

    /// <summary>Size labels start with "Medium" / "Large", e.g. "Large 16\" · 16 slices".</summary>
    public static bool IsSize(string? label, string size) =>
        label is not null && label.StartsWith(size, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Moves earned free Medium Cheese Pizzas onto their own $0 line (marked "FREE").
    /// Returns how many pizzas were made free.
    /// </summary>
    public static int Apply(List<OrderItem> lines)
    {
        var largeQty = lines
            .Where(l => l.MenuItemId == CheesePizzaId && IsSize(l.Size, "Large") && l.UnitPrice > 0)
            .Sum(l => l.Quantity);
        var earned = largeQty / LargesPerFreeMedium;

        var medium = lines.FirstOrDefault(l => l.MenuItemId == CheesePizzaId && IsSize(l.Size, "Medium") && l.UnitPrice > 0);
        if (earned == 0 || medium is null) return 0;

        var free = Math.Min(earned, medium.Quantity);
        medium.Quantity -= free;
        if (medium.Quantity == 0) lines.Remove(medium);

        lines.Add(new OrderItem
        {
            MenuItemId = medium.MenuItemId,
            Name = Truncate($"{medium.Name} (FREE · Buy 2 Large deal)", 80), // order_items.name is varchar(80)
            ImageUrl = medium.ImageUrl,
            Size = medium.Size,
            UnitPrice = 0m,
            Quantity = free,
        });
        return free;
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];
}
