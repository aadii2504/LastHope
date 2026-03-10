# `Program.cs` — Application Entry Point

**Location:** `LearnSphereBackend-master/Program.cs`

---

## What This File Does

This is the **startup file** — the heart of the entire backend. It runs when the application starts and does three things:

1. Configures **Logging** (Serilog)
2. Registers all **Services** into the DI container
3. Sets up the **Middleware pipeline** — the ordered sequence of processing for every HTTP request

Everything in the backend depends on what is configured here.

---

## Step-by-Step Boot Sequence

### Step 1 — Serilog Configuration (Before Anything Else)

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()                                              // Logs to terminal
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day) // Daily log files
    .CreateLogger();
```

Serilog is configured first so that even startup exceptions are captured. If `builder.Build()` throws, we still see the error in the log.

### Step 2 — Create Builder

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog(); // Replace default ASP.NET logger with Serilog
```

### Step 3 — Register Services (DI Container)

```csharp
// Repositories — data access layer
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IStudentRepository, StudentRepository>();
builder.Services.AddScoped<ICourseRepository, CourseRepository>();
builder.Services.AddScoped<IEnrollmentRepository, EnrollmentRepository>();
builder.Services.AddScoped<IChapterRepository, ChapterRepository>();
builder.Services.AddScoped<ILessonRepository, LessonRepository>();
builder.Services.AddScoped<ICourseContentRepository, CourseContentRepository>();

// Services — business logic
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IFileUploadService, FileUploadService>();
```

### Step 4 — EF Core Database Connection

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);
```

Connection string read from `appsettings.json`.

### Step 5 — JWT Authentication Setup

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,       // Checks token expiry
            ValidateIssuerSigningKey = true,
            ValidIssuer   = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!))
        };
    });
```

### Step 6 — CORS (Frontend → Backend Communication)

```csharp
builder.Services.AddCors(options => {
    options.AddPolicy("ViteCors", p =>
        p.WithOrigins("http://localhost:5173") // React Vite dev server
         .AllowAnyHeader()
         .AllowAnyMethod()
    );
});
```

### Step 7 — Build App and Configure Middleware Pipeline

```csharp
var app = builder.Build();

app.UseCors("ViteCors");           // 1. Allow cross-origin requests
app.UseStaticFiles();              // 2. Serve uploaded files from wwwroot/
app.UseSwagger();                  // 3. Enable Swagger UI
app.UseMiddleware<GlobalExceptionMiddleware>(); // 4. Catch all unhandled exceptions
app.UseAuthentication();           // 5. Parse JWT → populate HttpContext.User
app.UseAuthorization();            // 6. Enforce [Authorize] attributes
app.MapControllers();              // 7. Route HTTP requests to controller methods
app.Run();
```

**Order is critical.** If `UseAuthentication` comes after `UseAuthorization`, roles won't be available when authorization checks run.

### Step 8 — Seed Admin User

```csharp
await SeedDataService.SeedAdminUserAsync(app.Services);
```

Creates `admin@example.com` with password `Instructor@123` if not already in the DB.

---

## Why AddScoped vs AddSingleton vs AddTransient?

| Lifetime       | Meaning                          | Used For                                               |
| -------------- | -------------------------------- | ------------------------------------------------------ |
| `AddScoped`    | One instance per HTTP request    | Services, Repositories (because `DbContext` is scoped) |
| `AddSingleton` | One instance for app lifetime    | Configuration, in-memory caches (like Notifications)   |
| `AddTransient` | New instance each time requested | Lightweight, stateless utilities                       |

---

## Interview Questions & Answers

**Q: Why must UseCors come before UseAuthentication?**
CORS preflight requests (`OPTIONS` from the browser) must be handled before auth middleware runs. If auth runs first, the preflight gets rejected as unauthorized.

**Q: What happens if the DB is down when the app starts?**
`SeedDataService.SeedAdminUserAsync()` will throw. The `catch (Exception ex)` at the bottom catches it, logs `Log.Fatal(ex, "Application terminated unexpectedly")`, and the app exits cleanly.

**Q: How does Swagger know about the JWT token?**
In the `AddSwaggerGen` setup, we configure a Bearer security scheme. This adds an "Authorize" button in Swagger UI where you paste the JWT token. All subsequent requests from Swagger include `Authorization: Bearer <token>`.

**Q: What is `app.UseStaticFiles()` doing for us?**
It serves everything in the `wwwroot/` folder as a static file accessible over HTTP. Uploaded course content (videos, PDFs) saved to `wwwroot/uploads/` can be accessed directly at `http://localhost:5267/uploads/...`.
