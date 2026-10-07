using JoysPizza.Api.Contracts;
using JoysPizza.Api.Data;
using JoysPizza.Api.Domain;
using JoysPizza.Api.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JoysPizza.Api.Controllers;

/// <summary>
/// Staff accounts. Only an Admin can create or remove Store Manager accounts —
/// Store Managers and Customers get 403 Forbidden here.
/// </summary>
[ApiController]
[Route("api/admin/staff")]
[Authorize(Roles = AppRoles.Admin)]
public class StaffController(AppDbContext db, IPasswordHasher<User> hasher) : ControllerBase
{
    /// <summary>All admins and store managers.</summary>
    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> List(CancellationToken ct)
    {
        var staff = await db.Users.AsNoTracking()
            .Where(u => u.Role == UserRole.Admin || u.Role == UserRole.StoreManager)
            .OrderBy(u => u.Role).ThenBy(u => u.Name)
            .ToListAsync(ct);
        return staff.Select(u => u.ToDto()).ToList();
    }

    /// <summary>Create a new Store Manager login.</summary>
    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateStoreManager(CreateStoreManagerRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email, ct))
            throw ApiException.Conflict("An account with this email already exists. Use \"Give access to an existing account\" instead.");

        var user = new User
        {
            Name = req.Name.Trim(),
            Email = email,
            Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
            Role = UserRole.StoreManager,
        };
        user.PasswordHash = hasher.HashPassword(user, req.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return user.ToDto();
    }

    /// <summary>Make an existing customer account a Store Manager.</summary>
    [HttpPost("grant")]
    public async Task<ActionResult<UserDto>> Grant(GrantStoreManagerRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct)
            ?? throw ApiException.NotFound("No account uses that email. Create a new Store Manager instead.");
        if (user.Role == UserRole.Admin)
            throw ApiException.Conflict("That account is an Admin.");

        user.Role = UserRole.StoreManager;
        await db.SaveChangesAsync(ct);
        return user.ToDto();
    }

    /// <summary>Remove Store Manager access (the person keeps a normal customer account).</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return NotFound();
        if (user.Role == UserRole.Admin)
            throw ApiException.BadRequest("Admin accounts can't be removed here.");
        if (user.Role != UserRole.StoreManager) return NoContent();

        user.Role = UserRole.Customer;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
