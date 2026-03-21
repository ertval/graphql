# Frontend/JavaScript Security Audit (2026)

Repository: e:/Ertval One/_Software/zone-modules/Modules/graphql
Date: 2026-03-21
Standard: AGENTS.md security directives

## Executive Summary
The codebase shows solid baseline controls (explicit fetch options, timeout/cancellation, mostly safe DOM API usage), but has key gaps versus AGENTS.md 2026 guidance:
1. JWT is persisted in localStorage.
2. CSP and Trusted Types are not enforced from the app entrypoint.

## Findings

### High
1. JWT persisted in localStorage
- Evidence: src/infra.auth.js save/get/clear token helpers and src/app.js JWT read/decode path.
- Risk: token exfiltration under XSS.
- Remediation: migrate to server-managed session cookies (HttpOnly + Secure + SameSite), remove browser-accessible long-lived bearer token storage.

2. Missing CSP / Trusted Types
- Evidence: index.html has no CSP policy and no Trusted Types enforcement.
- Risk: higher XSS blast radius.
- Remediation: enforce CSP in response headers (prefer report-only rollout first), then enforce with nonce/hash-based script-src and Trusted Types policy.

### Medium
1. External project URL acceptance is too permissive
- Evidence: src/collaborations.core.js accepted arbitrary http/https absolute links.
- Risk: phishing/outbound-link abuse and plaintext HTTP downgrade.
- Remediation: allow only https and explicit trusted origin allowlist.

### Low
1. Repeated innerHTML usage for clearing nodes
- Evidence: dashboard/collaborations/chart UI modules.
- Risk: normalizes high-risk sink usage.
- Remediation: replace with replaceChildren() for clear operations.

2. User-facing rendering of raw backend error text
- Evidence: app/auth/graphql flow surfaces backend text.
- Risk: information exposure.
- Remediation: map internal errors to user-safe messages.

## Quick Wins
1. Replace clear-only innerHTML with replaceChildren().
2. Harden project URL generation with protocol+origin validation.
3. Remove hardcoded special-case collaborator filtering.
4. Centralize token decode behind auth adapter helper.

## Strategic Changes
1. Move from localStorage JWT to server sessions.
2. Roll out CSP report-only then enforce strict policy.
3. Add static checks/lint rules for dangerous sinks and empty catch blocks.
