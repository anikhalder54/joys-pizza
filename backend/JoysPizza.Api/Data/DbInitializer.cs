using JoysPizza.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace JoysPizza.Api.Data;

public static class DbInitializer
{
    /// <summary>
    /// Creates/updates the schema and seeds the menu + admin account.
    /// Uses EF migrations when the project has any (recommended for production),
    /// otherwise creates the schema directly so the app runs out of the box.
    /// </summary>
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<AppDbContext>();
        var config = sp.GetRequiredService<IConfiguration>();
        var hasher = sp.GetRequiredService<IPasswordHasher<User>>();
        var log = sp.GetRequiredService<ILoggerFactory>().CreateLogger("DbInitializer");

        if (db.Database.GetMigrations().Any())
        {
            await db.Database.MigrateAsync(ct);
        }
        else
        {
            // Not EnsureCreated(): hosted databases such as Supabase already contain their own tables,
            // which makes EnsureCreated() think the schema exists and skip creating ours.
            var creator = db.GetService<IRelationalDatabaseCreator>();
            if (!await creator.ExistsAsync(ct)) await creator.CreateAsync(ct);

            var hasOurTables = await db.Database
                .SqlQueryRaw<bool>("SELECT to_regclass('menu_items') IS NOT NULL AS \"Value\"")
                .SingleAsync(ct);
            if (!hasOurTables)
            {
                await creator.CreateTablesAsync(ct);
                log.LogInformation("Created database tables");
            }
        }

        if (!await db.MenuItems.AnyAsync(ct))
        {
            db.MenuItems.AddRange(SeedMenu.Build());
            log.LogInformation("Seeded sample menu");
        }

        var adminEmail = config["Seed:AdminEmail"]?.Trim().ToLowerInvariant();
        var adminPassword = config["Seed:AdminPassword"];
        if (!string.IsNullOrEmpty(adminEmail) && !await db.Users.AnyAsync(u => u.Role == UserRole.Admin, ct))
        {
            if (string.IsNullOrWhiteSpace(adminPassword))
            {
                log.LogWarning("No admin account exists. Set Seed:AdminPassword to create {Email}.", adminEmail);
            }
            else
            {
                var admin = new User { Name = "Store Manager", Email = adminEmail, Role = UserRole.Admin };
                admin.PasswordHash = hasher.HashPassword(admin, adminPassword);
                db.Users.Add(admin);
                log.LogInformation("Created admin account {Email}", adminEmail);
            }
        }

        if (config.GetValue<bool>("Seed:DemoCustomer") && !await db.Users.AnyAsync(u => u.Email == "jamie@example.com", ct))
        {
            var demo = new User { Name = "Jamie Rivera", Email = "jamie@example.com", Phone = "(917) 555-0199" };
            demo.PasswordHash = hasher.HashPassword(demo, "password");
            db.Users.Add(demo);
        }

        await db.SaveChangesAsync(ct);
    }
}
