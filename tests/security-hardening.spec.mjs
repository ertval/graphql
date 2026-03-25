import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const appJs = read("src/app.js");
const collaborationsJs = read("src/collaborations.view.js");
const collaborationsViewJs = read("src/collaborations.view.js");
const collaborationsPopupJs = read("src/collaborations.popup.js");
const dashboardPopupJs = read("src/dashboard.popup.js");
const collaborationsCss = read("css/collaborations.css");
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

test("collaborator project tiles open the shared project detail modal", () => {
	assert.match(collaborationsPopupJs, /openProjectDetail\(\s*project,/);
	assert.match(collaborationsPopupJs, /setAttribute\("role", "button"\)/);
	assert.match(collaborationsPopupJs, /setAttribute\("aria-label", `View details for \$\{project\.name\}`\)/);
});

test("dashboard project detail includes project members section", () => {
	assert.match(dashboardPopupJs, /Project Members/);
});

test("collaborator detail toggles extended project panel when same project is clicked", () => {
	assert.match(collaborationsPopupJs, /sp-layout-expanded/);
	assert.match(collaborationsPopupJs, /selectedProjectName/);
	assert.match(collaborationsPopupJs, /classList\.remove\("active"\)/);
});

test("collaborator split-panel animation uses theme slow timing and avoids left crop transform", () => {
	assert.match(collaborationsCss, /grid-template-columns var\(--transition-slow\)/);
	assert.match(collaborationsCss, /transform 520ms cubic-bezier\(0\.4, 0, 0\.2, 1\)/);
	assert.doesNotMatch(collaborationsCss, /translateX\(-/);
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
