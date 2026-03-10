# LearnSphere — Complete Interview Preparation Guide

> **Your interviewer will walk through every layer of this app. This guide explains every important file, every design decision, and every concept — in the exact language a mid-level engineer uses.**

---

## Table of Contents

1. [Project Overview & Folder Structure](#1-project-overview--folder-structure)
2. [How the App Starts — Program.cs Deep Dive](#2-how-the-app-starts--programcs-deep-dive)
3. [JWT Authentication — End to End](#3-jwt-authentication--end-to-end)
4. [Dependency Injection (DI) — How and Where](#4-dependency-injection-di--how-and-where)
5. [Repository Pattern & Database Layer](#5-repository-pattern--database-layer)
6. [Exception Handling — GlobalExceptionMiddleware](#6-exception-handling--globalexceptionmiddleware)
7. [Validations — Where They Live](#7-validations--where-they-live)
8. [Course Management — Full Flow (Backend + Frontend)](#8-course-management--full-flow-backend--frontend)
9. [File Uploads — How Files Are Stored and Served](#9-file-uploads--how-files-are-stored-and-served)
10. [Live Sessions — Create, Join, Attendance Tracking](#10-live-sessions--create-join-attendance-tracking)
11. [Assessments — Eligibility, Start, Submit, Grading](#11-assessments--eligibility-start-submit-grading)
12. [Analytics — How Data is Aggregated and Shown](#12-analytics--how-data-is-aggregated-and-shown)
13. [Frontend Architecture — React + Axios + State](#13-frontend-architecture--react--axios--state)
14. [Axios Interceptors & JWT on Every Request](#14-axios-interceptors--jwt-on-every-request)
15. [Frontend Routing — Protected Routes & Admin Routes](#15-frontend-routing--protected-routes--admin-routes)
16. [How Front-End Data Flow Works (Courses Example)](#16-how-front-end-data-flow-works-courses-example)
17. [Testing — NUnit, Moq, Arrange-Act-Assert](#17-testing--nunit-moq-arrange-act-assert)
18. [Entity Framework Core — Migrations, Relationships, DbContext](#18-entity-framework-core--migrations-relationships-dbcontext)
19. [Logging — Serilog Integration](#19-logging--serilog-integration)
20. [SOLID Principles — Where Used in This Project](#20-solid-principles--where-used-in-this-project)
21. [CORS — Why It's Needed and How It's Set Up](#21-cors--why-its-needed-and-how-its-set-up)
22. [Compliance — Compliant vs Non-Compliant Logic](#22-compliance--compliant-vs-non-compliant-logic)
23. [Excel / Export Report (Conceptual)](#23-excel--export-report-conceptual)
24. [Docker & Azure Basics (Conceptual)](#24-docker--azure-basics-conceptual)
25. [Common Cross-Questioning Scenarios](#25-common-cross-questioning-scenarios)

---

## 1. Project Overview & Folder Structure

LearnSphere is a Learning Management System (LMS) with:

- **Backend:** ASP.NET Core 8 Web API (`LearnSphereBackend-master`)
- **Frontend:** React 18 SPA with Vite (`learn-sphere-main/frontend/learn-sphere-ui`)
- **Tests:** NUnit + Moq unit test project (`LearnSphereBackend.Tests`)

### Backend Folder Layout

```
LearnSphereBackend-master/
├── Program.cs              ← App startup, DI registration, middleware pipeline
├── appsettings.json        ← DB connection string, JWT config
├── Controllers/            ← HTTP endpoints (thin layer, delegates to services/repos)
│   ├── AuthController.cs
│   ├── CoursesController.cs
│   ├── AssessmentsController.cs
│   ├── LiveSessionsController.cs
│   ├── AnalyticsController.cs
│   ├── QuizzesController.cs
│   ├── StudentsController.cs
│   └── NotificationsController.cs
├── Services/               ← Business logic
│   ├── AuthService.cs      ← Register/Login/ResetPassword
│   ├── JwtTokenService.cs  ← Token generation
│   ├── FileUploadService.cs
│   ├── AnalyticsService.cs
│   └── SeedDataService.cs  ← Seeds the first admin user on startup
├── Repositories/           ← Data access layer
│   ├── UserRepository.cs
│   ├── StudentRepository.cs
│   ├── CourseRepository.cs
│   ├── EnrollmentRepository.cs
│   ├── CourseStructureRepository.cs (Chapters, Lessons, Content)
│   └── Interfaces/         ← Interfaces for each repository
├── Models/                 ← EF Core entity classes (User, Student, Course, etc.)
├── DTOs/                   ← Data Transfer Objects (request/response shapes)
├── Data/
│   └── AppDbContext.cs     ← EF Core DbContext, all DbSets, all relationships
├── Middleware/
│   └── GlobalExceptionMiddleware.cs
└── Migrations/             ← Auto-generated EF Core migration files
```

### Frontend Folder Layout

```
src/
├── main.jsx                ← Entry point, wraps app in BrowserRouter + ToastProvider
├── App.jsx                 ← All routes defined here
├── api/
│   ├── http.js             ← Axios instance with JWT interceptor
│   ├── courseApi.js        ← Course, Quiz, Assessment, LiveSession API calls
│   ├── authApi.js
│   ├── enrollmentApi.js
│   └── analyticsApi.js
├── pages/                  ← Full page components
│   ├── admin/              ← Admin-only pages
│   └── student/            ← Student-only pages
└── components/             ← Reusable UI pieces
```

---

## 2. How the App Starts — Program.cs Deep Dive

`Program.cs` is the **entry point** of the entire backend. It runs top-to-bottom in this exact order:

### Step 1 — Logger is configured first (before anything else)

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();
```

Serilog is set up before the builder so that even startup errors are captured.

### Step 2 — Services are registered (DI Container)

```csharp
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
// ... and so on
```

This is the Dependency Injection container. `AddScoped` means one instance per HTTP request. When `AuthController` needs `IAuthService`, ASP.NET Core will automatically create `AuthService` and inject it.

### Step 3 — JWT authentication is configured

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!))
        };
    });
```

When a request comes in with `Authorization: Bearer <token>`, ASP.NET Core automatically validates the token signature, issuer, audience, and expiry. If valid, it populates `HttpContext.User` with the claims inside the token.

### Step 4 — Middleware Pipeline (ORDER MATTERS)

```csharp
app.UseCors("ViteCors");
app.UseStaticFiles();       // Serves uploaded files from wwwroot/uploads
app.UseSwagger();
app.UseMiddleware<GlobalExceptionMiddleware>();  // Catch all unhandled exceptions
app.UseAuthentication();    // Parse JWT token from header
app.UseAuthorization();     // Check [Authorize] attributes
app.MapControllers();
```

**Interview question: "Why must UseAuthentication come before UseAuthorization?"**
Because Authentication validates the token and sets the user identity, and Authorization then checks that identity against the `[Authorize]` attribute. If reversed, the authorization would see no user identity.

### Step 5 — Seed admin user on first start

```csharp
await SeedDataService.SeedAdminUserAsync(app.Services);
```

This checks if an admin user exists in the database. If not, it creates one. This runs once on every startup but only inserts if the admin is missing.

---

## 3. JWT Authentication — End to End

### Where is the JWT Token Created?

In `Services/JwtTokenService.cs`, the `CreateToken(User user)` method:

```csharp
public string CreateToken(User user)
{
    var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), // userId in the token
        new Claim(JwtRegisteredClaimNames.Email, user.Email),
        new Claim("name", user.Name),
        new Claim(ClaimTypes.Role, user.Role)  // "admin" or "student"
    };

    var token = new JwtSecurityToken(
        issuer: issuer,
        audience: audience,
        claims: claims,
        expires: DateTime.UtcNow.AddMinutes(120), // 2-hour expiry
        signingCredentials: credentials
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

**Interview question: "What is in the JWT token?"**
The token contains: the user's ID (as `NameIdentifier`), email, name, and role. The token is signed with an HMAC-SHA256 key. The secret key is in `appsettings.json` under `Jwt:Key`.

### Where is the Token Given to the Frontend?

In `AuthService.cs`, after login or register:

```csharp
return new AuthResponseDto
{
    Token = _jwt.CreateToken(user),
    Name = user.Name,
    Email = user.Email,
    Role = user.Role
};
```

The `AuthController.Login()` action calls `_auth.LoginAsync()` and returns this DTO. The frontend receives `{ token, name, email, role }` in the HTTP response body.

### Where Does the Frontend Store the Token?

In `localStorage`:

```javascript
// After login succeeds in LoginPage.jsx
localStorage.setItem("token", response.token);
localStorage.setItem("learnsphere_user", JSON.stringify(response));
```

### How Is the Token Sent on Every Request?

Through the **Axios interceptor** in `api/http.js`:

```javascript
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

Every single API call made through the `http` axios instance automatically gets the `Authorization: Bearer <token>` header attached before the request goes out.

### How Does the Backend Use the Token's Claims?

When a request arrives with a valid token, `HttpContext.User` is populated. In controllers:

```csharp
// Check role
if (!User.IsInRole("admin")) return StatusCode(403, ...);

// Get userId from the token
var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
Guid.TryParse(claim, out var userId);
```

In `AssessmentsController`:

```csharp
private async Task<Guid?> GetStudentIdAsync()
{
    var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(claim, out var userId)) return null;
    var student = await _db.Students.FirstOrDefaultAsync(s => s.UserId == userId);
    return student?.Id;
}
```

This extracts the user's Guid from the JWT, then finds the matching `Student` record to get the `StudentId`.

---

## 4. Dependency Injection (DI) — How and Where

DI is the core design pattern of ASP.NET Core. Instead of classes creating their own dependencies, the framework injects them through constructors.

### Registration (Program.cs)

```csharp
// Interface → Implementation mapping
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
```

`AddScoped` = one instance per HTTP request (most common for services and repositories).
`AddSingleton` = one instance for the lifetime of the app.
`AddTransient` = a new instance every time it's requested.

### Usage (Constructor Injection)

**AuthController.cs:**

```csharp
public AuthController(IAuthService auth, ILogger<AuthController> logger)
{
    _auth = auth;
    _logger = logger;
}
```

The ASP.NET Core runtime creates `AuthController` for each request and automatically provides the correct `IAuthService` and `ILogger<AuthController>` instances from the DI container.

**AuthService.cs:**

```csharp
public AuthService(IUserRepository users, IStudentRepository students, IJwtTokenService jwt)
{
    _users = users;
    _students = students;
    _jwt = jwt;
}
```

`AuthService` itself has dependencies — the DI container resolves the entire chain automatically.

**Interview question: "Why do you register repositories with interfaces instead of concrete classes?"**

Because it allows you to swap implementations without changing a single line of consumer code. In tests, we pass a `Mock<IUserRepository>` instead. The controller or service has zero knowledge about whether it's talking to a real database or a mock — it only knows the interface.

---

## 5. Repository Pattern & Database Layer

The Repository Pattern hides all EF Core details behind an interface, so controllers and services only use repository methods.

### How StudentRepository Works

```csharp
public class StudentRepository : IStudentRepository
{
    private readonly AppDbContext _db;

    public StudentRepository(AppDbContext db) { _db = db; }

    public async Task<List<Student>> GetAllAsync()
        => await _db.Students.AsNoTracking().ToListAsync();

    public async Task<Student?> GetByUserIdAsync(Guid userId)
        => await _db.Students.AsNoTracking()
                              .Include(s => s.User)
                              .FirstOrDefaultAsync(s => s.UserId == userId);
}
```

**Interview question: "What does AsNoTracking() do?"**

When you query EF Core normally, it tracks every entity in memory to detect changes and write them back on `SaveChanges()`. `AsNoTracking()` skips this tracking — which is faster and more memory-efficient for **read-only** queries. We only skip it when we don't plan to update the entity.

**Interview question: "Why use the Repository Pattern instead of using DbContext directly?"**

1. **Testability** — You can mock the repository in unit tests, no real DB needed.
2. **Single Responsibility** — Data access logic lives in one place, not scattered across controllers.
3. **Consistency** — All queries go through a known layer, making debugging easier.

---

## 6. Exception Handling — GlobalExceptionMiddleware

Located at `Middleware/GlobalExceptionMiddleware.cs`.

```csharp
public async Task InvokeAsync(HttpContext context)
{
    try
    {
        await _next(context);  // Pass to the next middleware/controller
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "An unhandled exception occurred");
        await HandleExceptionAsync(context, ex);
    }
}

private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
{
    context.Response.ContentType = "application/json";

    var response = exception switch
    {
        UnauthorizedAccessException => new ErrorResponse { StatusCode = 401, Message = "Unauthorized access" },
        ArgumentNullException       => new ErrorResponse { StatusCode = 400, Message = exception.Message },
        KeyNotFoundException        => new ErrorResponse { StatusCode = 404, Message = "Resource not found" },
        _                           => new ErrorResponse { StatusCode = 500, Message = "An internal server error occurred" }
    };

    context.Response.StatusCode = response.StatusCode;
    await context.Response.WriteAsync(JsonSerializer.Serialize(response));
}
```

**How it works:** Every HTTP request passes through this middleware. If any code in any controller or service throws an exception that's not caught locally, it bubbles up to this middleware, which catches it, maps it to the appropriate HTTP status code, logs it with Serilog, and returns a consistent JSON error response.

**Interview question: "Why do you also have try-catch inside individual controllers?"**

The local try-catch in controllers handles **expected** exceptions (e.g., "email already exists" → 400 Bad Request) with specific, meaningful messages. The global middleware is the **last resort safety net** for unexpected errors (bugs, null refs, DB connection failures) — the ones you did not anticipate.

---

## 7. Validations — Where They Live

Validations exist at **two levels**: frontend and backend.

### Frontend Validation (courseApi.js)

```javascript
create: async (payload) => {
  if (!payload.title || !payload.title.trim())
    throw new Error("Title is required");
  if (!payload.slug || !payload.slug.trim())
    throw new Error("Slug is required");
  // ...
};
```

Fast, immediate feedback to the user without a round-trip to the server.

### Backend Validation (CoursesController.cs)

```csharp
if (string.IsNullOrWhiteSpace(req.Title))
    return BadRequest(new { error = "Title is required" });
if (string.IsNullOrWhiteSpace(req.Slug))
    return BadRequest(new { error = "Slug is required" });
```

**For Live Sessions (LiveSessionsController.cs):**

```csharp
if (dto.StartTime < DateTime.UtcNow.AddMinutes(-1))
    return BadRequest(new { error = "Start time cannot be in the past." });
if (dto.EndTime <= dto.StartTime)
    return BadRequest(new { error = "End time must be after the start time." });
```

**For File Uploads (FileUploadService.cs):**

```csharp
if (file.Length > MaxFileSize)  // 500 MB limit
    return (false, null, null, 0, "File size exceeds maximum limit");
if (!IsValidFileType(fileExtension, contentType))
    return (false, null, null, 0, "File type not allowed");
```

**Interview question: "Why validate on BOTH frontend and backend?"**

Frontend validation is for **user experience** (instant feedback, no wait). Backend validation is for **security** — any user can bypass the frontend using Postman, curl, or a script. The backend must never trust client input.

### Database-Level Validation (AppDbContext.cs)

```csharp
// Unique email enforced at database level
modelBuilder.Entity<User>()
    .HasIndex(u => u.Email)
    .IsUnique();

// A student can only be enrolled in a course once
modelBuilder.Entity<Enrollment>()
    .HasIndex(e => new { e.StudentId, e.CourseId })
    .IsUnique();
```

This is the deepest layer of validation — the database constraint catches duplicate entries even if application code misses it.

---

## 8. Course Management — Full Flow (Backend + Frontend)

### How the Admin Creates a Course (Full End-to-End)

**Frontend (CoursesAdmin page):**

1. Admin fills out a form with title, slug, summary, description, etc.
2. On submit, `courseApi.create(payload)` is called.
3. `courseApi.create` validates the payload, then calls `http.post("courses", payload)`.
4. The `http` Axios instance attaches the JWT token to the header automatically.

**Backend (CoursesController.cs → `POST /api/courses`):**

1. `[Authorize]` attribute: ASP.NET validates the JWT token.
2. `User.IsInRole("admin")` check: reads the `Role` claim from the token.
3. Manual validation of required fields (Title, Slug, Summary).
4. A new `Course` entity is constructed and passed to `_courseRepo.AddAsync(course)`.
5. A notification is sent to all students via `NotificationsController.AddNotificationForUser()`.
6. Returns `201 Created` with the new course data.

**How the Frontend Shows the New Course:**
After the `create` API call succeeds, the frontend typically re-fetches the course list with `courseApi.getAll()`, and React re-renders the component with the updated state.

### Course Structure (Hierarchy)

```
Course
  └── Chapter (1-N)
        └── Lesson (1-N)
              ├── CourseContent (1-N)  ← uploaded files
              └── Quiz (1-N)           ← attached to chapter
Assessment (1-1)                       ← final assessment per course
```

The frontend fetches the full nested tree via `GET /api/courses/{id}/structure`, which returns everything in one response: course + chapters + lessons + content.

---

## 9. File Uploads — How Files Are Stored and Served

### Upload Endpoint

`POST /api/courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}/content`

This uses `[FromForm]` because it's a `multipart/form-data` request (file + metadata together).

### FileUploadService.cs — What Happens

```csharp
// 1. Validate file is not empty and within size limit (500 MB)
if (file.Length > MaxFileSize)
    return (false, null, null, 0, "File size too large");

// 2. Validate extension against allowed list
AllowedVideoExtensions = [".mp4", ".avi", ".mov", ".mkv", ".webm"]
// Documents: .pdf, .docx, .pptx, .xlsx

// 3. Generate a unique filename to prevent collisions
var uniqueFileName = $"{Guid.NewGuid()}_{DateTime.UtcNow.Ticks}{fileExtension}";

// 4. Save to disk
var uploadDir = Path.Combine(webRootPath, "uploads", "courses", courseId.ToString());
var filePath = Path.Combine(uploadDir, uniqueFileName);
using (var stream = new FileStream(filePath, FileMode.Create))
    await file.CopyToAsync(stream);

// 5. Return the URL  (served as static file by app.UseStaticFiles())
var fileUrl = $"http://localhost:5267/uploads/courses/{courseId}/{uniqueFileName}";
```

### How The File URL Is Served

`Program.cs` calls `app.UseStaticFiles()`. This tells ASP.NET Core to serve everything inside the `wwwroot/` folder as static files directly over HTTP. So a file saved at `wwwroot/uploads/courses/5/abc.mp4` is accessible at `http://localhost:5267/uploads/courses/5/abc.mp4`.

### Why Generate a Unique Filename?

Because if two users upload `lecture1.mp4`, the second would overwrite the first. Using `Guid.NewGuid()` guarantees a unique name every time.

### How the Frontend Uploads a File

```javascript
// The FormData approach:
const formData = new FormData();
formData.append("file", selectedFile);
formData.append("title", "Lecture Title");
formData.append("contentType", "video");

await courseApi.content.upload(courseId, chapterId, lessonId, formData);
```

In `http.js`, the interceptor detects `FormData` and **removes the `Content-Type` header**:

```javascript
if (config.data instanceof FormData) {
  delete config.headers["Content-Type"];
}
```

**Interview question: "Why delete Content-Type for FormData?"**

When sending `FormData`, the browser or Axios needs to set `Content-Type: multipart/form-data; boundary=----xyz` — the **boundary** string is what separates different form fields in the byte stream. If you manually set `Content-Type: multipart/form-data` without the boundary, the server cannot parse the body. Deleting it forces Axios to auto-generate the correct header with the boundary.

---

## 10. Live Sessions — Create, Join, Attendance Tracking

### Creating a Live Session (Admin)

`POST /api/LiveSessions` with `[Authorize(Roles = "admin")]`.

The `LiveSessionCreateDto` accepts either a `VideoUrl` (external link) OR a `VideoFile` (file upload). If a file is provided, it's uploaded via `FileUploadService`. Validations:

- Start time cannot be in the past
- End time must be after start time

After creation, all students get an in-app notification with the IST-formatted time.

### How Attendance Works

`POST /api/LiveSessions/{id}/join` — called by the frontend when a student clicks "Join Now".

```csharp
var now = DateTime.UtcNow;
if (now < session.StartTime || now > session.EndTime)
    return Ok(new { joined = false, message = "Session is not currently live." });

// Check if student already has an attendance record
var existing = await _db.LiveSessionAttendances
    .FirstOrDefaultAsync(a => a.LiveSessionId == id && a.StudentId == student.Id);

if (existing == null)  // Only add once per session (idempotent)
{
    _db.LiveSessionAttendances.Add(new LiveSessionAttendance {
        LiveSessionId = id,
        StudentId = student.Id,
        JoinedAt = DateTime.UtcNow
    });
    await _db.SaveChangesAsync();
}
```

**Interview question: "How do you ensure attendance is not recorded twice?"**

The database has a **unique index** on `(LiveSessionId, StudentId)` in `AppDbContext.cs`:

```csharp
modelBuilder.Entity<LiveSessionAttendance>()
    .HasIndex(a => new { a.LiveSessionId, a.StudentId })
    .IsUnique();
```

Additionally at the application level, we check `if (existing == null)` before inserting. This is double protection — app-level check is fast, database constraint is the safety net.

### Join Now vs View Recording (Frontend Logic)

In `LiveSessionsPage.jsx`:

```javascript
const now = new Date();
const start = new Date(session.startTime);
const end = new Date(session.endTime);

if (now >= start && now <= end) {
  // Show "Join Now" button → calls liveSessionApi.join(id) → navigates to /session/{id}
} else if (now > end) {
  // Show "View Recording" button → navigates to video URL
} else {
  // Show scheduled time
}
```

---

## 11. Assessments — Eligibility, Start, Submit, Grading

The assessment system enforces a strict learning path: student must **complete all lessons + pass all chapter quizzes** before the final assessment unlocks.

### Eligibility Check (`GET /api/assessments/course/{courseId}/eligibility`)

```csharp
private async Task<EligibilityResult> ComputeEligibilityAsync(Guid studentId, int courseId)
{
    // 1. Check if assessment exists
    // 2. Check attempt limit
    // 3. Count completed lessons vs total lessons
    if (lessonsCompleted < lessonsTotal)
        return new EligibilityResult { Eligible = false, Reason = "Complete all lessons first." };

    // 4. Count passed quizzes vs total quizzes
    if (quizzesPassed < quizzesTotal)
        return new EligibilityResult { Eligible = false, Reason = "Pass all chapter quizzes first." };

    return new EligibilityResult { Eligible = true, ... };
}
```

### Scoring and Grading (`POST /api/assessments/attempt/{attemptId}/submit`)

```csharp
// Auto-fail if time limit exceeded (with 1 minute grace)
var elapsed = DateTime.UtcNow - attempt.StartedAt;
if (elapsed.TotalMinutes > assessment.TimeLimitMinutes + 1)
{
    attempt.Status = "TimedOut";
    attempt.Score = 0;
    // ...
}

// Score calculation
float score = total > 0 ? (float)correct / total * 100f : 0;
bool passed = score >= assessment.PassingScorePercentage;

// Grade logic
enrollment.Grade = score >= 80 ? "A" : score >= 60 ? "B" : "C";
```

**Interview question: "How do you handle multiple attempts?"**

```csharp
// Always keep the HIGHEST score
if (enrollment.Score == null || score > enrollment.Score)
{
    enrollment.Score = score;
    enrollment.Grade = score >= 80 ? "A" : score >= 60 ? "B" : "C";
}
```

The `MaxAttempts` field on the `Assessment` model limits how many times a student can try.

### Security: Student Cannot See Correct Answers

The controller returns two different shapes based on role:

```csharp
if (User.IsInRole("admin"))
    return Ok(MapAssessmentAdmin(assessment));   // includes CorrectIndices
else
    return Ok(MapAssessmentStudent(assessment)); // excludes CorrectIndices
```

---

## 12. Analytics — How Data is Aggregated and Shown

`AnalyticsService.cs` runs all the aggregation directly via EF Core LINQ queries against the database. **No caching** — every call hits the database.

### Summary Stats

```csharp
var totalCourses  = await _db.Courses.CountAsync();
var totalStudents = await _db.Students.CountAsync();

var totalPassed = await _db.Enrollments
    .CountAsync(e => e.Grade == "A" || e.Grade == "B");

var totalFailed = await _db.Enrollments
    .CountAsync(e => e.Grade == "C");
```

**Grade logic:** A = 80+, B = 60–79, C = below 60. Grade C is treated as "Failed" in the analytics dashboard.

### Student Performance (Expandable Table)

Each student shows their enrolled courses with:

- Course title, grade, score, status, compliance
- Live session attendances (shown as separate rows with Grade = "NA")

### Course Performance (Compliance/Attendance Stats)

For self-paced courses: counts enrolled and passed students.
For live sessions: counts attendances as "enrolled" (since live sessions have no separate enrollment).

### How It Shows in Frontend

`Analytics.jsx` calls `analyticsApi.getSummary()`, `analyticsApi.getStudentPerformance()`, and `analyticsApi.getCoursePerformance()`. Results are stored in React state, and the component renders summary cards + an expandable table showing student → course drill-down.

---

## 13. Frontend Architecture — React + Axios + State

### Entry Point Flow

1. `index.html` → loads `main.jsx`
2. `main.jsx` wraps `<App />` in `<BrowserRouter>` and `<ToastContainer>` from react-toastify
3. `App.jsx` renders all routes using React Router v6 `<Routes>/<Route>`

### State Management

This project uses **local component state** (`useState`, `useEffect`) — no Redux or Zustand. Data is fetched directly in each page component:

```javascript
// In CoursesAdmin.jsx (example pattern)
const [courses, setCourses] = useState([]);

useEffect(() => {
  courseApi.getAll().then((data) => setCourses(data));
}, []);
```

When an admin creates a course:

1. API call succeeds
2. `setCourses(prev => [...prev, newCourse])` updates the state
3. React automatically re-renders the list

**Interview question: "Is local state the best choice? What would you use at scale?"**

For this project it works fine because state doesn't need to be shared across deeply nested components. At scale, you would use React Query (for server state/caching) or Zustand/Redux (for complex global state like user session, cart, notifications).

---

## 14. Axios Interceptors & JWT on Every Request

Located at `src/api/http.js` — this is the **central API client** used by ALL other API files.

```javascript
export const http = axios.create({
  baseURL: "http://localhost:5267/api/",
});

// REQUEST INTERCEPTOR — runs before every request goes out
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"]; // Let browser set multipart boundary
  }
  return config;
});

// RESPONSE INTERCEPTOR — runs on every response
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — force logout
      localStorage.removeItem("token");
      localStorage.removeItem("learnsphere_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
```

**Interview question: "What is an Axios interceptor?"**

An interceptor is middleware for HTTP requests/responses. The request interceptor runs before the request is sent, the response interceptor runs after a response is received. They allow you to modify requests/responses globally — perfect for attaching authentication tokens or handling common errors in one place instead of copy-pasting the token logic in every API call.

**Interview question: "What happens when the JWT expires?"**

The backend returns a `401 Unauthorized`. The response interceptor catches it, clears `localStorage`, and redirects to `/login`. The user is forced to log in again.

---

## 15. Frontend Routing — Protected Routes & Admin Routes

### ProtectedRoute Component

```jsx
// components/dashboard/ProtectedRoute.jsx
export const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("learnsphere_user") || "null");
  if (!user || !user.token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};
```

Any route wrapped in `<ProtectedRoute>` redirects to `/login` if no user is in localStorage.

### ProtectedAdminRoute Component

```jsx
// components/admin/ProtectedAdminRoute.jsx
const ProtectedAdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("learnsphere_user") || "null");
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
};
```

Admin routes redirect non-admin users to the home page.

### Route Definitions (App.jsx)

```jsx
// Public route — anyone can see
<Route path="/courses" element={<CoursesPage />} />

// Protected (logged-in students only)
<Route path="/course/:slug/learn" element={
    <ProtectedRoute>
        <CoursePlayerPage />
    </ProtectedRoute>
} />

// Admin only
<Route path="/admin/courses" element={
    <ProtectedAdminRoute>
        <CoursesAdmin />
    </ProtectedAdminRoute>
} />
```

---

## 16. How Front-End Data Flow Works (Courses Example)

### Student Enrolling in a Course

1. Student visits `/courses` → `CoursesPage` calls `courseApi.getAll()` → GET `/api/courses`
2. Student clicks a course → goes to `/course/:slug` → `CourseDetailPage` calls `courseApi.getBySlug(slug)`
3. Student clicks "Enroll" → `enrollmentApi.enroll(courseId)` → POST `/api/students/enroll`
4. Backend creates a new `Enrollment` record and returns success
5. Frontend shows a success toast and redirects student to `/course/:slug/learn`

### Student Playing a Course

`CoursePlayerPage.jsx` fetches:

- `courseApi.getStructure(id)` → full course tree (chapters, lessons, content)
- `assessmentApi.getProgress(courseId)` → which lessons are completed, which quizzes passed
- `assessmentApi.getEligibility(courseId)` → whether final assessment is unlocked

When student finishes watching/reading a lesson:

- `assessmentApi.completeLesson(lessonId)` → POST `/api/assessments/lesson/{id}/complete`
- Backend marks `LessonProgress.IsCompleted = true`
- Frontend updates local state to show a checkmark on that lesson

---

## 17. Testing — NUnit, Moq, Arrange-Act-Assert

Located at `LearnSphereBackend.Tests/AuthServiceTests.cs`.

```csharp
public class AuthServiceTests
{
    private readonly Mock<IUserRepository>    _mockUsers;
    private readonly Mock<IStudentRepository> _mockStudents;
    private readonly Mock<IJwtTokenService>   _mockJwt;
    private readonly AuthService              _service;

    public AuthServiceTests()
    {
        _mockUsers    = new Mock<IUserRepository>();
        _mockStudents = new Mock<IStudentRepository>();
        _mockJwt      = new Mock<IJwtTokenService>();

        // Inject mocks instead of real implementations
        _service = new AuthService(_mockUsers.Object, _mockStudents.Object, _mockJwt.Object);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsAuthResponse()
    {
        // ARRANGE — set up the fake data
        var password = "password123";
        var user = new User { Id = Guid.NewGuid(), Name = "Test User", Email = "test@example.com", Status = "active" };
        user.PasswordHash = _hasher.HashPassword(user, password);

        _mockUsers.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(user);  // Fake the DB call

        _mockJwt.Setup(j => j.CreateToken(It.IsAny<User>()))
                .Returns("fake-jwt-token");  // Fake the JWT

        // ACT — call the real method
        var result = await _service.LoginAsync(new LoginRequestDto { Email = "test@example.com", Password = password }, CancellationToken.None);

        // ASSERT — verify the outcome
        Assert.NotNull(result);
        Assert.Equal("Test User",    result.Name);
        Assert.Equal("fake-jwt-token", result.Token);
    }
}
```

**Interview question: "Why use Moq?"**

`AuthService` depends on `IUserRepository` which talks to a SQL Server database. In a unit test you don't want a real database — it's slow, requires setup, and makes tests fragile. **Moq** lets you create fake implementations of interfaces (`Mock<IUserRepository>`) and configure them to return specific values (`Setup(...).ReturnsAsync(user)`). This way you test **only the AuthService logic** in isolation.

**Interview question: "What's the difference between a unit test and an integration test?"**

- **Unit test:** Tests one class/method in isolation. Dependencies are mocked. Fast, no DB.
- **Integration test:** Tests multiple real layers together (controller → service → repository → DB). Slower but proves things work end-to-end.

Our test is a unit test — it tests `AuthService.LoginAsync()` with all dependencies mocked.

---

## 18. Entity Framework Core — Migrations, Relationships, DbContext

### AppDbContext.cs

The `AppDbContext` is the **gateway to the database**. It inherits from EF Core's `DbContext` and defines all tables as `DbSet<T>` properties:

```csharp
public DbSet<User> Users => Set<User>();
public DbSet<Course> Courses => Set<Course>();
public DbSet<Enrollment> Enrollments => Set<Enrollment>();
public DbSet<LiveSession> LiveSessions => Set<LiveSession>();
public DbSet<LiveSessionAttendance> LiveSessionAttendances => Set<LiveSessionAttendance>();
```

### Relationships Configured in OnModelCreating

```csharp
// User ↔ Student: 1-to-1 (each user has one student profile)
modelBuilder.Entity<User>()
    .HasOne(u => u.StudentProfile)
    .WithOne(s => s.User!)
    .HasForeignKey<Student>(s => s.UserId);

// Course → Chapter → Lesson → Content (cascade delete chain)
modelBuilder.Entity<Course>()
    .HasMany(c => c.Chapters)
    .WithOne(c => c.Course!)
    .HasForeignKey(c => c.CourseId)
    .OnDelete(DeleteBehavior.Cascade);  // Delete course → deletes chapters

// LiveSession → Course (SetNull so deleting a course doesn't delete live sessions)
modelBuilder.Entity<Course>()
    .HasMany(c => c.LiveSessions)
    .WithOne(ls => ls.Course!)
    .HasForeignKey(ls => ls.CourseId)
    .OnDelete(DeleteBehavior.SetNull);
```

### Global UTC DateTime Converter

```csharp
var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
    v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),   // Save as UTC
    v => DateTime.SpecifyKind(v, DateTimeKind.Utc)               // Read as UTC
);
```

This ensures all datetimes stored in SQL Server are UTC, avoiding timezone bugs regardless of where the server runs.

### Migrations

```bash
# Create a migration after changing a Model
dotnet ef migrations add AddLiveSessionTable

# Apply migrations to the database
dotnet ef database update
```

Migrations are auto-generated C# files that describe how to upgrade (or downgrade) the database schema. They live in the `Migrations/` folder.

---

## 19. Logging — Serilog Integration

### Setup (Program.cs)

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()                                          // Logs to terminal
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)  // Daily log files
    .CreateLogger();

builder.Host.UseSerilog();  // Replace default ASP.NET logger with Serilog
```

### Usage in Controllers

```csharp
// AuthController.cs
_logger.LogInformation("admin is signed in email - {Email}", result.Email);
_logger.LogInformation("user is signed in with email - {Email}", result.Email);

// CoursesController.cs
_logger.LogInformation("admin created a course - {CourseName}", created.Title);
```

### GlobalExceptionMiddleware Logs Errors

```csharp
_logger.LogError(ex, "An unhandled exception occurred");
```

### Structured Logging

`{Email}` is a **named property**, not string interpolation. Serilog captures this as a searchable property in the log sink. This makes it easy to filter logs by `Email` in tools like Seq or Elasticsearch.

---

## 20. SOLID Principles — Where Used in This Project

| Principle                     | Where in LearnSphere                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S — Single Responsibility** | `JwtTokenService` only creates tokens. `AuthService` only handles auth. `FileUploadService` only manages files. Each class has one job.                                 |
| **O — Open/Closed**           | Adding a new content type (e.g., "audio") only requires updating `AllowedAudioExtensions` in `FileUploadService` — no changes to uploading logic.                       |
| **L — Liskov Substitution**   | Anywhere `IUserRepository` is accepted, a concrete `UserRepository` (or a `Mock<IUserRepository>` in tests) can be used interchangeably.                                |
| **I — Interface Segregation** | We have `IUserRepository`, `IStudentRepository`, `ICourseRepository` — separate small interfaces instead of one giant `IRepository`.                                    |
| **D — Dependency Inversion**  | Controllers and services depend on **interfaces** (`IAuthService`, `IJwtTokenService`), not concrete classes. This is enforced through DI registration in `Program.cs`. |

---

## 21. CORS — Why It's Needed and How It's Set Up

CORS (Cross-Origin Resource Sharing) is needed because the frontend runs at `http://localhost:5173` (Vite) and the backend runs at `http://localhost:5267`. The browser treats these as different origins and blocks requests by default.

```csharp
builder.Services.AddCors(options => {
    options.AddPolicy("ViteCors", p =>
        p.WithOrigins("http://localhost:5173")
         .AllowAnyHeader()
         .AllowAnyMethod()
    );
});

app.UseCors("ViteCors");  // Must be before UseAuthentication
```

This tells the browser: "Requests from `http://localhost:5173` are allowed to call this API."

---

## 22. Compliance — Compliant vs Non-Compliant Logic

When a student passes the final assessment:

```csharp
// Calculate due date: latestCompletionDate + AccessDurationDays
var latestCompletion = allCompletionDates.Max();
var calculatedDueDate = latestCompletion.AddDays(assessment.AccessDurationDays.Value);

// Was the assessment submitted before the due date?
enrollment.Compliance = DateTime.UtcNow <= calculatedDueDate ? "Compliant" : "Non-Compliant";
```

**Example:** If a student completed their last lesson on Jan 1 and the `AccessDurationDays` is 30, the assessment must be submitted by Jan 31. If submitted on Feb 5, they are **Non-Compliant**.

This shows up in Analytics as Compliant/Non-Compliant per student per course.

---

## 23. Excel / Export Report (Conceptual)

If asked "how would you generate an Excel report?":

The standard approach in .NET is using the **EPPlus** or **ClosedXML** library:

```csharp
// Install: dotnet add package EPPlus
using OfficeOpenXml;

var package = new ExcelPackage();
var ws = package.Workbook.Worksheets.Add("Students");

ws.Cells[1,1].Value = "Name";
ws.Cells[1,2].Value = "Email";
ws.Cells[1,3].Value = "Grade";

int row = 2;
foreach (var student in students)
{
    ws.Cells[row,1].Value = student.Name;
    ws.Cells[row,2].Value = student.Email;
    ws.Cells[row,3].Value = student.Grade;
    row++;
}

var bytes = package.GetAsByteArray();
return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "report.xlsx");
```

The frontend downloads this via a simple link or button that calls the API and triggers a browser file download.

---

## 24. Docker & Azure Basics (Conceptual)

### Docker

A `Dockerfile` for the backend would look like:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "MyProject.Api.dll"]
```

**Why Docker?** It packages the app with all its dependencies so it runs identically everywhere — developer machine, staging, production.

### Azure

- **Azure App Service** — Hosts the ASP.NET Core API and the React build.
- **Azure SQL Database** — Managed SQL Server in the cloud (same as our local SQL Server but managed by Microsoft).
- **Azure Blob Storage** — In production, file uploads should go to Blob Storage instead of the local file system (the file system resets on container restarts).
- **Azure DevOps / GitHub Actions** — CI/CD pipeline to auto-build and deploy on code push.

**Interview question: "What's the difference between the current file storage and production-ready storage?"**

Currently files are saved to `wwwroot/uploads/` on the local disk. This works locally but breaks in cloud deployments where:

1. Web apps often run multiple instances — a file uploaded to instance A is not visible to instance B.
2. Containers restart and the filesystem is wiped.

The fix is Azure Blob Storage — files go to the cloud, and every instance reads from the same place. You just change `FileUploadService` to use the Azure Blob SDK instead of `File.WriteAllBytes`.

---

## 25. Common Cross-Questioning Scenarios

### "Where is the password stored?"

Passwords are **never stored in plain text**. `AuthService` uses ASP.NET Core's `PasswordHasher<User>`:

```csharp
user.PasswordHash = _hasher.HashPassword(user, req.Password);  // On register
var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);  // On login
```

This uses PBKDF2 hashing with a random salt — even if the database is compromised, passwords can't be reversed.

### "What stops a student from calling admin endpoints?"

Two layers:

1. **`[Authorize]` attribute** — validates the JWT token is present and valid.
2. **`User.IsInRole("admin")` / `[Authorize(Roles = "admin")]`** — reads the Role claim from the token. Since the token is signed with a secret key, a student cannot forge an admin role.

### "What if a student tries to submit an assessment they didn't start?"

```csharp
var attempt = await _db.AssessmentAttempts
    .FirstOrDefaultAsync(a => a.Id == attemptId && a.StudentId == studentId.Value);

if (attempt == null) return NotFound("Attempt not found.");
if (attempt.Status != "Started") return BadRequest("This attempt is already completed.");
```

Both the `attemptId` AND the `studentId` (from the JWT token, not from the request) must match. A student cannot supply another student's `attemptId` because their own `studentId` won't match.

### "How does the frontend know if a user is admin or student?"

The login API returns `{ token, name, email, role }`. The frontend stores `role` in `localStorage`. The `ProtectedAdminRoute` component reads `user.role` and redirects non-admins. **But crucially** — the real security is always enforced on the backend. The frontend check is just for UX purposes.

### "What happens if the database is down?"

The `GlobalExceptionMiddleware` catches the `SqlException` (or `DbUpdateException`) and returns a `500 Internal Server Error` with a generic message. The Serilog logger records the full stack trace to the log file for debugging. The user sees a clean error message, not a stack trace.

### "What is `AsNoTracking()` and when do you NOT use it?"

You do NOT use `AsNoTracking()` when you plan to modify the entity and call `SaveChanges()`. Example:

```csharp
// WRONG — tracked entity needed for update
var student = await _db.Students.AsNoTracking().FindAsync(id);
student.Name = "New Name";
await _db.SaveChangesAsync();  // EF Core doesn't know about this entity!

// CORRECT
var student = await _db.Students.FindAsync(id);  // tracked
student.Name = "New Name";
await _db.SaveChangesAsync();  // EF Core sees the change and updates DB
```

### "Why is `IEnrollmentRepository` used instead of accessing `_db.Enrollments` directly in controllers?"

The Repository Pattern. Direct `_db` access in controllers violates Single Responsibility — controllers should handle HTTP logic, not SQL queries. Repositories are the data access layer. This also makes controllers unit-testable without a database.

### "Explain the entire flow when a student clicks 'Submit Assessment'"

1. **Frontend:** `assessmentApi.submit(attemptId, answers)` → `POST /api/assessments/attempt/{attemptId}/submit` with the answer map in the request body.
2. **Backend — Auth:** JWT verified by middleware; `GetStudentIdAsync()` extracts studentId from claims.
3. **Backend — Validation:** Confirms attempt belongs to this student; checks status is "Started"; checks time limit.
4. **Backend — Scoring:** Iterates each question, compares submitted answers to `CorrectIndices` stored as JSON.
5. **Backend — Grading:** Score ≥ 80% = Grade A, 60–79% = B, < 60% = C.
6. **Backend — Enrollment update:** Updates `Enrollment.Score`, `Enrollment.Grade`, `Enrollment.Compliance`.
7. **Backend — Returns:** `{ score, passed, correct, total, attemptsUsed, maxAttempts }`.
8. **Frontend:** Shows result modal. If passed, shows "Course completed successfully" message. Updates UI state to reflect completion.

---

_This guide covers every file and every concept at a mid-level engineer depth. Study the code alongside this guide and you will be able to answer any question about this project with confidence._
