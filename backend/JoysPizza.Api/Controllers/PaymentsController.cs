using JoysPizza.Api.Contracts;
using JoysPizza.Api.Infrastructure;
using JoysPizza.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JoysPizza.Api.Controllers;

[ApiController]
[AllowAnonymous]
public class PaymentsController(
    OrderService orders,
    IPaymentService payments,
    IOptions<StripeOptions> stripe,
    IOptions<RestaurantOptions> restaurant,
    ILogger<PaymentsController> log) : ControllerBase
{
    /// <summary>Public settings the frontend needs (fees and which payment mode is active).</summary>
    [HttpGet("api/config")]
    public PublicConfigDto Config() => new(
        restaurant.Value.DeliveryFee,
        restaurant.Value.FreeDeliveryOver,
        restaurant.Value.Currency,
        payments.Mode,
        payments.PublishableKey);

    /// <summary>
    /// Stripe webhook. Marks orders as paid even if the customer closes the browser before
    /// the page confirms. Configure the endpoint in Stripe for payment_intent.succeeded.
    /// </summary>
    [HttpPost("api/payments/webhook")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> Webhook(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(stripe.Value.WebhookSecret))
        {
            log.LogWarning("Stripe webhook received but Stripe:WebhookSecret is not configured");
            return NotFound();
        }

        using var reader = new StreamReader(Request.Body);
        var json = await reader.ReadToEndAsync(ct);

        Stripe.Event stripeEvent;
        try
        {
            stripeEvent = Stripe.EventUtility.ConstructEvent(
                json,
                Request.Headers["Stripe-Signature"],
                stripe.Value.WebhookSecret,
                throwOnApiVersionMismatch: false);
        }
        catch (Stripe.StripeException ex)
        {
            log.LogWarning(ex, "Rejected Stripe webhook with an invalid signature");
            return BadRequest();
        }

        if (stripeEvent.Type == "payment_intent.succeeded" && stripeEvent.Data.Object is Stripe.PaymentIntent intent)
        {
            var order = await orders.SyncPaymentByIntentAsync(intent.Id, ct);
            if (order is null) log.LogWarning("No order found for PaymentIntent {Id}", intent.Id);
        }

        return Ok();
    }
}
