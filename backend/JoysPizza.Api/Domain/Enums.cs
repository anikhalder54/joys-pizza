using System.Text.Json.Serialization;

namespace JoysPizza.Api.Domain;

// JSON names match the strings the React frontend already uses.
// Enums are stored as text in PostgreSQL (see AppDbContext.ConfigureConventions).

public enum UserRole
{
    [JsonStringEnumMemberName("customer")] Customer,
    [JsonStringEnumMemberName("admin")] Admin,
}

public enum MenuCategory
{
    Pizza,
    Pasta,
    Burgers,
    Appetizers,
    Salads,
    Desserts,
    Drinks,
}

public enum FulfillmentType
{
    [JsonStringEnumMemberName("delivery")] Delivery,
    [JsonStringEnumMemberName("pickup")] Pickup,
}

public enum OrderStatus
{
    /// <summary>Order created, waiting for Stripe to confirm the payment. Not shown to the kitchen.</summary>
    [JsonStringEnumMemberName("Awaiting payment")] AwaitingPayment,
    Received,
    Preparing,
    Ready,
    [JsonStringEnumMemberName("Out for delivery")] OutForDelivery,
    Completed,
    Cancelled,
}

public enum PaymentMethodKind
{
    [JsonStringEnumMemberName("apple_pay")] ApplePay,
    [JsonStringEnumMemberName("google_pay")] GooglePay,
    [JsonStringEnumMemberName("credit")] Credit,
    [JsonStringEnumMemberName("debit")] Debit,
    [JsonStringEnumMemberName("card")] Card,
    [JsonStringEnumMemberName("other")] Other,
}
