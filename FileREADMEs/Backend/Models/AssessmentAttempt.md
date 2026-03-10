# `AssessmentAttempt.cs` — Model

**Location:** `LearnSphereBackend-master/Models/AssessmentAttempt.cs`

---

## What This File Does

Tracks each individual time a student attempts the final assessment. A student can have multiple `AssessmentAttempt` records (up to `Assessment.MaxAttempts`). Each attempt has its own score, status (Started/Completed/TimedOut), and timestamps.

---

## Full Code

```csharp
public class AssessmentAttempt
{
    [Key]
    public int Id { get; set; }

    [Required]
    public Guid StudentId { get; set; }
    [ForeignKey("StudentId")]
    public Student? Student { get; set; }

    [Required]
    public int AssessmentId { get; set; }
    [ForeignKey("AssessmentId")]
    public Assessment? Assessment { get; set; }

    public int AttemptNumber { get; set; } = 1;

    public float? Score { get; set; }
    public bool? Passed { get; set; }

    /// Started, Completed, TimedOut
    public string Status { get; set; } = "Started";

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
```

---

## Status Values

| Status        | When Set                                             |
| ------------- | ---------------------------------------------------- |
| `"Started"`   | When `POST /assessments/course/{id}/start` is called |
| `"Completed"` | When student submits before time limit               |
| `"TimedOut"`  | When `elapsed > TimeLimitMinutes + 1 minute grace`   |

---

## How Multiple Attempts Work

```csharp
// Count only COMPLETED attempts (not "Started" ones) against the limit
var completedAttempts = assessment.Attempts.Count(a => a.Status != "Started");
if (completedAttempts >= assessment.MaxAttempts)
    return BadRequest("You have used all attempts.");

// Best score logic in Submit()
if (enrollment.Score == null || score > enrollment.Score)
{
    enrollment.Score = score;
    enrollment.Grade = score >= 80 ? "A" : score >= 60 ? "B" : "C";
}
```

Only the **highest score** across attempts updates the Enrollment grade.

---

## Interview Questions & Answers

**Q: Can a student resume an unfinished attempt?**
Yes! If `Status == "Started"` and time hasn't expired, the same attempt ID is reused:

```csharp
var ongoing = assessment.Attempts.FirstOrDefault(a => a.Status == "Started");
if (ongoing == null)
{
    // Create new attempt
}
return Ok(new { attemptId = ongoing.Id, startedAt = ongoing.StartedAt, ... });
```

The frontend receives the original `StartedAt` and can display the remaining time.

**Q: What happens when time runs out?**
On submit, the backend checks time elapsed:

```csharp
var elapsed = DateTime.UtcNow - attempt.StartedAt;
if (elapsed.TotalMinutes > assessment.TimeLimitMinutes + 1)
{
    attempt.Status = "TimedOut";
    attempt.Score = 0;
    return Ok(new { score = 0, passed = false, reason = "Time expired." });
}
```
