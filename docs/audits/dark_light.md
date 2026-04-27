# Implementation Plan — Light Mode Support

Add a light mode theme to the GraphQL Profile application, preserving the current dark mode as default, and provide a toggle button for switching.

## User Review Required

> [!IMPORTANT]
> The light mode will use a clean, Slate-based color palette (Slate 50/900) while maintaining the signature Sky-Cyan accents. Glassmorphism effects will be adjusted for light backgrounds to ensure readability and premium feel.

## Proposed Changes

### [Component] Design System (CSS Variables)

#### [MODIFY] [theme.css](file:///e:/Ertval%20One/_Software/zone-modules/Modules/graphql/css/theme.css)
- Define new semantic variables for transparency/glass effects that are currently hardcoded (e.g., `--glass-bg`, `--border-subtle`).
- Add a `[data-theme="light"]` block to override variables:
    - `--bg-primary`: `#f8fafc`
    - `--bg-secondary`: `#ffffff`
    - `--bg-card`: `rgba(255, 255, 255, 0.7)`
    - `--bg-card-hover`: `rgba(255, 255, 255, 0.9)`
    - `--text-primary`: `#0f172a`
    - `--text-secondary`: `#475569`
    - `--text-muted`: `#94a3b8`
    - `--glass-border`: `rgba(14, 165, 233, 0.2)`
    - `--glass-shadow`: `rgba(0, 0, 0, 0.05)`

#### [MODIFY] [base.css](file:///e:/Ertval%20One/_Software/zone-modules/Modules/graphql/css/base.css), [nav.css](file:///e:/Ertval%20One/_Software/zone-modules/Modules/graphql/css/nav.css), [dashboard.css](file:///e:/Ertval%20One/_Software/zone-modules/Modules/graphql/css/dashboard.css), [graphs.css](file:///e:/Ertval%20One/_Software/zone-modules/Modules/graphql/css/graphs.css), [login.css](file:///e:/Ertval%20One/_Software/zone-modules/Modules/graphql/css/login.css)
- Replace all hardcoded `rgba(255, 255, 255, ...)` and `rgba(0, 0, 0, ...)` with the new theme variables.

---

### [Component] Theme Management (Logic & UI)

#### [NEW] [theme.manager.js](file:///e:/Ertval%20One/_Software/zone-modules/Modules/graphql/src/features/shell/theme.manager.js)
- Implement `ThemeManager` module:
    - `getTheme()`: Read from `localStorage` or system preference.
    - `setTheme(theme)`: Update `localStorage` and `html[data-theme]`.
    - `toggleTheme()`: Cycle between light and dark.
    - Initialize theme on load (before page render to prevent flicker).

#### [MODIFY] [shell.ui.view.js](file:///e:/Ertval%20One/_Software/zone-modules/Modules/graphql/src/features/shell/shell.ui.view.js)
- Import and initialize theme toggle listeners.

#### [MODIFY] [index.html](file:///e:/Ertval%20One/_Software/zone-modules/Modules/graphql/index.html)
- Add a theme toggle button in the `.nav-actions` section.
- Add an inline script in `<head>` to apply the saved theme immediately.

## Verification Plan

### Automated Tests
- Run existing regression tests to ensure no functionality is broken.
- Verify `data-theme` persistence.

### Manual Verification
- Manually toggle the theme and inspect all views:
    - Login page.
    - Dashboard graphs.
    - Collaborations table.
- Verify that charts remain readable.


# Research Notes — Surgical Precision for Theme Refactoring

This document identifies all hardcoded values that must be replaced with variables in `theme.css` to support a clean light mode transition.

## Hardcoded Color Mapping

| File | Line | Current Value | Proposed Variable |
| :--- | :--- | :--- | :--- |
| `base.css` | 49 | `rgba(6, 11, 20, 0.88)` | `--bg-nav` |
| `base.css` | 92 | `rgba(255, 255, 255, 0.06)` | `--border-subtle` |
| `base.css` | 93 | `rgba(6, 11, 20, 0.55)` | `--bg-footer` |
| `base.css` | 132-134 | `rgba(255, 255, 255, 0.03/0.06)` | `--bg-skeleton` |
| `nav.css` | 71 | `rgba(255, 255, 255, 0.04)` | `--bg-tabs` |
| `nav.css` | 96 | `rgba(255, 255, 255, 0.06)` | `--bg-tab-hover` |
| `login.css` | 88 | `rgba(255, 255, 255, 0.04)` | `--bg-input` |
| `login.css` | 89 | `rgba(255, 255, 255, 0.08)` | `--border-input` |
| `dashboard.css` | 47 | `rgba(255, 255, 255, 0.06)` | `--bg-item` |
| `dashboard.css` | 129 | `rgba(255, 255, 255, 0.02)` | `--bg-item-soft` |
| `dashboard.css` | 203 | `rgba(255, 255, 255, 0.05)` | `--bg-track` |
| `graphs.css` | 28 | `rgba(255, 255, 255, 0.1)` | `--graph-axis` |
| `graphs.css` | 33 | `rgba(255, 255, 255, 0.04)` | `--graph-grid` |
| `graphs.css` | 130 | `rgba(8, 22, 45, 0.96)` | `--bg-tooltip` |

## Theme Variable Extensions (`theme.css`)

New variables to be added to `:root` (dark defaults):
- `--bg-nav`: `rgba(6, 11, 20, 0.88)`
- `--bg-footer`: `rgba(6, 11, 20, 0.55)`
- `--bg-tabs`: `rgba(255, 255, 255, 0.04)`
- `--bg-tab-hover`: `rgba(255, 255, 255, 0.06)`
- `--bg-input`: `rgba(255, 255, 255, 0.04)`
- `--bg-item`: `rgba(255, 255, 255, 0.06)`
- `--bg-item-soft`: `rgba(255, 255, 255, 0.02)`
- `--bg-track`: `rgba(255, 255, 255, 0.05)`
- `--bg-tooltip`: `rgba(8, 22, 45, 0.96)`
- `--border-subtle`: `rgba(255, 255, 255, 0.06)`
- `--border-input`: `rgba(255, 255, 255, 0.08)`
- `--graph-axis`: `rgba(255, 255, 255, 0.1)`
- `--graph-grid`: `rgba(255, 255, 255, 0.04)`

Light Mode Overrides (`[data-theme="light"]`):
- `--bg-nav`: `rgba(248, 250, 252, 0.92)`
- `--bg-footer`: `rgba(241, 245, 249, 0.8)`
- `--bg-tabs`: `rgba(15, 23, 42, 0.03)`
- `--bg-tab-hover`: `rgba(15, 23, 42, 0.05)`
- `--bg-input`: `rgba(15, 23, 42, 0.02)`
- `--bg-item`: `rgba(15, 23, 42, 0.03)`
- `--bg-item-soft`: `rgba(15, 23, 42, 0.01)`
- `--bg-track`: `rgba(15, 23, 42, 0.05)`
- `--bg-tooltip`: `rgba(255, 255, 255, 0.98)`
- `--border-subtle`: `rgba(15, 23, 42, 0.08)`
- `--border-input`: `rgba(15, 23, 42, 0.12)`
- `--graph-axis`: `rgba(15, 23, 42, 0.15)`
- `--graph-grid`: `rgba(15, 23, 42, 0.06)`
- `--glass-shadow`: `rgba(0, 0, 0, 0.06)`
