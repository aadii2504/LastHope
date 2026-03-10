# `SeedDataService.cs` — Service

**Location:** `LearnSphereBackend-master/Services/SeedDataService.cs`

---

## What This File Does

A one-time setup service that ensures a default **admin user** always exists in the database. It runs every time the application starts, but only creates/resets the admin if necessary.

---

## Full Code

```csharp
public static class SeedDataService
{
    public static async Task SeedAdminUserAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var adminUser = db.Users.FirstOrDefault(u => u.Email == "admin@example.com");
        var hasher = new PasswordHasher<User>();

        if (adminUser == null)
        {
            // First time — create admin
            adminUser = new User
            {
                Name = "Admin",
                Email = "admin@example.com",
                Role = "admin",
                Status = "active"
            };
            adminUser.PasswordHash = hasher.HashPassword(adminUser, "Instructor@123");
            db.Users.Add(adminUser);
        }
        else
        {
            // Admin exists — enforce correct role and password
            adminUser.Role = "admin";
            adminUser.Status = "active";
            adminUser.PasswordHash = hasher.HashPassword(adminUser, "Instructor@123");
            db.Users.Update(adminUser);
        }

        await db.SaveChangesAsync();
    }
}
```

---

## Why CreateScope()?

`AppDbContext` is registered as **Scoped** (one instance per HTTP request). But at startup there's no HTTP request — we're outside the request pipeline. `serviceProvider.CreateScope()` creates a temporary DI scope so we can safely resolve the scoped `AppDbContext`.

Without this, you'd get: `"Cannot resolve scoped service from root provider"`.

---

## Admin Credentials

| Field    | Value               |
| -------- | ------------------- |
| Email    | `admin@example.com` |
| Password | `Instructor@123`    |
| Role     | `admin`             |

These are hardcoded for the demo. In production, you'd read them from environment variables or Azure Key Vault.

---

## Interview Questions & Answers

**Q: What happens if someone manually changes the admin's role to "student" in the database?**
On next app restart, `SeedDataService` detects the existing record and forces `adminUser.Role = "admin"` — restoring it.

**Q: Why is `SeedDataService` a static class?**
It has no instance state — it's a one-shot utility. Static methods are simpler since there's nothing to inject; all dependencies are resolved locally via the scope.

**Q: When does this run?**
Immediately after `app.Build()` and before `app.Run()` in `Program.cs`:

```csharp
await SeedDataService.SeedAdminUserAsync(app.Services);
app.Run(); // App starts accepting HTTP requests
```

So it always runs before any request is processed.
