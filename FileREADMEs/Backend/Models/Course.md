# `Course.cs` — Model

**Location:** `LearnSphereBackend-master/Models/Course.cs`

---

## What This File Does

The `Course` entity represents a learning course in the platform. It is the **root** of the content hierarchy: Course → Chapters → Lessons → Content. It also links to Enrollments and Live Sessions.

---

## Full Code

```csharp
public class Course
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Title { get; set; } = null!;

    public string? Slug { get; set; }
    public string? Summary { get; set; }
    public string? Description { get; set; }
    public string? Thumbnail { get; set; }

    public string? Categories { get; set; }  // Comma-separated, e.g. "C#,Backend,API"

    public string? Duration { get; set; }
    public string Level { get; set; } = "beginner";  // beginner, intermediate, advanced

    public decimal Price { get; set; } = 0;
    public int Students { get; set; } = 0;

    public string Type { get; set; } = "Self-Paced"; // "Live" or "Self-Paced"
    public string Status { get; set; } = "published"; // "published" or "draft"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<Chapter> Chapters { get; set; } = new List<Chapter>();
    public ICollection<LiveSession> LiveSessions { get; set; } = new List<LiveSession>();
}
```

---

## Field-by-Field Explanation

| Field         | Purpose                                                                                 |
| ------------- | --------------------------------------------------------------------------------------- |
| `Id`          | `int` PK — courses have fewer records so `int` is fine                                  |
| `Title`       | Required. The name shown to students                                                    |
| `Slug`        | URL-friendly identifier, e.g. `intro-to-csharp`. Used in frontend route `/course/:slug` |
| `Summary`     | Short description shown on course cards                                                 |
| `Description` | Rich text (HTML/markdown) for the full course detail page                               |
| `Thumbnail`   | URL of the cover image                                                                  |
| `Categories`  | Comma-separated string. Parsed in `AnalyticsService` via `.Split(',')`                  |
| `Level`       | `beginner`, `intermediate`, `advanced` — shown as a badge in the UI                     |
| `Type`        | `Self-Paced` or `Live` — determines course behavior                                     |
| `Status`      | `published` shown to students; `draft` hidden from public listing                       |

---

## Content Hierarchy

```
Course (int Id)
  └── Chapter (1-N via CourseId FK)
        └── Lesson (1-N via ChapterId FK)
              ├── CourseContent (uploaded files — 1-N via LessonId FK)
              └── Quiz (1-N via ChapterId FK)
Assessment (1-1 via CourseId FK)
LiveSession (1-N via CourseId? FK, nullable)
```

---

## Why `int` for Id but `Guid` for User/Student?

Courses are created only by admins, so enumeration is not a security risk. Sequential `int` IDs are simpler for database indexing and foreign key joins. Users/Students use `Guid` because they are created by the public.

---

## How Courses Appear in the Frontend

1. **Course List page:** `GET /api/courses` → returns all courses → `CoursesPage.jsx` displays cards
2. **Course Detail page:** `GET /api/courses/{id}` or by slug → `CourseDetailPage.jsx`
3. **Course Player:** `GET /api/courses/{id}/structure` → full nested tree → `CoursePlayerPage.jsx`

---

## Interview Questions & Answers

**Q: How does `slug` work? Why not just use `id`?**
A slug is a human-readable URL identifier. `/course/intro-to-dotnet` is better than `/course/42`. The frontend looks up the course by slug using `courseApi.getBySlug()`, which fetches all courses and finds the matching one client-side (since there's no `GET /courses/slug/:slug` endpoint — it does a client-side filter).

**Q: Why is `Categories` stored as a comma-separated string instead of a separate table?**
Simpler schema for a project of this scale. In production you'd use a `CourseCategory` join table. In `AnalyticsService`, it's parsed: `c.Categories.Split(',', StringSplitOptions.RemoveEmptyEntries)`.

**Q: What is `Students` (int) field?**
It's a denormalized counter for how many students enrolled. It could get out of sync with actual enrollments. A production system would compute this from `Enrollments.Count` instead.
