using JoysPizza.Api.Contracts;
using JoysPizza.Api.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JoysPizza.Api.Controllers;

/// <summary>Menu photo uploads (admin / store manager). Files are saved to wwwroot/uploads and served as static files.</summary>
[ApiController]
[Route("api/uploads")]
[Authorize(Roles = AppRoles.Staff)]
public class UploadsController(IWebHostEnvironment env, IOptions<UploadOptions> options) : ControllerBase
{
    private static readonly Dictionary<string, string> Allowed = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif",
    };

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResult>> Upload(IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) throw ApiException.BadRequest("The file is empty.");
        if (file.Length > options.Value.MaxBytes)
            throw ApiException.BadRequest($"Images must be {options.Value.MaxBytes / (1024 * 1024)} MB or smaller.");
        if (!Allowed.TryGetValue(file.ContentType.ToLowerInvariant(), out var ext))
            throw ApiException.BadRequest("Upload a JPEG, PNG, WebP or GIF image.");

        await using var input = file.OpenReadStream();
        var header = new byte[12];
        var read = await input.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, ct);
        if (!LooksLikeImage(header.AsSpan(0, read)))
            throw ApiException.BadRequest("That file doesn't look like an image.");

        var root = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(root, "uploads");
        Directory.CreateDirectory(dir);
        var name = $"{Guid.NewGuid():N}{ext}";

        await using (var output = System.IO.File.Create(Path.Combine(dir, name)))
        {
            await output.WriteAsync(header.AsMemory(0, read), ct); // bytes already read for the signature check
            await input.CopyToAsync(output, ct);
        }

        return new UploadResult($"{Request.Scheme}://{Request.Host}/uploads/{name}");
    }

    private static ReadOnlySpan<byte> JpegMagic => [0xFF, 0xD8, 0xFF];
    private static ReadOnlySpan<byte> PngMagic => [0x89, 0x50, 0x4E, 0x47];

    private static bool LooksLikeImage(ReadOnlySpan<byte> h) =>
        h.StartsWith(JpegMagic) ||
        h.StartsWith(PngMagic) ||
        h.StartsWith("GIF8"u8) ||
        (h.Length >= 12 && h[..4].SequenceEqual("RIFF"u8) && h[8..12].SequenceEqual("WEBP"u8));
}
