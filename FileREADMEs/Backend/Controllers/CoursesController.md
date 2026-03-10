# `CoursesController.cs` — Controller

**Location:** `LearnSphereBackend-master/Controllers/CoursesController.cs`

---

## What This File Does

The largest controller in the project. Manages the entire content hierarchy: **Course, Chapter, Lesson, and CourseContent** CRUD operations. Also handles file uploads for lesson content.

---

## Base Route

```csharp
[Route("api/courses")]
```

---

## Endpoint Groups

### Course CRUD

| Method   | Route                         | Auth  | Description                                     |
| -------- | ----------------------------- | ----- | ----------------------------------------------- |
| `GET`    | `/api/courses`                | None  | List all published courses                      |
| `GET`    | `/api/courses/{id}`           | None  | Get one course by ID                            |
| `GET`    | `/api/courses/{id}/structure` | None  | Full nested tree (chapters + lessons + content) |
| `POST`   | `/api/courses`                | Admin | Create a new course                             |
| `PUT`    | `/api/courses/{id}`           | Admin | Update course                                   |
| `DELETE` | `/api/courses/{id}`           | Admin | Delete course + cascade everything              |

### Chapter CRUD

| Method   | Route                                   | Auth  |
| -------- | --------------------------------------- | ----- |
| `POST`   | `/api/courses/{courseId}/chapters`      | Admin |
| `PUT`    | `/api/courses/{courseId}/chapters/{id}` | Admin |
| `DELETE` | `/api/courses/{courseId}/chapters/{id}` | Admin |

### Lesson CRUD

Similar to chapters: `POST`, `PUT`, `DELETE` under `/courses/{courseId}/chapters/{chapterId}/lessons/`.

### Content Upload

```csharp
[HttpPost("{courseId}/chapters/{chapterId}/lessons/{lessonId}/content")]
[Authorize]
[Consumes("multipart/form-data")]
public async Task<IActionResult> UploadContent(...)
```

`[FromForm]` reads the uploaded file + metadata from `multipart/form-data`.

---

## Admin Authorization Pattern

```csharp
[HttpPost]
[Authorize]          // Token must be valid
public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequest req)
{
    if (!User.IsInRole("admin"))   // Role claim from JWT token
        return StatusCode(403, new { error = "Only admins can create courses" });
    // ...
}
```

Note: Some endpoints use `[Authorize(Roles = "admin")]` attribute directly, which is equivalent.

---

## Course Creation Flow

```
POST /api/courses
Body: { title, slug, summary, description, thumbnail, level, type, ... }
       ↓
Validate required fields (Title, Slug, Summary, Description, Thumbnail, Level)
       ↓
Create Course entity → _courseRepo.AddAsync(course)
       ↓
Notify all existing students:
  var allUsers = await _db.Users.Where(u => u.Role == "student").ToListAsync();
  foreach (var user in allUsers)
      NotificationsController.AddNotificationForUser(user.Id, "New Course Available", title, course.Id)
       ↓
Return 201 Created with course data
```

---

## GetCourseStructure — The Big Endpoint

```
GET /api/courses/{id}/structure
```

Returns the full course tree in a single response:

```json
{
  "id": 1,
  "title": "Intro to C#",
  "chapters": [
    {
      "id": 10,
      "title": "Chapter 1",
      "lessons": [
        {
          "id": 100,
          "title": "Lesson 1",
          "contents": [ { "id": 1000, "type": "video", "url": "..." } ],
          "quizzes": [ { "id": 50, "title": "Quiz 1", ... } ]
        }
      ]
    }
  ]
}
```

This uses EF Core `.Include()` chains to load everything in one DB query:

```csharp
_db.Courses
   .Include(c => c.Chapters.OrderBy(ch => ch.Order))
   .ThenInclude(ch => ch.Lessons.OrderBy(l => l.Order))
   .ThenInclude(l => l.Contents)
   .Include(c => c.Chapters)
   .ThenInclude(ch => ch.Quizzes)
   .ThenInclude(q => q.Questions)
```

---

## Interview Questions & Answers

**Q: What does [Consumes("multipart/form-data")] do on the upload endpoint?**
It tells ASP.NET Core and Swagger that this endpoint expects a multipart form body (not JSON). Swagger then renders a file picker in its UI. The controller uses `[FromForm]` to bind file + fields from the form.

**Q: How does deleting a course trigger deletion of chapters, lessons, and content?**
`AppDbContext.OnModelCreating()` configures `OnDelete(DeleteBehavior.Cascade)` for the Course → Chapter → Lesson → CourseContent chain. When `_db.Courses.Remove(course)` + `SaveChanges()` is called, SQL Server's cascade delete fires and removes all related records automatically.

**Q: What happens to the uploaded files on disk when a course is deleted?**
The DB records are deleted (via cascade), but the physical files in `wwwroot/uploads/` remain. `CoursesController.DeleteCourse()` calls `FileUploadService.DeleteFile()` on each content item's file path before deleting the course entity.
