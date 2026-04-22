import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const indexHtml = read("index.html");
const dashboardViewJs = read("src/features/dashboard/dashboard.ui.view.js");
const rolePopupJs = read("src/features/dashboard/dashboard.ui.popup.roles.js");

test("user profile card contains role counters and roles title", () => {
	assert.match(indexHtml, /<h3 class="profile-roles-title">Roles<\/h3>/);
	assert.match(
		indexHtml,
		/id="role-counter-captain"[\s\S]*id="audit-role-captain"/,
	);
	assert.match(
		indexHtml,
		/id="role-counter-partner"[\s\S]*id="audit-role-partner"/,
	);
	assert.match(
		indexHtml,
		/id="role-counter-auditor"[\s\S]*id="audit-role-auditor"/,
	);
	assert.doesNotMatch(indexHtml, /class="audit-role-stats"/);
});

test("role projects overlay exists with dedicated ids", () => {
	assert.match(indexHtml, /id="role-projects-overlay"/);
	assert.match(indexHtml, /id="role-projects-title"/);
	assert.match(indexHtml, /id="role-projects-content"/);
	assert.match(indexHtml, /id="role-projects-close"/);
});

test("audit ratio section includes audit details button and overlay", () => {
	assert.match(indexHtml, /id="audit-details-btn"/);
	assert.match(indexHtml, /Audit Details/);
	assert.match(indexHtml, /id="audit-details-overlay"/);
	assert.match(indexHtml, /id="audit-details-title"/);
	assert.match(indexHtml, /id="audit-details-content"/);
	assert.match(indexHtml, /id="audit-details-close"/);
});

test("dashboard view initializes role projects popup and role data builder", () => {
	assert.match(dashboardViewJs, /initRoleProjectsPopup/);
	assert.match(dashboardViewJs, /initAuditDetailsPopup/);
	assert.match(dashboardViewJs, /_auditDetailsProjects/);
	assert.match(dashboardViewJs, /computeDashboardRoleData/);
	assert.match(dashboardViewJs, /_roleProjectsByRole/);
});

test("role popup module reuses split-panel project detail behavior", () => {
	assert.match(rolePopupJs, /createProjectDetailPanelElements/);
	assert.match(rolePopupJs, /sp-layout-expanded/);
	assert.match(rolePopupJs, /collab-project-list/);
	assert.match(rolePopupJs, /createProjectMembersSection/);
});
