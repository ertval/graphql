import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const appJs = read("app.js");
const collaborationsJs = read("collaborations.js");
const apiJs = read("api.js");

test("collaborations loading error does not inject err.message with innerHTML", () => {
	assert.doesNotMatch(
		collaborationsJs,
		/innerHTML\s*=\s*`[^`]*\$\{\s*err\.message\s*\}[^`]*`/,
	);
	assert.match(collaborationsJs, /errorMsg\.textContent\s*=\s*`Failed to load data:/);
});

test("app and collaborations avoid template innerHTML sinks for dynamic row/item rendering", () => {
	assert.doesNotMatch(appJs, /item\.innerHTML\s*=\s*`/);
	assert.doesNotMatch(collaborationsJs, /tr\.innerHTML\s*=\s*`/);
});

test("app synchronizes logout across tabs via storage event", () => {
	assert.match(appJs, /addEventListener\("storage",\s*\(event\)\s*=>\s*\{/);
	assert.match(appJs, /event\.key\s*===\s*TOKEN_STORAGE_KEY/);
	assert.match(appJs, /event\.newValue\s*===\s*null/);
});

test("api clears token on 401 and 403 GraphQL responses", () => {
	assert.match(apiJs, /response\.status\s*===\s*401\s*\|\|\s*response\.status\s*===\s*403/);
	assert.match(apiJs, /clearToken\(\);\s*\n\s*return fail\(new Error\("Session expired\. Please log in again\."\)\);/);
});

test("api clears token on GraphQL auth-related errors", () => {
	assert.match(apiJs, /const isAuthErrorMessage = \(message\) =>/);
	assert.match(apiJs, /if \(isAuthErrorMessage\(messages\)\) \{\s*\n\s*clearToken\(\);\s*\n\s*\}/);
});
