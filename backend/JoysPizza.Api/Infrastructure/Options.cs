using System.ComponentModel.DataAnnotations;

namespace JoysPizza.Api.Infrastructure;

public class JwtOptions
{
    public const string Section = "Jwt";

    [Required] public string Issuer { get; set; } = "";
    [Required] public string Audience { get; set; } = "";

    /// <summary>HMAC-SHA256 signing key. Use 32+ random characters; keep it out of source control in production.</summary>
    [Required, MinLength(32, ErrorMessage = "Jwt:Key must be at least 32 characters.")]
    public string Key { get; set; } = "";

    [Range(1, 24 * 30)] public int ExpiresHours { get; set; } = 12;
}

public class RestaurantOptions
{
    public const string Section = "Restaurant";

    [Range(0, 100)] public decimal DeliveryFee { get; set; } = 3.99m;
    [Range(0, 10000)] public decimal FreeDeliveryOver { get; set; } = 40m;
    [Required] public string Currency { get; set; } = "usd";
}

public class StripeOptions
{
    public const string Section = "Stripe";

    public string SecretKey { get; set; } = "";
    public string PublishableKey { get; set; } = "";
    public string WebhookSecret { get; set; } = "";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(SecretKey);
}

public class UploadOptions
{
    public const string Section = "Uploads";

    [Range(1024, 50 * 1024 * 1024)] public long MaxBytes { get; set; } = 5 * 1024 * 1024;
}
