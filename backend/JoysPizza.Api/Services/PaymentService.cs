using JoysPizza.Api.Domain;
using JoysPizza.Api.Infrastructure;
using Microsoft.Extensions.Options;

namespace JoysPizza.Api.Services;

public record PaymentSession(string Mode, string PaymentIntentId, string? ClientSecret, string? PublishableKey);

public record PaymentResult(
    bool Succeeded,
    string Status,
    long AmountCents,
    PaymentMethodKind? Method,
    string? Brand,
    string? Last4);

public interface IPaymentService
{
    /// <summary>"stripe" or "demo".</summary>
    string Mode { get; }
    string? PublishableKey { get; }
    Task<PaymentSession> CreatePaymentAsync(Domain.Order order, CancellationToken ct);
    Task<PaymentResult> GetPaymentAsync(string paymentIntentId, CancellationToken ct);
    Task RefundAsync(string paymentIntentId, CancellationToken ct);
}

public static class Money
{
    public static long ToCents(decimal amount) => (long)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);
}

/// <summary>
/// Real payments with Stripe PaymentIntents. The browser collects card / Apple Pay / Google Pay
/// details in the Stripe Payment Element — raw card numbers never touch this API.
/// </summary>
public class StripePaymentService(IOptions<StripeOptions> stripeOptions, IOptions<RestaurantOptions> restaurant) : IPaymentService
{
    private readonly StripeOptions _opts = stripeOptions.Value;
    private readonly Stripe.StripeClient _client = new(stripeOptions.Value.SecretKey);

    public string Mode => "stripe";
    public string? PublishableKey => _opts.PublishableKey;

    public async Task<PaymentSession> CreatePaymentAsync(Domain.Order order, CancellationToken ct)
    {
        var service = new Stripe.PaymentIntentService(_client);
        var intent = await service.CreateAsync(
            new Stripe.PaymentIntentCreateOptions
            {
                Amount = Money.ToCents(order.Total),
                Currency = restaurant.Value.Currency,
                // Cards only. Apple Pay and Google Pay are card wallets, so they still appear.
                // (No bank, Cash App, Amazon Pay, Klarna or Link.)
                PaymentMethodTypes = new List<string> { "card" },
                Description = $"Joy's Pizza order {order.Number}",
                ReceiptEmail = order.Email,
                Metadata = new Dictionary<string, string>
                {
                    ["orderId"] = order.Id.ToString(),
                    ["orderNumber"] = order.Number,
                },
            },
            new Stripe.RequestOptions { IdempotencyKey = $"order-{order.Id}" },
            ct);

        return new PaymentSession(Mode, intent.Id, intent.ClientSecret, _opts.PublishableKey);
    }

    public async Task<PaymentResult> GetPaymentAsync(string paymentIntentId, CancellationToken ct)
    {
        var service = new Stripe.PaymentIntentService(_client);
        var intent = await service.GetAsync(
            paymentIntentId,
            new Stripe.PaymentIntentGetOptions { Expand = ["latest_charge"] },
            requestOptions: null,
            cancellationToken: ct);

        var card = intent.LatestCharge?.PaymentMethodDetails?.Card;
        PaymentMethodKind? method = null;
        if (card is not null)
        {
            method = card.Wallet?.Type switch
            {
                "apple_pay" => PaymentMethodKind.ApplePay,
                "google_pay" => PaymentMethodKind.GooglePay,
                _ => card.Funding switch
                {
                    "credit" => PaymentMethodKind.Credit,
                    "debit" => PaymentMethodKind.Debit,
                    _ => PaymentMethodKind.Card,
                },
            };
        }
        else if (intent.LatestCharge?.PaymentMethodDetails is not null)
        {
            method = PaymentMethodKind.Other;
        }

        return new PaymentResult(
            intent.Status == "succeeded",
            intent.Status,
            intent.Amount,
            method,
            card?.Brand is { } brand ? FormatBrand(brand) : null,
            card?.Last4);
    }

    public async Task RefundAsync(string paymentIntentId, CancellationToken ct)
    {
        var service = new Stripe.RefundService(_client);
        await service.CreateAsync(
            new Stripe.RefundCreateOptions { PaymentIntent = paymentIntentId },
            new Stripe.RequestOptions { IdempotencyKey = $"refund-{paymentIntentId}" },
            ct);
    }

    private static string FormatBrand(string brand) => brand switch
    {
        "visa" => "Visa",
        "mastercard" => "Mastercard",
        "amex" => "Amex",
        "discover" => "Discover",
        _ => char.ToUpperInvariant(brand[0]) + brand[1..],
    };
}

/// <summary>
/// Development-only stand-in used when Stripe keys aren't configured, so the whole
/// ordering flow can be tried locally. Every payment "succeeds" as a Visa credit card.
/// </summary>
public class DemoPaymentService : IPaymentService
{
    public string Mode => "demo";
    public string? PublishableKey => null;

    public Task<PaymentSession> CreatePaymentAsync(Domain.Order order, CancellationToken ct) =>
        Task.FromResult(new PaymentSession(Mode, $"demo_{order.Id:N}", null, null));

    public Task<PaymentResult> GetPaymentAsync(string paymentIntentId, CancellationToken ct) =>
        Task.FromResult(new PaymentResult(true, "succeeded", -1, PaymentMethodKind.Credit, "Visa", "4242"));

    public Task RefundAsync(string paymentIntentId, CancellationToken ct) => Task.CompletedTask;
}
