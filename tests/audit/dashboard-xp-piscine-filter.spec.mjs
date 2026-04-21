import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const dashboardApi = read("src/features/dashboard/dashboard.api.js");

test("dashboard.api.js should not filter out Piscine JS projects", () => {
	// The original bug used "%piscine%" which filters out anything containing "piscine",
	// including "piscine-js" or "piscine-go".
	// The fix should be to specifically filter "%piscine-go%" or to use a better regex
	// to allow "piscine-js" to pass.

	// We assert that the queries DO NOT use '%piscine%'
	assert.doesNotMatch(
		dashboardApi,
		/_nlike:\s*"%piscine%"/,
		"Should not use '%piscine%' as it excludes Piscine JS",
	);

	// And we assert they still exclude piscine-go (case-insensitive)
	assert.match(
		dashboardApi,
		/_nilike:\s*"%piscine-go%"/,
		"Should exclude the original piscine-go track",
	);

	// Null path rows must remain included to avoid dropping valid XP records.
	assert.match(
		dashboardApi,
		/path:\s*\{\s*_is_null:\s*true\s*\}/,
		"Should keep XP rows where path is null",
	);
});
