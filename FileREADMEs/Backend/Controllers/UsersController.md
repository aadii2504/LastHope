# `UsersController.cs` — Controller

**Location:** `LearnSphereBackend-master/Controllers/UsersController.cs`

---

## What This File Does

Admin-only controller for user management. Provides two operations: list all users with their student profiles, and toggle a user's active/inactive status.

---

## Base Route

```csharp
[Route("api/users")]
```

---

## Endpoint Map

| Method | Route          | Auth       | Description                          |
| ------ | -------------- | ---------- | ------------------------------------ |
| `GET`  | `/`            | Admin only | List all users with student profiles |
| `PUT`  | `/{id}/status` | Admin only | Activate or deactivate a user        |

---

## GetAll — Returns Users With Nested Student Profile

```csharp
[HttpGet]
[Authorize]
public async Task<IActionResult> GetAll()
{
    if (!User.IsInRole("admin"))
        return StatusCode(403, new { error = "Only admins can view users" });

    var users = await _repo.GetAllAsync();

    // Map to DTO — flattens User + nested StudentProfile
    var dtos = users.Select(u => new UserDto
    {
        Id = u.Id,
        Name = u.Name,
        Email = u.Email,
        Role = u.Role,
        Status = u.Status,
        CreatedAt = u.CreatedAt,
        StudentProfile = u.StudentProfile == null ? null : new StudentMeResponseDto
        {
            FullName = u.StudentProfile.FullName,
            Email = u.StudentProfile.Email,
            // ...all student fields
        }
    });

    return Ok(dtos);
}
```

---

## UpdateStatus — Toggle Active/Inactive

```csharp
[HttpPut("{id}/status")]
public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateUserStatusRequestDto req)
{
    if (!User.IsInRole("admin")) return StatusCode(403, ...);

    // Validate status value
    if (req.Status != "active" && req.Status != "inactive")
        return BadRequest(new { error = "Invalid status" });

    var user = (await _repo.GetAllAsync()).FirstOrDefault(u => u.Id == id);
    if (user == null) return NotFound(...);

    user.Status = req.Status;
    await _repo.SaveChangesAsync(ct);

    return Ok(new { message = "Status updated successfully" });
}
```

Setting `Status = "inactive"` prevents login because `AuthService.LoginAsync()` checks:

```csharp
if (user.Status != "active")
    throw new UnauthorizedAccessException("Account is deactivated");
```

---

## Interview Questions & Answers

**Q: Why is `[Authorize]` + manual role check used instead of `[Authorize(Roles = "admin")]`?**
Both work identically. `[Authorize(Roles = "admin")]` returns a generic 403 response. The manual check allows returning a custom JSON error body: `{ "error": "Only admins can view users" }`. Better for API clients.

**Q: Why does GetAllAsync() load all users to find one by ID for status update?**
This is slightly inefficient — ideally `IUserRepository` would have a `GetByIdAsync(Guid id)` method. This is a candidate for improvement. At current scale (few users) it doesn't matter.

**Q: How does deactivating a user affect their current JWT tokens?**
It doesn't immediately. Existing JWT tokens remain valid until expiry (2 hours). Only the next login attempt is blocked. For immediate revocation, you'd need a token blacklist stored in a cache (Redis).
