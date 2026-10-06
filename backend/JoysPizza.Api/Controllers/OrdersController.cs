using JoysPizza.Api.Contracts;
using JoysPizza.Api.Data;
using JoysPizza.Api.Domain;
using JoysPizza.Api.Infrastructure;
using JoysPizza.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JoysPizza.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController(AppDbContext db, OrderService orders) : ControllerBase
{
    /// <summary>
    /// Place an order. Prices, deals and fees are calculated on the server. Returns the order
    /// ("Awaiting payment") plus what the browser needs to collect payment.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<CreateOrderResponse>> Create(CreateOrderRequest req, CancellationToken ct)
    {
        var result = await orders.CreateAsync(User.GetUserId(), req, ct);
        return CreatedAtAction(nameof(Get), new { number = result.Order.Id }, result);
    }

    /// <summary>
    /// Called by the browser after Stripe confirms the payment. Verifies the payment with Stripe
    /// (the client is never trusted) and sends the order to the kitchen.
    /// </summary>
    [HttpPost("{number}/confirm-payment")]
    public async Task<ActionResult<OrderDto>> ConfirmPayment(string number, CancellationToken ct)
    {
        var order = await LoadAsync(number, ct);
        if (order is null) return NotFound();
        order = await orders.SyncPaymentAsync(order, ct);
        if (order.Status == OrderStatus.AwaitingPayment)
            throw ApiException.Payment("We haven't received the payment for this order yet.");
        return order.ToDto();
    }

    /// <summary>The signed-in customer's orders (newest first).</summary>
    [HttpGet("mine")]
    public async Task<ActionResult<List<OrderDto>>> Mine(CancellationToken ct)
    {
        var userId = User.GetUserId();
        var list = await db.Orders.AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.UserId == userId && o.Status != OrderStatus.AwaitingPayment)
            .OrderByDescending(o => o.CreatedAt)
            .Take(100)
            .ToListAsync(ct);
        return list.Select(o => o.ToDto()).ToList();
    }

    /// <summary>One order. Customers can see their own orders; admins can see any order.</summary>
    [HttpGet("{number}")]
    public async Task<ActionResult<OrderDto>> Get(string number, CancellationToken ct)
    {
        var order = await LoadAsync(number, ct);
        if (order is null) return NotFound();
        // If the webhook hasn't arrived yet, check with the payment provider.
        if (order.Status == OrderStatus.AwaitingPayment) order = await orders.SyncPaymentAsync(order, ct);
        return order.ToDto();
    }

    private async Task<Order?> LoadAsync(string number, CancellationToken ct)
    {
        var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Number == number, ct);
        if (order is null) return null;
        return order.UserId == User.GetUserId() || User.IsAdmin() ? order : null;
    }
}

/// <summary>Kitchen dashboard endpoints.</summary>
[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "Admin")]
public class AdminOrdersController(AppDbContext db, OrderService orders, TimeProvider clock) : ControllerBase
{
    /// <summary>Paid orders from the last <paramref name="days"/> days (default 3), newest first.</summary>
    [HttpGet]
    public async Task<ActionResult<List<OrderDto>>> List([FromQuery] int days = 3, CancellationToken ct = default)
    {
        var since = clock.GetUtcNow().AddDays(-Math.Clamp(days, 1, 90));
        var list = await db.Orders.AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.Status != OrderStatus.AwaitingPayment && (o.CreatedAt >= since || (o.Status != OrderStatus.Completed && o.Status != OrderStatus.Cancelled)))
            .OrderByDescending(o => o.CreatedAt)
            .Take(500)
            .ToListAsync(ct);
        return list.Select(o => o.ToDto()).ToList();
    }

    /// <summary>Move an order through the kitchen workflow. Cancelling a paid order refunds it.</summary>
    [HttpPatch("{number}/status")]
    public async Task<ActionResult<OrderDto>> UpdateStatus(string number, UpdateStatusRequest req, CancellationToken ct)
    {
        var order = await orders.UpdateStatusAsync(number, req.Status, ct);
        return order.ToDto();
    }
}
