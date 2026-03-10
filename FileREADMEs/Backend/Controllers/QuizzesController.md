# `QuizzesController.cs` — Controller

**Location:** `LearnSphereBackend-master/Controllers/QuizzesController.cs`

---

## What This File Does

Manages quizzes that belong to course chapters. Admin can create, update, and delete quizzes with their questions. Students can submit quiz answers and check their last attempt.

**Note:** Unlike other controllers, `QuizzesController` injects `AppDbContext` directly (not via a repository interface). This is a trade-off chosen for simplicity — quiz data access is not complex enough to warrant a full repository.

---

## Base Route

```csharp
[Route("api/[controller]")]  // = api/quizzes
```

---

## Endpoint Map

| Method   | Route                  | Auth       | Description                         |
| -------- | ---------------------- | ---------- | ----------------------------------- |
| `GET`    | `/chapter/{chapterId}` | None       | Get all quizzes for a chapter       |
| `GET`    | `/{id}`                | None       | Get one quiz with questions         |
| `POST`   | `/`                    | Admin      | Create quiz + questions             |
| `PUT`    | `/{id}`                | Admin      | Update quiz + replace all questions |
| `DELETE` | `/{id}`                | Admin      | Delete quiz                         |
| `POST`   | `/{id}/submit`         | Authorized | Submit quiz answers                 |
| `GET`    | `/{id}/my-attempt`     | Authorized | Get my latest attempt               |

---

## Quiz Question Upsert Logic

```csharp
private async Task UpsertQuestions(int quizId, List<QuizQuestionDto> questions)
{
    // Delete ALL existing questions
    var existing = await _db.QuizQuestions.Where(q => q.QuizId == quizId).ToListAsync();
    _db.QuizQuestions.RemoveRange(existing);

    // Re-insert all questions from the new list
    for (int i = 0; i < questions.Count; i++)
    {
        _db.QuizQuestions.Add(new QuizQuestion
        {
            QuizId = quizId,
            Text = q.Text,
            Options = JsonSerializer.Serialize(q.Options),  // Serialize to JSON
            CorrectIndex = q.CorrectIndex,
            Order = i,    // Order is positional in the submitted list
        });
    }
    await _db.SaveChangesAsync();
}
```

This "delete-all, re-insert" approach is simpler than a true upsert (comparing old/new, updating in-place). Works well for small question lists.

---

## Submission Scoring

```csharp
foreach (var question in quiz.Questions)
{
    if (dto.Answers.TryGetValue(question.Id, out int selected)
        && selected == question.CorrectIndex)
        correct++;
}
float score = (float)correct / quiz.Questions.Count * 100f;
bool passed = score >= quiz.PassingScorePercentage;
```

Note: Quiz uses `CorrectIndex` (single `int`), while Assessment uses `CorrectIndices` (JSON array). Quizzes only support MCQ.

---

## DTOs Are Defined Inside the Same File

```csharp
public record QuizUpsertDto(int ChapterId, string Title, ...);
public record QuizQuestionDto(string Text, List<string> Options, int CorrectIndex);
public record QuizSubmitDto(Dictionary<int, int> Answers);  // questionId → selectedIndex
```

These are local record types, not in the DTOs/ folder. They're small enough to keep inline.

---

## Interview Questions & Answers

**Q: What does `Dictionary<int, int> Answers` represent in the submit DTO?**
`{ questionId: selectedOptionIndex }`. For example: `{ 1: 2, 2: 0, 3: 1 }` means for question 1 the student selected option index 2, etc.

**Q: Why does QuizzesController use AppDbContext directly instead of a repository?**
Design trade-off for simplicity. Quizzes are only managed in this one controller, and quiz-specific queries are small. Adding a `IQuizRepository` with methods identical to what's here wouldn't add testability value because the controller constructor takes `AppDbContext` directly — meaning you'd need to mock the full DbContext in tests anyway.

**Q: Can a student see the correct answers for a quiz?**
Yes — `MapQuiz()` includes `CorrectIndex` in its output. This is intentional for quizzes (unlike assessments) — students can review what they got wrong for learning purposes.
