import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const dashboardPopupJs = read("src/features/dashboard/dashboard.ui.popup.js");
const rolePopupJs = read("src/features/dashboard/dashboard.ui.popup.roles.js");
const collaborationsPopupJs = read(
	"src/features/collaborations/collaborations.ui.popup.js",
);

test("dashboard project detail stat grid shows formatted XP instead of project-link availability", () => {
	assert.match(dashboardPopupJs, /formatXP\(xpAmount\)/);
	assert.match(dashboardPopupJs, /XP Received/);
	assert.match(dashboardPopupJs, /XP Given/);
	assert.doesNotMatch(dashboardPopupJs, /label:\s*"Project Link"/);
});

test("role project detail panel shows XP tile and auditor-specific wording", () => {
	assert.match(rolePopupJs, /formatXP\(project\.xpAmount \?\? 0\)/);
	assert.match(
		rolePopupJs,
		/project\.role === "Auditor" \? "XP Given" : "XP Received"/,
	);
	assert.doesNotMatch(rolePopupJs, /label:\s*"Project Link"/);
});

test("collaboration project detail panel shows XP tile and keeps path/link section renderer", () => {
	assert.match(collaborationsPopupJs, /formatXP\(project\.xpAmount \?\? 0\)/);
	assert.match(collaborationsPopupJs, /XP Given/);
	assert.match(collaborationsPopupJs, /XP Received/);
	assert.match(collaborationsPopupJs, /createProjectPathAndLinkSection/);
	assert.doesNotMatch(collaborationsPopupJs, /label:\s*"Project Link"/);
});
