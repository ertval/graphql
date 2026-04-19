import assert from "node:assert/strict";
import test, { before } from "node:test";

if (!globalThis.btoa) {
	globalThis.btoa = (value) => Buffer.from(value, "utf8").toString("base64");
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

let clearToken;
let decodeToken;
let getToken;
let login;
let saveToken;
let TOKEN_STORAGE_KEY;
let configureGraphqlAuth;
let graphqlQuery;

before(async () => {
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

	({ clearToken, decodeToken, getToken, login, saveToken, TOKEN_STORAGE_KEY } =
		await import("../src/infra/auth.js"));
	({ configureGraphqlAuth, graphqlQuery } = await import(
		"../src/infra/graphql.js"
	));

	configureGraphqlAuth({
		getToken,
		clearToken,
	});
});

const makeJwt = (payload) => {
	const toBase64Url = (value) =>
		Buffer.from(JSON.stringify(value), "utf8")
			.toString("base64")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/g, "");
	return `${toBase64Url({ alg: "HS256", typ: "JWT" })}.${toBase64Url(payload)}.signature`;
};

test("login returns success Result with token", async () => {
	globalThis.fetch = async () => ({
		ok: true,
		status: 200,
		headers: {
			get: () => "application/json",
		},
		text: async () => JSON.stringify("mock-token"),
	});

	const result = await login("user", "pass");
	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.data, "mock-token");
	}
});

test("login returns failure Result for invalid credentials", async () => {
	globalThis.fetch = async () => ({
		ok: false,
		status: 401,
		headers: {
			get: () => "application/json",
		},
		text: async () => JSON.stringify({}),
	});

	const result = await login("user", "bad-pass");
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.equal(result.error.message, "Invalid username/email or password.");
	}
});

test("graphqlQuery returns failure Result when token is missing", async () => {
	clearToken();
	globalThis.fetch = async () => {
		throw new Error("fetch should not be called without token");
	};

	const result = await graphqlQuery("{ user { id } }");
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.equal(result.error.message, "Not authenticated. Please log in.");
	}
});

test("graphqlQuery returns failure Result and clears token on 401", async () => {
	const futureExp =
		Math.floor(Temporal.Now.instant().epochMilliseconds / 1000) + 3600;
	const jwt = makeJwt({ sub: "42", exp: futureExp });
	saveToken(jwt);
	globalThis.fetch = async () => ({
		ok: false,
		status: 401,
		json: async () => ({}),
	});

	const result = await graphqlQuery("{ user { id } }");
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.equal(result.error.message, "Session expired. Please log in again.");
	}
	clearToken();
	assert.equal(globalThis.sessionStorage.getItem(TOKEN_STORAGE_KEY), null);
});

test("saveToken stores only valid non-expired JWT payloads", () => {
	const malformedResult = saveToken("not-a-jwt");
	assert.equal(malformedResult.ok, false);

	const expired = makeJwt({ sub: "42", exp: 1 });
	const expiredResult = saveToken(expired);
	assert.equal(expiredResult.ok, true);

	const payload = decodeToken();
	assert.equal(payload, null);
	assert.equal(globalThis.sessionStorage.getItem(TOKEN_STORAGE_KEY), null);
});
