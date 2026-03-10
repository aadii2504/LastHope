# `Assessment.cs` — Model

**Location:** `LearnSphereBackend-master/Models/Assessment.cs`

---

## What This File Does

`Assessment` is the **final exam** for a course. There is exactly one Assessment per Course (1-to-1). It stores the exam configuration: time limit, passing score, and how many times a student can attempt it.

---

## Full Code

```csharp
public class Assessment
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CourseId { get; set; }

    [ForeignKey("CourseId")]
    public Course? Course { get; set; }

    [Required]
    public string Title { get; set; } = "Final Assessment";

    public string? Description { get; set; }

    public int TimeLimitMinutes { get; set; } = 30;
    public int PassingScorePercentage { get; set; } = 70;
    public int MaxAttempts { get; set; } = 2;
    public int? AccessDurationDays { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<AssessmentQuestion> Questions { get; set; } = new List<AssessmentQuestion>();
    public ICollection<AssessmentAttempt> Attempts { get; set; } = new List<AssessmentAttempt>();
}
```

---

## Field Meanings

| Field                    | Default | Meaning                                                                                                       |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------- |
| `TimeLimitMinutes`       | 30      | Student has 30 minutes to submit after starting                                                               |
| `PassingScorePercentage` | 70      | Score ≥ 70% → Pass (can be customized by admin)                                                               |
| `MaxAttempts`            | 2       | Student can retry up to 2 times                                                                               |
| `AccessDurationDays`     | null    | If set (e.g. 30), student must submit within 30 days of completing the last lesson. Used for Compliance logic |

---

## How It Connects to Other Models

```
Assessment (1 per Course)
  ├── AssessmentQuestion[] — the actual questions
  └── AssessmentAttempt[]  — each time a student takes the exam
        ↓
     Result stored in Enrollment.Grade / Enrollment.Score
```

---

## Interview Questions & Answers

**Q: How is PassingScorePercentage used in code?**

```csharp
// AssessmentsController.Submit()
bool passed = score >= assessment.PassingScorePercentage;
enrollment.Grade = score >= 80 ? "A" : score >= 60 ? "B" : "C";
```

Note: Grade thresholds (80, 60) are hardcoded; `PassingScorePercentage` is the admin-configurable pass/fail line.

**Q: What is AccessDurationDays?**
It defines a compliance window. If set to 30, the student must complete the assessment within 30 days of finishing their last lesson/quiz. After submission, the backend compares `submittedAt` vs `calculatedDueDate` and marks enrollment as `"Compliant"` or `"Non-Compliant"`.

**Q: How do you ensure 1-to-1 between Course and Assessment?**
In `AppDbContext.cs`:

```csharp
modelBuilder.Entity<Course>()
    .HasOne<Assessment>()
    .WithOne(a => a.Course!)
    .HasForeignKey<Assessment>(a => a.CourseId)
    .OnDelete(DeleteBehavior.Cascade);
```

`Cascade` means if you delete a Course, the Assessment is automatically deleted too.
