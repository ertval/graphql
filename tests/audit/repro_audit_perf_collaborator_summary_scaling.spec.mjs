import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const collaborationsView = read(
	"src/features/collaborations/collaborations.ui.view.js",
);
const collaborationsCore = read(
	"src/features/collaborations/collaborations.core.js",
);

test("repro PERF-001: collaborations summary build avoids per-login full rescans", () => {
	assert.doesNotMatch(
		collaborationsView,
		/uniqueCollabs\s*=\s*logins\.map\(\(login\)\s*=>\s*buildCollaboratorSummary\(data,\s*login\)\);/,
		"Collaborations view still rescans all rows once per login via buildCollaboratorSummary(data, login).",
	);

	assert.match(
		collaborationsCore,
		/export const buildCollaboratorSummaries\s*=\s*\(collabs\)\s*=>/,
		"Collaborations core should expose a grouped summary builder for one-pass preparation.",
	);
});
