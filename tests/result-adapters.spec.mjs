import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const appJs = read("src/app.js");
const collaborationsApiJs = read("src/collaborations.api.js");
const collaborationsViewJs = read("src/collaborations.view.js");
const dashboardViewJs = read("src/dashboard.view.js");
const infraResultJs = read("src/infra.result.js");

test("app login adapter handles Result object contract", () => {
	assert.match(
		appJs,
		/const loginResult = await login\(identifier, password\);/,
	);
	assert.match(appJs, /if \(!loginResult\.ok\) \{/);
	assert.match(appJs, /toPublicErrorMessage\(loginResult\.error, "auth"\)/);
});

test("dashboard view branches on Result objects without unwrap throw flow", () => {
	assert.match(dashboardViewJs, /const userResult = await fetchUserInfo\(\);/);
	assert.match(dashboardViewJs, /if \(!userResult\.ok\) \{/);
	assert.match(dashboardViewJs, /const firstError = \[/);
	assert.doesNotMatch(dashboardViewJs, /unwrapResult\(/);
});

test("collaborations data and view modules use explicit Result branching", () => {
	assert.match(
		collaborationsApiJs,
		/const collabsResult = await fetchCollaborations\(userId\);/,
	);
	assert.match(collaborationsApiJs, /if \(!collabsResult\.ok\) \{/);
	assert.match(
		collaborationsViewJs,
		/const collabsResult = await loadCollaborationsData\(userId\);/,
	);
	assert.match(collaborationsViewJs, /if \(!collabsResult\.ok\) \{/);
});

test("infra.result avoids throw-based unwrap helper", () => {
	assert.doesNotMatch(infraResultJs, /export const unwrapResult/);
	assert.match(infraResultJs, /export const mapResult =/);
});
