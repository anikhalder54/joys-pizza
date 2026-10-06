using JoysPizza.Api.Domain;

namespace JoysPizza.Api.Contracts;

public static class Mapping
{
    public static UserDto ToDto(this User u) => new(u.Id, u.Name, u.Email, u.Phone, u.Role);

    public static MenuItemDto ToDto(this MenuItem m) => new(
        m.Id,
        m.Name,
        m.Description,
        m.Price,
        m.Category,
        m.ImageUrl,
        m.Tags,
        m.IsSpecial,
        m.Sizes.Count > 0 ? m.Sizes.Select(s => new SizeDto(s.Label, s.Price)).ToList() : null,
        m.IsAvailable,
        m.UpdatedAt);

    public static OrderDto ToDto(this Order o) => new(
        o.Number,
        o.UserId,
        o.CustomerName,
        o.Email,
        o.Phone,
        o.Items
            .OrderBy(i => i.Id)
            .Select(i => new OrderLineDto(
                $"{i.MenuItemId}|{i.Size}|{(i.UnitPrice == 0m ? "free" : "paid")}", i.MenuItemId, i.Name, i.ImageUrl, i.Size, i.UnitPrice, i.Quantity))
            .ToList(),
        o.Subtotal,
        o.DeliveryFee,
        o.Tip,
        o.Total,
        o.Fulfillment,
        o.Address,
        o.Notes,
        o.PaymentMethod is { } method ? new PaymentInfoDto(method, o.CardBrand, o.CardLast4) : null,
        o.Status,
        o.CreatedAt,
        o.PaidAt,
        o.RefundedAt is not null);
}
