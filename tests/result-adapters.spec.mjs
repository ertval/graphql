import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const appJs = read("src/dashboard.app.js");
const collaborationsInitJs = read("src/collaborations.init.js");

test("app login adapter handles Result object contract", () => {
	assert.match(
		appJs,
		/const loginResult = await login\(identifier, password\);/,
	);
	assert.match(appJs, /if \(!loginResult\.ok\) \{/);
	assert.match(appJs, /loginError\.textContent = loginResult\.error\.message;/);
});

test("app dashboard adapter unwraps Result objects from API calls", () => {
	assert.match(appJs, /const user = unwrapResult\(\s*await fetchUserInfo\(\)\s*\);/);
	assert.match(appJs, /const xpTransactions = unwrapResult\(xpResult\);/);
	assert.match(
		appJs,
		/unwrapResult\(\s*await fetchObjectById/,
	);
});

test("collaborations adapter unwraps Result object from fetchCollaborations", () => {
	assert.match(collaborationsInitJs, /await fetchCollaborations\(userId\)/);
	assert.match(
		collaborationsInitJs,
		/const\s*\{\s*groups,\s*auditsGiven,\s*auditsReceived\s*\}\s*=\s*unwrapResult\(/,
	);
});
