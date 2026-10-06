using System.Security.Cryptography;
using JoysPizza.Api.Contracts;
using JoysPizza.Api.Data;
using JoysPizza.Api.Domain;
using JoysPizza.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JoysPizza.Api.Services;

public class OrderService(
    AppDbContext db,
    IPaymentService payments,
    IOptions<RestaurantOptions> restaurantOptions,
    TimeProvider clock,
    ILogger<OrderService> log)
{
    private readonly RestaurantOptions _restaurant = restaurantOptions.Value;

    /// <summary>
    /// Prices the cart on the server (never trusting client prices), saves the order as
    /// "Awaiting payment" and opens a payment session.
    /// </summary>
    public async Task<CreateOrderResponse> CreateAsync(Guid userId, CreateOrderRequest req, CancellationToken ct)
    {
        if (req.Fulfillment == FulfillmentType.Delivery && string.IsNullOrWhiteSpace(req.Address))
            throw ApiException.BadRequest("A delivery address is required for delivery orders.");

        var ids = req.Items.Select(i => i.MenuItemId).Distinct().ToList();
        var menu = await db.MenuItems.AsNoTracking().Where(m => ids.Contains(m.Id)).ToDictionaryAsync(m => m.Id, ct);

        var lines = new List<OrderItem>();
        foreach (var line in req.Items)
        {
            if (!menu.TryGetValue(line.MenuItemId, out var item))
                throw ApiException.BadRequest($"Menu item '{line.MenuItemId}' no longer exists.");
            if (!item.IsAvailable)
                throw ApiException.Conflict($"Sorry — {item.Name} is currently unavailable. Please remove it from your cart.");

            decimal unitPrice;
            string? size = null;
            if (item.Sizes.Count > 0)
            {
                var chosen = item.Sizes.FirstOrDefault(s => string.Equals(s.Label, line.Size, StringComparison.OrdinalIgnoreCase))
                    ?? throw ApiException.BadRequest($"Please choose a valid size for {item.Name}.");
                unitPrice = chosen.Price;
                size = chosen.Label;
            }
            else
            {
                unitPrice = item.Price;
            }

            // Merge duplicate lines (same item + size).
            var existing = lines.FirstOrDefault(l => l.MenuItemId == item.Id && l.Size == size);
            if (existing is not null) existing.Quantity += line.Quantity;
            else
                lines.Add(new OrderItem
                {
                    MenuItemId = item.Id,
                    Name = item.Name,
                    ImageUrl = item.ImageUrl,
                    Size = size,
                    UnitPrice = unitPrice,
                    Quantity = line.Quantity,
                });
        }

        // Deals: "Buy 2 Large Cheese Pizzas, Get 1 Medium FREE" (free pizzas become $0 lines).
        Promotions.Apply(lines);

        // No sales tax is charged (prices are final).
        var subtotal = Round(lines.Sum(l => l.UnitPrice * l.Quantity));
        const decimal tax = 0m;
        var deliveryFee = req.Fulfillment == FulfillmentType.Pickup || subtotal >= _restaurant.FreeDeliveryOver
            ? 0m
            : _restaurant.DeliveryFee;
        var tip = Round(subtotal * req.TipPercent);
        var now = clock.GetUtcNow();

        var order = new Order
        {
            Number = await NewOrderNumberAsync(ct),
            UserId = userId,
            CustomerName = req.CustomerName.Trim(),
            Email = req.Email.Trim(),
            Phone = req.Phone.Trim(),
            Fulfillment = req.Fulfillment,
            Address = req.Fulfillment == FulfillmentType.Delivery ? req.Address?.Trim() : null,
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            Subtotal = subtotal,
            Tax = tax,
            DeliveryFee = deliveryFee,
            Tip = tip,
            Total = subtotal + deliveryFee + tip,
            Status = OrderStatus.AwaitingPayment,
            CreatedAt = now,
            UpdatedAt = now,
            Items = lines,
        };

        var session = await payments.CreatePaymentAsync(order, ct);
        order.PaymentIntentId = session.PaymentIntentId;

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        log.LogInformation("Order {Number} created ({Total:C}) awaiting payment", order.Number, order.Total);

        return new CreateOrderResponse(order.ToDto(), new PaymentSessionDto(session.Mode, session.ClientSecret, session.PublishableKey));
    }

    /// <summary>
    /// Asks the payment provider whether the order was paid and, if so, sends it to the kitchen.
    /// Safe to call repeatedly (browser confirmation and the Stripe webhook may both call it).
    /// </summary>
    public async Task<Order> SyncPaymentAsync(Order order, CancellationToken ct)
    {
        if (order.Status != OrderStatus.AwaitingPayment || order.PaymentIntentId is null) return order;

        var result = await payments.GetPaymentAsync(order.PaymentIntentId, ct);
        if (!result.Succeeded) return order;

        if (result.AmountCents >= 0 && result.AmountCents != Money.ToCents(order.Total))
        {
            log.LogError("Amount mismatch on {Number}: paid {Paid} cents, expected {Expected}",
                order.Number, result.AmountCents, Money.ToCents(order.Total));
            throw ApiException.Payment("The amount paid doesn't match this order. Please contact the restaurant.");
        }

        var now = clock.GetUtcNow();
        order.Status = OrderStatus.Received;
        order.PaidAt = now;
        order.UpdatedAt = now;
        order.PaymentMethod = result.Method ?? PaymentMethodKind.Card;
        order.CardBrand = result.Brand;
        order.CardLast4 = result.Last4;
        await db.SaveChangesAsync(ct);
        log.LogInformation("Order {Number} paid via {Method}", order.Number, order.PaymentMethod);
        return order;
    }

    public async Task<Order?> SyncPaymentByIntentAsync(string paymentIntentId, CancellationToken ct)
    {
        var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.PaymentIntentId == paymentIntentId, ct);
        return order is null ? null : await SyncPaymentAsync(order, ct);
    }

    /// <summary>Kitchen status change. Cancelling a paid order refunds it.</summary>
    public async Task<Order> UpdateStatusAsync(string number, OrderStatus status, CancellationToken ct)
    {
        var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Number == number, ct)
            ?? throw ApiException.NotFound($"Order {number} was not found.");

        if (status == OrderStatus.AwaitingPayment)
            throw ApiException.BadRequest("An order can't be moved back to 'Awaiting payment'.");
        if (order.Status == OrderStatus.Cancelled)
            throw ApiException.Conflict("This order was cancelled and can't be changed.");
        if (order.Status == OrderStatus.AwaitingPayment && status != OrderStatus.Cancelled)
            throw ApiException.Conflict("This order hasn't been paid yet.");
        if (status == OrderStatus.OutForDelivery && order.Fulfillment == FulfillmentType.Pickup)
            throw ApiException.BadRequest("Pickup orders can't be sent out for delivery.");

        if (status == OrderStatus.Cancelled && order.PaidAt is not null && order.RefundedAt is null && order.PaymentIntentId is not null)
        {
            await payments.RefundAsync(order.PaymentIntentId, ct);
            order.RefundedAt = clock.GetUtcNow();
            log.LogInformation("Order {Number} cancelled and refunded", order.Number);
        }

        order.Status = status;
        order.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return order;
    }

    private static decimal Round(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

    private async Task<string> NewOrderNumberAsync(CancellationToken ct)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var number = "ORD-" + RandomNumberGenerator.GetString(Alphabet, 8);
            if (!await db.Orders.AnyAsync(o => o.Number == number, ct)) return number;
        }
        throw new InvalidOperationException("Could not generate a unique order number.");
    }
}
