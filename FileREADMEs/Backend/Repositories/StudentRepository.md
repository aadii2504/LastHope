# `StudentRepository.cs` — Repository

**Location:** `LearnSphereBackend-master/Repositories/StudentRepository.cs`

---

## What This File Does

Provides all data access methods for the `Student` entity. Controllers and services never write SQL or EF Core queries directly — they call these methods. This is the **Repository Pattern** in action.

---

## Interface It Implements

```csharp
public class StudentRepository : IStudentRepository
```

The interface in `Repositories/Interfaces/IStudentRepository.cs` defines the contract. Any class implementing `IStudentRepository` can substitute this one — used in unit tests with `Mock<IStudentRepository>`.

---

## Key Methods

```csharp
// Get all students — read-only (AsNoTracking = faster)
public async Task<List<Student>> GetAllAsync(CancellationToken ct = default)
    => await _db.Students.AsNoTracking().ToListAsync(ct);

// Get student with their User object loaded
public async Task<Student?> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    => await _db.Students
                .AsNoTracking()
                .Include(s => s.User)          // Eager load User navigation property
                .FirstOrDefaultAsync(s => s.UserId == userId, ct);

// Get student with TRACKING — needed before updating
public async Task<Student?> GetByUserIdTrackedAsync(Guid userId, CancellationToken ct = default)
    => await _db.Students
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.UserId == userId, ct);

// Add new student
public async Task AddAsync(Student student, CancellationToken ct = default)
    => await _db.Students.AddAsync(student, ct);

// Commit pending changes
public async Task SaveChangesAsync(CancellationToken ct = default)
    => await _db.SaveChangesAsync(ct);
```

---

## Tracked vs No-Tracking Pattern

| Method                    | Tracking          | Use Case                             |
| ------------------------- | ----------------- | ------------------------------------ |
| `GetByUserIdAsync`        | No (AsNoTracking) | Reading profile for display — faster |
| `GetByUserIdTrackedAsync` | Yes               | Before updating profile fields       |

```csharp
// UPDATE pattern — must use tracked version
var s = await _students.GetByUserIdTrackedAsync(userId, ct);
s.FullName = "New Name";   // EF Core detects this change
await _students.SaveChangesAsync(ct);
// ↑ EF Core generates: UPDATE Students SET FullName = 'New Name' WHERE Id = ...
```

---

## Why Repository Pattern?

1. **Testability** — `IStudentRepository` allows mocking in unit tests:
   ```csharp
   var mockStudents = new Mock<IStudentRepository>();
   mockStudents.Setup(r => r.GetByUserIdAsync(userId, default)).ReturnsAsync(fakeStudent);
   ```
2. **Single Responsibility** — data access code lives in one place
3. **Decoupling** — controllers don't know about EF Core, only about the interface

If you switch from SQL Server to PostgreSQL, only the repository implementation changes — all controllers stay the same.

---

## Interview Questions & Answers

**Q: What does `Include(s => s.User)` do?**
It tells EF Core to perform an SQL `JOIN` on the `Users` table and populate `s.User` with the related `User` entity. Without it, `s.User` would be `null` (lazy loading is disabled in this project).

**Q: What happens if `SaveChangesAsync` is called and there's no DB connection?**
EF Core throws a `SqlException`, which bubbles up to `GlobalExceptionMiddleware`, which catches it and returns a 500 Internal Server Error. The exception is logged via Serilog.

**Q: Why not just use the DbContext directly in controllers?**
It violates the **Single Responsibility Principle** and makes controllers impossible to unit test without a real database. The repository abstracts away EF Core, so controllers are testable with simple mocks.
