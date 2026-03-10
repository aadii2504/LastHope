# `LiveSession.cs` — Model

**Location:** `LearnSphereBackend-master/Models/LiveSession.cs`

---

## What This File Does

Represents a scheduled live class event. Admins create these; students join them during the scheduled window. A `LiveSession` can optionally be linked to a `Course`.

---

## Full Code

```csharp
public class LiveSession
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    [Required]
    public string VideoUrl { get; set; } = null!;  // Zoom link or uploaded video

    public string? ThumbnailUrl { get; set; }

    [Required]
    public DateTime StartTime { get; set; }  // Live window start (UTC)

    [Required]
    public DateTime EndTime { get; set; }    // Live window end (UTC)

    public int? CourseId { get; set; }       // Optional — can be standalone
    [ForeignKey("CourseId")]
    public Course? Course { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
```

---

## VideoUrl — Two Modes

The `VideoUrl` field serves two purposes depending on the session state:

1. **During live window** (`now >= StartTime && now <= EndTime`): It's a Zoom/Meet link shown as "Join Now".
2. **After live window**: It becomes the recorded video URL shown as "View Recording".

---

## Attendance Tracking

Attendance is stored in the separate `LiveSessionAttendance` table, not on this model. When a student joins during the window, a row is inserted in `LiveSessionAttendances`:

```csharp
_db.LiveSessionAttendances.Add(new LiveSessionAttendance {
    LiveSessionId = id,
    StudentId = student.Id,
    JoinedAt = DateTime.UtcNow
});
```

---

## Why CourseId Is Nullable (`int?`)

Live sessions can be:

1. **Course-linked** — related to a specific course (e.g., a doubt-clearing session for "React Basics")
2. **Standalone** — a general webinar not tied to any specific course

The delete behavior is `SetNull` — if the course is deleted, `CourseId` becomes `null`, but the live session itself is NOT deleted.

---

## Interview Questions & Answers

**Q: How does the frontend decide to show "Join Now" vs "View Recording"?**

```javascript
const now = new Date();
if (now >= start && now <= end) → "Join Now"
else if (now > end)            → "View Recording"
else                           → "Scheduled on [date]"
```

**Q: How is attendance validated?**
The `/join` endpoint checks `DateTime.UtcNow >= session.StartTime && DateTime.UtcNow <= session.EndTime`. If the student tries to join before or after the window, `joined: false` is returned. Attendance is only recorded during the live window.

**Q: All datetimes are stored as UTC. How does the frontend show IST?**
The frontend uses JavaScript `new Date(isoString)` which automatically converts UTC to the browser's local timezone. For notification messages, the backend explicitly converts: `TimeZoneInfo.ConvertTimeFromUtc(session.StartTime, istZone)`.
