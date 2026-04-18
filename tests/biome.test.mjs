import assert from "node:assert";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("biome check passes", () => {
	const result = spawnSync("npx", ["biome", "ci", "."], {
		shell: true,
		encoding: "utf-8",
	});

	if (result.status !== 0) {
		console.error(result.stdout);
		console.error(result.stderr);
	}

	assert.strictEqual(
		result.status,
		0,
		"Biome check failed. Run 'npm run lint:fix' to fix issues.",
	);
});
