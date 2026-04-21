# Refactored Architecture Guide (2026)

This document provides a comprehensive overview of the **Screaming Vertical Slice Architecture** implemented in the GraphQL Profile application.

---

## 🏗️ Architectural Overview

The application is structured into **Feature Slices** (business domains) and **Infrastructure** (technical adapters). This structure ensures that adding a new feature (like "Profile Edit") doesn't require modifying existing feature code.

### 1. File Structure

```text
src/
├── features/               # Domain-driven vertical slices
│   ├── auth/               # Identity and session management
│   ├── collaborations/     # Peer leaderboard and profiling
│   ├── dashboard/          # Stats and SVG analytics
│   └── shell/              # App layout and navigation
├── infra/                  # Shared technical adapters (Auth, GQL, UI)
├── shared/                 # Reusable UI components (Shared popups)
└── app.js                  # Decoupled Event Orchestrator
```

### 2. Feature Slice Pattern

Every major feature follows a consistent naming convention:

| Suffix | Responsibility | Implementation Rules |
|---|---|---|
| `.core.js` | **Pure Business Logic**. | Side-effect free. No DOM or fetch. |
| `.api.js` | **Data Access Layer**. | Encapsulates GraphQL queries and mapping. |
| `.ui.view.js` | **UI Controller**. | Orchestrates DOM rendering and events. |
| `.ui.popup.js` | **Detail/Overlay View**. | Handles specific drill-down UI logic. |

---

## 🔄 Critical Data Flows

### A. Decoupled Event-Driven Auth
1. `auth.ui.view` triggers login via `infra.auth`.
2. On success, a global `auth:login` event is dispatched.
3. Other slices (`dashboard`, `collaborations`) listen for this event and initialize their respective domains.
4. **Benefit**: The Auth feature doesn't need to know that the Dashboard exists.

### B. Dashboard Pipeline (Functional Core)
1. `loadDashboard()` fires multiple `dashboard.api` queries in parallel via `Promise.all()`.
2. `dashboard.core` computes derived stats (e.g., aggregating XP by project).
3. `dashboard.ui.view.renderers` updates the DOM and generates native SVG charts.
4. **Stale Guard**: A generation counter (`dashboardLoadGeneration`) prevents async race conditions.

### C. Collaborations Lifecycle
1. **Lazy Loading**: Data is only fetched when the user switches to the "Collaborations" tab.
2. **Immutable State**: Sorting and filtering use ES2026 methods (`.toSorted()`, `.toSpliced()`) to maintain predictable UI state.

---

## 🛡️ ES2026 Engineering Standards

- **Temporal API**: All date handling uses the `Temporal` proposal (zero `Date` objects).
- **Object.groupBy()**: Used for project-based XP aggregation in charts.
- **Result Pattern**: Uniform success/failure objects (`{ ok, data/error }`) for explicit error handling.
- **Security**: Strict CSP, Trusted Types, and no `localStorage` for sensitive JWTs.
- **Quality**: Unified linting and formatting via **Biome**.

---

## ✅ Refactor Completion Status

- [x] **Vertical Slices**: Features isolated into their own directories.
- [x] **Decoupling**: Tight coupling between `app.js` and features removed in favor of events.
- [x] **Pure Logic**: Extracted to `.core.js` files for testability.
- [x] **SVG Refactor**: Charts moved to specialized sub-modules in `dashboard/`.
- [x] **Infra Centralization**: Network, Auth, and Result logic moved to `src/infra/`.
