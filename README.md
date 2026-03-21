# GraphQL Profile

A vanilla JavaScript web application that displays a user's school progression and statistics by querying a GraphQL API endpoint. Built to master GraphQL queries (Normal, Nested, Parameterised), JWT authentication, and programmatic SVG generation — all without a single external library.

## 🚀 Features

- **JWT Authentication** — Secure login with Basic Auth; token stored in `localStorage`.
- **Dynamic GraphQL Queries** — Normal, nested, and parameterised queries across `user`, `transaction`, `progress`, `result`, and `object` tables.
- **4 SVG Data Visualisations** — Animated charts built purely with `createElementNS`, grouped by theme:
  - **XP Analytics group**: Cumulative XP line chart + XP by project bar chart
  - **Audit & Results group**: Audit ratio donut chart + Pass/Fail pie chart
- **Students Leaderboard** — Browse all visible school students with live search, campus filter, sortable columns (Level, XP, Audit Ratio), and paginated results.
- **Student Profile Overlay** — Click any student row to see their full dashboard (4 graphs + stats + skills).
- **Interactive Projects** — Click any project in "Recent Projects" to open a detail overlay showing XP earned, grade, type, and date.
- **Glassmorphism UI** — Dark navy + Sky/Cyan accent design with micro-animations and smooth transitions.
- **Bonus Sections** — Top skills (animated bars) and recent project activity (Pass/Fail badges).

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Language | Vanilla JavaScript (ES2026 modules, `const`/`let`, arrow functions) |
| HTML | HTML5 semantic elements, ARIA attributes |
| CSS | Modular CSS Custom Properties, Flexbox, CSS Grid |
| Charts | SVG via `document.createElementNS` — zero canvas, zero chart libs |
| Data APIs | ES2026 `Temporal`, `Object.groupBy()`, immutable array methods (`.toSorted()`) |
| Concurrency | `async/await` + `Promise.all()` |
| Linting | Biome (unified lint + format) |

## 📂 Project Structure

```text
├── index.html
├── src/
│   ├── features/
│   │   ├── collaborations.controller.js
│   │   ├── collaborations.core.js
│   │   ├── collaborations.index.js
│   │   ├── collaborations.view.js
│   │   ├── dashboard.app.js
│   │   ├── dashboard.graphs.render.js
│   │   ├── dashboard.index.js
│   │   ├── dashboard.metrics.js
│   │   └── shared.result.unwrap.js
│   └── infrastructure/
│       ├── graphql.auth.service.js
│       ├── graphql.client.service.js
│       ├── graphql.index.js
│       ├── graphql.queries.service.js
│       └── graphql.result.core.js
│
├── css/
│   ├── theme.css       # Design tokens — colour palette, spacing, typography, radii
│   ├── base.css        # Reset, body, glass utilities, tab-panel layout, keyframes
│   ├── login.css       # Login card, form, background orbs
│   ├── nav.css         # Navigation bar + tab switcher
│   ├── dashboard.css   # Dashboard cards (user, XP, audit, graphs, skills, activity, project modal)
│   ├── graphs.css      # SVG container styles, axis, donut/pie, tooltips
│   └── collaborations.css # Collaborations table, pagination, profile overlay
│
└── docs/
    ├── audit.md                      # Peer-review audit criteria
    ├── audit_verification_report.md  # Implementation verification mapping
    ├── architecture_and_learning_guide.md
    ├── deployment_guide.md
    └── requirements.md
```

## 🚀 Getting Started

The app uses ES modules and fetches data from a remote API, so it must be served via a local HTTP server.

### Run locally (Node.js)
```bash
npx serve .
```

### Run locally (Python)
```bash
python -m http.server 3000
```

Then open `http://localhost:3000` in your browser.

## 💡 How It Works

1. **Login** — Submits Basic Auth credentials to `/api/auth/signin`. On success a JWT is saved and the dashboard loads.
2. **Parallel data fetch** — `Promise.all` fires 5 concurrent GraphQL queries (user info, XP transactions, progress, skills, level, results).
3. **Dashboard** — Data is bound to DOM elements. Four SVG graphs are rendered in two thematic groups.
4. **Students tab** — Lazy-loaded on first visit. Fetches all visible users, enriches them with XP/level data in batches, then renders the sortable/filterable paginated table.
5. **Student Profile** — Clicking a row opens a full dashboard overlay for that student.
6. **Project Detail** — Clicking a project in "Recent Projects" shows a detail card with XP earned, grade, date, and path.

## 🌐 Deploying

This is 100% static — no build step needed.

| Platform | Method |
|---|---|
| **GitHub Pages** | Enable Pages from `main` branch root — automatic on every push |
| **Netlify** | Drag-and-drop the project folder onto [app.netlify.com/drop](https://app.netlify.com/drop) |
| **Vercel** | Import the repository; leave Build Command empty |

See `docs/deployment_guide.md` for detailed step-by-step instructions.

### GitHub Pages optimization notes

1. Keep `.nojekyll` at repository root to avoid underscore-path filtering.
2. Use repository-root publishing (`main` + `/`) because `index.html` and `src/features/dashboard.index.js` are resolved as static files.
3. Avoid absolute asset paths so project works both on custom domains and `github.io/<repo>` paths.

## ✅ Audit Compliance

All requirements in `docs/audit.md` are met. See `docs/audit_verification_report.md` for a full question-by-question mapping to code.
