# `LiveSessionsController.cs` — Controller

**Location:** `LearnSphereBackend-master/Controllers/LiveSessionsController.cs`

---

## What This File Does

Manages live class sessions: CRUD by admin, attendance recording by students, and file uploads for video/thumbnail assets.

---

## Base Route

```csharp
[Route("api/LiveSessions")]
```

---

## Endpoint Map

| Method   | Route              | Auth    | Description                          |
| -------- | ------------------ | ------- | ------------------------------------ |
| `GET`    | `/`                | None    | List all live sessions               |
| `GET`    | `/{id}`            | None    | Get one session                      |
| `POST`   | `/`                | Admin   | Create session                       |
| `PUT`    | `/{id}`            | Admin   | Update session                       |
| `DELETE` | `/{id}`            | Admin   | Delete session                       |
| `POST`   | `/{id}/join`       | Student | Record attendance during live window |
| `GET`    | `/{id}/attendance` | Admin   | Get list of attendees                |

---

## Create Session — Key Logic

```csharp
[HttpPost]
[Authorize(Roles = "admin")]
public async Task<IActionResult> Create([FromForm] LiveSessionCreateDto dto)
{
    // 1. Validate time window
    if (dto.StartTime < DateTime.UtcNow.AddMinutes(-1))
        return BadRequest(new { error = "Start time cannot be in the past." });
    if (dto.EndTime <= dto.StartTime)
        return BadRequest(new { error = "End time must be after start time." });

    string videoUrl = dto.VideoUrl ?? "";

    // 2. Handle optional file upload
    if (dto.VideoFile != null)
    {
        var (success, fileUrl, _, _, uploadError) =
            await _fileUpload.UploadFileAsync(dto.VideoFile, "video");
        if (!success) return BadRequest(new { error = uploadError });
        videoUrl = fileUrl!;
    }

    // 3. Create the session
    var session = new LiveSession { Title = dto.Title, VideoUrl = videoUrl, ... };
    _db.LiveSessions.Add(session);
    await _db.SaveChangesAsync();

    // 4. Notify all students (in IST time format)
    var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
    var istStart = TimeZoneInfo.ConvertTimeFromUtc(session.StartTime, istZone);
    var timeStr = istStart.ToString("dd MMM yyyy, hh:mm tt");

    var students = await _db.Users.Where(u => u.Role == "student").ToListAsync();
    foreach (var u in students)
        NotificationsController.AddNotificationForUser(u.Id,
            "New Live Session", $"'{session.Title}' is scheduled on {timeStr} IST", session.CourseId);

    return CreatedAtAction(...);
}
```

---

## Join Session — Attendance Recording

```csharp
[HttpPost("{id}/join")]
[Authorize]
public async Task<IActionResult> Join(int id)
{
    var now = DateTime.UtcNow;

    // 1. Get student from JWT
    var studentId = await GetStudentIdAsync();

    // 2. Check session exists
    var session = await _db.LiveSessions.FindAsync(id);

    // 3. Validate time window
    if (now < session.StartTime || now > session.EndTime)
        return Ok(new { joined = false, message = "Session is not currently live." });

    // 4. Check for existing attendance (idempotent)
    var existing = await _db.LiveSessionAttendances
        .FirstOrDefaultAsync(a => a.LiveSessionId == id && a.StudentId == studentId);

    if (existing == null)
    {
        _db.LiveSessionAttendances.Add(new LiveSessionAttendance {
            LiveSessionId = id,
            StudentId = studentId.Value,
            JoinedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    return Ok(new { joined = true, videoUrl = session.VideoUrl });
}
```

---

## IST Timezone Conversion

The notification message is shown in IST for Indian users:

```csharp
var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
var istStart = TimeZoneInfo.ConvertTimeFromUtc(session.StartTime, istZone);
```

All DB timestamps are stored as UTC. The conversion to IST only happens for display in notification messages.

---

## Interview Questions & Answers

**Q: What if the server runs in a timezone other than IST?**
Since we always store UTC in the DB and convert to IST explicitly using `TimeZoneInfo`, the timezone of the server machine doesn't matter. The conversion is always from UTC.

**Q: Can a student join the same session from two browser tabs?**
The second join attempt will find `existing != null` and skip the insert, returning the same `videoUrl`. No duplicate attendance is created.

**Q: What is idempotency?**
Making the same request multiple times produces the same result. The `/join` endpoint is idempotent — joining twice doesn't create two attendance records. This is important for network reliability (retrying failed requests is safe).
