# GraphQL Profile 2026 Multi-Agent Audit Report

Date: 2026-04-18
Scope: Full repository audit under AGENTS.md (Security, Performance/Logic, Architecture/Idioms)
Method: Parallel worker audits + independent verification + repro tests

## 1. Executive Summary

Health Score: 86/100

Verdict: The codebase is stable and modern-JS aligned, with three verified Major issues reproduced and fixed, while a small set of architectural/security hardening items remain open.

## 2. The Audit Matrix

| Domain | Score | Status | Notes |
|---|---:|---|---|
| Security | 84 | Good | No Critical findings; JWT sessionStorage tradeoff and CSP style hardening still open. |
| Performance/Logic | 88 | Good | 2 Major issues fixed and verified (summary scaling, query budget). |
| Architecture/Idioms | 84 | Good | 1 Major async-staleness fixed; feature-boundary/purity drift remains Minor. |

## 3. Verified Findings

### Critical

- None.

### Major

#### AUDIT-001
- ID: AUDIT-001
- Location: src/collaborations.view.js:L9-L26, src/collaborations.core.js:L176-L257
- Finding: Collaborator summaries were previously prepared with per-login full rescans (`logins.map((login) => buildCollaboratorSummary(data, login))`), creating worst-case O(N^2) load behavior.
- Reproduction: tests/audit/repro_audit_perf_collaborator_summary_scaling.spec.mjs
- Modern JS Fix:
```js
export const buildCollaboratorSummaries = (collabs) =>
  Object.entries(Object.groupBy(collabs, (collab) => collab.login))
    .map(([login, matches]) => {
      // summarize grouped matches once
    })
    .filter(Boolean);

export const setAllCollabsData = (data) => {
  allCollabs = data;
  uniqueCollabs = buildCollaboratorSummaries(data);
};
```
- Verification: Repro failed before fix, then passed after fix.
  - Baseline: `npm run test:audit` -> fail
  - Post-fix: same command -> pass

#### AUDIT-002
- ID: AUDIT-002
- Location: src/collaborations.api.js:L21-L72
- Finding: `GetCollabs` was unbounded and contained a duplicated `captainLogin` field in the `audit_received.group` selection.
- Reproduction: tests/audit/repro_audit_gql_collaborations_query_budget.spec.mjs
- Modern JS Fix:
```js
const COLLABS_HISTORY_LIMIT = 250;

const query = `
  query GetCollabs($userId: Int!, $historyLimit: Int!) {
    group_user(where: {userId: {_eq: $userId}}, limit: $historyLimit, order_by: {createdAt: desc}) {
      group { path captainLogin object { name } members { user { login firstName lastName campus } } }
      createdAt
    }
    audit(where: {auditorId: {_eq: $userId}}, limit: $historyLimit, order_by: {createdAt: desc}) { ... }
    audit_received: audit(where: {group: {members: {userId: {_eq: $userId}}}}, limit: $historyLimit, order_by: {createdAt: desc}) { ... }
  }
`;
```
- Verification: Repro failed before fix (duplicate + no budget), then passed after fix.

#### AUDIT-003
- ID: AUDIT-003
- Location: src/dashboard.view.js:L52-L133, src/app.js:L13-L138
- Finding: Dashboard async flow had no stale-request generation guard, allowing superseded loads to potentially commit outdated UI/state.
- Reproduction: tests/audit/repro_audit_async_dashboard_stale_guard.spec.mjs
- Modern JS Fix:
```js
let dashboardLoadGeneration = 0;

export const invalidateDashboardLoads = () => {
  dashboardLoadGeneration += 1;
};

export const loadDashboard = async (...) => {
  const loadGeneration = ++dashboardLoadGeneration;
  const staleResult = () => {
    if (loadGeneration !== dashboardLoadGeneration) {
      return { ok: false, error: new Error("Stale dashboard load cancelled.") };
    }
    return null;
  };
  // guard after awaits before state/UI writes
};
```
- Verification: Repro failed before fix, then passed after fix; logout flow now explicitly invalidates in-flight dashboard loads.

### Minor

#### AUDIT-004
- ID: AUDIT-004
- Location: src/infra.auth.js:L13-L156
- Finding: JWT is persisted in `sessionStorage` fallback (`TOKEN_STORAGE_KEY`) which remains readable by script if XSS occurs.
- Reproduction: tests/api-result-contract.spec.mjs#L133 (behavioral contract confirms session persistence), source evidence in auth module.
- Modern JS Fix: Prefer server-managed HttpOnly+Secure+SameSite cookie sessions when backend ownership is available.
- Verification: Confirmed in source; downgraded from Major due static-hosting constraints and session-scoped storage.

#### AUDIT-005
- ID: AUDIT-005
- Location: index.html:L6
- Finding: CSP currently includes `style-src 'unsafe-inline'`, weakening style injection hardening.
- Reproduction: tests/security-hardening.spec.mjs#L206 (checks CSP presence), source evidence in CSP meta tag.
- Modern JS Fix:
```html
<meta http-equiv="Content-Security-Policy"
      content="...; style-src 'self' https://fonts.googleapis.com; ...">
```
- Verification: Confirmed in source; retained as hardening debt.

#### AUDIT-006
- ID: AUDIT-006
- Location: src/dashboard.core.js:L7
- Finding: Core module re-exports infrastructure error classifier (`infra.errors`), violating pure-core boundary intent.
- Reproduction: tests/architecture-boundaries.spec.mjs (adjacent boundary checks) + source read.
- Modern JS Fix:
```js
// move auth-failure classification into app/use-case layer
import { isAuthFailureError } from "./infra.errors.js";
// do not re-export from dashboard.core.js
```
- Verification: Confirmed in source; downgraded to Minor due localized impact.

#### AUDIT-007
- ID: AUDIT-007
- Location: src/collaborations.api.js:L11, src/dashboard.popup.roles.js:L6
- Finding: Cross-feature imports indicate porous encapsulation boundaries in flat module layout.
- Reproduction: tests/architecture-boundaries.spec.mjs (partial guard coverage) + source read.
- Modern JS Fix: Introduce feature public entrypoints and restrict cross-feature internal imports via lint/architecture tests.
- Verification: Confirmed in source; downgraded to Minor because coupling is currently intentional/operational.

### Nit

#### AUDIT-008
- ID: AUDIT-008
- Location: tests/api-result-contract.spec.mjs:L37-L38
- Finding: Test fallback uses legacy `Date` in Temporal stub path.
- Reproduction: Source evidence and grep (`Date.now`, `new Date`).
- Modern JS Fix:
```js
epochMilliseconds: 0,
toString: () => "1970-01-01T00:00:00.000Z",
```
- Verification: Confirmed in tests only (production source remains Temporal-based).

#### AUDIT-009
- ID: AUDIT-009
- Location: src/charts.helpers.js:L20
- Finding: Generic SVG attribute helper writes arbitrary attribute names without an allowlist.
- Reproduction: Source evidence and security scan.
- Modern JS Fix: Add explicit safe-attribute allowlist before `setAttribute`.
- Verification: Confirmed in source; currently low risk because call sites are mostly constant-safe.

#### AUDIT-010
- ID: AUDIT-010
- Location: src and index.html broad scan
- Finding: No dangerous HTML string sinks (`innerHTML` interpolation, `insertAdjacentHTML`, `outerHTML`, `document.write`) were found in active rendering paths.
- Reproduction: Existing security scan tests + grep.
- Modern JS Fix: Keep `createElement`/`textContent`/`replaceChildren` patterns.
- Verification: Not Found (positive control).

## 4. Drift Analysis vs architecture_and_learning_guide.md

Reference baseline:
- docs/guides/architecture_and_learning_guide.md:L170-L176

Observed drift:
1. Flat module layout remains prefix-based (`src/*.js`) rather than strict feature folders with explicit internal/public boundaries.
2. Core purity rule drift persists where dashboard core references infra concern (`src/dashboard.core.js:L7`).
3. Cross-feature imports remain in place (`src/collaborations.api.js:L11`, `src/dashboard.popup.roles.js:L6`), signaling boundary softness.

Observed alignment:
1. View modules still avoid direct infra auth/transport imports, consistent with guide rule 2.
2. Result-pattern and Temporal usage remain present and validated by existing tests.
3. Repro-fixed majors improved conformance to guide goals: predictable async orchestration and bounded query/data processing.

## Verification Log

- Baseline repro run (pre-fix): 3/3 failing
  - Command: `npm run test:audit`
- Post-fix repro run: 3/3 passing
  - Same command
- Final project validation:
  - `npm run lint` -> pass
  - `npm test` -> pass (60/60)
