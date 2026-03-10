# `AnalyticsService.cs` — Service

**Location:** `LearnSphereBackend-master/Services/AnalyticsService.cs`

---

## What This File Does

Aggregates data from multiple tables to produce the analytics reports shown in the admin dashboard. Three main reports: summary stats, student performance, and course performance.

---

## GetSummaryStatsAsync — Dashboard KPI Cards

```csharp
public async Task<AnalyticsSummaryDto> GetSummaryStatsAsync(CancellationToken ct = default)
{
    var totalCourses  = await _db.Courses.CountAsync(ct);
    var totalStudents = await _db.Students.CountAsync(ct);
    var totalSessions = await _db.LiveSessions.CountAsync(ct);

    // Distinct students who have at least one enrollment
    var totalEnrolled = await _db.Enrollments
        .Select(e => e.StudentId).Distinct().CountAsync(ct);

    // Grade A or B = Passed
    var totalPassed = await _db.Enrollments
        .CountAsync(e => e.Grade == "A" || e.Grade == "B", ct);

    // Grade C = Failed
    var totalFailed = await _db.Enrollments
        .CountAsync(e => e.Grade == "C", ct);

    return new AnalyticsSummaryDto { ... };
}
```

This powers the 6 KPI boxes in the admin Analytics page: Total Courses, Total Students, Total Sessions, Total Enrolled, Passed, Failed.

---

## GetStudentPerformanceAsync — Expandable Student Table

Fetches all enrollments and live session attendances and groups them per student:

```csharp
var enrollments = await _db.Enrollments
    .Include(e => e.Student)
    .Include(e => e.Course)
    .ToListAsync(ct);

var liveAttendances = await _db.LiveSessionAttendances
    .Include(a => a.LiveSession)
    .Include(a => a.Student)
    .Where(a => a.JoinedAt >= a.LiveSession!.StartTime && a.JoinedAt <= a.LiveSession!.EndTime)
    .ToListAsync(ct);
```

Live session entries are added to the same student record with `Grade = "NA"`, `Score = null`.

---

## GetCoursePerformanceAsync — Course Report Table

One row per course + one row per live session:

```csharp
// Self-paced courses
result = courses.Select(c => new CoursePerformanceDto {
    Enrolled = c.Enrollments.Count,
    Passed = c.Enrollments.Count(e => e.Grade == "A" || e.Grade == "B"),
    Failed = c.Enrollments.Count(e => e.Grade == "C"),
    AttendanceStats = new { Enrolled = c.Enrollments.Count, Attended = ... }
});

// Live sessions appended with offset ID to avoid UI key collision
result.Add(new CoursePerformanceDto {
    Id = ls.Id + 1000000,  // Offset to avoid collision with course IDs
    Type = "Live Session",
    Enrolled = attended,   // For live sessions, "enrolled" = those who attended
    ...
});
```

**ID Offset trick:** Because both courses and live sessions are shown in the same table, their IDs could clash (Course 5 and LiveSession 5). Adding `1000000` to live session IDs ensures uniqueness in the frontend list rendering.

---

## Compliance in Analytics

`Compliant` = Student submitted assessment before `EnrolledAt + AccessDurationDays`.
`Non-Compliant` = Submitted late.

This field is already stored in `Enrollment.Compliance` and just returned by the analytics query.

---

## Interview Questions & Answers

**Q: Why inject `AppDbContext` directly instead of repositories?**
`AnalyticsService` performs complex multi-table queries with `Include()` and LINQ aggregations that span many entities. Using repositories for each would require many round trips or complex repository methods. Direct `AppDbContext` is appropriate here for read-heavy reporting queries.

**Q: What is the N+1 query problem and do you have it here?**
N+1 means: 1 query to get N entities + N extra queries to load each entity's related data. We avoid this by using `.Include()` to eager-load related data in a single query: `Enrollments.Include(e => e.Student).Include(e => e.Course)`.

**Q: How does the analytics page know if Grade A is "Passed"?**
The grading is: score ≥ 80 = A, score ≥ 60 = B, below 60 = C. The analytics service counts `Grade == "A" || Grade == "B"` as passed and `Grade == "C"` as failed. This mirrors the grading logic in `AssessmentsController.Submit()`.
