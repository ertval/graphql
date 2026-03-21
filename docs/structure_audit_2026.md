# Codebase Organization Audit (2026)

Scope: evaluate project structure against architectural guidance in AGENTS.md, focused on feature-first organization, layered decoupling, and encapsulated boundaries.

## Summary

- Overall status: Partially aligned.
- Low-risk structural refactor performed: none (to avoid runtime/import regressions).
- Low-risk improvement delivered: this audit provides a staged migration path that can be executed incrementally without behavior changes.

## Findings Against AGENTS.md

### 1) Feature-first structure

- Current state:
  - Top-level JavaScript modules are type-oriented (`app.js`, `api.js`, `graphs.js`, `collaborations.js`) instead of feature-oriented.
  - CSS is split by view/style concern in `css/` and still references legacy `students.css` naming even though the active feature is collaborations.
- Assessment:
  - Violates strict feature-first guidance, but current layout is understandable for a small static app.
- Risk of immediate full migration:
  - Medium: import path and selector regressions are likely if all modules are moved at once.

### 2) Layered decoupling (core/application/infrastructure)

- Current state:
  - `api.js` acts as infrastructure (fetch/auth/query transport).
  - `app.js` mixes orchestration and domain computation (XP totals, pass/fail derivation, audit ratio rendering prep).
  - `graphs.js` is a rendering adapter layer but currently receives semi-processed domain data from `app.js`.
  - `collaborations.js` mixes transformation logic with DOM rendering/event wiring.
- Assessment:
  - Partial alignment. Clear separation exists in intent, but pure domain logic is not isolated from UI/application orchestration.

### 3) Encapsulated boundaries

- Current state:
  - No folder-level public/private boundaries exist for features.
  - Package-level boundary enforcement through `package.json` exports is not applicable in this browser-first static layout.
  - Encapsulation is currently by convention only.
- Assessment:
  - Not aligned with strict boundary guidance.

## Pragmatic Improvement Plan (Low-Risk, Incremental)

1. Create feature folders with compatibility re-export shims first.
   - Add `features/dashboard`, `features/collaborations`, `features/shared`, `infrastructure/graphql`.
   - Keep existing top-level files as thin re-export wrappers during transition.

2. Extract pure domain transforms from UI modules.
   - Move deterministic calculations (XP aggregation, pass/fail counting, collaborator normalization) into pure modules under `features/*/core`.
   - Keep DOM/event code in `features/*/ui`.

3. Introduce lightweight application layer modules.
   - Add use-case orchestrators (for example, `loadDashboardData`, `loadCollaborationsData`) under `features/*/application`.
   - Keep fetch transport/auth concerns inside `infrastructure/graphql`.

4. Add explicit internal/public boundaries by filesystem contract.
   - Use `index.js` as the only public entrypoint for each feature folder.
   - Keep non-exported internals under `internal/` and avoid cross-feature internal imports.

5. Rename legacy styling artifact at the end of migration.
   - Rename `css/students.css` to `css/collaborations.css` once HTML link and selectors are fully migrated.
   - Do this last to minimize visual regression risk.

## Suggested Target Layout

```text
features/
  dashboard/
    application/
    core/
    ui/
    index.js
  collaborations/
    application/
    core/
    ui/
    index.js
  shared/
    core/
    ui/
infrastructure/
  graphql/
    api-client.js
    auth.js
```

## Why No Direct Refactor Was Applied

- The current app is static, import-path sensitive, and tightly coupled to existing DOM IDs/selectors.
- A broad move/rename in one pass is higher risk than warranted for this request.
- The staged plan above is designed to preserve behavior while improving architecture in controlled increments.