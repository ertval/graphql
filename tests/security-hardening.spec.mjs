import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const appJs = read("src/app.js");
const collaborationsJs = read("src/collaborations.view.js");
const collaborationsViewJs = read("src/collaborations.view.js");
const apiJs = read("src/infra.graphql.js");
const indexHtml = read("index.html");

test("collaborations loading error uses safe textContent and no template innerHTML sink", () => {
	assert.doesNotMatch(
		collaborationsViewJs,
		/innerHTML\s*=\s*`[^`]*\$\{\s*err\.message\s*\}[^`]*`/,
	);
	assert.match(
		collaborationsViewJs,
		/errorMsg\.textContent\s*=\s*"Failed to load collaborations data\."/,
	);
});

test("app and collaborations avoid template innerHTML sinks for dynamic row/item rendering", () => {
	assert.doesNotMatch(appJs, /item\.innerHTML\s*=\s*`/);
	assert.doesNotMatch(collaborationsJs, /tr\.innerHTML\s*=\s*`/);
});

test("app synchronizes logout via BroadcastChannel with storage fallback", () => {
	assert.match(appJs, /BroadcastChannel/);
	assert.match(appJs, /AUTH_SYNC_KEY/);
	assert.match(appJs, /event\.key === AUTH_SYNC_KEY/);
});

test("api clears token on 401 and 403 GraphQL responses", () => {
	assert.match(
		apiJs,
		/response\.status\s*===\s*401\s*\|\|\s*response\.status\s*===\s*403/,
	);
	assert.match(
		apiJs,
		/graphqlAuth\.clearToken\(\);\s*\n\s*return fail\(new Error\("Session expired\. Please log in again\."\)\);/,
	);
});

test("api clears token on GraphQL auth-related errors", () => {
	assert.match(apiJs, /const isAuthErrorMessage = \(message\) =>/);
	assert.match(
		apiJs,
		/if \(isAuthErrorMessage\(messages\)\) \{\s*\n\s*graphqlAuth\.clearToken\(\);/,
	);
});

test("index has CSP and Trusted Types meta hardening", () => {
	assert.match(indexHtml, /http-equiv="Content-Security-Policy"/);
	assert.match(indexHtml, /require-trusted-types-for 'script'/);
	assert.match(indexHtml, /trusted-types 'none'/);
});
