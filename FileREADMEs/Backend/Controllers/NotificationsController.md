# `NotificationsController.cs` — Controller

**Location:** `LearnSphereBackend-master/Controllers/NotificationsController.cs`

---

## What This File Does

Manages in-app notifications for students. Three key differences from other controllers:

1. **In-memory store** (not database) — notifications are stored in a static `List<Notification>`
2. **Static helper methods** — other controllers call `NotificationsController.AddNotificationForUser()` directly
3. **Thread-safe** — uses `lock` and `ConcurrentDictionary` for thread safety

---

## How Notifications Are Stored

```csharp
// Static in-memory store (lives for the entire app lifetime)
private static readonly List<Notification> notifications = new();
private static readonly object _lock = new();
private static int _nextNotificationId = 0;

// Deduplication registry
private static readonly ConcurrentDictionary<string, DateTime> SentOnceKeys = new();
```

Since there's no database table, notifications are **lost when the server restarts**. This is a demo-level implementation.

---

## Endpoint Map

| Method | Route           | Description                               |
| ------ | --------------- | ----------------------------------------- |
| `GET`  | `/`             | Get unread notifications for current user |
| `POST` | `/{id}/read`    | Mark single notification as read          |
| `POST` | `/read-all`     | Mark all notifications as read            |
| `GET`  | `/unread-count` | Get count of unread notifications         |

---

## Static Methods Used by Other Controllers

```csharp
// Called when a new course is created (CoursesController)
NotificationsController.AddNotificationForUser(userId, "New Course", "...", courseId);

// Called when a new live session is created (LiveSessionsController)
// "Once" version ensures duplicate notifications are not sent
NotificationsController.AddNotificationForUserOnce(userId, "Live Session", "...", courseId, "LIVE_SESSION");
```

**`AddNotificationForUserOnce`** prevents sending the same notification twice:

```csharp
public static void AddNotificationForUserOnce(Guid recipientUserId, ...)
{
    var key = $"{recipientUserId:N}:{courseId}:{type}";
    if (SentOnceKeys.TryAdd(key, DateTime.UtcNow))  // Only adds if key doesn't exist
    {
        AddNotificationForUser(...);  // Create notification
    }
    // If key exists, the notification was already sent — do nothing
}
```

---

## Thread Safety

All reads and writes to `notifications` use `lock (_lock)`:

```csharp
lock (_lock)
{
    notifications.Add(new Notification { ... });
}
```

`_nextNotificationId` is incremented atomically:

```csharp
Id = Interlocked.Increment(ref _nextNotificationId)
```

This prevents two concurrent requests from getting the same ID.

---

## Interview Questions & Answers

**Q: Why use in-memory storage instead of a database table?**
For demo simplicity. Database notifications would require a `Notifications` table, migration, repository, and service — considerable overhead for functionality that's secondary to the platform's purpose.

**Q: What's the production-grade approach?**
Store notifications in a DB table. Use SignalR or WebSockets to push real-time notifications to the frontend instead of polling. Use different channels (email, SMS) via a message broker like Azure Service Bus.

**Q: What is ConcurrentDictionary vs Dictionary + lock?**
`ConcurrentDictionary` has built-in thread-safe operations like `TryAdd` — no external `lock` needed for it. `Dictionary` is not thread-safe and requires a manual `lock`. We use both: `ConcurrentDictionary` for `SentOnceKeys` (concurrent-safe) and `lock` for the `List<Notification>` (which has no concurrent-safe alternative).
