import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const appJs = read("app.js");
const collaborationsJs = read("collaborations.js");

test("app login adapter handles Result object contract", () => {
	assert.match(appJs, /const loginResult = await login\(identifier, password\);/);
	assert.match(appJs, /if \(!loginResult\.ok\) \{/);
	assert.match(appJs, /loginError\.textContent = loginResult\.error\.message;/);
});

test("app dashboard adapter unwraps Result objects from API calls", () => {
	assert.match(appJs, /const user = unwrapResult\(await fetchUserInfo\(\)\);/);
	assert.match(appJs, /const xpTransactions = unwrapResult\(xpResult\);/);
	assert.match(appJs, /const objDetail = unwrapResult\(await fetchObjectById\(xpTransactions\[0\]\.id\)\);/);
});

test("collaborations adapter unwraps Result object from fetchCollaborations", () => {
	assert.match(collaborationsJs, /await fetchCollaborations\(userId\)/);
	assert.match(collaborationsJs, /const \{ groups, auditsGiven, auditsReceived \} = unwrapResult\(/);
});
