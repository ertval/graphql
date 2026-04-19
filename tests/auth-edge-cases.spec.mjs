import assert from "node:assert/strict";
import test from "node:test";

// ── Polyfills for Node test environment ────────────────────────────
if (!globalThis.btoa) {
	globalThis.btoa = (value) => Buffer.from(value, "utf8").toString("base64");
}
if (!globalThis.atob) {
	globalThis.atob = (value) => Buffer.from(value, "base64").toString("utf8");
}

const createStorageMock = () => {
	const store = new Map();
	return {
		getItem: (key) => (store.has(key) ? store.get(key) : null),
		setItem: (key, value) => {
			store.set(key, String(value));
		},
		removeItem: (key) => {
			store.delete(key);
		},
	};
};

globalThis.sessionStorage = createStorageMock();

if (!globalThis.Temporal) {
	globalThis.Temporal = {
		Now: {
			instant: () => ({
				epochMilliseconds: Date.now(),
				toString: () => new Date().toISOString(),
			}),
		},
	};
}

let clearToken, decodeToken, getToken, saveToken, TOKEN_STORAGE_KEY;

const loadAuth = async () => {
	// Dynamic import to pick up the fixed module
	({ clearToken, decodeToken, getToken, saveToken, TOKEN_STORAGE_KEY } =
		await import("../src/infra/auth.js"));
};

// ── JWT Helpers ────────────────────────────────────────────────────

/** Builds a JWT using standard base64 (no url-safe chars). */
const makeJwt = (payload) => {
	const toBase64Url = (value) =>
		Buffer.from(JSON.stringify(value), "utf8")
			.toString("base64")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/g, "");
	return `${toBase64Url({ alg: "HS256", typ: "JWT" })}.${toBase64Url(payload)}.signature`;
};

/** Builds a JWT whose payload deliberately contains base64url characters. */
const makeBase64UrlJwt = () => {
	// Craft a payload that produces '-' and '_' in its base64url encoding.
	// A payload with specific bytes will force url-safe characters.
	const payload = {
		sub: "user+test/id",
		exp: Math.floor(Date.now() / 1000) + 3600,
		iss: "zone01.gr",
		// Extra field to increase entropy and force base64url chars
		data: "abc?def>ghi",
	};
	return makeJwt(payload);
};

const futureExp = () => Math.floor(Date.now() / 1000) + 3600;
const _pastExp = () => Math.floor(Date.now() / 1000) - 100;

// ── Tests ──────────────────────────────────────────────────────────

test("setup: load auth module", async () => {
	await loadAuth();
	assert.ok(saveToken, "saveToken should be exported");
});

test("parseJwtPayload handles standard base64 JWTs", () => {
	clearToken();
	const jwt = makeJwt({ sub: "42", exp: futureExp() });
	const result = saveToken(jwt);
	assert.equal(result.ok, true, "Standard JWT should be accepted");

	const decoded = decodeToken();
	assert.equal(decoded.sub, "42");
});

test("parseJwtPayload handles base64url-encoded JWTs correctly", () => {
	clearToken();
	const jwt = makeBase64UrlJwt();
	const result = saveToken(jwt);
	assert.equal(result.ok, true, "base64url JWT should be accepted after fix");

	const decoded = decodeToken();
	assert.ok(decoded, "Decoded payload should not be null");
	assert.equal(decoded.sub, "user+test/id");
	assert.equal(decoded.data, "abc?def>ghi");
});

test("parseJwtPayload rejects malformed tokens", () => {
	clearToken();

	// Not a string
	assert.equal(saveToken(123).ok, false);

	// Wrong number of parts
	assert.equal(saveToken("only.two").ok, false);
	assert.equal(saveToken("a.b.c.d").ok, false);

	// Invalid base64 in payload
	assert.equal(saveToken("header.!!!invalid!!!.signature").ok, false);

	// Missing exp claim
	const noExpJwt = makeJwt({ sub: "42" });
	assert.equal(saveToken(noExpJwt).ok, false);
});

test("getToken returns null for expired JWT (respects 30s leeway)", () => {
	clearToken();

	// Token that expires in 10 seconds — within the 30s leeway window
	const nearExp = Math.floor(Date.now() / 1000) + 10;
	const jwt = makeJwt({ sub: "42", exp: nearExp });
	saveToken(jwt);

	const token = getToken();
	assert.equal(
		token,
		null,
		"Token within 30s leeway should be treated as expired",
	);
	assert.equal(
		globalThis.sessionStorage.getItem(TOKEN_STORAGE_KEY),
		null,
		"Expired token should be cleared from sessionStorage",
	);
});

test("getToken returns token when expiry is beyond leeway", () => {
	clearToken();
	const jwt = makeJwt({ sub: "42", exp: futureExp() });
	saveToken(jwt);

	const token = getToken();
	assert.ok(token, "Token with future expiry should be returned");
});

test("getToken clears token after idle timeout", () => {
	clearToken();
	const jwt = makeJwt({ sub: "42", exp: futureExp() });
	saveToken(jwt);

	// Simulate idle: set last-active timestamp to 31 minutes ago
	const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
	globalThis.sessionStorage.setItem(
		"graphql_jwt_last_active",
		String(thirtyOneMinutesAgo),
	);

	const token = getToken();
	assert.equal(token, null, "Token should be null after idle timeout");
});

test("getToken does NOT clear token if activity is recent", () => {
	clearToken();
	const jwt = makeJwt({ sub: "42", exp: futureExp() });
	saveToken(jwt);

	// Activity just 5 minutes ago — well within the 30-minute window
	const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
	globalThis.sessionStorage.setItem(
		"graphql_jwt_last_active",
		String(fiveMinutesAgo),
	);

	const token = getToken();
	assert.ok(token, "Token should be returned when activity is recent");
});

test("saveToken clears previous token on invalid JWT", () => {
	clearToken();

	// First save a valid token
	const validJwt = makeJwt({ sub: "42", exp: futureExp() });
	saveToken(validJwt);
	assert.ok(getToken(), "Valid token should be stored");

	// Now save an invalid one — should clear everything
	saveToken("garbage");
	assert.equal(getToken(), null, "Invalid token should clear previous state");
	assert.equal(
		globalThis.sessionStorage.getItem(TOKEN_STORAGE_KEY),
		null,
		"sessionStorage should be cleared",
	);
});

test("decodeToken returns null when no token is stored", () => {
	clearToken();
	assert.equal(decodeToken(), null);
});

test("clearToken removes all auth state", () => {
	const jwt = makeJwt({ sub: "42", exp: futureExp() });
	saveToken(jwt);
	assert.ok(getToken());

	clearToken();

	assert.equal(getToken(), null);
	assert.equal(decodeToken(), null);
	assert.equal(globalThis.sessionStorage.getItem(TOKEN_STORAGE_KEY), null);
	assert.equal(
		globalThis.sessionStorage.getItem("graphql_jwt_last_active"),
		null,
	);
});
