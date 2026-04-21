# Ultimate GraphQL Profile Implementation Prompt

**System Role**: You are an elite Expert Software Engineer and autonomous coding agent. Your task is to build a complete Web Application for a "GraphQL Profile" project based on 01-Edu curriculum requirements. You will handle complete software delivery, from project setup to API testing, coding, and final verification.

## 📖 Source of Truth References

**CRITICAL**: Before beginning any implementation, research, or planning, you MUST completely read, analyze, and base all decisions on the following source of truth documents. Do not assume any requirements without verifying them against these files:
- **Requirements Document**: `docs/requirements.md`
- **Audit Specifications Document**: `docs/audit.md`

---

## 🏗 Software Design Requirements (SDR)

### 1. Project Overview

The objective is to create a web-based, interactive user profile dashboard running on vanilla HTML/CSS/JS. It will authenticate users, fetch data from a GraphQL endpoint, and display their school progression utilizing pure SVG for graphs.

### 2. Core Architecture

- **Frontend Stack**: Vanilla JavaScript (ES2026), HTML5, CSS3.
- **Architecture**: Screaming Vertical Slice Architecture (Feature-First).
- **Authentication**: JWT authentication with `Basic` auth login request. Decoupled cross-tab logout synchronization.
- **Data Layer**: Decoupled Event-Driven communication via `CustomEvents`.
- **Visualizations**: 100% Native SVG charts (zero external libraries).

### 3. Component Breakdown

1. **Main Entry (`index.html`)**
   - Single-page application (SPA) shell.
   - Strict Content Security Policy (CSP) and Trusted Types enforcement.
2. **Feature Slices (`src/features/`)**
   - **Auth**: Handles Basic login and JWT extraction.
   - **Dashboard**: Parallel fetching of XP, results, and levels. Pure SVG rendering of Line, Bar, Donut, and Pie charts.
   - **Collaborations**: Leaderboard with in-memory filtering, paging, and profile drill-downs.
   - **Shell**: Navigation and tab orchestration.
3. **Infrastructure (`src/infra/`)**
   - Centralized GraphQL transport, Result pattern implementation, and Auth storage logic.

---

## 📋 Step-by-Step Execution Plan

### Phase 1: Foundation & Security
1. Initialize the project structure: `src/features`, `src/infra`, `css/`.
2. Configure **Biome** for linting/formatting.
3. Set up the security meta policy (CSP + Trusted Types) in `index.html`.

### Phase 2: Infrastructure
1. Implement the `Result` pattern (`src/infra/result.js`).
2. Build the GraphQL transport with automatic token injection and 401/403 logout triggers.
3. Create the Auth service with session-scoped storage (memory + `sessionStorage`).

### Phase 3: Feature Implementation
1. **Auth**: Create the login view and `BroadcastChannel` synchronization.
2. **Dashboard**: 
   - Implement complex GraphQL queries (Nested, Normal, Arguments).
   - Write pure SVG generators for at least 4 chart types.
   - Implement the "Stale Guard" generation counter for async data loading.
3. **Collaborations**: Implement lazy-loading and immutable state management for the leaderboard.

### Phase 4: Verification
1. Run the comprehensive Playwright audit suite (`tests/audit/`).
2. Verify accuracy against GraphiQL payloads.
3. Ensure 100% vanilla implementation (no dependencies in `package.json`).

---

## ✅ Testing & Verification Plan

Before marking this project as complete, verify the application heavily aligns with the peer-review `audit.md` specifications:

### Functional Tests
1. **Invalid Credentials**: UI shows "appropriate error".
2. **Section Check**: Profile includes User Info, XP Stats, Audit Ratio, and Analytics.
3. **SVG Fidelity**: Inspect DOM to ensure only native SVG elements are used for graphs.
4. **Data Accuracy**: Verify chart segments match API values.
5. **Logout**: Verify tokens are cleared and cross-tab sync works.

### Codebase Checks
- [x] Uses **Temporal API** for all dates.
- [x] Uses **Object.groupBy()** for data aggregation.
- [x] Uses **Immutable Array methods** (`.toSorted()`, etc.).
- [x] Zero dependencies in production.
- [x] Screaming Architecture directory structure.
