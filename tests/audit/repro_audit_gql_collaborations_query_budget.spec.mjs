import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const collaborationsApi = read(
	"src/features/collaborations/collaborations.api.js",
);

const extractGetCollabsQuery = () => {
	const match = collaborationsApi.match(/const query = `([\s\S]*?)`;/);
	assert.ok(match?.[1], "Could not find GetCollabs query string.");
	return match[1];
};

test("repro GQL-001: GetCollabs query removes duplicate fields and applies budget limits", () => {
	const query = extractGetCollabsQuery();
	const captainLoginMatches = query.match(/captainLogin/g) ?? [];

	assert.equal(
		captainLoginMatches.length,
		3,
		"GetCollabs query should select captainLogin exactly once per group block (3 total).",
	);

	assert.match(
		query,
		/group_user\(where:\s*\{userId:\s*\{_eq:\s*\$userId\}\},\s*limit:\s*\$historyLimit,/,
		"group_user query branch should apply explicit historyLimit.",
	);
	assert.match(
		query,
		/audit\(where:\s*\{auditorId:\s*\{_eq:\s*\$userId\}\},\s*limit:\s*\$historyLimit,/,
		"audit-given query branch should apply explicit historyLimit.",
	);
	assert.match(
		query,
		/audit_received:\s*audit\(where:\s*\{group:\s*\{members:\s*\{userId:\s*\{_eq:\s*\$userId\}\}\}\},\s*limit:\s*\$historyLimit,/,
		"audit-received query branch should apply explicit historyLimit.",
	);
	assert.match(
		query,
		/query\s+GetCollabs\(\$userId:\s*Int!,\s*\$historyLimit:\s*Int!\)/,
		"GetCollabs should expose a historyLimit variable.",
	);
});
