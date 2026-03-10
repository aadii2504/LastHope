# `GlobalExceptionMiddleware.cs` — Middleware

**Location:** `LearnSphereBackend-master/Middleware/GlobalExceptionMiddleware.cs`

---

## What This File Does

Acts as a **global safety net** for any unhandled exception in the application. Instead of ASP.NET Core's default HTML error page (useless for an API), it catches exceptions, logs them with Serilog, and returns a consistent JSON error response.

---

## Full Code

```csharp
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);  // Pass request to the next middleware in the pipeline
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
            InvalidOperationException   => new ErrorResponse { StatusCode = 400, Message = exception.Message },
            KeyNotFoundException        => new ErrorResponse { StatusCode = 404, Message = "Resource not found" },
            _                           => new ErrorResponse { StatusCode = 500, Message = "An internal server error occurred" }
        };

        context.Response.StatusCode = response.StatusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
```

---

## How the Middleware Chain Works

```
HTTP Request
     ↓
GlobalExceptionMiddleware.InvokeAsync()
     ↓ (try)
 Next Middleware → Authentication → Authorization → Controller → Service
                    ↑
     If any unhandled exception bubbles up here...
     ↓ (catch)
 Log to Serilog → Write JSON error to response body
```

---

## Expected vs Unexpected Exceptions

| Type           | Who Handles It               | Example                              |
| -------------- | ---------------------------- | ------------------------------------ |
| **Expected**   | try-catch inside controllers | `BadRequest("Email already exists")` |
| **Unexpected** | GlobalExceptionMiddleware    | NullReferenceException, DbException  |

Controllers handle known business logic errors with specific messages. The middleware handles everything else with generic "500 Internal Server Error".

---

## Registration in Program.cs

```csharp
app.UseMiddleware<GlobalExceptionMiddleware>(); // Must be before UseAuthentication
```

It must be before `UseAuthentication` so JWT failures also go through this handler if they propagate.

---

## Interview Questions & Answers

**Q: What is middleware in ASP.NET Core?**
Middleware is a component in the HTTP request pipeline. Each middleware can process the request, call `_next(context)` to pass to the next middleware, and process the response on the way back. Order of registration in `Program.cs` determines the order of execution.

**Q: Why use middleware for exception handling instead of ActionFilter or try-catch in every controller?**
Middleware operates at a lower level than filters — it catches exceptions from anywhere in the pipeline, including middleware itself. A global try-catch in every controller is repetitive and easy to forget. One middleware = one place to handle all unhandled exceptions.

**Q: Does the client see the actual exception message?**
Only for `ArgumentNullException` and `InvalidOperationException` (which are typically thrown intentionally with meaningful messages). For unexpected exceptions (`_` catch-all), the client only sees `"An internal server error occurred"`. The full stack trace is only in the Serilog log file.
