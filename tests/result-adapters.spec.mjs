import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const appJs = read("src/dashboard.app.js");
const collaborationsJs = read("src/collaborations.view.js");
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
	assert.match(appJs, /const user = unwrapResult\(await fetchUserInfo\(\)\);/);
	assert.match(appJs, /const xpTransactions = unwrapResult\(xpResult\);/);
	assert.match(
		appJs,
		/const objDetail = unwrapResult\(await fetchObjectById\(xpTransactions\[0\]\.id\)\);/,
	);
});

test("collaborations adapter unwraps Result object from fetchCollaborations", () => {
	assert.match(collaborationsInitJs, /await fetchCollaborations\(userId\)/);
	assert.match(
		collaborationsInitJs,
		/const \{ groups, auditsGiven, auditsReceived \} = unwrapResult\(/,
	);
});
