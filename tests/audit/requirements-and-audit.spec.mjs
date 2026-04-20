import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const indexHtml = read("index.html");
const authUiJs = read("src/features/auth/auth.ui.view.js");

// Graph code is now split across multiple files — concat for assertions
const graphsHelpersJs = read(
	"src/features/dashboard/dashboard.ui.charts.helpers.js",
);
const graphsBarJs = read("src/features/dashboard/dashboard.ui.charts.bar.js");
const graphsLineJs = read("src/features/dashboard/dashboard.ui.charts.line.js");
const graphsJs = graphsHelpersJs + graphsBarJs + graphsLineJs;

test("login form supports username/email and password inputs", () => {
	assert.match(indexHtml, /id="identifier"/);
	assert.match(indexHtml, /id="password"/);
	assert.match(indexHtml, /autocomplete="username"/);
	assert.match(indexHtml, /autocomplete="current-password"/);
});

test("dashboard contains three required data sections", () => {
	assert.match(indexHtml, /id="section-user"/);
	assert.match(indexHtml, /id="section-xp"/);
	assert.match(indexHtml, /id="section-audit"/);
});

test("statistics section exists and includes at least two graph containers", () => {
	assert.match(indexHtml, /id="section-graphs"/);

	const graphContainerMatches =
		indexHtml.match(
			/id="(xp-line-chart|project-bar-chart|audit-donut-chart|passfail-pie-chart)"/g,
		) ?? [];
	assert.ok(
		graphContainerMatches.length >= 2,
		"Expected at least two graph containers",
	);
});

test("graph rendering uses native SVG API", () => {
	assert.match(graphsJs, /document\.createElementNS\(/);
	assert.match(
		graphsJs,
		/SVG_NS\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/,
	);
	assert.match(graphsJs, /renderXPLineChart/);
	assert.match(graphsJs, /renderProjectBarChart/);
});

test("XP by Project graph uses dynamic layout computation", () => {
	assert.match(graphsBarJs, /computeProjectBarLayout/);
	assert.match(graphsBarJs, /const layout = computeProjectBarLayout/);
});

test("logout flow exists and clears auth token", () => {
	assert.match(authUiJs, /logoutBtn\?\.addEventListener\("click"/);
	assert.match(authUiJs, /clearToken\(\)/);
});
