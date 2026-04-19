# Authentication & Sensitive Data Security Report

Date: 2026-04-19

## Summary

This report documents how authentication is implemented in the project, how credentials and tokens are sent and stored, whether any client-side encryption is used, the principal security controls in place, and prioritized recommendations.

## Key Findings

- Login flow
  - Endpoint: POST https://platform.zone01.gr/api/auth/signin — credentials are sent using HTTP Basic auth (Authorization: Basic <base64(identifier:password)>). Fetch options include `mode: "cors"`, `credentials: "omit"`, `cache: "no-store"`, `redirect: "error"`, `referrerPolicy: "no-referrer"`. See [src/infra/auth.js](src/infra/auth.js#L68-L86).

- Token issuance & format
  - Server returns a JWT. The client accepts JSON or a raw-text token and extracts it from the response. See [src/infra/auth.js](src/infra/auth.js#L100-L114).

- Token storage & lifecycle
  - Tokens are kept in memory (`memoryToken`) and mirrored to `sessionStorage` under the key `graphql_jwt_session`. Last activity is tracked under `graphql_jwt_last_active` to implement idle timeouts. See [src/infra/auth.js](src/infra/auth.js#L130-L156).
  - Token expiry is enforced client-side by decoding the JWT payload and checking `exp` with a 30s leeway. See [src/infra/auth.js](src/infra/auth.js#L35-L44) and [src/infra/auth.js](src/infra/auth.js#L149-L166).

- GraphQL transport
  - All GraphQL requests use the endpoint https://platform.zone01.gr/api/graphql-engine/v1/graphql and set `Authorization: Bearer <token>` from the injected `getToken()` adapter. Fetch options mirror the login call (`mode: "cors"`, `credentials: "omit"`, `referrerPolicy: "no-referrer"`). See [src/infra/graphql.js](src/infra/graphql.js#L39-L60).

- Network & request hygiene
  - Requests use an `AbortController` with a 12s timeout (via `createRequestController`). Timeouts surface as user-friendly messages. See [src/infra/network.js](src/infra/network.js#L1-L22).
  - `referrerPolicy: "no-referrer"` and `cache: "no-store"` are set to reduce leakage of sensitive values.

- Cross-tab logout synchronization
  - Uses `BroadcastChannel('graphql_auth_channel')` when available; falls back to writing/removing a `localStorage` key `graphql_auth_event` to trigger the `storage` event in other tabs. Tokens themselves are stored in `sessionStorage` (not shared). See [src/app.js](src/app.js#L48-L55) and [src/app.js](src/app.js#L136-L156).

- Client-side cryptography
  - No WebCrypto/SubtleCrypto usage or third-party encryption libraries found. The code uses `btoa`/`atob` only for Basic encoding and JWT payload decoding. See [src/infra/auth.js](src/infra/auth.js#L70) and [src/infra/auth.js](src/infra/auth.js#L41).

## Security Positives

- Requests set `credentials: "omit"`, `referrerPolicy: "no-referrer"`, and `cache: "no-store"`, which reduces the risk of cookies/referrers leaking tokens. ([src/infra/auth.js](src/infra/auth.js#L68-L86), [src/infra/graphql.js](src/infra/graphql.js#L39-L60)).
- JWT expiry is enforced client-side and the GraphQL transport clears tokens on 401/403 responses. ([src/infra/auth.js](src/infra/auth.js#L149-L166), [src/infra/graphql.js](src/infra/graphql.js#L62-L68)).
- AbortController timeouts are implemented to bound request duration. ([src/infra/network.js](src/infra/network.js#L1-L22)).
- Cross-tab logout sync via BroadcastChannel + localStorage fallback provides broad logout propagation. ([src/app.js](src/app.js#L48-L55), [src/app.js](src/app.js#L136-L156)).
- UI rendering favors safe sinks (e.g., `textContent`) rather than `innerHTML` in inspected files.

## Security Concerns (observations & risks)

- Basic auth usage for sign-in: credentials are base64-encoded (reversible) and placed in an Authorization header. While sent over HTTPS, Basic headers are sensitive and should not be logged by servers or intermediaries. See [src/infra/auth.js](src/infra/auth.js#L68-L86).

- Client-side token storage in `sessionStorage`: tokens are accessible to any script running on the same origin — if an XSS vulnerability exists, tokens can be read and exfiltrated. See [src/infra/auth.js](src/infra/auth.js#L130-L156).

- No refresh-token mechanism observed: token rotation and revocation depend on server TTL and 401 handling; UX or security tradeoffs may arise depending on token lifetimes. See [src/infra/auth.js](src/infra/auth.js#L149-L166).

- JWT decoding uses `atob` directly. JWTs are base64url-encoded by spec; using `atob` without normalizing may break decoding for valid tokens (padding and URL-safe characters). This can cause false negatives where valid tokens are rejected. See [src/infra/auth.js](src/infra/auth.js#L35-L44).

- No explicit server-side logout call: `performLogout()` clears client state but does not call an API to invalidate tokens server-side. See [src/app.js](src/app.js#L137-L154).

## Prioritized Recommendations

1. High: Avoid storing long-lived credentials/tokens in script-accessible storage
   - Move sensitive refresh tokens to `HttpOnly`, `Secure`, `SameSite` cookies and implement short-lived access tokens in memory. If persistent storage is necessary, prefer server-backed sessions. (Modify `saveToken()` to avoid `sessionStorage` writes — [src/infra/auth.js](src/infra/auth.js#L130-L156)).

2. High: Harden XSS protections
   - Enforce strict CSP, adopt Trusted Types, and audit all renderers for `innerHTML`/sinks. Unit-test renderers for safe output. (Check `index.html` CSP and all UI components.)

3. High: Fix JWT base64url decoding
   - Normalize base64url characters (`-`→`+`, `_`→`/`, add padding) before `atob`, or use a small helper to parse JWT payload reliably to avoid discarding valid tokens. ([src/infra/auth.js](src/infra/auth.js#L35-L44)).

4. High: Implement server-side session revocation and consider refresh-token flow
   - Add a server endpoint to revoke tokens and call it from `performLogout()` to prevent token reuse after client logout. Implement refresh tokens in HttpOnly cookies to support short-lived access tokens on the client.

5. Medium: Reduce exposure of Basic auth credentials
   - Prefer a POST body over TLS or modern auth flows (OAuth/OIDC, or exchange credentials for short-lived tokens) instead of sending raw Basic header where server logs could capture them. ([src/infra/auth.js](src/infra/auth.js#L68-L86)).

6. Medium: Audit server CORS and logging
   - Ensure server CORS only allows trusted origins and that logs redact Authorization headers.

7. Low: Add automated checks
   - CI grep rules to detect future additions of `innerHTML`, `localStorage` writes for tokens, or console logging of sensitive keys.

## Concrete quick fixes (suggested)

- Fix base64url decoding in `parseJwtPayload()` (small code change).
- Make token memory-only (remove `sessionStorage` write) as an interim mitigation if the team cannot immediately adopt HttpOnly cookie flows.
- Add a server logout API call in `performLogout()` and call it on sign-out.

## Appendix — Evidence pointers (examples)

- Login request + Basic header: [src/infra/auth.js](src/infra/auth.js#L68-L86)
- Token persistence & session-storage key: [src/infra/auth.js](src/infra/auth.js#L130-L156)
- GraphQL bearer injection and endpoint: [src/infra/graphql.js](src/infra/graphql.js#L39-L60)
- Timeout/AbortController: [src/infra/network.js](src/infra/network.js#L1-L22)
- Logout sync (BroadcastChannel + localStorage fallback): [src/app.js](src/app.js#L48-L55), [src/app.js](src/app.js#L136-L156)

---

If you want, I can implement one or more of the concrete quick fixes now (pick one):
- A: Patch `parseJwtPayload()` to correctly handle base64url JWT payloads.
- B: Stop persisting tokens to `sessionStorage` (memory-only) and add a comment explaining the recommended cookie-based flow.
- C: Add a server-logout call from `performLogout()` (requires endpoint details).


