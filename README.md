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
│   ├── features/           # Domain-driven vertical slices (Screaming Architecture)
│   │   ├── auth/           # Authentication logic and login view
│   │   ├── collaborations/ # Collaborations leaderboard and profiles
│   │   ├── dashboard/      # Main stats, charts, and activity
│   │   └── shell/          # Navigation and app-wide UI layout
│   ├── infra/              # Technical adapters (Auth, GraphQL, Result pattern)
│   ├── shared/             # Shared UI components (popups)
│   └── app.js              # Event-driven application orchestrator
├── css/
│   ├── theme.css           # Design tokens (HSL palette, variables)
│   ├── base.css            # Layout, glassmorphism, and animations
│   ├── login.css           # Auth-specific styling
│   ├── dashboard.css       # Stats and charts layout
│   └── collaborations.css  # Tables and filters
└── docs/
    ├── audit.md            # Requirement checklist
    ├── audit_answers.md    # Detailed guide for audit verification
    └── guides/             # Architecture and learning materials
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
# Run all Playwright tests
npx playwright test

# Run Biome linting/formatting
npm run lint
```

## 🔄 Data Flows

The application follows a **Decoupled Event-Driven Architecture**, ensuring feature slices communicate without tight coupling:

1. **Authentication Flow**:
   - `auth.ui.view` triggers `infra.auth:login()`.
   - On success, a global `auth:login` event is dispatched.
   - Slices (dashboard, collaborations) listen for `auth:login` to initialize their data.
   - `infra.graphql` handles token injection and automatic logout on 401/403 responses.

2. **Dashboard Pipeline**:
   - `dashboard.ui.view` reacts to `auth:login`.
   - Parallel fetching via `dashboard.api` retrieves all user metrics.
   - Pure logic in `dashboard.core` computes summaries (role counts, XP totals).
   - `dashboard.ui.view.renderers` updates the DOM using native SVG and modern CSS.
   - **Stale Guard**: A generation-based tracking system prevents race conditions during rapid reloads.

3. **Collaborations Pipeline**:
   - `collaborations.ui.view` handles lazy-loading stats on tab switch.
   - Filtering and pagination use **Immutable ES2026 methods** (`.toSorted()`, `.toSpliced()`).
   - Role and name normalization is handled by `collaborations.core`.

## 🛜 Deployment to GitHub Pages

Since the application is 100% static and relies on client-side JS and a remote API, it can be deployed very easily to GitHub Pages.

**Deploying directly from the repository**:
1. Commit and push all files to the `main` branch of your GitHub repository.
2. In your repository settings, go to **Pages** (under the "Code and automation" sidebar).
3. Under **Source**, leave it as "Deploy from a branch".
4. Under **Branch**, select `main` and the `/ (root)` folder, then click **Save**.
5. Ensure the `.nojekyll` file remains at the repository root to prevent GitHub Pages from ignoring files and folders that start with an underscore.
6. Your application will be live at `https://<your-username>.github.io/<repository-name>/`.

## 💡 Engineering Highlights

- **Zero Dependencies**: 100% vanilla JS/CSS/SVG.
- **Screaming Architecture**: Folder structure reflects the product domain.
- **Modern JavaScript**: Extensive use of `Temporal`, `Object.groupBy()`, `using` declarations, and `CustomEvents`.
- **Security First**: CSP + Trusted Types, no `localStorage` for JWT, and sanitised error handling.
- **Clean Architecture**: Domain logic is isolated from technical infrastructure and UI side-effects.
