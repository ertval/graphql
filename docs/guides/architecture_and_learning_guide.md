# Architecture & Learning Guide — GraphQL Profile

Welcome to the GraphQL Profile project! This guide explains the core concepts, modern JavaScript patterns, and the "Screaming Vertical Slice" architecture used in this application.

---

## 1. Core Concepts 🧠

### What is an API?
An API (Application Programming Interface) is like a waiter in a restaurant. You (the browser) look at the menu and tell the waiter what you want. The waiter (API) goes to the kitchen (server/database), retrieves your order, and returns it to you.

### What is GraphQL?
Unlike traditional REST APIs that return a fixed "dish", **GraphQL** lets you specify exactly which fields you want. This prevents "over-fetching" (getting data you don't need) and "under-fetching" (having to make multiple calls).

```graphql
# Normal query — only 2 fields
{ user { id login } }

# Parameterised query — filter by userId variable
query GetXP($userId: Int!) {
  transaction(where: { userId: { _eq: $userId } }) {
    amount createdAt
  }
}

# Nested query — traverse relationships (User -> Transaction -> Object)
{ transaction { amount object { name type } } }
```

### JWT Authentication
When you log in, the server returns a **JWT (JSON Web Token)**. We store this in-memory for security, with a `sessionStorage` fallback for page reloads.
- **Security Hint**: We avoid `localStorage` to mitigate persistent XSS risks.
- **Implementation**: See `src/infra/auth.js`.

---

## 2. Screaming Vertical Slice Architecture

Our directory structure "screams" its purpose. Instead of grouping by technical type (components, services), we group by **Feature**.

```text
├── src/
│   ├── features/
│   │   ├── auth/           # Identity and Login
│   │   ├── dashboard/      # User Stats and SVG Analytics
│   │   ├── collaborations/ # Peer Leaderboard and Profiles
│   │   └── shell/          # Navigation and App Layout
│   ├── infra/              # Technical adapters (Auth, GraphQL, UI helpers)
│   ├── shared/             # Reusable UI components (Popups)
│   └── app.js              # Decoupled Event Orchestrator
```

### The Decoupled Event Flow
Features do not call each other directly. They communicate via **Native CustomEvents**. This allows us to add or remove features without breaking the app.

```js
// src/app.js - Orchestration
if (isAuthenticated()) {
  document.dispatchEvent(new CustomEvent("auth:login"));
}

// src/features/dashboard/dashboard.ui.view.js - Reaction
document.addEventListener("auth:login", async () => {
  await loadDashboard();
});
```

---

## 3. Critical Engineering & Edge Cases

### 🛡️ Security: XSS & Injection Prevention
- **Trusted Types**: We use a meta policy to ensure all DOM injections are sanitized.
- **CSP**: A strict Content Security Policy prevents unauthorized scripts and styles.
- **Sanitization**: We use `textContent` by default and `replaceChildren()` for clearing elements, avoiding `innerHTML` sinks.

### ⚡ Performance: Parallel Fetching & Lazy Loading
- **Parallelism**: In `dashboard.api.js`, we use `Promise.all` to fire all 6+ GraphQL queries simultaneously. This cuts load time significantly.
- **Lazy Loading**: The Collaborations feature is only initialized when the user clicks the tab, saving bandwidth and processing power for the initial login.

### 🏁 Pitfall Avoidance: The "Stale Load" Guard
In async applications, a slow request might return after the user has already logged out or triggered a new load. We use a **Generation Counter** to ignore "stale" results.

```js
// src/features/dashboard/dashboard.ui.view.js
let dashboardLoadGeneration = 0;

export const loadDashboard = async () => {
  const loadId = ++dashboardLoadGeneration;
  const data = await fetchEverything();
  
  // Guard: if loadId is old, don't update the UI
  if (loadId !== dashboardLoadGeneration) return; 
  render(data);
};
```

### 📅 Modern APIs: Temporal & Immutable Arrays
- **No `Date`**: We exclusively use the **Temporal API** for robust time handling without the "timezone hell" of legacy JS.
- **No Mutation**: We use `.toSorted()` and `.toSpliced()` (ES2026) to ensure our data remains predictable and side-effect free.

---

## 4. Data Flow & Usability

### The "Result" Pattern
Instead of `try/catch` everywhere, we use a `Result` object: `{ ok: true, data } | { ok: false, error }`.
- This makes error handling explicit and type-safe.
- **Hint**: See `src/infra/result.js`.

### SVG Drawing Workflow
1. **Fetch**: Get raw data from GraphQL.
2. **Transform**: Compute coordinates in a pure function (`core.js`).
3. **Render**: Use `document.createElementNS` to create SVG elements.
4. **Style**: Use CSS variables (in `graphs.css`) to handle colors and animations, keeping the JS focused on logic.

---

## 5. Deployment & Scalability
The app is designed to be **Static-Host Ready**. Because it's vanilla JS with no build step required (though we use Biome for quality), it can be served from any simple folder.

**Scalability**: To add a "Profile Edit" feature, you would simply create `src/features/profile-edit/`, add its CSS, and listen for `auth:login`. No existing feature code would need to change.
