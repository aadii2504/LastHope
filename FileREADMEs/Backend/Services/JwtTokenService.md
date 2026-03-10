# `JwtTokenService.cs` — Service

**Location:** `LearnSphereBackend-master/Services/JwtTokenService.cs`

---

## What This File Does

Responsible for one thing: **generating a JWT (JSON Web Token)** for a user after successful login or registration. It reads configuration from `appsettings.json` and packs user data into signed claims.

---

## Full Code

```csharp
public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config) => _config = config;

    public string CreateToken(User user)
    {
        var jwt = _config.GetSection("Jwt");

        var key = jwt["Key"]!;
        var issuer = jwt["Issuer"];
        var audience = jwt["Audience"];

        int expiresMinutes = 120;
        _ = int.TryParse(jwt["ExpiresMinutes"], out expiresMinutes);

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), // Used to identify user in every controller
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("name", user.Name),
            new Claim(ClaimTypes.Role, user.Role)  // "admin" or "student" — used for [Authorize(Roles="admin")]
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

---

## appsettings.json Configuration

```json
{
  "Jwt": {
    "Key": "your-super-secret-key-minimum-256-bits",
    "Issuer": "LearnSphereAPI",
    "Audience": "LearnSphereClient",
    "ExpiresMinutes": "120"
  }
}
```

---

## What's Inside the JWT Token

A JWT has three parts: `header.payload.signature`

**Payload (Claims):**

```json
{
  "nameid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "sub": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "student@example.com",
  "name": "John Doe",
  "role": "student",
  "exp": 1741000000
}
```

**Signature:** HMAC-SHA256 of header + payload using the secret `Key`. The client cannot forge the token because they don't know the key.

---

## How Backend Uses the Claims

```csharp
// In any controller:
User.IsInRole("admin")                                  // reads ClaimTypes.Role

User.FindFirst(ClaimTypes.NameIdentifier)?.Value        // reads user.Id (Guid)
User.FindFirstValue(JwtRegisteredClaimNames.Email)      // reads email
```

---

## Interview Questions & Answers

**Q: What algorithm is used to sign the token?**
HMAC-SHA256 (`SecurityAlgorithms.HmacSha256`). It's a symmetric algorithm — the same key is used to sign and verify. Both signing (JwtTokenService) and verification (Program.cs `AddJwtBearer`) use the same key from config.

**Q: What happens when the token expires?**
After `ExpiresMinutes` (120 min), the token is rejected by `AddJwtBearer` middleware (because `ValidateLifetime = true`). The backend returns 401. The Axios response interceptor in `http.js` catches this 401 and redirects to `/login`.

**Q: Can you decode the payload without the key?**
Yes — the payload is Base64-encoded, not encrypted. Anyone can decode and read the claims. But they **cannot forge** a new token without the signing key. For sensitive data, use JWE (JSON Web Encryption) instead.

**Q: Why use ClaimTypes.NameIdentifier and JwtRegisteredClaimNames.Sub both?**
Different libraries read different claim types. ASP.NET Identity reads `ClaimTypes.NameIdentifier`, while JWT-standard libraries read `sub`. Storing both ensures maximum compatibility.
