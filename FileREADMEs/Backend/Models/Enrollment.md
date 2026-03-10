# `Enrollment.cs` — Model

**Location:** `LearnSphereBackend-master/Models/Enrollment.cs`

---

## What This File Does

`Enrollment` is the **join table** between `Student` and `Course`. When a student enrolls in a course, a row is created here. It also stores all the analytics data for that student's progress in that course — grade, score, compliance.

---

## Full Code

```csharp
public class Enrollment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid StudentId { get; set; }
    public Student? Student { get; set; }

    public int CourseId { get; set; }
    public Course? Course { get; set; }

    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string Status { get; set; } = "active"; // active, completed, dropped

    // Analytics Fields
    public string? Grade { get; set; }       // "A", "B", "C"
    public float? Score { get; set; }        // 0-100
    public string? Compliance { get; set; }  // "Compliant", "Non-Compliant"
    public string? Attendance { get; set; }  // Date string of completion
    public int AttendanceCount { get; set; } = 0;
}
```

---

## Key Constraints

```csharp
// AppDbContext.cs — Unique per student per course
modelBuilder.Entity<Enrollment>()
    .HasIndex(e => new { e.StudentId, e.CourseId })
    .IsUnique();
```

A student can only enroll once per course. The application also checks this before inserting.

---

## Lifecycle of an Enrollment

```
1. Student enrolls → Status = "active", all analytics fields = null
       ↓
2. Student completes all lessons → LessonProgress records created
       ↓
3. Student passes all quizzes → QuizAttempt records created
       ↓
4. Student becomes eligible for final assessment
       ↓
5. Student submits assessment → AssessmentsController.Submit()
       ↓
   enrollment.Score = score
   enrollment.Grade = score >= 80 ? "A" : score >= 60 ? "B" : "C"
   enrollment.Attendance = DateTime.UtcNow.ToString("yyyy-MM-dd")
   (if passed):
     enrollment.Status = "completed"
     enrollment.CompletedAt = DateTime.UtcNow
     enrollment.Compliance = DateTime.UtcNow <= dueDate ? "Compliant" : "Non-Compliant"
```

---

## Interview Questions & Answers

**Q: Why store Grade and Score on Enrollment instead of AssessmentAttempt?**
Assessment attempts track individual attempts (multiple tries). The Enrollment stores the **best/final** grade for reporting/analytics. `AnalyticsService` reads `Enrollment.Grade` to count passed/failed students — it doesn't look at raw attempt scores.

**Q: What is the Compliance field?**
It tracks whether the student completed the course within the allowed time window (`Assessment.AccessDurationDays`). If the student's assessment submission date is after the due date, they are `"Non-Compliant"`.

**Q: How do you prevent double enrollment?**
Two layers: (1) In `StudentsController.EnrollInCourse()`, the code checks `_enrollments.GetByStudentAndCourseAsync()` before inserting. (2) The database has a unique composite index on `(StudentId, CourseId)`.
