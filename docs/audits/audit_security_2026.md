# Frontend/JavaScript Security Audit (2026)

Repository: e:/Ertval One/_Software/zone-modules/Modules/graphql
Date: 2026-03-21
Standard: AGENTS.md security directives

## Executive Summary
The codebase is now hardened for static hosting constraints (GitHub Pages), with session-scoped JWT handling and CSP/Trusted Types policy applied in index metadata.

Because this is a static frontend app, server-managed HttpOnly sessions cannot be implemented directly in this repository. Compensating controls are now used: memory-first JWT handling with sessionStorage fallback, expiry/idle checks, and strict CSP restrictions.

## Findings

### High
1. JWT browser storage risk (mitigated)
- Previous issue: localStorage persistence for long-lived bearer token.
- Current status: fixed in code using memory + sessionStorage with expiry and idle timeout checks.
- Residual risk: token remains accessible to same-origin JavaScript if XSS exists.
- Next mitigation: reduce token TTL server-side and add token rotation.

2. Missing CSP / Trusted Types (mitigated)
- Previous issue: no CSP policy on entrypoint.
- Current status: fixed with CSP + Trusted Types meta policy in index.html for GitHub Pages compatibility.
- Residual risk: response-header-only protections are still unavailable directly on GitHub Pages.

### Medium
1. External project URL acceptance
- Current status: fixed by strict https + trusted origin allowlist validation.
- Residual risk: none identified under current data flow.

### Low
1. clear-only innerHTML usage
- Current status: fixed by replacing clear-only innerHTML operations with replaceChildren() across charts and view/popup modules.

2. User-facing rendering of raw backend error text
- Evidence: app/auth/graphql flow surfaces backend text.
- Risk: information exposure.
- Remediation: map internal errors to user-safe messages.

## Quick Wins
1. Keep token handling session-scoped and avoid persistent browser storage.
2. Keep strict project URL allowlist validation.
3. Keep token decode centralized behind auth adapter helper.
4. Keep user-visible error mapping sanitized.

## Strategic Changes
1. If full header control is required, deploy behind Netlify/Vercel/Cloudflare and enforce CSP/TT via response headers.
2. Add automated static checks for dangerous sinks and boundary regressions.
3. Add server-side token rotation and short TTL enforcement for additional JWT hardening.

## GitHub Pages Constraints
1. This app is static-only, so server-managed HttpOnly sessions are outside direct frontend scope.
2. CSP is enforced via meta policy in index.html as a practical fallback.
3. Cross-tab logout is synchronized using BroadcastChannel with localStorage signal fallback, without storing JWT in localStorage.
