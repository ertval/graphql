import test from "node:test";
import assert from "node:assert/strict";

import { clearToken, graphqlQuery, login, saveToken } from "../src/infrastructure/graphql.index.js";

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

globalThis.localStorage = createStorageMock();

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
	saveToken("mock-jwt");
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
	assert.equal(globalThis.localStorage.getItem("graphql_jwt"), null);
});
