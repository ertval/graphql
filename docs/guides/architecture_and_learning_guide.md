# Architecture & Learning Guide — GraphQL Profile

Welcome to the GraphQL Profile project! This guide explains the core concepts used in this application and how the codebase is structured.

---

## 1. Core Concepts 🧠

### What is an API?
An API (Application Programming Interface) is like a waiter in a restaurant. You (the browser) look at the menu and tell the waiter what you want. The waiter (API) goes to the kitchen (server/database), retrieves your order, and returns it to you.

### What is GraphQL?
A traditional REST API returns a fixed "dish" — e.g., a full user object with 50 fields even if you only need 3. **GraphQL** lets you specify exactly which fields you want:

```graphql
# Normal query — only 2 fields
{ user { id login } }

# Parameterised query — filter by userId variable
query GetXP($userId: Int!) {
  transaction(where: { userId: { _eq: $userId } }) {
    amount createdAt
  }
}

# Nested query — traverse relationships
{ result { grade object { name type } } }
```

This project demonstrates all three query types. See `src/features/dashboard/dashboard.api.js` for concrete implementations.

### JWT Authentication
When you log in, the server verifies credentials and returns a **JWT (JSON Web Token)** — a cryptographically signed ticket. Every subsequent GraphQL request includes this token in the `Authorization: Bearer <token>` header. If the token expires or is tampered with, the server rejects the request.

The token is session-scoped in memory with `sessionStorage` fallback in `src/infra/auth.js`. `isAuthenticated()` validates token expiry before allowing API calls.

### SVG Graphics
All four charts are drawn using the browser's native **SVG (Scalable Vector Graphics)** API:
```js
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
```
There is **no canvas, no external chart library**. Coordinates are calculated in JavaScript from the raw data, then translated into SVG attributes (`d`, `cx`, `cy`, `r`, etc.).

### Why `npx serve`?
Browsers block:
1. **CORS requests** from `file://` origins — the GraphQL API rejects them.
2. **ES module imports** over `file://` — the browser refuses to load `import` statements.
3. **SPA routing** — a server redirects 404s back to `index.html`.

A simple `npx serve .` gives the app a proper `http://localhost:3000` origin.

---

## 2. Module Architecture

┌──────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  index.html  ──links──►  css/ (7 files)                      │
│       │                                                      │
│       └──module──► src/app.js                                │
│                         │                                    │
│                         ├──► src/features/dashboard/         │
│                         ├──► src/features/collaborations/    │
│                         ├──► src/shared/                     │
│                         └──► src/infra/                      │
└──────────────────────────────────────────────────────────────┘

| File Group | Responsibility |
|---|---|
| `dashboard.*.js` | Tab routing, dashboard load pipeline, project detail overlays (`.popup`), pure transform logic (`.core`), and GraphQL queries (`.api`). |
| `collaborations.*.js` | Collaborations domain normalisation (`.core`), API fetching (`.api`), DOM orchestration and filtering (`.view`), and profile overlays (`.popup`). |
| `shared/` | Shared UI components and SVG charts. |
| `infra/` | Auth token management, HTTP/GraphQL transport wrapper, and the Result logic pattern. |

### CSS Module Split

| File | Content |
|---|---|
| `css/theme.css` | CSS custom properties — palette, spacing, radii, typography, transitions |
| `css/base.css` | Reset, body, `.glass` utility, `.tab-panel` layout, keyframe animations |
| `css/login.css` | Login card, form inputs, background orb animations |
| `css/nav.css` | Navigation bar, brand, tab switcher, logout button |
| `css/dashboard.css` | Dashboard cards (user, XP, audit), graph groups, skills, activity, project detail overlay |
| `css/graphs.css` | SVG containers, axis lines, line/bar/donut/pie element classes, tooltips |
| `css/collaborations.css` | Collaborations controls, table, role badges, pagination, collaborator profile overlay |

---

## 3. Key Design Patterns

### Tab Switching (no router library)
```js
const switchTab = (tab) => {
  dashboardPanel.classList.toggle('active', tab === 'dashboard');
  collabsPanel.classList.toggle('active', tab === 'collabs');
};
```
`.tab-panel { display: none }` / `#dashboard.tab-panel.active { display: grid }` in CSS.  
The students panel gets `display: block` via `.tab-panel.active`, while the dashboard uses a more specific selector to get its 3-column grid.

### Lazy Loading (students)
```js
tabStudents.addEventListener('click', () => {
  if (!studentsPanel.dataset.loaded) {
    studentsPanel.dataset.loaded = '1';
    initStudentsView();          // fetch happens ONLY on first click
  }
});
```

### Parallel Fetching
```js
const [xpTransactions, progress, skills, level, results] =
  await Promise.all([fetchXPTransactions(id), fetchProgress(id), ...]);
```
All five queries fire simultaneously, reducing total wait time to the slowest single response.

### Immutable Array Operations (ES2026)
```js
// toSorted — never mutates the original array
const topSkills = [...skillMap.entries()].toSorted(([, a], [, b]) => b - a);
```

### Temporal API (no legacy Date)
```js
const zdt = Temporal.Instant.from(createdAt)
  .toZonedDateTimeISO(Temporal.Now.timeZoneId());
return zdt.toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric' });
```

---

## 4. What Part Could Be Written in Go? 🐹

Currently 100% client-side. If you introduced a Go backend:

### Stays in JavaScript (Frontend)
- DOM manipulation and SVG drawing (`src/charts.*.js`)
- User interaction (click events, hover effects, tab routing)
- Styling (all CSS)

### Moves to Go (Backend)
- **GraphQL proxy** — Go fetches from Zone01 API, adds auth server-side (safer than browser token ownership)
- **Session management** — Go issues an `HttpOnly` cookie instead of exposing the JWT to JS (XSS protection)
- **Static file server** — `http.FileServer` replaces `npx serve`
- **Data caching** — Go caches expensive aggregation queries (large transaction histories)

```
Currently: Browser → Zone01 GraphQL API
With Go:   Browser → Your Go Server → Zone01 GraphQL API
```

---

## 5. Coding Standards (AGENTS.md — ES2026)

| Rule | Implemented |
|---|---|
| `var` forbidden | ✅ — `const`/`let` only |
| CommonJS forbidden | ✅ — ES modules (`import`/`export`) only |
| `Temporal` API | ✅ — zero `Date` objects |
| Immutable arrays | ✅ — `.toSorted()`, spread instead of `.sort()` |
| `Object.groupBy()` | ✅ — used in `src/charts.bar.js` for project XP aggregation |
| `async/await` | ✅ — no `.then()` chains |
| Biome linting | ✅ — no `!important`, sorted imports, no unused vars |

## 6. Dependency Boundaries

1. app may compose view/api/core/infra modules and wire adapters.
2. view modules should not import infra auth/transport directly.
3. api modules should not import view/DOM modules.
4. core modules remain pure and side-effect free.
5. infra modules expose reusable adapters and stay feature-agnostic.
