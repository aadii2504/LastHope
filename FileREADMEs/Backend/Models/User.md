# `User.cs` — Model

**Location:** `LearnSphereBackend-master/Models/User.cs`

---

## What This File Does

This is the **EF Core entity** that maps to the `Users` table in SQL Server. It is the authentication identity of every person in the system — both students and the admin.

## Full Code

```csharp
public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";

    public string Role { get; set; } = "student"; // "admin" or "student"
    public string Status { get; set; } = "active"; // "active" or "inactive"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Student? StudentProfile { get; set; } // Navigation property (1-to-1)
}
```

---

## Field-by-Field Explanation

| Field            | Type       | Purpose                                                                 |
| ---------------- | ---------- | ----------------------------------------------------------------------- |
| `Id`             | `Guid`     | Primary key. Auto-generated as a new GUID on object creation            |
| `Name`           | `string`   | Display name of the user                                                |
| `Email`          | `string`   | Login identifier. Unique index enforced in `AppDbContext`               |
| `PasswordHash`   | `string`   | PBKDF2 hash via ASP.NET `PasswordHasher<User>`. **Never plain text**    |
| `Role`           | `string`   | `"admin"` or `"student"`. This is embedded in the JWT token             |
| `Status`         | `string`   | `"active"` or `"inactive"`. Inactive users cannot login                 |
| `StudentProfile` | `Student?` | Navigation property. EF Core lazy/eager loads the linked student record |

---

## How It Flows in the App

```
Registration Request
      ↓
AuthService.RegisterAsync()
      ↓
User object created with Role = "student"
      ↓
_hasher.HashPassword(user, req.Password)  → PasswordHash stored
      ↓
_users.AddAsync(user)                     → Saved to Users table in DB
      ↓
JwtTokenService.CreateToken(user)         → JWT created using Id, Email, Name, Role
```

**Login check:**

```csharp
if (user.Status != "active")
    throw new UnauthorizedAccessException("Account is deactivated");

var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
if (verify == PasswordVerificationResult.Failed)
    throw new UnauthorizedAccessException("Invalid email or password");
```

---

## Database Relationship

- **1-to-1 with Student:** One `User` has exactly one `Student` profile. Configured in `AppDbContext`:
  ```csharp
  modelBuilder.Entity<User>()
      .HasOne(u => u.StudentProfile)
      .WithOne(s => s.User!)
      .HasForeignKey<Student>(s => s.UserId);
  ```
- **Unique Email index:**
  ```csharp
  modelBuilder.Entity<User>()
      .HasIndex(u => u.Email)
      .IsUnique();
  ```

---

## Why Guid Instead of int for Id?

`int` IDs are sequential and predictable — a hacker can enumerate `GET /users/1`, `/users/2`, etc. GUIDs are non-sequential and random, making enumeration attacks impractical. GUIDs also work well in distributed systems (no central auto-increment).

---

## Interview Questions & Answers

**Q: Where is the password hashed?**
In `AuthService.cs`: `user.PasswordHash = _hasher.HashPassword(user, req.Password);`. The `PasswordHasher<User>` from ASP.NET Identity uses PBKDF2 with a random salt. Even if two users have the same password, their hashes will differ.

**Q: How does the backend know the role of the logged-in user?**
The `Role` field is embedded as a Claim inside the JWT token when `JwtTokenService.CreateToken(user)` is called. On every subsequent request, ASP.NET reads the token and populates `User.IsInRole("admin")` or `User.IsInRole("student")`.

**Q: Can a student promote themselves to admin?**
No. The `Role` field is set server-side during registration (always to `"student"`). The JWT token is signed with a secret key the client never knows. They cannot forge a token with `role: admin`.

**Q: What happens if an admin deactivates a user?**
`UsersController.UpdateStatus()` sets `user.Status = "inactive"`. On next login attempt, `AuthService.LoginAsync()` checks `if (user.Status != "active")` and throws `UnauthorizedAccessException`, returning 401.
