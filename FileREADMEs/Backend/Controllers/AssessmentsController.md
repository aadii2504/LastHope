# `AssessmentsController.cs` — Controller

**Location:** `LearnSphereBackend-master/Controllers/AssessmentsController.cs`

---

## What This File Does

Manages the full lifecycle of the final course assessment: CRUD by admin, eligibility checking, starting an attempt, submitting answers, and tracking lesson/quiz progress.

---

## Base Route

```csharp
[Route("api/assessments")]
```

---

## Complete Endpoint Map

| Method   | Route                            | Who     | Description                            |
| -------- | -------------------------------- | ------- | -------------------------------------- |
| `GET`    | `/course/{courseId}/admin`       | Admin   | Get assessment with correct answers    |
| `GET`    | `/course/{courseId}`             | Student | Get assessment WITHOUT correct answers |
| `POST`   | `/course/{courseId}`             | Admin   | Create assessment for a course         |
| `PUT`    | `/{id}`                          | Admin   | Update assessment settings/questions   |
| `DELETE` | `/{id}`                          | Admin   | Delete assessment                      |
| `GET`    | `/course/{courseId}/eligibility` | Student | Check if student can take assessment   |
| `POST`   | `/course/{courseId}/start`       | Student | Start an assessment attempt            |
| `POST`   | `/attempt/{attemptId}/submit`    | Student | Submit answers                         |
| `POST`   | `/lesson/{lessonId}/complete`    | Student | Mark a lesson as done                  |
| `GET`    | `/course/{courseId}/progress`    | Student | Get lesson completion status           |

---

## Key Algorithm: Eligibility Check

```csharp
private async Task<EligibilityResult> ComputeEligibilityAsync(Guid studentId, int courseId)
{
    var assessment = await _db.Assessments.Include(a => a.Attempts).FirstOrDefaultAsync(..);

    // 1. Assessment must exist
    if (assessment == null) return Not eligible;

    // 2. Check attempt limit (count only non-"Started" attempts)
    var completed = assessment.Attempts.Count(a => a.Status != "Started" && a.StudentId == studentId);
    if (completed >= assessment.MaxAttempts) return Not eligible: attempts used;

    // 3. Count all lessons in this course
    var totalLessons = await _db.Lessons.CountAsync(l in course);

    // 4. Count completed lessons by this student
    var completedLessons = await _db.LessonProgresses.CountAsync(...completed...);
    if (completedLessons < totalLessons) return Not eligible: finish lessons;

    // 5. Count all quizzes in this course
    var totalQuizzes = await _db.Quizzes.CountAsync(q in course);

    // 6. Find most recent passing attempt per quiz
    var passedQuizzes = await _db.QuizAttempts
        .Where(qa => qa.StudentId == studentId && qa.Passed == true && quizIds.Contains(qa.QuizId))
        .GroupBy(qa => qa.QuizId)
        .Select(g => g.OrderByDescending(q => q.AttemptedAt).First())
        .CountAsync();

    if (passedQuizzes < totalQuizzes) return Not eligible: pass quizzes;

    return Eligible;
}
```

---

## Key Algorithm: Scoring on Submit

```csharp
foreach (var question in assessment.Questions)
{
    var correctIndices = JsonSerializer.Deserialize<List<int>>(question.CorrectIndices);

    if (question.Type == "MCQ")
    {
        // Single answer — compare submitted int to correct index
        if (answers.TryGetProperty(question.Id.ToString(), out var el))
            if (correctIndices.Contains(el.GetInt32())) correct++;
    }
    else // MultipleSelect
    {
        var selected = multiEl.EnumerateArray().Select(e => e.GetInt32()).OrderBy(x => x).ToList();
        var expected = correctIndices.OrderBy(x => x).ToList();
        if (selected.SequenceEqual(expected)) correct++;  // Must match exactly
    }
}

float score = total > 0 ? (float)correct / total * 100f : 0;
bool passed = score >= assessment.PassingScorePercentage;
```

---

## Compliance Calculation

```csharp
var completionDates = await _db.LessonProgresses
    .Where(lp => lp.StudentId == studentId && lessonIds.Contains(lp.LessonId))
    .Select(lp => lp.CompletedAt)
    .ToListAsync();

var latest = completionDates.Where(d => d != null).Max();
var dueDate = latest!.Value.AddDays(assessment.AccessDurationDays.Value);
enrollment.Compliance = DateTime.UtcNow <= dueDate ? "Compliant" : "Non-Compliant";
```

---

## Security: Role-Based Response

```csharp
if (User.IsInRole("admin"))
    return Ok(MapAssessmentAdmin(assessment));   // Includes CorrectIndices
else
    return Ok(MapAssessmentStudent(assessment)); // Excludes CorrectIndices
```

---

## Interview Questions & Answers

**Q: Walk me through the full flow from student clicking "Take Assessment" to seeing their grade.**

1. `GET /eligibility` → checks lessons + quizzes → returns `{ eligible: true }`
2. `POST /course/{id}/start` → creates `AssessmentAttempt { Status: "Started" }` → returns `attemptId`
3. Student answers all questions (timer shown from `startedAt`)
4. `POST /attempt/{id}/submit` with `{ answers: { questionId: selectedIndex } }`
5. Backend checks time limit → scores answers → updates `Enrollment.Score/Grade/Compliance`
6. Frontend shows result modal with score and grade

**Q: What if two requests come in simultaneously to start the same assessment?**
The uniqueness check `_db.AssessmentAttempts.FirstOrDefaultAsync(a => a.Status == "Started")` is not atomic — there's a race condition. Proper fix: add a unique index on `(AssessmentId, StudentId, Status)` or use a database transaction.
