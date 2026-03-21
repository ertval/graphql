# Refactored Architecture Guide (2026)

This document provides a comprehensive overview of the refactored GraphQL Profile application. The architecture has been flattened and standardised into a **Feature-First** structure, adhering to Clean Architecture principles and ES2026 standards.

---

## 🏗️ Architectural Overview

The application is structured into **Features** (business domains) and **Infrastructure** (technical adapters). Each feature follows a consistent 4-file pattern to ensure "screaming architecture" where the file names communicate their purpose.

### 1. File Structure

```text
src/
├── app.js                  # Main Application Router & State Orchestrator
├── dashboard.view.js       # Main Dashboard Tab Rendering
├── dashboard.api.js        # GraphQL Queries for Dashboard
├── dashboard.popup.js      # Modal & Activity UI Logic
├── dashboard.core.js       # Pure Logic (Math, Grouping, Normalisation)
│
├── collaborations.view.js  # Leaderboard Table & State
├── collaborations.api.js   # Fetches & Normalises Collabs
├── collaborations.popup.js # Collaborator Profile Overlay
├── collaborations.core.js  # Pure Collab Domain Logic
│
├── charts.bar.js           # SVG Project XP Bar Chart
├── charts.donut.js         # SVG Audit Ratio Donut
├── charts.line.js          # SVG Cumulative XP Line
├── charts.pie.js           # SVG Pass/Fail Ratio Pie
├── charts.helpers.js       # SVG Factory & Formatters
│
├── infra.auth.js           # JWT & Session Management
├── infra.graphql.js        # HTTP Fetch & Error Handling
└── infra.result.js         # Result Pattern (ok/fail)
```

### 2. The 4-File Feature Pattern

Every major feature (e.g., `dashboard`, `collaborations`) is built using these suffixes:

| Suffix | Responsibility | Implementation Rules |
|---|---|---|
| `.core.js` | **Pure Business Logic**. Normalisation, math, and entities. | No DOM, no `fetch`, no side effects. |
| `.api.js` | **Data Access Layer**. Encapsulates queries and DTO mapping. | Depends on `infra.graphql.js`. |
| `.view.js` | **UI Orchestration**. Event listeners, state, and rendering. | Connects `.api` to the DOM. |
| `.popup.js` | **Overlay/Detail Logic**. Specific modal/dialog management. | Self-contained UI components. |

---

## 🔄 Critical Data Flows

### A. Authentication & Session Lifecycle
1. **Login**: `app.js` captures credentials → calls `infra.auth:login()`.
2. **Persistence**: On success, `infra.auth:saveToken()` stores a session-scoped JWT (memory-first, `sessionStorage` fallback).
3. **Implicit Auth**: Every request via `infra.graphql:graphqlQuery()` adds the `Authorization: Bearer` header.
4. **Expiration**: If the API returns 401/403, `infra.graphql` calls `infra.auth:clearToken()` and the UI triggers `performLogout()`.

### B. Dashboard Loading (The "Functional Core")
1. `app.js` triggers `loadDashboard()` which fires `Promise.all()` across multiple `dashboard.api` queries.
2. The pure logic functions in `dashboard.core.js` compute stats (top skills, total XP) isolated from the DOM.
3. Resulting data is passed into **Pure Renderers** (`charts.*` and `dashboard.view` DOM functions).
4. `Object.groupBy()` is used to bucket XP transactions by project name for the bar chart.
5. `Temporal` API processes all timestamps for accurate local date display in the activity feed.

### C. Collaborations Lifecycle
1. **Lazy Loading**: Data is only fetched when the user clicks the "Collaborations" tab.
2. **Aggregation**: `collaborations.api` fetches raw groups/audits and aggregates them into a unique list of logins.
3. **Normalisation**: `collaborations.core:normalizeCollaboratorNamesByLogin()` ensures name consistency across different records (e.g., Partner vs Auditor).
4. **Reactivity**: Sorting and filtering in `collaborations.view` use **Immutable Array Methods** (`.toSorted()`, `.with()`) to manage state without side effects.

---

## 🛡️ ES2026 & Engineering Guidelines

The codebase strictly follows the requirements set in `AGENTS.md`:

- **Immutability**: Mutating methods like `.sort()` are replaced with `.toSorted()`.
- **Temporal API**: The legacy `Date` object is 100% removed. All date math and formatting use `Temporal`.
- **Result Pattern**: Business logic rejections return `{ ok: false, error }` instead of throwing, allowing for type-safe error handling.
- **Screaming Structure**: Directory flattening ensures all files related to "Collaborations" or "Charts" stay prefixed and grouped.
- **Resource Management**: Network requests are bound by `AbortController` timeouts (12s) to prevent hanging UI.
- **Security**: Static-hosting-compatible hardening via CSP/Trusted Types meta policy, session-scoped JWT storage, and sanitized user-visible errors.

---

## ✅ Refactor Checklist Verification

- [x] All file headers updated with correct `@module` descriptors.
 - [x] Dashboard entry controller consolidated in `dashboard.view.js`.
- [x] `dashboard.activity.js` renamed to `dashboard.popup.js`.
- [x] Redundant `dashboard.metrics.js` removed (logic merged into `charts.helpers.js`).
- [x] GraphQL queries moved from `graphql.queries.js` to feature-specific `.api.js` files.
- [x] Infrastructure files grouped under `infra.*` prefix.
- [x] Biome linting/formatting checks passed.
- [x] `index.html` entry point updated.
