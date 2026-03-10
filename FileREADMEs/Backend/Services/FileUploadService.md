# `FileUploadService.cs` — Service

**Location:** `LearnSphereBackend-master/Services/FileUploadService.cs`

---

## What This File Does

Handles all file upload operations: validating file type and size, saving the file to the server's disk (`wwwroot/uploads/`), and returning a URL to access it. Also handles file deletion.

---

## Allowed File Types

```csharp
private readonly string[] AllowedVideoExtensions   = [".mp4", ".avi", ".mov", ".mkv", ".webm"];
private readonly string[] AllowedAudioExtensions   = [".mp3", ".wav", ".aac", ".flac"];
private readonly string[] AllowedDocumentExtensions= [".pdf", ".docx", ".pptx", ".xlsx"];
private readonly string[] AllowedImageExtensions   = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
private const long MaxFileSize = 500 * 1024 * 1024; // 500 MB
```

---

## UploadFileAsync — Step by Step

```csharp
public async Task<(bool success, string? fileUrl, string? fileName, long fileSize, string? error)>
    UploadFileAsync(IFormFile file, string contentType, int? courseId = null)
{
    // Step 1: Validate not empty
    if (file == null || file.Length == 0)
        return (false, null, null, 0, "File is empty");

    // Step 2: Validate size
    if (file.Length > MaxFileSize)
        return (false, null, null, 0, "File size exceeds 500 MB");

    // Step 3: Validate extension
    var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
    if (!IsValidFileType(fileExtension, contentType))
        return (false, null, null, 0, $"File type not allowed for {contentType}");

    // Step 4: Create upload directory
    var uploadDir = courseId.HasValue
        ? Path.Combine(webRootPath, "uploads", "courses", courseId.Value.ToString())
        : Path.Combine(webRootPath, "uploads", "live-sessions");
    Directory.CreateDirectory(uploadDir);

    // Step 5: Generate unique filename
    var uniqueFileName = $"{Guid.NewGuid()}_{DateTime.UtcNow.Ticks}{fileExtension}";
    var filePath = Path.Combine(uploadDir, uniqueFileName);

    // Step 6: Save file to disk
    using (var stream = new FileStream(filePath, FileMode.Create))
        await file.CopyToAsync(stream);

    // Step 7: Build and return the HTTP URL
    var fileUrl = $"http://localhost:5267/uploads/courses/{courseId}/{uniqueFileName}";
    return (true, fileUrl, file.FileName, file.Length, null);
}
```

---

## Return Type — Value Tuple

```csharp
(bool success, string? fileUrl, string? fileName, long fileSize, string? error)
```

Named tuples are used instead of a separate DTO class for brevity. The caller deconstructs it:

```csharp
var (success, fileUrl, fileName, fileSize, uploadError) =
    await _fileUploadService.UploadFileAsync(file, contentType, courseId);

if (!success) return BadRequest(new { error = uploadError });
```

---

## How Files Are Served

`app.UseStaticFiles()` in `Program.cs` serves everything in `wwwroot/` as static HTTP files.

```
File saved at:  wwwroot/uploads/courses/5/abc123_xyz.mp4
URL accessible: http://localhost:5267/uploads/courses/5/abc123_xyz.mp4
```

---

## Why Delete Content-Type Header on Frontend for FormData?

```javascript
// http.js interceptor
if (config.data instanceof FormData) {
  delete config.headers["Content-Type"]; // Let browser set multipart boundary
}
```

When axios sends `FormData`, the browser must auto-generate the `Content-Type: multipart/form-data; boundary=----XYZ` header. The boundary string tells the server where each field ends. If you manually set `Content-Type: multipart/form-data` (without boundary), the server can't parse the body.

---

## Interview Questions & Answers

**Q: What if two admins upload files with the same original name?**
There's no collision because the filename is always `{Guid}_{Ticks}.ext` — unique per upload. Original filename is stored separately in the `CourseContent.FileName` field for display purposes.

**Q: What happens in production where the server might restart and lose files?**
This is a known limitation. In production, you'd replace the disk storage with Azure Blob Storage. The `FileUploadService` interface makes this easy — just write a new `AzureFileUploadService` implementing `IFileUploadService` and register it in DI without changing any controller code.

**Q: What is `IFormFile`?**
It's ASP.NET Core's interface for an uploaded file in a multipart/form-data request. It exposes `FileName`, `Length`, `ContentType`, and `CopyToAsync(stream)`. The `[FromForm]` attribute in the controller tells the framework to read the body as form data.
