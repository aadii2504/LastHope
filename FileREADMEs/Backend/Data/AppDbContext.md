# `AppDbContext.cs` — EF Core Database Context

**Location:** `LearnSphereBackend-master/Data/AppDbContext.cs`

---

## What This File Does

`AppDbContext` is the **gateway between C# code and SQL Server**. It inherits from `DbContext` (Entity Framework Core). Every database table maps to a `DbSet<T>` property. All table relationships, constraints, and converters are configured in `OnModelCreating()`.

---

## All DbSets (Tables)

```csharp
// Auth
public DbSet<User> Users => Set<User>();
public DbSet<Student> Students => Set<Student>();

// Courses
public DbSet<Course> Courses => Set<Course>();
public DbSet<Enrollment> Enrollments => Set<Enrollment>();
public DbSet<Chapter> Chapters => Set<Chapter>();
public DbSet<Lesson> Lessons => Set<Lesson>();
public DbSet<CourseContent> CourseContents => Set<CourseContent>();

// Quizzes
public DbSet<Quiz> Quizzes => Set<Quiz>();
public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();

// Assessments
public DbSet<Assessment> Assessments => Set<Assessment>();
public DbSet<AssessmentQuestion> AssessmentQuestions => Set<AssessmentQuestion>();
public DbSet<AssessmentAttempt> AssessmentAttempts => Set<AssessmentAttempt>();

// Progress
public DbSet<LessonProgress> LessonProgresses => Set<LessonProgress>();

// Live Sessions
public DbSet<LiveSession> LiveSessions => Set<LiveSession>();
public DbSet<LiveSessionAttendance> LiveSessionAttendances => Set<LiveSessionAttendance>();
```

---

## Key Relationships (OnModelCreating)

### 1-to-1 Relationships

```csharp
// User ↔ Student
modelBuilder.Entity<User>()
    .HasOne(u => u.StudentProfile)
    .WithOne(s => s.User!)
    .HasForeignKey<Student>(s => s.UserId);

// Course ↔ Assessment (one final exam per course)
modelBuilder.Entity<Course>()
    .HasOne<Assessment>()
    .WithOne(a => a.Course!)
    .HasForeignKey<Assessment>(a => a.CourseId)
    .OnDelete(DeleteBehavior.Cascade);
```

### Cascade Delete Chain (Course hierarchy)

```csharp
Course → Chapter → Lesson → CourseContent  (all Cascade)
Course → Chapter → Quiz → QuizQuestion     (all Cascade)
Course → Enrollment                         (Cascade)
Course → Assessment → AssessmentQuestion    (Cascade)
```

Deleting a Course deletes everything related to it automatically.

### SetNull (No cascade destroy)

```csharp
// Live sessions linked to a course — keep them even if course is deleted
Course → LiveSession: OnDelete(DeleteBehavior.SetNull)
```

### Unique Indexes

```csharp
// User.Email must be unique
modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

// One enrollment per student per course
modelBuilder.Entity<Enrollment>()
    .HasIndex(e => new { e.StudentId, e.CourseId }).IsUnique();

// One attendance per student per live session
modelBuilder.Entity<LiveSessionAttendance>()
    .HasIndex(a => new { a.LiveSessionId, a.StudentId }).IsUnique();

// One progress record per student per lesson
modelBuilder.Entity<LessonProgress>()
    .HasIndex(lp => new { lp.StudentId, lp.LessonId }).IsUnique();
```

---

## Global UTC DateTime Converter

```csharp
var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
    v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),   // Save to DB as UTC
    v => DateTime.SpecifyKind(v, DateTimeKind.Utc)               // Read from DB as UTC
);

// Apply to ALL DateTime columns in ALL entities
foreach (var entityType in modelBuilder.Model.GetEntityTypes())
    foreach (var property in entityType.GetProperties())
        if (property.ClrType == typeof(DateTime) || property.ClrType == typeof(DateTime?))
            property.SetValueConverter(dateTimeConverter);
```

This ensures all timestamps stored in SQL Server are UTC, preventing timezone bugs.

---

## How Migrations Work

```bash
# After adding/changing a model:
dotnet ef migrations add DescriptiveName

# Apply to database:
dotnet ef database update
```

Migration files in `Migrations/` folder are auto-generated C# code that describes schema changes. EF Core tracks which migrations have been applied in a `__EFMigrationsHistory` table in SQL Server.

---

## Interview Questions & Answers

**Q: Why does AppDbContext inherit from DbContext?**
`DbContext` is the EF Core base class. It provides `DbSet<T>` properties (tables), `SaveChanges()` (commits transactions), `OnModelCreating()` (fluent configuration), change tracking, and connection management.

**Q: What is the difference between Cascade and SetNull?**

- `Cascade` — deleting the parent automatically deletes all children
- `SetNull` — deleting the parent sets the child's FK to `null` (child remains orphaned)
  Live sessions use `SetNull` because they're standalone events worth keeping even if a course is deleted.

**Q: What is AsNoTracking and when do you use it?**
By default EF Core tracks every queried entity in a change tracker. `AsNoTracking()` disables this for read-only queries — it's faster and uses less memory. You MUST use tracked queries (without AsNoTracking) when you plan to modify the entity and call `SaveChanges()`.

**Q: How is DbContext injected into services?**
`builder.Services.AddDbContext<AppDbContext>()` registers it as Scoped. Any Repository or Service that declares `AppDbContext db` in its constructor gets it automatically injected by the DI container.
