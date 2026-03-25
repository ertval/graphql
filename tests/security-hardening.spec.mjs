import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const appJs = read("src/app.js");
const collaborationsJs = read("src/collaborations.view.js");
const collaborationsViewJs = read("src/collaborations.view.js");
const collaborationsPopupJs = read("src/collaborations.popup.js");
const dashboardPopupJs = read("src/dashboard.popup.js");
const dashboardApiJs = read("src/dashboard.api.js");
const dashboardViewJs = read("src/dashboard.view.js");
const collaborationsCss = read("css/collaborations.css");
const apiJs = read("src/infra.graphql.js");
const indexHtml = read("index.html");

test("collaborations loading error uses safe textContent and no template innerHTML sink", () => {
	assert.doesNotMatch(
		collaborationsViewJs,
		/innerHTML\s*=\s*`[^`]*\$\{\s*err\.message\s*\}[^`]*`/,
	);
	assert.match(
		collaborationsViewJs,
		/errorMsg\.textContent\s*=\s*"Failed to load collaborations data\."/,
	);
});

test("app and collaborations avoid template innerHTML sinks for dynamic row/item rendering", () => {
	assert.doesNotMatch(appJs, /item\.innerHTML\s*=\s*`/);
	assert.doesNotMatch(collaborationsJs, /tr\.innerHTML\s*=\s*`/);
});

test("collaborator project tiles open the shared project detail modal", () => {
	assert.match(collaborationsPopupJs, /openProjectDetail\(\s*project,/);
	assert.match(collaborationsPopupJs, /setAttribute\("role", "button"\)/);
	assert.match(collaborationsPopupJs, /setAttribute\("aria-label", `View details for \$\{project\.name\}`\)/);
});

test("dashboard project detail includes project members section", () => {
	assert.match(dashboardPopupJs, /Project Members/);
	assert.match(dashboardPopupJs, /My Role/);
	assert.match(dashboardPopupJs, /sp-project-grid/);
	assert.match(dashboardPopupJs, /sp-project-link/);
	assert.match(dashboardPopupJs, /toProjectUrl/);
});

test("collaborator project member list only auto-adds active user for shared team membership", () => {
	assert.match(collaborationsPopupJs, /hasSharedTeamMembership/);
	assert.match(
		collaborationsPopupJs,
		/if \(hasSharedTeamMembership && activeUserLogin\) \{\s*\n\s*teamLogins\.push\(activeUserLogin\);/,
	);
});

test("dashboard project teams are hydrated by object id for all visible project names", () => {
	assert.match(dashboardApiJs, /query GetProjectTeams\(\$projectNames: \[String!\]!\)/);
	assert.match(dashboardApiJs, /group_user\(where: \{group: \{object: \{name: \{_in: \$projectNames\}\}\}\}\)/);
	assert.match(dashboardApiJs, /object \{\s*id\s*name\s*\}/);
	assert.match(dashboardViewJs, /const projectNames = \[\s*\n\s*\.\.\.new Set\(rawResults\.map\(\(result\) => result\.object\?\.name\)\.filter\(Boolean\)\),\s*\n\s*\];/);
	assert.match(dashboardViewJs, /fetchProjectTeams\(projectNames\)/);
	assert.match(dashboardViewJs, /teamMembers:\s*\n\s*teamsByProject\.get\(normalizeProjectName\(result\.object\?\.name\)\) \?\? \[\],/);
});

test("collaborator detail toggles extended project panel when same project is clicked", () => {
	assert.match(collaborationsPopupJs, /sp-layout-expanded/);
	assert.match(collaborationsPopupJs, /selectedProjectName/);
	assert.match(collaborationsPopupJs, /classList\.remove\("active"\)/);
});

test("collaborator split-panel animation uses theme slow timing and avoids left crop transform", () => {
	assert.match(collaborationsCss, /grid-template-columns var\(--transition-slow\)/);
	assert.match(collaborationsCss, /transform 520ms cubic-bezier\(0\.4, 0, 0\.2, 1\)/);
	assert.doesNotMatch(collaborationsCss, /translateX\(-/);
	assert.doesNotMatch(collaborationsCss, /scrollbar-gutter:\s*stable/);
	assert.doesNotMatch(collaborationsCss, /max-height:\s*min\(560px, calc\(90vh - 170px\)\);/);
	assert.doesNotMatch(collaborationsCss, /\.sp-project-panel \{[\s\S]*overflow-y:\s*auto;/);
	assert.match(collaborationsPopupJs, /stabilizeExpandedLayout\(layout, \(\) => \{\s*\n\s*layout\.classList\.add\("sp-layout-expanded"\);\s*\n\s*panel\.classList\.add\("active"\);/);
});

test("collaborator project detail renders My Role section for active user", () => {
	assert.match(collaborationsPopupJs, /My Role/);
	assert.match(collaborationsPopupJs, /getActiveUserProjectRole/);
});

test("dashboard team hydration uses group_user mapping and stable object id keys", () => {
	assert.match(
		dashboardApiJs,
		/query GetProjectTeams\(\$projectNames: \[String!\]!\)[\s\S]*group_user\(where: \{group: \{object: \{name: \{_in: \$projectNames\}\}\}\}\)/,
	);
	assert.match(
		dashboardApiJs,
		/const projectName = group\.object\?\.name \?\? "";[\s\S]*const normalizedProjectName = normalizeProjectName\(projectName\);/,
	);
	assert.match(dashboardViewJs, /const normalizeProjectName = \(name\) =>/);
	assert.match(
		dashboardViewJs,
		/teamMembers:\s*\n\s*teamsByProject\.get\(normalizeProjectName\(result\.object\?\.name\)\) \?\? \[\],?/,
	);
	assert.match(dashboardViewJs, /_teamsByProject = teamsByProject;/);
	assert.match(dashboardPopupJs, /const normalizeProjectName = \(name\) =>/);
	assert.match(dashboardPopupJs, /getTeamsByProject\(\)\.get\(normalizeProjectName\(projectName\)\) \?\? \[\]/);
});

test("app synchronizes logout via BroadcastChannel with storage fallback", () => {
	assert.match(appJs, /BroadcastChannel/);
	assert.match(appJs, /AUTH_SYNC_KEY/);
	assert.match(appJs, /event\.key === AUTH_SYNC_KEY/);
});

test("api clears token on 401 and 403 GraphQL responses", () => {
	assert.match(
		apiJs,
		/response\.status\s*===\s*401\s*\|\|\s*response\.status\s*===\s*403/,
	);
	assert.match(
		apiJs,
		/graphqlAuth\.clearToken\(\);\s*\n\s*return fail\(new Error\("Session expired\. Please log in again\."\)\);/,
	);
});

test("api clears token on GraphQL auth-related errors", () => {
	assert.match(apiJs, /const isAuthErrorMessage = \(message\) =>/);
	assert.match(
		apiJs,
		/if \(isAuthErrorMessage\(messages\)\) \{\s*\n\s*graphqlAuth\.clearToken\(\);/,
	);
});

test("index has CSP and Trusted Types meta hardening", () => {
	assert.match(indexHtml, /http-equiv="Content-Security-Policy"/);
	assert.match(indexHtml, /require-trusted-types-for 'script'/);
	assert.match(indexHtml, /trusted-types 'none'/);
});
