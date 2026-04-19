import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const collaborationsApi = read(
	"src/features/collaborations/collaborations.api.js",
);
const dashboardView = read("src/features/dashboard/dashboard.ui.view.js");
const graphqlInfra = read("src/infra/graphql.js");

test("collaborations api does not import view layer modules", () => {
	assert.doesNotMatch(
		collaborationsApi,
		/from\s+"\.\/collaborations\.ui\.view\.js"/,
	);
	assert.doesNotMatch(collaborationsApi, /document\.querySelector/);
});

test("dashboard view does not import infra auth directly", () => {
	assert.doesNotMatch(dashboardView, /from\s+"\.\.\/infra\/auth\.js"/);
	assert.match(dashboardView, /isSessionValid\s*=\s*\(\)\s*=>\s*true/);
});

test("infra graphql uses configurable auth adapter instead of direct auth import", () => {
	assert.match(graphqlInfra, /const graphqlAuth = \{/);
	assert.match(graphqlInfra, /export const configureGraphqlAuth = \(auth\) =>/);
	assert.doesNotMatch(graphqlInfra, /from\s+"\.\/auth\.js"/);
});
