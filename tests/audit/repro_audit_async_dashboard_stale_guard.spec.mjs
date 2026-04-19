import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const dashboardView = read("src/features/dashboard/dashboard.ui.view.js");
const appJs = read("src/app.js");

test("repro ASYNC-001: dashboard load uses generation guard and logout invalidation", () => {
	assert.match(
		dashboardView,
		/let dashboardLoadGeneration = 0;/,
		"Dashboard module should keep a load generation counter.",
	);
	assert.match(
		dashboardView,
		/export const invalidateDashboardLoads = \(\) => \{/,
		"Dashboard module should expose invalidateDashboardLoads for logout/session reset.",
	);
	assert.match(
		dashboardView,
		/const loadGeneration = \+\+dashboardLoadGeneration;/,
		"loadDashboard should capture a generation token when a load starts.",
	);
	assert.match(
		dashboardView,
		/if \(loadGeneration !== dashboardLoadGeneration\) \{\s*return \{ ok: false, error: new Error\("Stale dashboard load cancelled\."\) \};\s*\}/,
		"loadDashboard should cancel stale completions before mutating UI/state.",
	);
	assert.match(
		appJs,
		/import \{[\s\S]*?invalidateDashboardLoads,[\s\S]*?\} from "\.\/features\/dashboard\/dashboard\.ui\.view\.js";/,
		"App should import invalidateDashboardLoads from dashboard view.",
	);
	assert.match(
		appJs,
		/invalidateDashboardLoads\(\);/,
		"Logout flow should invalidate in-flight dashboard loads.",
	);
});
