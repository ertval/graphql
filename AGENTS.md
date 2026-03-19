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
  - **Promises**: Use `async/await` exclusively with top-level await where applicable. Rely on `Promise.withResolvers()` and `Promise.try()`.
- **Variables & Functions**:
  - `const` is the default. Only use `let` when variable reassignment is essential.
  - Prefer arrow functions for standard logic and to preserve lexical `this`.

## Code Quality & Static Analysis (2026)
- **State-of-the-Art Tooling**: Use **Biome** as the standard for ultra-fast unified linting and formatting (or ESLint v10 Flat Config). Actively perform static analysis to detect code smells.
- **Type-Aware JS**: Provide rich JSDocs for type-aware linting in vanilla JavaScript for maximum safety.
- **Code Health**: Prevent "AI slop", over-engineering, and boilerplate code. Write tightly scoped functions and observe complexity limits.

## Legacy Anti-Patterns (NEVER USE)
- **`var` is completely forbidden**.
- **CommonJS is obsolete**: Exclusively use ES Modules (`import`/`export`). No `require`.
- **Legacy objects & properties**: Avoid the `arguments` object (use rest parameter `...args`), avoid `_private` naming conventions (use `#private` class fields), and do not use `XMLHttpRequest` (use `fetch`).