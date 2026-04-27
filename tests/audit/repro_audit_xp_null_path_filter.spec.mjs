import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const dashboardApi = read("src/features/dashboard/dashboard.api.js");

test("xp query keeps records with null path while excluding piscine-go", () => {
	assert.match(
		dashboardApi,
		/_or:\s*\[\s*\{\s*path:\s*\{\s*_is_null:\s*true\s*\}\s*\}\s*,?\s*\{\s*path:\s*\{\s*_nilike:\s*"%piscine-go%"\s*\}\s*\}\s*\]/,
		"XP query should include null path rows and exclude piscine-go rows case-insensitively",
	);

	assert.match(
		dashboardApi,
		/eventId:\s*\{\s*_eq:\s*\$eventId\s*\}/,
		"XP and audit XP queries should be scoped to the active eventId.",
	);

	assert.doesNotMatch(
		dashboardApi,
		/path:\s*\{\s*_nlike:\s*"%piscine-go%"\s*\}/,
		"XP query should not use a plain _nlike filter that drops null paths",
	);
});
