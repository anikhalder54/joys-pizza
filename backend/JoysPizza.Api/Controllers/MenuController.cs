using System.Security.Cryptography;
using JoysPizza.Api.Contracts;
using JoysPizza.Api.Data;
using JoysPizza.Api.Domain;
using JoysPizza.Api.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JoysPizza.Api.Controllers;

[ApiController]
[Route("api/menu")]
public class MenuController(AppDbContext db, TimeProvider clock) : ControllerBase
{
    /// <summary>
    /// The menu. Customers get available items only; admins may pass includeUnavailable=true
    /// to also see hidden (out-of-stock) items.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<MenuItemDto>>> GetAll([FromQuery] bool includeUnavailable, CancellationToken ct)
    {
        if (includeUnavailable && !User.IsAdmin()) return Forbid();

        var query = db.MenuItems.AsNoTracking();
        if (!includeUnavailable) query = query.Where(m => m.IsAvailable);

        var items = await query.OrderBy(m => m.Category).ThenBy(m => m.SortOrder).ThenBy(m => m.Name).ToListAsync(ct);
        return items.Select(m => m.ToDto()).ToList();
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<MenuItemDto>> Get(string id, CancellationToken ct)
    {
        var item = await db.MenuItems.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id, ct);
        if (item is null || (!item.IsAvailable && !User.IsAdmin())) return NotFound();
        return item.ToDto();
    }

    /// <summary>Add a new item (admin).</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<MenuItemDto>> Create(MenuItemUpsertRequest req, CancellationToken ct)
    {
        var item = new MenuItem
        {
            Id = NewId(req.Category),
            Name = "",
            Description = "",
            SortOrder = (await db.MenuItems.Where(m => m.Category == req.Category).MaxAsync(m => (int?)m.SortOrder, ct) ?? -1) + 1,
            CreatedAt = clock.GetUtcNow(),
        };
        Apply(item, req);
        db.MenuItems.Add(item);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = item.Id }, item.ToDto());
    }

    /// <summary>Edit an item (admin).</summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<MenuItemDto>> Update(string id, MenuItemUpsertRequest req, CancellationToken ct)
    {
        var item = await db.MenuItems.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (item is null) return NotFound();
        Apply(item, req);
        await db.SaveChangesAsync(ct);
        return item.ToDto();
    }

    /// <summary>Mark an item available (shown on the website) or unavailable (hidden) (admin).</summary>
    [HttpPatch("{id}/availability")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<MenuItemDto>> SetAvailability(string id, AvailabilityRequest req, CancellationToken ct)
    {
        var item = await db.MenuItems.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (item is null) return NotFound();
        item.IsAvailable = req.Available;
        item.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return item.ToDto();
    }

    /// <summary>Delete an item permanently (admin). Past orders keep their own copy of the name and price.</summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var deleted = await db.MenuItems.Where(m => m.Id == id).ExecuteDeleteAsync(ct);
        return deleted == 0 ? NotFound() : NoContent();
    }

    /// <summary>Replace the whole menu with the sample menu (admin).</summary>
    [HttpPost("reset")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<MenuItemDto>>> Reset(CancellationToken ct)
    {
        await db.MenuItems.ExecuteDeleteAsync(ct);
        var items = SeedMenu.Build();
        db.MenuItems.AddRange(items);
        await db.SaveChangesAsync(ct);
        return items.Select(m => m.ToDto()).ToList();
    }

    private void Apply(MenuItem item, MenuItemUpsertRequest req)
    {
        var sizes = (req.Sizes ?? [])
            .Select(s => new MenuItemSize { Label = s.Label.Trim(), Price = Math.Round(s.Price, 2) })
            .ToList();

        if (sizes.Count == 0 && req.Price <= 0)
            throw ApiException.BadRequest("Enter a price greater than $0, or add at least one size.");
        if (sizes.Select(s => s.Label.ToLowerInvariant()).Distinct().Count() != sizes.Count)
            throw ApiException.BadRequest("Each size needs a different label.");

        var image = req.Image?.Trim() ?? "";
        if (image.Length > 0 && !(image.StartsWith("https://") || image.StartsWith("http://") || image.StartsWith("/uploads/")))
            throw ApiException.BadRequest("Image must be an http(s) URL or an uploaded image.");

        var tags = (req.Tags ?? [])
            .Select(t => t.Trim())
            .Where(t => t.Length is > 0 and <= 30)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        item.Name = req.Name.Trim();
        item.Description = req.Description.Trim();
        item.Category = req.Category;
        item.ImageUrl = image;
        item.Tags = tags;
        item.IsSpecial = req.Special;
        item.IsAvailable = req.Available;
        item.Sizes = sizes;
        item.Price = sizes.Count > 0 ? sizes.Min(s => s.Price) : Math.Round(req.Price, 2);
        item.UpdatedAt = clock.GetUtcNow();
    }

    private static string NewId(MenuCategory category) =>
        $"{category.ToString()[..2].ToLowerInvariant()}-{RandomNumberGenerator.GetHexString(8, lowercase: true)}";
}
