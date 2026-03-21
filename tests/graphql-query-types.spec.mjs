import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const apiJs = fs.readFileSync(
	path.join(process.cwd(), "src/graphql.queries.js"),
	"utf8",
);

const hasBlock = (pattern) => pattern.test(apiJs);

test("normal query is present", () => {
	assert.ok(
		hasBlock(
			/fetchUserInfo\s*=\s*async[\s\S]*?const query\s*=\s*`[\s\S]*?\{\s*user\s*\{/,
		),
		"Missing normal user query",
	);
});

test("query with arguments is present", () => {
	assert.ok(
		hasBlock(/query\s+GetXPTransactions\(\$userId:\s*Int!/),
		"Missing parameterized query with variables",
	);
	assert.ok(
		hasBlock(/graphqlQuery\(query,\s*\{\s*userId\s*\}\)/),
		"Missing variables usage in GraphQL call",
	);
});

test("nested query is present", () => {
	assert.ok(
		hasBlock(
			/fetchResults\s*=\s*async[\s\S]*?result\([\s\S]*?\{[\s\S]*?user\s*\{/,
		),
		"Missing nested result -> user query",
	);
	assert.ok(
		hasBlock(/object\s*\{\s*name\s*type\s*\}/),
		"Missing nested result -> object query",
	);
});
