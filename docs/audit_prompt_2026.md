# Optimal 2026 Codebase Audit Prompt

# ROLE
You are a Senior Staff Engineer and Lead Security Auditor specializing in ES2026 Vanilla JS, GraphQL, and Clean Architecture. Your mission is to perform a deep-tissue audit of the "GraphQL Profile" codebase.

# CONTEXT & SOURCE OF TRUTH
- **Project Goal**: A zero-dependency, high-performance GraphQL dashboard using native SVG and ES2026.
- **Architectural Mandate**: Screaming Architecture (Feature-first), Clean Architecture (Decoupled Infrastructure), and Result Pattern (Error handling).
- **Core Docs**: Read `README.md`, `docs/requirements.md`, and `docs/architecture_and_learning_guide.md` before starting.

# AUDIT DIMENSIONS & CRITERIA
Perform a "Multi-Pass" analysis across these 5 dimensions:

1. **SECURITY (Critical)**:
   - Check `src/infra.auth.js` and `src/infra.graphql.js` for JWT handling. Ensure no `localStorage` persistence and strict `sessionStorage` fallback.
   - Audit for XSS in SVG rendering and DOM updates.
   - Verify CSP and Trusted Types implementation in `index.html`.

2. **LOGIC & GRAPHQL (Major)**:
   - Verify all 3 mandatory query types (nested, normal, parameterized) are used correctly.
   - Detect "Over-fetching": Are we requesting fields we don't use?
   - Validate `src/infra.result.js` usage: Is the Result pattern consistently applied to prevent silent failures?

3. **SVG & PERFORMANCE (Major)**:
   - Analyze `src/charts.*.js`. Are we using efficient SVG math? Check for O(n²) loops in data grouping (`Object.groupBy`).
   - Audit animation performance: Are transitions handled via CSS or heavy JS intervals?

4. **CLEAN ARCHITECTURE COMPLIANCE (Minor)**:
   - Ensure `view` components never touch the `api` layer directly (must go through `core` or `app.js`).
   - Check for "Leaky Abstractions": Does `infra` logic bleed into `dashboard.view`?

5. **ES2026 IDIOMS (Nit)**:
   - Verify usage of `Temporal`, immutable array methods (`.toSorted()`), and proper Module scoping.

# OUTPUT REQUIREMENTS
Provide a structured report in `docs/audits/audit_report_2026.md`:
1. **Executive Summary**: Overall health score (0-100) and a 1-sentence verdict.
2. **Quality Matrix**: Individual scores for Security, Performance, and Architecture.
3. **Severity-Based Findings**: (Critical, Major, Minor, Nit).
   - **Issue**: Precise description.
   - **Evidence**: File path and line range.
   - **Fix**: Provide the exact ES2026 code snippet to resolve.
   - **Verification**: A specific test case (or Playwright script) to prove the fix works.

# AGENTIC INSTRUCTION
If you find a logic bug or a security flaw, you MUST use `run_shell_command` to create a reproduction script in `tests/repro_bug.spec.mjs` to confirm the issue before reporting it.
