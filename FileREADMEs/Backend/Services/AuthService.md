# `AuthService.cs` — Service

**Location:** `LearnSphereBackend-master/Services/AuthService.cs`

---

## What This File Does

`AuthService` contains all the **business logic for authentication**: register, login, and reset password. It is called by `AuthController` but operates independently — the controller just passes data in and returns the result.

This is the core of the authentication system.

---

## Dependencies Injected

```csharp
public AuthService(IUserRepository users, IStudentRepository students, IJwtTokenService jwt)
```

| Dependency           | Why                                                         |
| -------------------- | ----------------------------------------------------------- |
| `IUserRepository`    | To check if email exists, fetch user by email, save changes |
| `IStudentRepository` | To create the Student profile when a new user registers     |
| `IJwtTokenService`   | To generate the JWT token after successful login/register   |

---

## RegisterAsync — Full Flow

```csharp
public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto req, CancellationToken ct)
{
    // 1. Normalize email
    var email = req.Email.Trim().ToLower();

    // 2. Check uniqueness — throw if email already used
    if (await _users.EmailExistsAsync(email, ct))
        throw new InvalidOperationException("Email already exists");

    // 3. Create User entity
    var user = new User
    {
        Name = req.Name.Trim(),
        Email = email,
        Role = "student",          // Always student on self-registration
        Status = "active",
        CreatedAt = DateTime.UtcNow
    };
    user.PasswordHash = _hasher.HashPassword(user, req.Password);  // PBKDF2 hash

    // 4. Save User to DB
    await _users.AddAsync(user, ct);

    // 5. Create linked Student profile
    var student = new Student { UserId = user.Id, FullName = user.Name, Email = user.Email };
    await _students.AddAsync(student, ct);

    // 6. SaveChanges
    await _users.SaveChangesAsync(ct);

    // 7. Return token + basic info
    return new AuthResponseDto
    {
        Token = _jwt.CreateToken(user),
        Name = user.Name,
        Email = user.Email,
        Role = user.Role
    };
}
```

---

## LoginAsync — Full Flow

```csharp
public async Task<AuthResponseDto> LoginAsync(LoginRequestDto req, CancellationToken ct)
{
    // 1. Normalize email
    var email = req.Email.Trim().ToLower();

    // 2. Find user (throws 401 if not found)
    var user = await _users.GetByEmailAsync(email, ct);
    if (user is null)
        throw new UnauthorizedAccessException("Invalid email or password");

    // 3. Check if account is active
    if (user.Status != "active")
        throw new UnauthorizedAccessException("Account is deactivated");

    // 4. Verify password hash
    var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
    if (verify == PasswordVerificationResult.Failed)
        throw new UnauthorizedAccessException("Invalid email or password");

    // 5. Success — issue JWT
    return new AuthResponseDto
    {
        Token = _jwt.CreateToken(user),
        Name = user.Name,
        Email = user.Email,
        Role = user.Role
    };
}
```

Note: Both "user not found" and "wrong password" throw the same `UnauthorizedAccessException("Invalid email or password")`. This prevents **user enumeration attacks** — an attacker can't know if the email exists.

---

## Why Exceptions Instead of Return Values?

When `AuthService` throws `InvalidOperationException`, the `AuthController` catches it and returns `400 BadRequest`. When it throws `UnauthorizedAccessException`, the controller returns `401 Unauthorized`. This keeps the controller thin — just catch → return.

If these errors were returned as objects, the controller would need `if (result.error != null) return BadRequest(result.error)` logic everywhere.

---

## Interview Questions & Answers

**Q: Why don't you return "User does not exist" and "Wrong password" as separate messages?**
That would allow user enumeration — trying emails until you get "wrong password" tells you the email exists. Giving the same message for both cases prevents this.

**Q: How is the password hashed?**
`PasswordHasher<User>` from ASP.NET Core Identity uses PBKDF2 (Password-Based Key Derivation Function 2) with a random per-user salt, 10,000+ iterations, SHA-256. This makes brute-force attacks extremely slow.

**Q: Why is CancellationToken passed through all async methods?**
It propagates the request's cancellation signal. If the client disconnects mid-request (e.g., user navigates away), the CancellationToken is cancelled, which stops in-progress DB queries and prevents wasted resources.

**Q: What's the difference between `InvalidOperationException` and `UnauthorizedAccessException`?**
`InvalidOperationException` → 400 Bad Request (the request is wrong — email already exists).
`UnauthorizedAccessException` → 401 Unauthorized (credentials are wrong). Different HTTP semantics.
