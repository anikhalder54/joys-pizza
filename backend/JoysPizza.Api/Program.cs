using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using JoysPizza.Api.Data;
using JoysPizza.Api.Domain;
using JoysPizza.Api.Infrastructure;
using JoysPizza.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------- Options (validated at startup) ----------
builder.Services.AddOptions<JwtOptions>().Bind(config.GetSection(JwtOptions.Section)).ValidateDataAnnotations().ValidateOnStart();
builder.Services.AddOptions<RestaurantOptions>().Bind(config.GetSection(RestaurantOptions.Section)).ValidateDataAnnotations().ValidateOnStart();
builder.Services.AddOptions<UploadOptions>().Bind(config.GetSection(UploadOptions.Section)).ValidateDataAnnotations();
builder.Services.Configure<StripeOptions>(config.GetSection(StripeOptions.Section));

// ---------- Database (PostgreSQL) ----------
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(
        config.GetConnectionString("Default") ?? throw new InvalidOperationException("ConnectionStrings:Default is missing."),
        npgsql => npgsql.EnableRetryOnFailure(maxRetryCount: 5)));

// ---------- Auth (JWT bearer) ----------
var jwt = config.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            // Options validation (Jwt:Key >= 32 chars) fails startup before any token is checked.
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key.PadRight(32))),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "name",
            RoleClaimType = "role",
        };
    });
builder.Services.AddAuthorization();

// ---------- App services ----------
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddScoped<OrderService>();

var stripe = config.GetSection(StripeOptions.Section).Get<StripeOptions>() ?? new StripeOptions();
if (stripe.IsConfigured)
    builder.Services.AddSingleton<IPaymentService, StripePaymentService>();
else if (builder.Environment.IsDevelopment())
    builder.Services.AddSingleton<IPaymentService, DemoPaymentService>();
else
    throw new InvalidOperationException("Stripe:SecretKey must be configured outside Development.");

// ---------- Web ----------
builder.Services
    .AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));
        o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

var origins = config.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    // 10 sign-in / sign-up attempts per minute per client IP.
    o.AddPolicy("auth", http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();

// ---------- Pipeline ----------
app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                 // /openapi/v1.json
    app.MapScalarApiReference();      // /scalar/v1 — interactive API docs
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseStaticFiles();                 // serves wwwroot/uploads
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

await DbInitializer.InitializeAsync(app.Services);

if (app.Services.GetRequiredService<IPaymentService>().Mode == "demo")
    app.Logger.LogWarning("Stripe keys not set — using DEMO payments (every payment succeeds). Set Stripe:SecretKey and Stripe:PublishableKey for real payments.");

app.Run();
