# `Lesson.cs` — Model

**Location:** `LearnSphereBackend-master/Models/Lesson.cs`

---

## What This File Does

A `Lesson` belongs to a `Chapter`. It's the smallest unit of course content — a titled section that can hold multiple content items (videos, docs, images). Students must mark each lesson as "complete" before they can attempt the final assessment.

---

## Full Code

```csharp
public class Lesson
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ChapterId { get; set; }
    [ForeignKey("ChapterId")]
    public Chapter? Chapter { get; set; }

    [Required]
    public string Title { get; set; } = null!;

    public string? Description { get; set; }
    public int Order { get; set; } = 0;
    public string? Duration { get; set; }  // e.g., "1:45:00"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<CourseContent> Contents { get; set; } = new List<CourseContent>();
}
```

---

## How Lesson Completion Works

When a student finishes watching/reading a lesson in `CoursePlayerPage.jsx`:

```javascript
await assessmentApi.completeLesson(lessonId);
// POST /api/assessments/lesson/{lessonId}/complete
```

The backend creates a `LessonProgress` record:

```csharp
_db.LessonProgresses.Add(new LessonProgress {
    StudentId = studentId.Value,
    LessonId = lessonId,
    IsCompleted = true,
    CompletedAt = DateTime.UtcNow
});
```

Assessment eligibility checks count completed lessons vs total lessons:

```csharp
if (lessonsCompleted < lessonsTotal)
    return "Not eligible: Complete all lessons first.";
```

---

## Interview Questions & Answers

**Q: Why is `Duration` a string instead of an int (seconds)?**
Flexibility — it can store "1:45:00" or "3600" depending on what the admin enters. In a strict production system you'd store it as `int` seconds.

**Q: Can a lesson have multiple videos?**
Yes. A lesson has a `Contents` collection. An admin can upload multiple files (video + PDF + image) all belonging to the same lesson. They're stored as separate `CourseContent` records.
