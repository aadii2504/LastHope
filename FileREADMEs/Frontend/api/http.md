# `http.js` — Axios Instance & Interceptors

**Location:** `learn-sphere-main/frontend/learn-sphere-ui/src/api/http.js`

---

## What This File Does

Creates and exports a **pre-configured Axios instance** used by every API file in the frontend. It is the **single point** where:

1. The base API URL is set
2. JWT tokens are automatically attached to every request
3. 401 Unauthorized responses are globally handled (force logout)

All other API files import `http` from this file and use it instead of raw `axios`.

---

## Full Code

```javascript
import axios from "axios";

// Create a configured Axios instance
export const http = axios.create({
  baseURL: "http://localhost:5267/api/",
});

// ─── REQUEST INTERCEPTOR ─────────────────────────────────────────────────────
// Runs BEFORE every request is sent
http.interceptors.request.use(
  (config) => {
    // Attach JWT token from localStorage to every request
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // For FormData (file uploads), delete Content-Type
    // so Axios/browser can set the multipart/form-data boundary automatically
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config; // Must return config or the request is cancelled
  },
  (error) => Promise.reject(error),
);

// ─── RESPONSE INTERCEPTOR ────────────────────────────────────────────────────
// Runs AFTER every response is received
http.interceptors.response.use(
  (response) => response, // Pass through successful responses unchanged
  (error) => {
    // 401 = Token expired or invalid → force logout
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("learnsphere_user");
      window.location.href = "/login";
    }
    return Promise.reject(error); // Always re-throw for the calling code to handle
  },
);
```

---

## Flow Diagram

```
Frontend Component
      ↓ calls courseApi.getAll()
courseApi.js
      ↓ calls http.get("courses")
http.js — REQUEST INTERCEPTOR runs:
      • Reads token from localStorage
      • Adds Authorization: Bearer eyJhbGc... to headers
      • If FormData, removes Content-Type (for file uploads)
      ↓
HTTP request goes to http://localhost:5267/api/courses
      ↓
Backend returns response
http.js — RESPONSE INTERCEPTOR runs:
      • Success (2xx): passes response through unchanged
      • 401: clears localStorage + redirects to /login
      ↓
courseApi.js receives the response
      ↓
Component receives data
```

---

## Why This Pattern vs Manual Token Attachment

**Without interceptors** (repetitive, error-prone):

```javascript
// Every single API call would need:
const token = localStorage.getItem("token");
const response = await axios.get("http://localhost:5267/api/courses", {
  headers: { Authorization: `Bearer ${token}` },
});
```

**With interceptors** (DRY, centralized):

```javascript
// Every API call is just:
const response = await http.get("courses");
// Token is added automatically by the interceptor
```

---

## Interview Questions & Answers

**Q: What is an Axios interceptor?**
Middleware for HTTP requests/responses. Request interceptors run before a request is sent, response interceptors run after a response is received. They allow you to centrally modify requests/responses without touching individual API calls.

**Q: Why delete Content-Type for FormData?**
When you send a `multipart/form-data` request, the `boundary` string (`--WebkitFormBoundaryXXXX`) separates each field in the body. The browser generates this boundary automatically. If you manually set `Content-Type: multipart/form-data` (without the boundary), the server cannot parse the body and file upload fails.

**Q: What happens if the user's JWT expires while they're using the app?**
The next API call gets a 401 response. The response interceptor catches it, clears `localStorage`, and does `window.location.href = "/login"`. The user sees the login page.

**Q: Can you have multiple Axios interceptors on the same instance?**
Yes. `http.interceptors.request.use(handler1)` and `http.interceptors.request.use(handler2)` both stack. They run in the order added for requests, and in reverse order for responses (wrapping pattern).
