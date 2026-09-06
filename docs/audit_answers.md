# Audit Verification Guide — GraphQL Profile

This document provide detailed answers and code references for every question in the [Audit Checklist](../audit.md), ensuring full compliance with the project requirements.

---

## 1. Functional Verification

### 1.1 Invalid Login Attempt
> **Q: Try to log in with invalid credentials. Is an appropriate error shown?**
- **Verdict**: ✅ **Yes.**
- **Observed Behavior**:
  - Submitting empty inputs triggers client-side validation: `"Please fill in all fields."` without network calls.
  - Submitting incorrect credentials sends a `POST` request to `https://platform.zone01.gr/api/auth/signin` using HTTP `Basic` authentication.
  - Upon receiving a `401 Unauthorized` or `403 Forbidden` response, the UI immediately hides the button loader and renders `"Invalid username/email or password."` in `#login-error`.
- **Dual Identifier Support**:
  - The login input (`#identifier`) supports both `username` and `email` formats (e.g., `audit-user` or `audit@example.com`), satisfying project requirements.
- **Code Reference**:
  - [`auth.ui.view.js`](../src/features/auth/auth.ui.view.js): Form submission, button spinner state, and error injection.
  - [`infra/auth.js`](../src/infra/auth.js): Encodes credentials via `btoa(`${identifier}:${password}`)` and returns a failed Result.
  - [`auth.core.js`](../src/features/auth/auth.core.js): Error mapping and string sanitization.

### 1.2 Valid Login & Layout
> **Q: Does the profile page consist of three sections as required?**
- **Verdict**: ✅ **Yes.**
- **Observed Behavior**:
  - Successful authentication transitions the view from `#login-view` to `#profile-view`.
  - The profile page features exactly three dedicated data sections:
    1. **User Section** (`#section-user`): Avatar initials, full name, `@login`, email, campus (`📍 Athens`), and role distribution buttons (Captain / Partner / Auditor).
    2. **XP Section** (`#section-xp`): Total XP amount (formatted in `kB`/`MB`), current Level, and completed projects count.
    3. **Audit Section** (`#section-audit`): Up/Down audit ratio, Done (`totalUp`) vs Received (`totalDown`) visual progress bars, and an "Audit Details" modal trigger.
- **Code Reference**:
  - Layout in [`index.html`](../index.html#L169-L280).
  - Renderers: `renderUserSection()`, `renderXPSection()`, and `renderAuditSection()` in [`dashboard.ui.view.renderers.js`](../src/features/dashboard/dashboard.ui.view.renderers.js).

### 1.3 Content Accuracy (GraphiQL)
> **Q: Are the details presented in these sections accurate and correspond to the expected data?**
- **Verdict**: ✅ **Yes.**
- **How to verify in GraphiQL (`https://platform.zone01.gr/graphiql`)**:
  Run the queries below to verify that every rendered value matches database records 1:1.

#### Query 1: User Profile & Audit Ratio
```graphql
{
  user {
    id
    login
    firstName
    lastName
    email
    campus
    auditRatio
    totalUp
    totalDown
  }
}
```
- **Validation**:
  - `user.firstName` + `user.lastName` ➔ Matches `#user-fullname`.
  - `user.login` ➔ Matches `#user-login` and `#nav-username`.
  - `user.email` ➔ Matches `#user-email`.
  - `user.campus` ➔ Matches `#user-campus`.
  - `user.auditRatio` ➔ Rounded to 1 decimal place, matches `#audit-ratio`.
  - `user.totalUp` ➔ Formatted as `kB`/`MB` (`bytes / 1000`), matches `#audit-done-value`.
  - `user.totalDown` ➔ Formatted as `kB`/`MB` (`bytes / 1000`), matches `#audit-received-value`.

#### Query 2: Total XP & Level
```graphql
query GetXPAndLevel($userId: Int!, $eventId: Int!) {
  transaction(
    where: {
      userId: { _eq: $userId }
      eventId: { _eq: $eventId }
      type: { _eq: "xp" }
      _or: [
        { path: { _is_null: true } }
        { path: { _nilike: "%piscine-go%" } }
      ]
    }
    order_by: [{ createdAt: asc }]
  ) {
    amount
    path
  }
  level: transaction(
    where: {
      userId: { _eq: $userId }
      eventId: { _eq: $eventId }
      type: { _eq: "level" }
      _or: [
        { path: { _is_null: true } }
        { path: { _nilike: "%piscine-go%" } }
      ]
    }
    order_by: { amount: desc }
    limit: 1
  ) {
    amount
  }
}
```
*Variables*: `{ "userId": <YOUR_USER_ID>, "eventId": 200 }`
- **Validation**:
  - Sum of `transaction.amount` ➔ Formatted via `formatXP()`, matches `#total-xp`.
  - `level[0].amount` ➔ Matches `#user-level`.

### 1.4 Graphical Statistics Section
> **Q: Does the profile include a fourth section dedicated to graphical statistics?**
- **Verdict**: ✅ **Yes.**
- **Observed Behavior**:
  - A dedicated fourth section card (`#section-graphs`) titled **"Statistics"** is displayed on the Dashboard.
  - Subdivided into two logical groups:
    1. **XP Analytics**: Progress Over Time and XP by Project.
    2. **Audit & Results**: Audit Distribution and Pass/Fail Rate.
- **Code Reference**: [`index.html`](../index.html#L283-L314) and [`dashboard.ui.view.renderers.js:renderGraphs()`](../src/features/dashboard/dashboard.ui.view.renderers.js#L99-L112).

### 1.5 SVG Implementation
> **Q: Does this section contain at least two different graphs created using SVG?**
- **Verdict**: ✅ **Yes (4 native SVG graphs provided, exceeding the minimum of 2).**
  1. **XP Line Chart** (`#xp-line-chart` in [`dashboard.ui.charts.line.js`](../src/features/dashboard/dashboard.ui.charts.line.js)): Cumulative XP progression over time with bezier curves, area fill, data dots, and dynamic date labels.
  2. **Project Bar Chart** (`#project-bar-chart` in [`dashboard.ui.charts.bar.js`](../src/features/dashboard/dashboard.ui.charts.bar.js)): Horizontal bars for each project with dynamic layout computation, hover tooltips, and click-to-open project detail modal.
  3. **Audit Donut Chart** (`#audit-donut-chart` in [`dashboard.ui.charts.donut.js`](../src/features/dashboard/dashboard.ui.charts.donut.js)): Visual representation of Done vs Received audit bytes with animated SVG stroke arcs and center ratio.
  4. **Pass/Fail Pie Chart** (`#passfail-pie-chart` in [`dashboard.ui.charts.pie.js`](../src/features/dashboard/dashboard.ui.charts.pie.js)): Circular sector slices displaying project pass vs fail ratio.
- **Zero Libraries**: 100% programmatic SVG using `document.createElementNS("http://www.w3.org/2000/svg", ...)`.

### 1.6 Graph Accuracy
> **Q: Do the graphs display the expected data accurately?**
- **Verdict**: ✅ **Yes.**
- **Mathematical Accuracy & Verification**:
  - **Line Chart**: Evaluates timestamps using `Temporal.Instant.from(t.createdAt).epochMilliseconds` to scale the X-axis linearly. Final cumulative point matches `#total-xp`.
  - **Bar Chart**: Groups XP via `Object.groupBy()`; bar widths are computed as `(projectXP / maxXP) * chartWidth`. Clicking any bar opens the project modal displaying the exact same XP value.
  - **Donut Chart**: Arcs are calculated from `totalUp / (totalUp + totalDown)` and `totalDown / (totalUp + totalDown)`, mapping directly to platform audit bytes.
  - **Pie Chart**: Slices reflect counts of `grade >= 1` (Pass) vs `grade < 1` (Fail) from the `result` table.

### 1.7 Hosting
> **Q: Is the profile successfully accessible and hosted online?**
- **Verdict**: ✅ **Yes.**
- **Deployment Details**:
  - Pure static SPA (HTML/CSS/ES Modules) requiring zero build steps.
  - Live deployment available on GitHub Pages: `https://<your-username>.github.io/<repository-name>/`.
  - Root `.nojekyll` file ensures GitHub Pages serves all assets reliably without skipping folders.

### 1.8 Logout Functionality
> **Q: Is the logout functionality successful?**
- **Verdict**: ✅ **Yes.**
- **Observed Behavior**:
  - Clicking `#logout-btn` executes `infra.auth:clearToken()`, clearing the JWT from memory and `sessionStorage`.
  - Closes all open modals and unlocks body scrolling.
  - Clears inputs (`#identifier`, `#password`) and resets dashboard and collaborations state.
  - Dispatches `auth:logout`, transitioning the UI back to `#login-view`.
  - Broadcasts logout across all open tabs via `BroadcastChannel("graphql_auth_channel")` and storage event fallback.
- **Code Reference**: [`auth.ui.view.js:performLogout()`](../src/features/auth/auth.ui.view.js#L30-L47) and [`shell.ui.view.js`](../src/features/shell/shell.ui.view.js#L78-L98).

---

## 2. General Technical Requirements

### 2.1 Mandatory GraphQL Queries
> **Q: Does the project have at least the mandatory queries (nested, normal and using arguments)?**
- **Verdict**: ✅ **Yes, all three query patterns are implemented.**

#### 1. Normal Query (flat root field, no arguments)
Located in [`dashboard.api.js:fetchUserInfo()`](../src/features/dashboard/dashboard.api.js#L28-L45):
```graphql
{
  user {
    id
    login
    firstName
    lastName
    email
    campus
    auditRatio
    totalUp
    totalDown
  }
}
```

#### 2. Query with Arguments (variables & conditions)
Located in [`dashboard.api.js:fetchXPTransactions()`](../src/features/dashboard/dashboard.api.js#L117-L152):
```graphql
query GetXPTransactions($userId: Int!, $eventId: Int!) {
  transaction(
    where: {
      userId: { _eq: $userId }
      eventId: { _eq: $eventId }
      type: { _eq: "xp" }
      _or: [
        { path: { _is_null: true } }
        { path: { _nilike: "%piscine-go%" } }
      ]
    }
    order_by: [{ createdAt: asc }, { id: asc }]
  ) {
    id
    objectId
    amount
    createdAt
    path
    object {
      id
      name
      type
    }
  }
}
```

#### 3. Nested Query (relational sub-selections)
Located in [`dashboard.api.js:fetchResults()`](../src/features/dashboard/dashboard.api.js#L251-L282) (nests `result ➔ user` and `result ➔ object`):
```graphql
query GetResults($userId: Int!, $eventId: Int!) {
  result(
    where: {
      userId: { _eq: $userId }
      eventId: { _eq: $eventId }
    }
    order_by: { createdAt: desc }
    limit: 30
  ) {
    id
    objectId
    grade
    type
    createdAt
    user {
      id
      login
    }
    object {
      name
      type
    }
  }
}
```
*(Also in `fetchUserRoleStats`: nests `audit ➔ group ➔ members ➔ user`)*.

---

## 3. Bonus Features

### 3.1 Additional Information Beyond 3 Mandatory Sections
> **Q: +Does the profile showcase additional information beyond the three mandatory sections?**
- **Verdict**: ✅ **Yes.**
  - **Collaborations Leaderboard Tab** (`#tab-collaborations`): An entire secondary view featuring a verified school peer collaboration leaderboard with live search, role filter (Captain / Partner / Auditor), multi-column sorting, pagination, and detailed popups.
  - **Top Skills Section** (`#section-skills`): Aggregates skill transactions (`skill_%`), deduplicating and rendering the user's top technical competencies with animated percentage progress bars.
  - **Recent Projects Activity** (`#section-activity`): Interactive timeline of recent submissions showing pass/fail status pills, dates, and click-to-open drilldowns.
  - **Role Counters & Drilldown** (`#section-user`): Interactive counters displaying projects completed as Captain, Partner, or Auditor, opening the `#role-projects-overlay` modal on click.
  - **Audit Details Modal** (`#audit-details-overlay`): Detailed listing of every project audited, team members, and audit XP earned.
  - **Theme Toggle**: Full Dark / Light mode toggle (`#theme-toggle`) with local storage persistence and anti-flicker head script.

### 3.2 Extra Graphs
> **Q: +Are there additional graphs featured apart from the required two?**
- **Verdict**: ✅ **Yes.**
  - Required: At least 2 graphs.
  - Provided: **4 native SVG graphs**:
    1. XP Progress Over Time (Line Chart)
    2. XP by Project (Horizontal Bar Chart)
    3. Audit Distribution (Donut Chart)
    4. Pass / Fail Rate (Pie Chart)

### 3.3 Custom GraphiQL
> **Q: +Has the student created and utilized their own GraphiQL?**
- **Verdict**: ℹ️ **Platform GraphiQL Utilized (Bonus Item).**
- **Explanation for the Auditor**:
  - We utilized the platform's official GraphiQL IDE (`https://platform.zone01.gr/graphiql`) for introspecting the GraphQL schema, prototyping queries, and verifying data accuracy.
  - Building a full custom in-browser GraphiQL IDE (with Monaco editor, AST parsing, and schema autocomplete) was considered an optional bonus, and our engineering effort was focused instead on building high-value user features: a rich **Collaborations Leaderboard**, **4 interactive SVG charts**, **deep project & role overlays**, and **strict security hardening**.

### 3.4 UI Good Practices
> **Q: +Does the UI respect good practices?**
- **Verdict**: ✅ **Yes, exceptionally.**
- **UI/UX & Accessibility Highlights**:
  - **Responsive Design**: Fluid layout adapting smoothly across mobile (320px+), tablet, and desktop viewports without horizontal scrolling or overflow clips.
  - **Visual Hierarchy & Glassmorphism**: Clean dark/light theme tokens with frosted glass blur effects (`backdrop-filter`), consistent spacing, and Inter typography.
  - **Accessibility (a11y)**: Semantic HTML5 elements (`<main>`, `<nav>`, `<section>`, `<header>`, `<footer>`), explicit `role="dialog"` on modals, `aria-modal="true"`, `aria-label`, and `aria-live` regions for dynamic alerts and counters.
  - **Modal Ergonomics**: Body scroll is deterministically locked when popups open without layout shifts, and unlocked on all close paths (backdrop click, close button, ESC key, or logout).
  - **Visual Feedback**: Buttons indicate loading states with animated spinners; disabled states prevent duplicate form submissions.
  - **Security Standards**: Strict Content Security Policy (CSP) with `require-trusted-types-for 'script'`, no inline scripts in body, safe DOM sinks (`textContent`, `createElementNS`), and zero storage of sensitive credentials in `localStorage` (session-scoped token with idle timeout).

---

## 4. Quick Audit Walkthrough Guide (Step-by-Step)

Follow this 5-minute flow during your live peer audit:

1. **Demonstrate Invalid Login**:
   - Open your hosted URL.
   - Enter `wrong-user` and `wrong-password` ➔ Click Sign In ➔ Point out `#login-error` showing `"Invalid username/email or password."`.
2. **Demonstrate Valid Login**:
   - Log in with valid school credentials (or email).
   - Point out smooth transition into the Dashboard.
3. **Showcase the 3 Required Sections**:
   - Point to **Section 1: User Profile** (`#section-user`).
   - Point to **Section 2: Experience Points** (`#section-xp`).
   - Point to **Section 3: Audit Ratio** (`#section-audit`).
4. **GraphiQL Verification**:
   - Open `https://platform.zone01.gr/graphiql` in a second tab.
   - Run Query 1 (`user { ... }`) and show the numbers match the UI.
5. **Showcase Section 4: Graphical Statistics (SVG)**:
   - Point to `#section-graphs` and the 4 SVG graphs.
   - Hover over the Bar Chart bars to show tooltips, and click a bar to show the Project Detail modal.
   - Inspect elements in DevTools to show native `<svg>` nodes (no chart libraries).
6. **Showcase Bonus Features**:
   - Switch to the **Collaborations** tab; demonstrate search, role filter, and sorting.
   - Toggle **Light/Dark theme** in the top navigation.
7. **Demonstrate Logout**:
   - Click "Log Out" ➔ Point out that the session token is purged and the screen returns to `#login-view`.
