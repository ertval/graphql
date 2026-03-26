import assert from "node:assert/strict";
import test from "node:test";

import { computeDashboardRoleData } from "../src/dashboard.core.js";

const createProject = (id, name = `Project ${id}`) => ({
	object: { id, name, type: "project" },
	grade: 1,
	updatedAt: `2026-03-${String((id % 28) + 1).padStart(2, "0")}T10:00:00Z`,
});

test("audit role counters align Captain+Partner with completed projects", () => {
	const completedProjects = [
		...Array.from({ length: 10 }, (_, idx) => createProject(idx + 1)),
		...Array.from({ length: 15 }, (_, idx) => createProject(idx + 11)),
	];

	const teamsByProject = new Map([
		...Array.from({ length: 10 }, (_, idx) => [
			String(idx + 1),
			{ captainLogin: "alice" },
		]),
		...Array.from({ length: 15 }, (_, idx) => [
			String(idx + 11),
			{ captainLogin: "other-user" },
		]),
	]);

	const roleData = computeDashboardRoleData(
		completedProjects,
		teamsByProject,
		"alice",
		[],
	);

	assert.equal(roleData.stats.captain, 10);
	assert.equal(roleData.stats.partner, 15);
	assert.equal(roleData.stats.auditor, 0);
	assert.equal(
		roleData.stats.captain + roleData.stats.partner,
		completedProjects.length,
	);
});

test("projects without team metadata default to Partner", () => {
	const completedProjects = [createProject(1), createProject(2), createProject(3)];
	const teamsByProject = new Map([["1", { captainLogin: "alice" }]]);

	const roleData = computeDashboardRoleData(
		completedProjects,
		teamsByProject,
		"alice",
		[],
	);

	assert.deepEqual(roleData.stats, { captain: 1, partner: 2, auditor: 0 });
});

test("auditor role count deduplicates repeated audits of the same project", () => {
	const completedProjects = [];
	const teamsByProject = new Map();
	const auditorAudits = [
		{
			createdAt: "2026-03-01T10:00:00Z",
			objectId: 200,
			projectName: "Graph Explorer",
			projectPath: "/graphexplorer",
		},
		{
			createdAt: "2026-03-02T10:00:00Z",
			objectId: 200,
			projectName: "Graph Explorer",
			projectPath: "/graphexplorer",
		},
		{
			createdAt: "2026-03-03T10:00:00Z",
			objectId: 201,
			projectName: "Go Reloaded",
			projectPath: "/goreloaded",
		},
	];

	const roleData = computeDashboardRoleData(
		completedProjects,
		teamsByProject,
		"alice",
		auditorAudits,
	);

	assert.equal(roleData.stats.auditor, 2);
	assert.equal(roleData.projectsByRole.Auditor.length, 2);
	const countByProject = roleData.projectsByRole.Auditor.reduce((map, project) => {
		map.set(project.name, project.count);
		return map;
	}, new Map());
	assert.equal(countByProject.get("Graph Explorer"), 2);
	assert.equal(countByProject.get("Go Reloaded"), 1);
});
