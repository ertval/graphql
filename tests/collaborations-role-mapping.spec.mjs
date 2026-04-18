import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const collaborationsApiJs = read("src/collaborations.api.js");
const collaborationsCoreJs = read("src/collaborations.core.js");
const indexHtml = read("index.html");

test("collaborations api maps audits received collaborator role to Auditor", () => {
	assert.match(collaborationsApiJs, /audit_received:[\s\S]*role:\s*"Auditor"/);
});

test("collaborations api preserves Captain role for captain-based audit records", () => {
	assert.match(collaborationsApiJs, /captainLogin/);
	assert.match(collaborationsApiJs, /role:\s*"Captain"/);
});

test("collaborations api keeps captain metadata for partner and auditor context", () => {
	assert.match(
		collaborationsApiJs,
		/group_user\([\s\S]*?group\s*\{[\s\S]*?captainLogin/,
	);
	assert.match(
		collaborationsApiJs,
		/audit_received:[\s\S]*?group\s*\{[\s\S]*?captainLogin/,
	);
	assert.match(collaborationsApiJs, /teamCaptainLogin/);
});

test("collaborations api maps group member collaborator role to Captain when login matches captainLogin", () => {
	assert.match(
		collaborationsApiJs,
		/const isCaptain = member\.user\.login === g\.group\?\.captainLogin;[\s\S]*role:\s*isCaptain \? "Captain" : "Partner"/,
	);
});

test("verified collaborator role set excludes dead Auditee role", () => {
	assert.match(
		collaborationsCoreJs,
		/new Set\(\["Partner", "Captain", "Auditor"\]\)/,
	);
	assert.doesNotMatch(collaborationsCoreJs, /Auditee/);
});

test("role filter includes Captain option", () => {
	assert.match(indexHtml, /<option value="Captain">Captain<\/option>/);
});

test("role filter removes dead Auditee option", () => {
	assert.doesNotMatch(indexHtml, /<option value="Auditee">Auditee<\/option>/);
});
