# `AssessmentQuestion.cs` — Model

**Location:** `LearnSphereBackend-master/Models/AssessmentQuestion.cs`

---

## What This File Does

Stores each individual question in a course's final assessment. Supports two question types: **MCQ** (single correct answer) and **MultipleSelect** (multiple correct answers). Both options and correct answers are stored as JSON strings.

---

## Full Code

```csharp
public class AssessmentQuestion
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int AssessmentId { get; set; }

    [ForeignKey("AssessmentId")]
    public Assessment? Assessment { get; set; }

    [Required]
    public string Text { get; set; } = null!;

    public string Type { get; set; } = "MCQ"; // "MCQ" or "MultipleSelect"

    public string Options { get; set; } = "[]";
    // JSON array of answer text strings: ["Option A", "Option B", "Option C", "Option D"]

    public string CorrectIndices { get; set; } = "[0]";
    // MCQ: [2]  → index 2 is correct
    // MultipleSelect: [0,2] → indices 0 and 2 are correct

    public int Order { get; set; } = 0;
}
```

---

## Why JSON Strings, Not a Separate Table?

Storing `Options` and `CorrectIndices` as JSON strings avoids creating a `QuestionOption` table with a 1-to-many relationship. Questions are always fetched together with their options, JSON deserialization is cheap, and the schema stays simple for a project of this scale.

---

## How Options Are Saved and Retrieved

**Admin saving a question:**

```csharp
// AssessmentsController.UpsertQuestions()
_db.AssessmentQuestions.Add(new AssessmentQuestion
{
    Options = JsonSerializer.Serialize(q.Options ?? new List<string>()),
    CorrectIndices = JsonSerializer.Serialize(q.CorrectIndices ?? new List<int>()),
});
```

**Returning questions to admin (with answers):**

```csharp
Options = SafeDeserialize<List<string>>(q.Options),
CorrectIndices = SafeDeserialize<List<int>>(q.CorrectIndices),
```

**Returning questions to student (WITHOUT answers):**

```csharp
// CorrectIndices is intentionally omitted
var questions = assessment.Questions.Select(q => new {
    q.Id, q.Text, q.Type,
    Options = SafeDeserialize<List<string>>(q.Options),
    q.Order
});
```

---

## Scoring Logic

**MCQ (single correct answer):**

```csharp
if (correctIndices.Contains(el.GetInt32())) correct++;
```

**MultipleSelect (all must match):**

```csharp
var selectedList = multiEl.EnumerateArray().Select(e => e.GetInt32()).OrderBy(x => x).ToList();
var sortedCorrect = correctIndices.OrderBy(x => x).ToList();
if (selectedList.SequenceEqual(sortedCorrect)) correct++;
```

For MultipleSelect, the student must pick **all correct options and nothing else** to get the point.

---

## Interview Questions & Answers

**Q: A student submits their answers. How are they scored?**
The controller deserializes `CorrectIndices` from the DB, compares it to the submitted answer index/indices. Each correct question adds 1 to `correct`. Final score = `(correct / total) * 100`.

**Q: How do you prevent students from seeing correct answers?**
`MapAssessmentStudent()` builds the response object without including `CorrectIndices`. The `CorrectIndices` column is never sent in student API responses — only `MapAssessmentAdmin()` includes them.
