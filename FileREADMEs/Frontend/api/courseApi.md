# `courseApi.js` — Frontend API Layer

**Location:** `learn-sphere-main/frontend/learn-sphere-ui/src/api/courseApi.js`

---

## What This File Does

The **central API interface** between the React frontend and the backend for everything related to courses, chapters, lessons, content, quizzes, assessments, and live sessions. Every page component that needs backend data imports from this file.

---

## Architecture

```
React Component
      ↓ imports
courseApi.js         ← This file
      ↓ uses
http.js              ← Axios instance with JWT interceptor
      ↓ sends HTTP to
.NET Backend API
```

---

## Module Structure

```javascript
export const courseApi = {
    getAll: async () => { ... },
    getById: async (id) => { ... },
    getStructure: async (id) => { ... },
    create: async (payload) => { ... },
    update: async (id, payload) => { ... },
    delete: async (id) => { ... },

    chapters: { create, update, delete },
    lessons: { create, update, delete },
    content: { upload, delete },
};

export const quizApi = { /* ... */ };
export const assessmentApi = { /* ... */ };
export const liveSessionApi = { /* ... */ };
```

---

## Course CRUD Examples

```javascript
// GET /api/courses
getAll: async () => {
    const { data } = await http.get("courses");
    return data;
},

// POST /api/courses
create: async (payload) => {
    // Frontend validation BEFORE hitting the API
    if (!payload.title?.trim()) throw new Error("Title is required");
    if (!payload.slug?.trim())  throw new Error("Slug is required");

    const { data } = await http.post("courses", payload);
    return data;
},
```

---

## File Upload API Call

```javascript
// POST /api/courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}/content
// Uses FormData for multipart/form-data
upload: async (courseId, chapterId, lessonId, formData) => {
    const { data } = await http.post(
        `courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}/content`,
        formData
        // Content-Type is intentionally NOT set here
        // http.js interceptor deletes it for FormData to allow browser to set boundary
    );
    return data;
},
```

---

## Assessment API — Complete Flow

```javascript
export const assessmentApi = {
  // Check if student can take the assessment
  getEligibility: async (courseId) => {
    const { data } = await http.get(
      `assessments/course/${courseId}/eligibility`,
    );
    return data;
  },

  // Start assessment (creates attempt record)
  startAttempt: async (courseId) => {
    const { data } = await http.post(`assessments/course/${courseId}/start`);
    return data; // { attemptId, startedAt, timeLimitMinutes }
  },

  // Submit answers
  submitAttempt: async (attemptId, answers) => {
    const { data } = await http.post(
      `assessments/attempt/${attemptId}/submit`,
      { answers },
    );
    return data; // { score, passed, grade, correct, total }
  },

  // Mark a lesson as complete
  completeLesson: async (lessonId) => {
    const { data } = await http.post(`assessments/lesson/${lessonId}/complete`);
    return data;
  },
};
```

---

## Error Handling Pattern

```javascript
getAll: async () => {
    try {
        const { data } = await http.get("courses");
        return data;
    } catch (err) {
        // Re-throw with a user-friendly message
        throw new Error(err.response?.data?.error ?? "Failed to fetch courses");
    }
},
```

In components, the calling code typically wraps the API call:

```javascript
try {
  const courses = await courseApi.getAll();
  setCourses(courses);
} catch (err) {
  toast.error(err.message); // Show toast notification
}
```

---

## Interview Questions & Answers

**Q: Why is each API grouped into a module (courseApi, quizApi, etc.) instead of one flat export?**
Namespace organization. When a component imports `assessmentApi.startAttempt()`, it's immediately clear this is an assessment operation. Flat exports like `startAssessmentAttempt` would require longer names.

**Q: How does the component know if an API call failed due to network error vs server error?**
`err.response` is populated for server errors (4xx, 5xx) — the request reached the server. `err.request` is populated for network errors (no response received). `err.message` is set for both plus client-side errors (e.g., request construction failure).

**Q: Why validate on the frontend in courseApi.create() if the backend also validates?**
Frontend validation is for **user experience** — instant feedback without a round-trip. Backend validation is for **security** — mandatory, can't be bypassed. Both serve different purposes and must coexist.
