# `AuthController.cs` — Controller

**Location:** `LearnSphereBackend-master/Controllers/AuthController.cs`

---

## What This File Does

Exposes HTTP endpoints for user authentication: register, login, logout, and password reset. It's a **thin controller** — all actual logic is in `AuthService`. The controller's job is to receive HTTP requests, call the service, and return HTTP responses.

---

## Base Route

```csharp
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
```

All endpoints are prefixed with `http://localhost:5267/api/auth/`.

---

## Endpoints

### POST /api/auth/register

```csharp
[HttpPost("register")]
public async Task<IActionResult> Register([FromBody] RegisterRequestDto req, CancellationToken ct)
{
    try
    {
        var result = await _auth.RegisterAsync(req, ct);
        _logger.LogInformation("User registered with email - {Email}", result.Email);
        return CreatedAtAction(nameof(Login), result);  // 201 Created
    }
    catch (InvalidOperationException ex)
    {
        return BadRequest(new { error = ex.Message });  // 400 - email already exists
    }
}
```

### POST /api/auth/login

```csharp
[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginRequestDto req, CancellationToken ct)
{
    try
    {
        var result = await _auth.LoginAsync(req, ct);
        if (result.Role == "admin")
            _logger.LogInformation("Admin signed in - {Email}", result.Email);
        else
            _logger.LogInformation("User signed in - {Email}", result.Email);
        return Ok(result);  // 200 with { token, name, email, role }
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { error = ex.Message });  // 401
    }
}
```

### POST /api/auth/logout

```csharp
[HttpPost("logout")]
[Authorize]
public IActionResult Logout()
{
    // JWT is stateless — server doesn't keep sessions
    // Client is responsible for deleting the token from localStorage
    _logger.LogInformation("User logged out");
    return Ok(new { message = "Logged out successfully" });
}
```

### POST /api/auth/reset-password

```csharp
[HttpPost("reset-password")]
public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto req, CancellationToken ct)
{
    try
    {
        await _auth.ResetPasswordAsync(req, ct);
        return Ok(new { message = "Password reset successfully" });
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { error = ex.Message });
    }
}
```

---

## Request/Response Flow (Login)

```
POST /api/auth/login
{ "email": "test@example.com", "password": "pass123" }
       ↓
AuthController.Login()
       ↓
AuthService.LoginAsync()
  → Normalize email
  → Find user in DB
  → Check status == "active"
  → VerifyHashedPassword
  → JwtTokenService.CreateToken(user)
       ↓
Return 200 OK:
{
  "token": "eyJhbGc...",
  "name": "Test User",
  "email": "test@example.com",
  "role": "student"
}
```

---

## Why Logout Doesn't Invalidate the Token?

JWT is **stateless** — the server stores no session data. The token is self-contained and valid until expiry. True logout (token blacklisting) requires storing invalidated token IDs in a cache (like Redis). For this project, logout simply tells the client to delete the token locally.

---

## Interview Questions & Answers

**Q: How does [Authorize] work on the Logout endpoint?**
The JWT middleware parses the `Authorization: Bearer <token>` header and populates `HttpContext.User`. `[Authorize]` then checks that the user is authenticated. If no valid token is presented, the request is rejected with 401 before the method body runs.

**Q: What is [ApiController]?**
A class-level attribute that enables automatic model binding, automatic 400 responses for invalid models (ModelState validation), and [FromBody] inference. Without it, you need `[FromBody]` on every parameter.

**Q: What is ControllerBase vs Controller?**
`Controller` is for MVC with views (returns HTML). `ControllerBase` is for API-only (returns JSON/data). Our API uses `ControllerBase` since we have a separate React frontend.
