# LearnSphere — File-Level README Index

> One README per source file. Each explains the file's purpose, full code flow, and interview Q&A.

---

## How to Use This Folder

1. Open the README for the file you want to understand
2. Read the "Flow" section to understand the execution path
3. Read the interview Q&A at the bottom for likely questions

---

## Backend — Startup

| File                   | README                                            | What It Does                                             |
| ---------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `Program.cs`           | [Program.md](./Backend/Program.md)                | App startup, DI, middleware pipeline, JWT config         |
| `Data/AppDbContext.cs` | [AppDbContext.md](./Backend/Data/AppDbContext.md) | EF Core DbContext, all tables, relationships, migrations |
| `appsettings.json`     | —                                                 | DB connection string, JWT settings, logging config       |

---

## Backend — Middleware

| File                                      | README                                                                            | What It Does                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `Middleware/GlobalExceptionMiddleware.cs` | [GlobalExceptionMiddleware.md](./Backend/Middleware/GlobalExceptionMiddleware.md) | Catches all unhandled exceptions, returns JSON error responses |

---

## Backend — Models (Database Tables)

| File                              | README                                                                | Table Purpose                                       |
| --------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| `Models/User.cs`                  | [User.md](./Backend/Models/User.md)                                   | Auth identity — login credentials + role            |
| `Models/Student.cs`               | [Student.md](./Backend/Models/Student.md)                             | Student profile — personal, academic, guardian data |
| `Models/Course.cs`                | [Course.md](./Backend/Models/Course.md)                               | Course entity — root of content hierarchy           |
| `Models/Enrollment.cs`            | [Enrollment.md](./Backend/Models/Enrollment.md)                       | Student ↔ Course join + Grade/Score/Compliance      |
| `Models/Chapter.cs`               | [Chapter.md](./Backend/Models/Chapter.md)                             | Course → Chapter grouping                           |
| `Models/Lesson.cs`                | [Lesson.md](./Backend/Models/Lesson.md)                               | Chapter → Lesson unit                               |
| `Models/CourseContent.cs`         | —                                                                     | Lesson → uploaded file (video/doc/image)            |
| `Models/Assessment.cs`            | [Assessment.md](./Backend/Models/Assessment.md)                       | Final exam per course (1-to-1 with Course)          |
| `Models/AssessmentQuestion.cs`    | [AssessmentQuestion.md](./Backend/Models/AssessmentQuestion.md)       | MCQ/MultipleSelect questions with JSON answers      |
| `Models/AssessmentAttempt.cs`     | [AssessmentAttempt.md](./Backend/Models/AssessmentAttempt.md)         | Each time a student attempts the final assessment   |
| `Models/Quiz.cs`                  | [Quiz.md](./Backend/Models/Quiz.md)                                   | Chapter-level quiz (gating checkpoint)              |
| `Models/QuizQuestion.cs`          | —                                                                     | Individual quiz question (MCQ only)                 |
| `Models/QuizAttempt.cs`           | —                                                                     | Student quiz submission record                      |
| `Models/LessonProgress.cs`        | —                                                                     | Tracks lesson completion per student                |
| `Models/LiveSession.cs`           | [LiveSession.md](./Backend/Models/LiveSession.md)                     | Scheduled live class event                          |
| `Models/LiveSessionAttendance.cs` | [LiveSessionAttendance.md](./Backend/Models/LiveSessionAttendance.md) | Student joined live session during window           |
| `Models/Notification.cs`          | —                                                                     | In-app notification (in-memory, not DB-backed)      |

---

## Backend — Services

| File                            | README                                                          | Responsibility                                          |
| ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| `Services/AuthService.cs`       | [AuthService.md](./Backend/Services/AuthService.md)             | Register, Login, ResetPassword business logic           |
| `Services/JwtTokenService.cs`   | [JwtTokenService.md](./Backend/Services/JwtTokenService.md)     | Creates signed JWT tokens with user claims              |
| `Services/FileUploadService.cs` | [FileUploadService.md](./Backend/Services/FileUploadService.md) | Validates + saves + serves uploaded files               |
| `Services/AnalyticsService.cs`  | [AnalyticsService.md](./Backend/Services/AnalyticsService.md)   | Aggregates stats: grade counts, performance, compliance |
| `Services/SeedDataService.cs`   | [SeedDataService.md](./Backend/Services/SeedDataService.md)     | Seeds admin user on app startup                         |

---

## Backend — Repositories

| File                                        | README                                                              | Entity                                        |
| ------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| `Repositories/StudentRepository.cs`         | [StudentRepository.md](./Backend/Repositories/StudentRepository.md) | Student CRUD with tracked/no-tracking options |
| `Repositories/UserRepository.cs`            | —                                                                   | User CRUD                                     |
| `Repositories/CourseRepository.cs`          | —                                                                   | Course CRUD                                   |
| `Repositories/EnrollmentRepository.cs`      | —                                                                   | Enrollment operations                         |
| `Repositories/CourseStructureRepository.cs` | —                                                                   | Chapter/Lesson/Content CRUD                   |
| `Repositories/NotificationRepository.cs`    | —                                                                   | Notification persistence                      |

---

## Backend — Controllers (API Endpoints)

| File                                     | README                                                                         | Routes                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `Controllers/AuthController.cs`          | [AuthController.md](./Backend/Controllers/AuthController.md)                   | `/api/auth/register`, `/login`, `/logout`, `/reset-password` |
| `Controllers/CoursesController.cs`       | [CoursesController.md](./Backend/Controllers/CoursesController.md)             | `/api/courses` + chapters + lessons + content                |
| `Controllers/AssessmentsController.cs`   | [AssessmentsController.md](./Backend/Controllers/AssessmentsController.md)     | `/api/assessments` — eligibility, start, submit, progress    |
| `Controllers/LiveSessionsController.cs`  | [LiveSessionsController.md](./Backend/Controllers/LiveSessionsController.md)   | `/api/LiveSessions` — CRUD + join + attendance               |
| `Controllers/QuizzesController.cs`       | [QuizzesController.md](./Backend/Controllers/QuizzesController.md)             | `/api/quizzes` — CRUD + submit                               |
| `Controllers/StudentsController.cs`      | [StudentsController.md](./Backend/Controllers/StudentsController.md)           | `/api/students/me` — profile + enroll + courses              |
| `Controllers/NotificationsController.cs` | [NotificationsController.md](./Backend/Controllers/NotificationsController.md) | `/api/notifications` — in-memory, static methods             |
| `Controllers/UsersController.cs`         | [UsersController.md](./Backend/Controllers/UsersController.md)                 | `/api/users` — admin user management                         |
| `Controllers/AnalyticsController.cs`     | —                                                                              | `/api/analytics` — delegates to AnalyticsService             |

---

## Tests

| File                                           | README                                             | Tests                               |
| ---------------------------------------------- | -------------------------------------------------- | ----------------------------------- |
| `LearnSphereBackend.Tests/AuthServiceTests.cs` | [AuthServiceTests.md](./Tests/AuthServiceTests.md) | Unit tests for AuthService with Moq |

---

## Frontend — Core

| File            | README                      | Role                                            |
| --------------- | --------------------------- | ----------------------------------------------- |
| `src/main.jsx`  | —                           | React entry point, wraps app in BrowserRouter   |
| `src/App.jsx`   | [App.md](./Frontend/App.md) | All routes, ProtectedRoute, ProtectedAdminRoute |
| `src/index.css` | —                           | Global styles, CSS variables, base resets       |

---

## Frontend — API Layer

| File                         | README                                      | Purpose                                         |
| ---------------------------- | ------------------------------------------- | ----------------------------------------------- |
| `src/api/http.js`            | [http.md](./Frontend/api/http.md)           | Axios instance + JWT interceptor + 401 handler  |
| `src/api/courseApi.js`       | [courseApi.md](./Frontend/api/courseApi.md) | Course, Quiz, Assessment, LiveSession API calls |
| `src/api/authApi.js`         | —                                           | Login, Register, Logout API calls               |
| `src/api/enrollmentApi.js`   | —                                           | Enroll, unenroll API calls                      |
| `src/api/analyticsApi.js`    | —                                           | Analytics summary and performance API calls     |
| `src/api/notificationApi.js` | —                                           | Fetch/mark-read notifications                   |
| `src/api/studentApi.js`      | —                                           | Student profile get/update                      |
| `src/api/userApi.js`         | —                                           | Admin: get all users, update status             |

---

## Key Concepts Quick Reference

| Concept                   | Where Used                                                   |
| ------------------------- | ------------------------------------------------------------ |
| JWT Creation              | `JwtTokenService.CreateToken()`                              |
| JWT Validation            | `Program.cs AddJwtBearer()` + `[Authorize]`                  |
| JWT Frontend Storage      | `localStorage.setItem("token", ...)`                         |
| JWT Auto-Attach           | `http.js` request interceptor                                |
| Dependency Injection      | `Program.cs` → used everywhere                               |
| Repository Pattern        | All `Repository.cs` files                                    |
| Global Exception Handling | `GlobalExceptionMiddleware.cs`                               |
| File Uploads              | `FileUploadService.cs` + `[FromForm]` in controllers         |
| Route Protection          | `ProtectedRoute.jsx`, `ProtectedAdminRoute.jsx` in `App.jsx` |
| Assessment Eligibility    | `AssessmentsController.ComputeEligibilityAsync()`            |
| Compliance Tracking       | `AssessmentsController.Submit()` → `Enrollment.Compliance`   |
| Attendance Tracking       | `LiveSessionsController.Join()` → `LiveSessionAttendance`    |
| Analytics                 | `AnalyticsService.cs`                                        |
| Seeding                   | `SeedDataService.SeedAdminUserAsync()`                       |
| Unit Testing              | `AuthServiceTests.cs` with Moq                               |
