using System.Security.Claims;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace JoysPizza.Api.Infrastructure;

/// <summary>Business-rule failure that should reach the client as an RFC 7807 problem response.</summary>
public class ApiException(int statusCode, string title, string? detail = null) : Exception(detail ?? title)
{
    public int StatusCode { get; } = statusCode;
    public string Title { get; } = title;
    public string? Detail { get; } = detail;

    public static ApiException BadRequest(string detail) => new(StatusCodes.Status400BadRequest, "Invalid request", detail);
    public static ApiException NotFound(string detail) => new(StatusCodes.Status404NotFound, "Not found", detail);
    public static ApiException Conflict(string detail) => new(StatusCodes.Status409Conflict, "Conflict", detail);
    public static ApiException Payment(string detail) => new(StatusCodes.Status402PaymentRequired, "Payment problem", detail);
}

public class ApiExceptionHandler(IProblemDetailsService problemDetails, ILogger<ApiExceptionHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        var (status, title, detail) = exception switch
        {
            ApiException api => (api.StatusCode, api.Title, api.Detail),
            Stripe.StripeException stripe => (StatusCodes.Status502BadGateway, "Payment provider error", stripe.StripeError?.Message ?? "The payment provider returned an error."),
            _ => (StatusCodes.Status500InternalServerError, "Something went wrong", (string?)null),
        };

        if (status >= 500) log.LogError(exception, "Unhandled error on {Path}", http.Request.Path);

        http.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = http,
            Exception = exception,
            ProblemDetails = new ProblemDetails { Status = status, Title = title, Detail = detail },
        });
    }
}

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue("sub"), out var id)
            ? id
            : throw new ApiException(StatusCodes.Status401Unauthorized, "Unauthorized", "Missing or invalid user id in token.");

    public static bool IsAdmin(this ClaimsPrincipal user) => user.IsInRole(AppRoles.Admin);

    /// <summary>Admin or Store Manager.</summary>
    public static bool IsStaff(this ClaimsPrincipal user) =>
        user.IsInRole(AppRoles.Admin) || user.IsInRole(AppRoles.StoreManager);
}

/// <summary>Role names used in [Authorize(Roles = ...)] — they match UserRole.ToString() in the token.</summary>
public static class AppRoles
{
    public const string Admin = "Admin";
    public const string StoreManager = "StoreManager";
    /// <summary>Kitchen dashboard + menu management.</summary>
    public const string Staff = "Admin,StoreManager";
}
