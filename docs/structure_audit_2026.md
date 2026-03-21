# Codebase Organization Audit (2026)

Scope: evaluate project structure against AGENTS.md guidance for feature-first layout, layered decoupling, and encapsulated boundaries.

## Summary

- Overall status: Mostly aligned.
- Refactor status: applied and verified with unit + runtime tests.
- Entry point: `index.html` now loads `src/features/dashboard.index.js`.

## Current Structure

```text
src/
  features/
    collaborations.controller.js
    collaborations.core.js
    collaborations.index.js
    collaborations.view.js
    dashboard.app.js
    dashboard.graphs.render.js
    dashboard.index.js
    dashboard.metrics.js
    shared.result.unwrap.js
  infrastructure/
    graphql.auth.service.js
    graphql.client.service.js
    graphql.index.js
    graphql.queries.service.js
    graphql.result.core.js
```

## Assessment Against AGENTS.md

### 1) Feature-first structure

- Implemented:
  - JavaScript moved under `src/features/*` and `src/infrastructure/*`.
  - Legacy top-level JS modules removed.
  - CSS naming migrated from `students.css` to `collaborations.css`.

### 2) Layered decoupling (core/application/infrastructure)

- Implemented:
  - Infrastructure split into auth/client/query/result modules via file naming (`graphql.*`).
  - Collaborations domain transforms remain isolated in `collaborations.core.js`.
  - Dashboard deterministic metrics remain isolated in `dashboard.metrics.js`.
  - UI/render and orchestration responsibilities remain separated by file names (`*.view.js`, `*.app.js`, `*.controller.js`).

### 3) Encapsulated boundaries

- Implemented:
  - Each feature exposes a `*.index.js` public entrypoint.
  - Cross-feature imports route through feature indexes or infrastructure index.

## Residual Gaps

- Additional extraction opportunities remain:
  - `dashboard.app.js` still contains significant UI orchestration and modal logic.
  - `collaborations.view.js` still contains large DOM/event sections that can be further split.

## Next Increment (Optional)

1. Split dashboard modal/activity render logic into dedicated `dashboard.*.view.js` modules.
2. Introduce explicit use-case functions (`loadDashboardData`, `loadCollaborationsData`) in dedicated `*.app.js` files.
3. Add import-boundary lint rules to prevent accidental deep cross-layer imports.