# Authentication & Sensitive Data Security Report

Date: 2026-04-20

## Summary

This report documents the security implementation of the GraphQL Profile application, focusing on credential handling, token lifecycle, and architectural controls.

## Key Findings

- **Login Flow**: 
  - Credentials are sent via HTTP Basic auth to `https://platform.zone01.gr/api/auth/signin`.
  - Fetch options enforce `mode: "cors"`, `credentials: "omit"`, and `cache: "no-store"`.
  - **Code**: `src/infra/auth.js:login()`

- **Token Storage**:
  - Tokens are stored in-memory (`memoryToken`) for primary access.
  - Mirrored to `sessionStorage` for persistence across tab reloads (cleared on tab close).
  - **Code**: `src/infra/auth.js:saveToken()`

- **Token Validation**:
  - JWTs are validated client-side for expiry using the `exp` claim with a 30-second leeway.
  - **Fixed**: Base64url decoding is correctly implemented to handle URL-safe characters and padding.
  - **Code**: `src/infra/auth.js:base64urlToBase64()` and `parseJwtPayload()`

- **Session Hardening**:
  - **Idle Timeout**: Session automatically expires after 30 minutes of inactivity.
  - **Cross-tab Sync**: Logout is synchronized across all tabs using `BroadcastChannel` with a `localStorage` fallback.
  - **Code**: `src/features/auth/auth.ui.view.js`

- **Transport Security**:
  - `infra.graphql` automatically clears the token and triggers logout if the API returns 401 or 403.
  - **Code**: `src/infra/graphql.js:graphqlQuery()`

## Security Controls

1. **XSS Mitigation**:
   - Strict Content Security Policy (CSP) and Trusted Types policy enforced in `index.html`.
   - Use of safe DOM sinks (`textContent`, `replaceChildren`) across all feature views.
2. **Data Leakage Prevention**:
   - `referrerPolicy: "no-referrer"` on all sensitive network calls.
   - `credentials: "omit"` ensures cookies are not sent with GraphQL requests.
3. **Robustness**:
   - 12-second timeout on all network requests via `AbortController`.

## Recommendations & Status

- **Fixed**: JWT base64url decoding issue resolved.
- **Implemented**: Idle session timeout added.
- **Implemented**: Cross-tab logout synchronization.
- **Recommendation**: Transition to `HttpOnly` cookies if the backend supports it (currently constrained by the third-party Platform API requirements).
