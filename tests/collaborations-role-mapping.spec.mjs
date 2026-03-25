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

test("verified collaborator role set includes Captain", () => {
	assert.match(collaborationsCoreJs, /new Set\(\["Partner", "Captain", "Auditor", "Auditee"\]\)/);
});

test("role filter includes Captain option", () => {
	assert.match(indexHtml, /<option value="Captain">Captain<\/option>/);
});
