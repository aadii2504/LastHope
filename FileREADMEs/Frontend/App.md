# `App.jsx` — React Router & Route Protection

**Location:** `learn-sphere-main/frontend/learn-sphere-ui/src/App.jsx`

---

## What This File Does

The **central routing file** of the React app. It defines every URL route and which component renders at that route. It also implements access control through `ProtectedRoute` and `ProtectedAdminRoute` wrapper components.

---

## Route Architecture

```
App.jsx
  ├── Public Routes (anyone can access, no token needed)
  │   ├── /                    → LandingPage
  │   ├── /login               → LoginPage
  │   ├── /register            → RegistrationPage
  │   ├── /forgot-password     → ForgotPasswordPage
  │   ├── /courses             → CoursesPage
  │   ├── /course/:slug        → CourseDetailPage
  │   └── /about, /contact     → static pages
  │
  ├── Protected Routes [ProtectedRoute] (must be logged in)
  │   ├── /dashboard           → DashboardPage
  │   ├── /enrolled-courses    → EnrolledCourses
  │   ├── /profile             → ProfilePage
  │   ├── /live-sessions       → LiveSessionsPage
  │   ├── /live/:id            → LiveSessionPlayer
  │   └── /course/:slug/learn  → CoursePlayerPage
  │
  └── Admin Routes [ProtectedAdminRoute] (must be admin role)
      ├── /admin/dashboard     → AdminDashboard
      ├── /admin/courses       → CoursesAdmin
      ├── /admin/live-sessions → LiveSessionsAdmin
      ├── /admin/analytics     → Analytics
      └── /admin/users         → Users
```

---

## ProtectedRoute — Auth Guard

```jsx
export const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("learnsphere_user") || "null");

  if (!user || !user.token) {
    return <Navigate to="/login" replace />; // Redirect if not logged in
  }

  return children;
};
```

**How it works:** Reads `learnsphere_user` from `localStorage`. If no user (not logged in), redirects to `/login`. `replace` means the redirect URL is replaced in browser history, so pressing "Back" won't loop back to the protected page.

---

## ProtectedAdminRoute — Role Guard

```jsx
const ProtectedAdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("learnsphere_user") || "null");

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />; // Redirect non-admins to home
  }

  return children;
};
```

---

## Route Usage in JSX

```jsx
// Student course player — requires login
<Route path="/course/:slug/learn" element={
    <ProtectedRoute>
        <CoursePlayerPage />
    </ProtectedRoute>
} />

// Analytics — requires admin role
<Route path="/admin/analytics" element={
    <ProtectedAdminRoute>
        <Analytics />
    </ProtectedAdminRoute>
} />
```

---

## Dynamic Route Parameters

`/course/:slug` — the `:slug` is a URL parameter, accessible in the component via:

```javascript
const { slug } = useParams();
// If URL is /course/intro-to-csharp, slug = "intro-to-csharp"
```

`/course/:slug/learn` — same slug parameter, different page (player vs detail)

---

## How the Frontend Knows the User's Role

On login, the backend returns `{ token, name, email, role }`. The frontend stores it:

```javascript
localStorage.setItem("learnsphere_user", JSON.stringify(response));
```

`ProtectedAdminRoute` reads `user.role` from this stored object. **This is for UX only** — the real security check happens in every backend endpoint (`User.IsInRole("admin")`). The frontend check just prevents non-admin users from seeing admin UI.

---

## Interview Questions & Answers

**Q: What happens if someone manually edits localStorage to set role = "admin"?**
They can access the admin React pages, but every backend API call will be rejected. The JWT token in `localStorage` has the real `role: "student"` claim (signed and unmodifiable). The backend always reads the role from the JWT, not from any client-supplied value.

**Q: What is React Router's `<Navigate>` component?**
It causes an immediate redirect when rendered. `<Navigate to="/login" replace />` is equivalent to `window.location.replace("/login")` — it replaces the current history entry, so the back button doesn't loop.

**Q: How does `useParams()` work in CoursePlayerPage?**
React Router makes URL parameters available via the `useParams()` hook inside any component that's rendered by a `<Route path="/course/:slug/learn">`. The colon `:slug` defines the parameter name.

**Q: What is `react-router-dom` and why use it?**
A library that enables **client-side routing** — navigating between pages without a full browser reload. `<Routes>/<Route>` define which component renders at each URL. `<Link>` and `useNavigate()` handle navigation. This gives Single Page Applications (SPAs) the feel of multi-page websites.
