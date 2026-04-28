# Audit Verification Guide — GraphQL Profile

This document provide detailed answers and code references for every question in the [Audit Checklist](../audit.md), ensuring full compliance with the project requirements.

---

## 1. Functional Verification

### Invalid Login Attempt
> **Q: Try to log in with invalid credentials. Is an appropriate error shown?**
- **Answer**: Yes. The `src/features/auth/auth.ui.view.js` listens for the login form submission. It calls `login()` from `src/infra/auth.js`.
- **Code Reference**: 
  - `auth.ui.view.js`: Handles form submission, displays a loader during the request, and renders the error message.
  - `infra/auth.js`: Implements the `Basic` auth fetch to `/api/auth/signin`. If the status is not 200, it returns a failed Result with an "Invalid credentials" message.
  - `auth.core.js`: Normalizes backend error messages into user-friendly strings.

### Valid Login & Layout
> **Q: Does the profile page consist of three sections as required?**
- **Answer**: Yes. The Dashboard is divided into:
  1. **User Section**: Identity, email, campus, and Role Distribution (Captain/Partner/Auditor).
  2. **XP Section**: Total XP, Level, and detailed XP progress.
  3. **Audit Section**: Audit ratio, total up/down, and detailed audit history.
- **Code Reference**: See `renderUserSection`, `renderXPSection`, and `renderAuditSection` in `src/features/dashboard/dashboard.ui.view.renderers.js`.

### Content Accuracy (GraphiQL)
> **Q: Are the details presented in these sections accurate and correspond to the expected data?**
- **Answer**: Yes. All data is fetched directly from the platform's GraphQL API using standard queries.
- **Verification**: You can run the queries found in `src/features/dashboard/dashboard.api.js` inside GraphiQL to verify the values (XP, level, ratio) match exactly.

### Graphical Statistics
> **Q: Does the profile include a fourth section dedicated to graphical statistics?**
- **Answer**: Yes. The **Statistics** section (accessible via the Dashboard tab) contains 4 distinct SVG charts grouped by "XP Analytics" and "Audit & Results".
- **Code Reference**: `src/features/dashboard/dashboard.ui.view.renderers.js:renderGraphs()` orchestrates the rendering of all four charts.

### SVG Implementation
> **Q: Does this section contain at least two different graphs created using SVG?**
- **Answer**: Yes. We exceed the requirement with **four** native SVG graphs:
  1. **XP Line Chart**: Cumulative progress over time (`src/features/dashboard/dashboard.ui.charts.line.js`).
  2. **Project Bar Chart**: XP earned per project (`src/features/dashboard/dashboard.ui.charts.bar.js`).
  3. **Audit Donut Chart**: Visual ratio of Done vs Received (`src/features/dashboard/dashboard.ui.charts.donut.js`).
  4. **Pass/Fail Pie Chart**: Ratio of successful vs failed project results (`src/features/dashboard/dashboard.ui.charts.pie.js`).

### Graph Accuracy
> **Q: Do the graphs display the expected data accurately?**
- **Answer**: Yes. The charts are built by transforming raw GraphQL transactions into SVG coordinates.
- **Logic**:
  - `Object.groupBy()` is used to aggregate XP by project name.
  - `Temporal` API ensures accurate time-axis scaling for the line chart.
  - Native SVG path generators translate data points to screen pixels using geometric formulas.

### Hosting
> **Q: Is the profile successfully accessible and hosted online?**
- **Answer**: Yes. Follow the instructions in `README.md` to deploy to GitHub Pages. The app is 100% static and compatible with any standard web host.

### Logout Functionality
> **Q: Is the logout functionality successful?**
- **Answer**: Yes. Clicking the Logout button triggers `infra.auth:logout()`, which:
  1. Clears the JWT from memory and `sessionStorage`.
  2. Dispatches a global `auth:logout` event.
  3. All UI slices reset their state (clearing personal data, resetting inputs) and return to the login screen.
- **Code Reference**: `src/features/auth/auth.ui.view.js:performLogout()` and the `auth:logout` listener in `src/features/shell/shell.ui.view.js`.

---

## 2. General Technical Requirements

### Mandatory GraphQL Queries
> **Q: Does the project have at least the mandatory queries (nested, normal and using arguments)?**
- **Answer**: Yes.
  - **Normal**: `fetchUserInfo` in `dashboard.api.js`.
  - **Nested**: `fetchUserRoleStats` in `dashboard.api.js` (nests `group`, `object`, and `members`).
  - **Arguments**: `fetchXPTransactions` uses `where: { userId: { _eq: $userId } }`.
- **Code Reference**: `src/features/dashboard/dashboard.api.js`.

---

## 3. Bonus Features

### Additional Information
- **Collaborations Tab**: A full leaderboard of all school peers with live search, paging, and role filtering.
- **Project Detail Overlays**: Click any project in the "Recent Projects" list to see a detailed drill-down, including team members and exact XP/grade.
- **Skills Breakdown**: A visual list of the user's top technical skills aggregated from transactions.
- **Theme Switching**: Full support for Light and Dark modes with persistent storage.

### Extra Graphs
- We provided **4 graphs** (Line, Bar, Donut, Pie) instead of the minimum 2.

### Coding Practices
- **Clean Architecture**: Decoupled layers (API, Core, View, Infra).
- **ES2026 Standards**: Uses `Temporal`, `Object.groupBy()`, `Promise.try()`, Immutable Arrays, and `using` declarations.
- **Performance**: Parallel fetching (`Promise.all`) and lazy-loading of the collaborations list.
- **Security**: Strict CSP, Trusted Types, and no `localStorage` for sensitive tokens.
- **Accessibility**: ARIA labels, keyboard navigation for tabs, and semantic HTML structure.
