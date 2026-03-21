# Architecture Audit 2026

Repository: e:/Ertval One/_Software/zone-modules/Modules/graphql
Date: 2026-03-21
Standard: AGENTS.md screaming architecture / clean architecture directives

## Overall Assessment
Current architecture is functional but flatter and more type/prefix-driven than feature-first. Coupling between view/application/infra modules is higher than desired for clean architecture.

## Major Findings
1. Feature-first boundaries are not explicit in filesystem layout.
- Evidence: src/* modules grouped by prefixes (dashboard.*, collaborations.*, infra.*, charts.*) rather than feature folders.

2. Orchestration layers depend directly on concrete infra/UI modules.
- Evidence: collaborations.api and dashboard.view import concrete collaborators rather than abstractions.

3. Dependency inversion gaps around auth/transport integration.
- Evidence: infra.graphql directly depends on token lifecycle concerns.

4. Encapsulation boundaries are not enforced.
- Evidence: no package exports boundaries for internal/public modules.

## Boundary/Responsibility Leaks
1. collaborations.api mixes data orchestration with UI concerns.
2. app.js previously decoded JWT directly in shell logic.
3. collaborations.core combined domain transforms with URL adapter concerns.

## Prioritized Safe Refactor Plan
1. Define allowed dependency map in docs (core/app/ui/infra boundaries).
2. Introduce thin ports for auth/session and graph query transport.
3. Split collaborations orchestration from presentation concerns.
4. Remove app-level JWT parsing duplication; use auth adapter helper.
5. Isolate domain-pure functions from adapter utilities.
6. Reduce mutable module-level shared state via explicit feature state containers.
7. Migrate to feature-first folders after seams are introduced.
8. Add package exports map to enforce public boundaries.
