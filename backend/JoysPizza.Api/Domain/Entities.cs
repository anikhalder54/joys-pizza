namespace JoysPizza.Api.Domain;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    /// <summary>Always stored lower-cased and trimmed.</summary>
    public required string Email { get; set; }
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = "";
    public UserRole Role { get; set; } = UserRole.Customer;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<Order> Orders { get; set; } = [];
}

public class MenuItem
{
    /// <summary>Short slug, e.g. "pz-margherita". Referenced by carts on the frontend.</summary>
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    /// <summary>Single price, or the lowest size price when <see cref="Sizes"/> is not empty.</summary>
    public decimal Price { get; set; }
    public MenuCategory Category { get; set; }
    public string ImageUrl { get; set; } = "";
    public List<string> Tags { get; set; } = [];
    public bool IsSpecial { get; set; }
    /// <summary>False = hidden from the public menu (out of stock).</summary>
    public bool IsAvailable { get; set; } = true;
    public List<MenuItemSize> Sizes { get; set; } = [];
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Stored as a JSON column on the menu item.</summary>
public class MenuItemSize
{
    public required string Label { get; set; }
    public decimal Price { get; set; }
}

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    /// <summary>Human-friendly public id, e.g. "ORD-7K2M9QXA".</summary>
    public required string Number { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public required string CustomerName { get; set; }
    public required string Email { get; set; }
    public required string Phone { get; set; }
    public FulfillmentType Fulfillment { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }

    public decimal Subtotal { get; set; }
    /// <summary>Always 0 — no sales tax is charged. Kept so existing databases don't need a schema change.</summary>
    public decimal Tax { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal Tip { get; set; }
    public decimal Total { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.AwaitingPayment;

    public string? PaymentIntentId { get; set; }
    public PaymentMethodKind? PaymentMethod { get; set; }
    public string? CardBrand { get; set; }
    public string? CardLast4 { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset? RefundedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<OrderItem> Items { get; set; } = [];
}

/// <summary>Snapshot of a menu item at the time of ordering (name/price never change afterwards).</summary>
public class OrderItem
{
    public int Id { get; set; }
    public Guid OrderId { get; set; }
    public required string MenuItemId { get; set; }
    public required string Name { get; set; }
    public string ImageUrl { get; set; } = "";
    public string? Size { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}
