# GraphQL Profile

A vanilla JavaScript web application that displays a user's school progression and statistics by querying a GraphQL API endpoint. Built using ES2026 standards, Clean Architecture, and programmatic SVG generation — all without external libraries.

## 🚀 Features

- **JWT Authentication** — Secure login with Basic Auth; session-scoped token handling via `infra.auth` (memory + sessionStorage fallback).
- **Dynamic GraphQL Queries** — Normal, nested, and parameterised queries across `user`, `transaction`, `progress`, and `result` tables.
- **4 SVG Data Visualisations** — Animated charts built purely with native SVG elements:
  - **XP Analytics**: Cumulative XP line chart + XP by project bar chart.
  - **Audit & Results**: Audit ratio donut chart + Pass/Fail pie chart.
- **Collaborations Leaderboard** — Browse all school partners/captains/auditors with live search, role filters, and paginated results.
- **Collaborator Profile Overlay** — Click any collaborator to see their detailed stats and recent shared projects.
- **Project Detail** — Interactive project-level drill-down for deep inspection of results.
- **Glassmorphism UI** — Premium dark mode design with micro-animations and smooth transitions.

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Language | Vanilla JavaScript (ES2026 Modules) |
| Architecture | Feature-First (Screaming Architecture), Clean Architecture |
| Charts | Native SVG (zero external libs) |
| APIs | `Temporal` API, `Object.groupBy()`, Immutable Array methods (`.toSorted()`) |
| Patterns | Result Pattern (ok/fail), Data Decoupling (Domain/Adapters) |
| Linting | Biome (Unified Fast Lint/Format) |

## 📂 Project Structure

```text
├── src/
│   ├── features/           # Domain-driven vertical slices
│   │   ├── dashboard/      # Dashboard feature (flat structure)
│   │   │   ├── dashboard.api.js
│   │   │   ├── dashboard.core.js
│   │   │   ├── dashboard.ui.view.js
│   │   │   ├── dashboard.ui.popup.js
│   │   │   └── dashboard.ui.charts.*.js
│   │   └── collaborations/ # Collaborations feature (flat structure)
│   │       ├── collaborations.api.js
│   │       ├── collaborations.core.js
│   │       ├── collaborations.ui.view.js
│   │       └── collaborations.ui.popup.js
│   ├── core/               # Global domain logic (Result pattern)
│   ├── infra/              # Technical adapters (Auth, GraphQL, UI)
│   ├── shared/             # Shared UI components
│   └── app.js              # Application entry and routing
├── css/
│   ├── theme.css           # Global design tokens
│   ├── base.css            # Base layouts and glass effects
│   ├── dashboard.css       # Dash-specific styles
│   ├── collaborations.css  # Table and profiles
│   └── graphs.css          # SVG styling
└── docs/
    ├── requirements.md     # Original project requirements
    └── guides/             # Architecture and deployment guides
```

## 🚀 Getting Started

The app uses ES modules and fetches data from a remote API, so it must be served via a local HTTP server.

### Run locally
```bash
npx serve .
# or
python -m http.server 3000
```
Then open `http://localhost:3000` in your browser.

### Run tests
```bash
npm run test
```

## 🔄 Data Flows

The application follows a strict unidirectional data flow, ensuring predictability and decoupling logic from the UI:

1. **Authentication Flow**:
   - User enters credentials in `app.js` → credentials sent to `infra.auth:login()`.
   - On success, `infra.auth` stores the JWT in memory and mirrors it to `sessionStorage` for same-tab reload continuity.
   - Subsequent queries fetch the token natively and inject it into the `Authorization` header via `infra.graphql:graphqlQuery()`.
   - Logout synchronization uses `BroadcastChannel` with a storage-event fallback signal key.

2. **Dashboard Initialization Flow**:
   - `app.js` calls `loadDashboard()` which triggers a parallel fetch (`Promise.all`) across all user metrics inside `dashboard.api`.
   - Pure logic extraction (`dashboard.core.js`) computes summaries without touching the DOM.
   - Raw data (transactions, progress, skills) is passed down to **pure renderers** (`charts.*` and DOM update functions).
   - Side-effects are isolated; data is not mutated after being mapped from the GraphQL layer.

3. **Collaborations Feed Flow**:
   - Lazy-loaded to improve performance: `collaborations.api` is only invoked when the user opens the "Collaborations" tab.
   - Paging, filtering, and sorting occur in memory using immutable ES2026 array concepts (`.filter()`, `.toSorted()`) in `collaborations.view`.
   - `collaborations.core` handles deterministic name/role normalizations purely, without any DOM logic or external dependencies.

## 🛜 Deployment to GitHub Pages

Since the application is 100% static and relies on client-side JS and a remote API, it can be deployed very easily to GitHub Pages.

**Deploying directly from the repository**:
1. Commit and push all files to the `main` branch of your GitHub repository.
2. In your repository settings, go to **Pages** (under the "Code and automation" sidebar).
3. Under **Source**, leave it as "Deploy from a branch".
4. Under **Branch**, select `main` and the `/ (root)` folder, then click **Save**.
5. *Optimization Note*: Ensure the `.nojekyll` file remains at the repository root to prevent GitHub Pages from ignoring files and folders that start with an underscore (if any).
6. Your application will be live at `https://<your-username>.github.io/<repository-name>/`.

## 💡 Engineering Highlights

- **Zero Dependencies**: Entirely built on standard browser APIs.
- **Modern JavaScript**: Use of `Temporal`, immutable array methods, and native set operations where appropriate.
- **Deterministic UI**: State-to-UI binding ensures consistent rendering without a virtual DOM.
- **Static-hosting security**: CSP + Trusted Types meta policy, sanitized user-facing errors, and no JWT persistence in localStorage.
- **Audit Ready**: Comprehensive `docs/` folder mapping every requirement to implementation.
- **Clean Architecture**: Strict separation of concerns with feature-first module organization and layered decoupling.
