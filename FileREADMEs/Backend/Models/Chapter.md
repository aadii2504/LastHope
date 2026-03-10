# `Chapter.cs` — Model

**Location:** `LearnSphereBackend-master/Models/Chapter.cs`

---

## What This File Does

A `Chapter` is a logical grouping of lessons within a course. The hierarchy is `Course → Chapter → Lesson → Content`. Chapters also have associated `Quizzes` that students must pass before unlocking the final assessment.

---

## Full Code

```csharp
public class Chapter
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CourseId { get; set; }
    [ForeignKey("CourseId")]
    public Course? Course { get; set; }

    [Required]
    public string Title { get; set; } = null!;

    public string? Description { get; set; }
    public int Order { get; set; } = 0;  // For sorting in the sidebar

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    public ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();
}
```

---

## How Order Works

When `CoursesController.GetCourseStructure()` builds the response, chapters are returned in the order stored in DB. The admin sets `Order` when creating/updating. The frontend sidebar renders chapters in `Order` sequence.

---

## CRUD Endpoints

| Method   | Endpoint                                | Action                                       |
| -------- | --------------------------------------- | -------------------------------------------- |
| `POST`   | `/api/courses/{courseId}/chapters`      | Create chapter                               |
| `GET`    | `/api/courses/{courseId}/chapters/{id}` | Get one chapter with lessons                 |
| `PUT`    | `/api/courses/{courseId}/chapters/{id}` | Update title/description/order               |
| `DELETE` | `/api/courses/{courseId}/chapters/{id}` | Delete (cascades → deletes lessons, content) |

---

## Interview Questions & Answers

**Q: What happens when you delete a Chapter?**
The DB has `OnDelete(DeleteBehavior.Cascade)` on both `Chapter → Lesson` and `Lesson → CourseContent`. So deleting a chapter auto-deletes all its lessons and their uploaded content records. The actual files on disk are NOT automatically deleted (only the DB records).

**Q: How does a student know which chapter comes first?**
The `Order` field. `GET /api/courses/{id}/structure` returns chapters sorted by their `Order`. The frontend displays them in that sequence in the left sidebar of `CoursePlayerPage`.
