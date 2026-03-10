# `StudentsController.cs` — Controller

**Location:** `LearnSphereBackend-master/Controllers/StudentsController.cs`

---

## What This File Does

Manages the **student's own profile and course enrollments**. All endpoints are protected with `[Authorize]` — only logged-in users can call them. The student's identity is always derived from the JWT token, not from a URL parameter.

---

## Base Route

```csharp
[Route("api/students")]
```

---

## Endpoint Map

| Method   | Route                    | Description              |
| -------- | ------------------------ | ------------------------ |
| `GET`    | `/me`                    | Get my profile           |
| `POST`   | `/me`                    | Create/update my profile |
| `POST`   | `/me/enroll`             | Enroll in a course       |
| `GET`    | `/me/courses`            | Get my enrolled courses  |
| `DELETE` | `/me/courses/{courseId}` | Unenroll from a course   |

---

## How "me" Works — JWT to Student

Every endpoint extracts the current user's ID from the JWT token:

```csharp
var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
          ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

if (!Guid.TryParse(idStr, out var userId))
    return Unauthorized("Invalid token");

var student = await _students.GetByUserIdAsync(userId, ct);
```

The URL never contains the user's ID — it's always read from the token. This prevents one student from accessing another student's data by changing the URL.

---

## Profile Upsert Pattern

`POST /me` either creates or updates the profile:

```csharp
var s = await _students.GetByUserIdTrackedAsync(userId, ct); // Tracked for update

if (s is null)
{
    // Create new profile
    s = new Student { UserId = userId, ... };
    await _students.AddAsync(s, ct);
}

// Update only the fields that are non-null in the request
if (req.FullName is not null) s.FullName = req.FullName;
if (req.DateOfBirth is not null) s.DateOfBirth = req.DateOfBirth;
// ...partial update pattern

await _students.SaveChangesAsync(ct);
```

This is a **partial update** — the client only sends fields it wants to change, null fields are ignored. This is safer than PUT (which overwrites everything).

---

## Enrollment Logic

```csharp
[HttpPost("me/enroll")]
public async Task<IActionResult> EnrollInCourse([FromBody] EnrollmentRequestDto req)
{
    // 1. Get student
    var student = await _students.GetByUserIdAsync(userId, ct);

    // 2. Check not already enrolled
    var existing = await _enrollments.GetByStudentAndCourseAsync(student.Id, req.CourseId);
    if (existing is not null)
        return BadRequest("Already enrolled in this course");

    // 3. Create enrollment
    var enrollment = new Enrollment { StudentId = student.Id, CourseId = req.CourseId, Status = "active" };
    await _enrollments.AddAsync(enrollment);

    // 4. Log
    _logger.LogInformation("Student - {Email} enrolled in course - {CourseName}", ...);

    return Ok(new { message = "Enrolled successfully" });
}
```

---

## Interview Questions & Answers

**Q: Why is the student ID taken from the JWT token and not from the request URL?**
Security. If it were `/students/{studentId}/courses`, a student could put another student's ID in the URL and manipulate their data. The JWT token is signed and cannot be tampered with — reading identity from it is safe.

**Q: What is GetByUserIdTrackedAsync vs GetByUserIdAsync?**
`GetByUserIdAsync` uses `AsNoTracking()` — fast, read-only.
`GetByUserIdTrackedAsync` does NOT use `AsNoTracking()` — EF Core tracks the entity, so changes to its properties are automatically detected and committed on `SaveChanges()`.

The upsert endpoint uses the tracked version so that setting `s.FullName = req.FullName` is picked up by EF Core's change tracker.
