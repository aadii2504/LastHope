# `Quiz.cs` — Model

**Location:** `LearnSphereBackend-master/Models/Quiz.cs`

---

## What This File Does

A `Quiz` is a gated checkpoint at the **chapter level**. Students must pass all chapter quizzes before the final `Assessment` unlocks. Quizzes are different from the final Assessment — they have their own time limit and passing score, and can be retried unlimited times.

---

## Full Code

```csharp
public class Quiz
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

    public int TimeLimitMinutes { get; set; } = 15;
    public int PassingScorePercentage { get; set; } = 60; // Default: 60%

    public int Order { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<QuizQuestion> Questions { get; set; } = new List<QuizQuestion>();
}
```

---

## Quiz vs Assessment

| Feature                         | Quiz                                 | Assessment          |
| ------------------------------- | ------------------------------------ | ------------------- |
| Level                           | Per Chapter                          | Per Course (final)  |
| Retry                           | Unlimited                            | Up to `MaxAttempts` |
| Default Pass %                  | 60%                                  | 70%                 |
| Correct Answers sent to student | Yes (in `QuizzesController.MapQuiz`) | No                  |
| Affects Grade                   | No                                   | Yes (A/B/C)         |
| Unlocks                         | Nothing                              | Course completion   |

---

## How Quiz Submission Works

```
Student submits answers → POST /api/quizzes/{id}/submit
       ↓
QuizzesController.Submit()
       ↓
For each question: check dto.Answers[questionId] == question.CorrectIndex
       ↓
score = (correct / total) * 100
passed = score >= quiz.PassingScorePercentage
       ↓
QuizAttempt record saved
       ↓
Returns { score, passed, correct, total }
```

---

## Interview Questions & Answers

**Q: Can a student retry a failed quiz?**
Yes, unlimited retries. No `MaxAttempts` on `Quiz`. The eligibility check in `AssessmentsController` looks at `QuizAttempts` where `Passed == true` — it only needs at least one passed attempt per quiz.

**Q: How does the eligibility check use Quiz results?**

```csharp
var passedQuizAttempts = await _db.QuizAttempts
    .Where(qa => qa.StudentId == studentId && qa.Passed && quizIds.Contains(qa.QuizId))
    .GroupBy(qa => qa.QuizId)
    .Select(g => g.OrderByDescending(qa => qa.AttemptedAt).First())
    .ToListAsync();

if (passedQuizAttempts.Count < quizzesTotal)
    return "Not eligible: Pass all chapter quizzes first.";
```

Groups by quiz ID, takes the latest attempt per quiz, and checks if a passing attempt exists for every quiz.
