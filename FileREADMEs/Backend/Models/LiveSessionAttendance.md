# `LiveSessionAttendance.cs` — Model

**Location:** `LearnSphereBackend-master/Models/LiveSessionAttendance.cs`

---

## What This File Does

Records that a specific student attended a specific live session. Created when a student clicks "Join Now" during an active live session window. One row per student-per-session.

---

## Full Code

```csharp
public class LiveSessionAttendance
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int LiveSessionId { get; set; }
    [ForeignKey("LiveSessionId")]
    public LiveSession? LiveSession { get; set; }

    [Required]
    public Guid StudentId { get; set; }
    [ForeignKey("StudentId")]
    public Student? Student { get; set; }

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
```

---

## Unique Constraint

```csharp
// AppDbContext.cs
modelBuilder.Entity<LiveSessionAttendance>()
    .HasIndex(a => new { a.LiveSessionId, a.StudentId })
    .IsUnique();
```

A student can only have one attendance record per live session. This is enforced at both app-level and DB-level.

---

## How Attendance Is Used in Analytics

In `AnalyticsService.GetStudentPerformanceAsync()`:

```csharp
var liveAttendances = await _db.LiveSessionAttendances
    .Where(a => a.JoinedAt >= a.LiveSession!.StartTime && a.JoinedAt <= a.LiveSession!.EndTime)
    .ToListAsync();
```

Only attendances where `JoinedAt` falls within the session window are counted. This validates that the student actually joined during the live period.

---

## Interview Questions & Answers

**Q: If a student joins twice (refreshes the page), is attendance recorded twice?**
No. The application checks `if (existing == null)` before inserting, and the DB has a unique composite index on `(LiveSessionId, StudentId)`. The insert would fail at the DB level even if the app-level check is bypassed.

**Q: How is live session attendance shown in the student report?**
In `AnalyticsService.GetStudentPerformanceAsync()`, attendance rows are converted into `StudentCourseDetailDto` entries with `Grade = "NA"` and `Score = null`, clearly distinguishing them from self-paced course enrollments.
