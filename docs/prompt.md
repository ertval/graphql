# Ultimate GraphQL Profile Implementation Prompt

**System Role**: You are an elite Expert Software Engineer and autonomous coding agent. Your task is to build a complete Web Application for a "GraphQL Profile" project based on 01-Edu curriculum requirements. You will handle complete software delivery, from project setup to API testing, coding, and final verification.

## 📖 Source of Truth References

**CRITICAL**: Before beginning any implementation, research, or planning, you MUST completely read, analyze, and base all decisions on the following source of truth documents. Do not assume any requirements without verifying them against these files:
- **Requirements Document**: `e:\Ertval One\_Software\zone-modules\Modules\graphql\docs\requirements.md`
- **Audit Specifications Document**: `e:\Ertval One\_Software\zone-modules\Modules\graphql\docs\audit.md`

---

## 🏗 Software Design Requirements (SDR)

### 1. Project Overview

The objective is to create a web-based, interactive user profile dashboard running on vanilla HTML/CSS/JS (or a minimal bundler like Vite). It will authenticate users, fetch data from a GraphQL endpoint, and display their school progression utilizing pure SVG for graphs.

### 2. Core Architecture

- **Frontend Stack**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Authentication**: JWT authentication with `Basic` auth login request.
- **Data Layer**: GraphQL queries with nested objects and variables using the `Fetcher` API.
- **Visualizations**: Dynamic SVG charts (external libraries like Chart.js are allowed).

### 3. Component Breakdown

1. **Login Page (`index.html`)**
   - Form accepting `identifier` (username or email) and `password`.
   - `POST` request to `https://platform.zone01.gr/api/auth/signin` using Basic Auth.
   - Saves returned JWT to `localStorage` or `sessionStorage`.
   - Appropriate error handling for invalid credentials.
2. **Profile Dashboard (`profile.html` or dynamic view)**
   - Must present at least 3 sections of user data (e.g., User Identification, Total XP, Audit Ratio).
   - Logout functionality (clears token, returns to login).
3. **GraphQL Service (`api.js`)**
   - Main query executing nested, normal, and parameterized requests with Bearer token.
4. **Data Visualization (`graphs.js`)**
   - Generates minimal **two different SVG graphs**:
     - Graph 1: Line Chart (XP earned over time / progress).
     - Graph 2: Bar Chart or Pie Chart (Audit pass/fail ratio, Projects vs Exercises).

---

## 📋 Step-by-Step Execution Plan

**IMPORTANT**: You must utilize Subagents for complex tasks (like building SVG math logic) to maintain context speed and parallelization.

### Phase 1: Context & Setup

1. **Initialize the Project**: Create fundamental files (`index.html`, `app.css`, `app.js`, `api.js`). Provide a robust starting layout following modern UI/UX practices.
2. **Ask User for Config**: immediately ask the user to provide their `patform.zone01.gr` string and test credentials if manual testing is needed.

### Phase 2: Documentation & Research

1. **Analyze Requirements Links**: Spawn a Subagent to comprehensively read the online documentation for all referenced links in the `requirements.md` file (e.g., GraphQL, SVG, UI/UX).
2. **Web Search for Best Practices**: Instruct the Subagent to search the web for the latest modern development, GraphQL querying, and styling best practices as of 2026.
3. **Generate Research Document**: The subagent must return a comprehensive documentation file (e.g., `research_findings.md`) containing its findings.
4. **Utilize Findings**: You must utilize this document systematically throughout the remainder of the implementation.

### Phase 3: Endpoint Testing & Verification

1. **Authentication Testing**: Use `curl` or a Node script to send a basic base64 encoded auth request to `https://platform.zone01.gr/api/auth/signin`. Ensure JWT extraction works.
2. **GraphQL Discovery**: Test a basic query against `https://platform.zone01.gr/api/graphql-engine/v1/graphql` to verify connection and schema. For example, query the `user` table to grab the `id` and `login`.

### Phase 4: Implement Authentication Flow

1. Build the login UI.
2. Draft the authorization logic interceptor. Provide clear UI error messages for invalid credentials.
3. Automatically redirect to the profile UI upon successful JWT retrieval.

### Phase 5: GraphQL Integration

1. Structure complex GraphQL queries spanning across tables: `user`, `transaction` (for XP and audit ratio), `progress`, `result`, and `object`.
2. Construct queries that hit the constraints: must utilize **nested queries**, **normal queries**, and **using arguments (variables)**.

### Phase 6: Dynamic SVG Generation

1. Write vanilla JS utility functions to create SVG elements programmatically (`document.createElementNS('http://www.w3.org/2000/svg', 'svg')`).
2. Implement **Graph 1** (e.g., Total XP over time as a progressive Line Chart).
3. Implement **Graph 2** (e.g., Audit Up vs Down ratio as a Pie Chart or Bar Graph).
4. Apply good UI practices: proper scaling, hover effects, colors, and legends.

### Phase 7: Polish and Refinement

1. Verify logout deletes the JWT and fully restricts access.
2. Refine styling, applying modern layout best-practices and responsiveness.
3. Prepare the build for static hosting (e.g., GitHub Pages).

---

## ✅ Testing & Verification Plan

Before marking this project as complete, verify the application heavily aligns with the peer-review `audit.md` specifications:

### Functional Tests

1. **Login Fails**: Submit random credentials. Does the UI gracefully show "appropriate error"?
2. **Login Succeeds**: Submit correct credentials. Are there 3 identifiable sections of user info?
3. **GraphiQL Cross-check**: Log the exact GraphQL payload returned and compare the rendered stats matching what the API provides natively.
4. **SVG Graphs**: Inspect the DOM. Does the statistics section contain purely `<svg>`, `<circle>`, `<path>`, `<rect>`, etc. without canvas or external libraries?
5. **Two Distinct Graphs**: Are there exactly two varying types of graphs (e.g., bar and line)?
6. **Data Accuracy**: Do the lengths of lines or slices of pie truly correspond correctly to the queried ratio of XP or Audits?
7. **Logout function**: Click log out. Is the user booted to the login screen and blocked from navigating back via browser history?

### Codebase Checks

- [ ] Check for `query { ... }` that demonstrates standard querying.
- [ ] Check for `transaction { object { name } }` demonstrating nested objects.
- [ ] Check for `object(where: {id: {_eq: 1}})` demonstrating parameterized arguments.

Execute these steps meticulously and autonomously. Begin phase 1 immediately.
