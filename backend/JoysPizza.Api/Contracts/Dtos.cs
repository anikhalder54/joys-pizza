using System.ComponentModel.DataAnnotations;
using JoysPizza.Api.Domain;

namespace JoysPizza.Api.Contracts;

// JSON is camelCase and nulls are omitted, so these shapes line up with
// the TypeScript types in frontend/src/types.ts.

// ---------------- Auth ----------------

public record UserDto(Guid Id, string Name, string Email, string? Phone, UserRole Role);

public record AuthResponse(string Token, DateTimeOffset ExpiresAt, UserDto User);

public record RegisterRequest(
    [Required, StringLength(100, MinimumLength = 2)] string Name,
    [Required, EmailAddress, StringLength(254)] string Email,
    [StringLength(30)] string? Phone,
    [Required, StringLength(100, MinimumLength = 6)] string Password);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

// ---------------- Menu ----------------

public record SizeDto(
    [Required, StringLength(40, MinimumLength = 1)] string Label,
    [Range(typeof(decimal), "0.01", "1000")] decimal Price);

public record MenuItemDto(
    string Id,
    string Name,
    string Description,
    decimal Price,
    MenuCategory Category,
    string Image,
    IReadOnlyList<string> Tags,
    bool Special,
    IReadOnlyList<SizeDto>? Sizes,
    bool Available,
    DateTimeOffset UpdatedAt);

public record MenuItemUpsertRequest(
    [Required, StringLength(80, MinimumLength = 1)] string Name,
    [Required, StringLength(500, MinimumLength = 10)] string Description,
    [Range(typeof(decimal), "0", "1000")] decimal Price,
    MenuCategory Category,
    [StringLength(2048)] string? Image,
    [MaxLength(10)] List<string>? Tags,
    bool Special,
    [MaxLength(8)] List<SizeDto>? Sizes,
    bool Available = true);

public record AvailabilityRequest(bool Available);

public record UploadResult(string Url);

// ---------------- Orders ----------------

public record OrderLineRequest(
    [Required, StringLength(64)] string MenuItemId,
    [StringLength(40)] string? Size,
    [Range(1, 50)] int Quantity);

public record CreateOrderRequest(
    [Required, MinLength(1), MaxLength(30)] List<OrderLineRequest> Items,
    FulfillmentType Fulfillment,
    [Required, StringLength(100, MinimumLength = 2)] string CustomerName,
    [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(30, MinimumLength = 7)] string Phone,
    [StringLength(300)] string? Address,
    [StringLength(500)] string? Notes,
    [Range(0, 0.30)] decimal TipPercent);

public record OrderLineDto(
    string Key,
    string ItemId,
    string Name,
    string Image,
    string? Size,
    decimal UnitPrice,
    int Qty);

public record PaymentInfoDto(PaymentMethodKind Method, string? Brand, string? Last4);

public record OrderDto(
    string Id,
    Guid UserId,
    string CustomerName,
    string Email,
    string Phone,
    IReadOnlyList<OrderLineDto> Items,
    decimal Subtotal,
    decimal DeliveryFee,
    decimal Tip,
    decimal Total,
    FulfillmentType Fulfillment,
    string? Address,
    string? Notes,
    PaymentInfoDto? Payment,
    OrderStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PaidAt,
    bool Refunded);

/// <summary>
/// How the browser should collect payment.
/// "stripe": mount the Stripe Payment Element with <see cref="ClientSecret"/>.
/// "demo": Stripe isn't configured (Development only) — call confirm-payment directly.
/// </summary>
public record PaymentSessionDto(string Mode, string? ClientSecret, string? PublishableKey);

public record CreateOrderResponse(OrderDto Order, PaymentSessionDto Payment);

public record UpdateStatusRequest(OrderStatus Status);

// ---------------- Config ----------------

public record PublicConfigDto(
    decimal DeliveryFee,
    decimal FreeDeliveryOver,
    string Currency,
    string PaymentMode,
    string? StripePublishableKey);
