# Agent Instructions: Modern JavaScript (2026) Guidelines

## Core Directives
- **No Unprompted Testing**: Do not run tests unless explicitly requested by the user.
- **Action-Oriented**: Focus purely on writing clean, idiomatic code and performing rigorous robust static analysis.

## Modern JS & Idioms (ES2026 Standard)
- **Immutability by Default**: 
  - ALWAYS use immutable array methods (`toSorted()`, `toReversed()`, `toSpliced()`, `with()`) instead of mutating counterparts (`sort()`, `reverse()`, `splice()`).
  - Rely on destructuring and the spread operator (`...`) instead of direct object/array mutation.
- **Modern APIs & Primitives**:
  - **Temporal API**: Exhaustively use `Temporal` for accurate date/time tracking. The legacy `Date` object is strictly forbidden.
  - **Sets**: Utilize native ES2025 Set operations (`union()`, `intersection()`, `difference()`, `isSubsetOf()`, etc.).
  - **Grouping**: Leverage `Object.groupBy()` and `Map.groupBy()` for grouping data iteratively.
- **Promises & Error Flow**: 
  - Use `async/await` exclusively with top-level await where applicable. 
  - Rely on `Promise.withResolvers()` and `Promise.try()` for unified sync/async wrapping.
  - **Explicit Result Pattern**: For business logic rejections, prefer returning a Result object (e.g., `{ ok: true, data } | { ok: false, error }`) instead of throwing exceptions. Reserve `throw` for truly exceptional, unrecoverable system failures.
- **Resource Management**: Exhaustively use the **`using`** and **`await using`** declarations for deterministic cleanup of resources (file handles, event listeners, streams). Avoid manual `try...finally` cleanup.
- **Variables & Functions**:
  - `const` is the default. Only use `let` when variable reassignment is essential.
  - Prefer arrow functions for standard logic and to preserve lexical `this`.

## Code Organization & Architecture (2026)
- **Screaming Architecture**: The directory structure MUST communicate the application's domain and purpose, not the technical framework used.
  - Prefer a **Feature-First** structure (e.g., `src/features/billing/`) over a Type-First structure (e.g., `src/components/`).
  - **Colocation**: Keep logic, UI components, styles, types, and tests together within the feature folder they serve.
- **Layered Decoupling (Clean Architecture)**:
  - **Core/Domain**: This layer MUST be pure JavaScript, housing business rules and entities. It has zero knowledge of the database, UI, or external APIs.
  - **Application/Use Cases**: Orchestrates flow. It depends on abstractions (interfaces/ports) and not concrete implementations.
  - **Infrastructure/Adapters**: Implements the technical details (e.g., `fetch` calls, `Temporal` formatting for UI, storage). Use Dependency Inversion to provide these to the application layer.
- **Encapsulated Modules**: 
  - Use `package.json` `exports` to define strict public boundaries. Prevent unauthorized deep-imports into a feature's internal modules.
  - Maintain a strict hierarchy: Feature A should never reach into Feature B's `internal/` folder.
- **Functional Core, Imperative Shell**: Centralize business logic in pure, deterministic functions; push side effects (I/O) to the outermost edges of the architecture.
- **Fine-Grained Reactivity (Signals)**: For state management, prefer **Signals** (standardized observer primitives) over heavy global state containers. Ensure UI updates are targeted and granular.

## Code Quality & Static Analysis (2026)
- **State-of-the-Art Tooling**: Use **Biome** as the standard for ultra-fast unified linting and formatting (or ESLint v10 Flat Config). Actively perform static analysis to detect code smells.
- **Type-Aware JS**: Provide rich JSDocs for type-aware linting in vanilla JavaScript for maximum safety.
- **Code Health**: Prevent "AI slop", over-engineering, and boilerplate code. Write tightly scoped functions and observe complexity limits.

## Legacy Anti-Patterns (NEVER USE)
- **`var` is completely forbidden**.
- **CommonJS is obsolete**: Exclusively use ES Modules (`import`/`export`). No `require`.
- **Legacy objects & properties**: Avoid the `arguments` object (use rest parameter `...args`), avoid `_private` naming conventions (use `#private` class fields), and do not use `XMLHttpRequest` (use `fetch`).
- **Forbidden Patterns**: NEVER modify built-in prototypes. Avoid "clever" one-liners that sacrifice readability for terseness.

## Bug Fixing
-  **No Quick Fixes**: When I report a bug, dont try to fix it immediately. Instead, try to understand the root cause of the bug. Then write a test that reproduces the bug. Then have subagents try to fix the bug and prove it with passing test. 