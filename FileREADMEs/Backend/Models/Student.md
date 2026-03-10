# `Student.cs` — Model

**Location:** `LearnSphereBackend-master/Models/Student.cs`

---

## What This File Does

`Student` is the **extended profile** of a user. Every `User` with role `student` has a corresponding `Student` record. The `User` handles authentication (login/password), while `Student` holds academic and personal details.

Think of it this way:

- **User** = login credentials + role
- **Student** = full profile + enrollment history

---

## Full Code

```csharp
public class Student
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }  // FK to Users table
    public User? User { get; set; }   // Navigation property

    // Personal Details
    public string FullName { get; set; } = "";
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string Email { get; set; } = "";
    public string? Country { get; set; }
    public string? Phone { get; set; }

    // Academic Details
    public string? RollNumber { get; set; }
    public string? Course { get; set; }
    public int? Year { get; set; }

    // Guardian Details
    public string? GuardianName { get; set; }
    public string? GuardianPhone { get; set; }
    public string? GuardianEmail { get; set; }
    public string? GuardianAddress { get; set; }

    // Relationships
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
}
```

---

## How It Flows in the App

**Created during registration:**

```csharp
// AuthService.RegisterAsync()
var student = new Student
{
    UserId = user.Id,       // Link to the User record
    FullName = user.Name,
    Email = user.Email
};
await _students.AddAsync(student, ct);
```

**Retrieved during course actions:**

```csharp
// In StudentsController / AssessmentsController
var student = await _db.Students.FirstOrDefaultAsync(s => s.UserId == userId);
// studentId (Guid) is used for enrollments, quiz attempts, etc.
```

---

## Why Two Separate Tables (User + Student)?

This is the **separation of concerns** principle:

- `User` only needs to exist for login. Even an admin (who never has a student profile) is a `User`.
- `Student` is only relevant for learner-specific data.
- If you want to add `Teacher` later, you add a `Teacher` model pointing to `User`, without touching `Student`.

---

## DateOnly vs DateTime

`DateOfBirth` uses C# `DateOnly` (introduced in .NET 6) because you only care about the date, not the time. However, SQL Server doesn't natively support `DateOnly`, so `AppDbContext` has a custom value converter:

```csharp
var converter = new ValueConverter<DateOnly?, DateTime?>(
    d => d.HasValue ? d.Value.ToDateTime(TimeOnly.MinValue) : null,
    d => d.HasValue ? DateOnly.FromDateTime(d.Value) : null
);
```

This converts `DateOnly` → `DateTime` when saving, and back when reading.

---

## Interview Questions & Answers

**Q: Why does `Student` have its own `Id` (Guid) when it already has `UserId`?**
`UserId` is the FK linking back to `User`. `Student.Id` is the PK of the `Students` table itself. Many other tables (Enrollment, AssessmentAttempt, LessonProgress) use `StudentId` as their FK — they reference `Student.Id`, not `User.Id`. This is cleaner because it keeps student-domain relationships separate from auth-domain.

**Q: What happens if a student's student profile is missing?**
`StudentsController.GetMe()` auto-creates a basic profile:

```csharp
if (s is null)
{
    s = new Student { UserId = userId, FullName = name, Email = email };
    await _students.AddAsync(s, ct);
}
```

**Q: How do you get from JWT token to Student data?**
Extract `UserId` from claims → look up `Student` by `UserId` → use `Student.Id` for queries:

```csharp
Guid.TryParse(claim, out var userId);
var student = await _db.Students.FirstOrDefaultAsync(s => s.UserId == userId);
var studentId = student.Id; // Used for enrollments, attempts, etc.
```
