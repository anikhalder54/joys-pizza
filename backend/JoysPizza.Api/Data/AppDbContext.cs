using JoysPizza.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace JoysPizza.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        // Readable enum values in the database ("Received", "Pizza", ...).
        builder.Properties<Enum>().HaveConversion<string>().HaveMaxLength(32);
        // Money: numeric(10,2).
        builder.Properties<decimal>().HavePrecision(10, 2);
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Name).HasMaxLength(100);
            e.Property(u => u.Email).HasMaxLength(254);
            e.Property(u => u.Phone).HasMaxLength(30);
            e.Property(u => u.PasswordHash).HasMaxLength(512);
        });

        b.Entity<MenuItem>(e =>
        {
            e.ToTable("menu_items");
            e.HasKey(m => m.Id);
            e.Property(m => m.Id).HasMaxLength(64);
            e.Property(m => m.Name).HasMaxLength(80);
            e.Property(m => m.Description).HasMaxLength(500);
            e.Property(m => m.ImageUrl).HasMaxLength(2048);
            e.Property(m => m.Tags).HasColumnType("text[]");
            e.OwnsMany(m => m.Sizes, s => s.ToJson());
            e.HasIndex(m => new { m.Category, m.SortOrder });
        });

        b.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.HasIndex(o => o.Number).IsUnique();
            e.HasIndex(o => o.PaymentIntentId);
            e.HasIndex(o => o.CreatedAt);
            e.HasIndex(o => new { o.UserId, o.CreatedAt });
            e.Property(o => o.Number).HasMaxLength(20);
            e.Property(o => o.CustomerName).HasMaxLength(100);
            e.Property(o => o.Email).HasMaxLength(254);
            e.Property(o => o.Phone).HasMaxLength(30);
            e.Property(o => o.Address).HasMaxLength(300);
            e.Property(o => o.Notes).HasMaxLength(500);
            e.Property(o => o.PaymentIntentId).HasMaxLength(255);
            e.Property(o => o.CardBrand).HasMaxLength(32);
            e.Property(o => o.CardLast4).HasMaxLength(4);
            e.Property(o => o.PaymentMethod).HasConversion<string>().HasMaxLength(32);

            e.HasOne(o => o.User).WithMany(u => u.Orders).HasForeignKey(o => o.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(o => o.Items).WithOne().HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<OrderItem>(e =>
        {
            e.ToTable("order_items");
            e.Property(i => i.MenuItemId).HasMaxLength(64);
            e.Property(i => i.Name).HasMaxLength(80);
            e.Property(i => i.ImageUrl).HasMaxLength(2048);
            e.Property(i => i.Size).HasMaxLength(40);
        });
    }
}
