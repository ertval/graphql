import assert from "node:assert/strict";
import test from "node:test";

import {
	computeAuditDetailsProjects,
	computeDashboardRoleData,
} from "../src/features/dashboard/dashboard.core.js";

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
	const completedProjects = [
		createProject(1),
		createProject(2),
		createProject(3),
	];
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
	const countByProject = roleData.projectsByRole.Auditor.reduce(
		(map, project) => {
			map.set(project.name, project.count);
			return map;
		},
		new Map(),
	);
	assert.equal(countByProject.get("Graph Explorer"), 2);
	assert.equal(countByProject.get("Go Reloaded"), 1);
});

test("audit details projects aggregate xp by object id and sort by latest audit date", () => {
	const audits = [
		{
			createdAt: "2026-03-03T10:00:00Z",
			objectId: 301,
			projectName: "Go Reloaded",
			projectPath: "/athens/div-01/go-reloaded",
		},
		{
			createdAt: "2026-03-09T10:00:00Z",
			objectId: 300,
			projectName: "Graph Explorer",
			projectPath: "/athens/div-01/graph-explorer",
		},
		{
			createdAt: "2026-03-07T10:00:00Z",
			objectId: 300,
			projectName: "Graph Explorer",
			projectPath: "/athens/div-01/graph-explorer",
		},
	];

	const auditXpTransactions = [
		{
			objectId: 300,
			amount: 12000,
			path: "/athens/div-01/graph-explorer",
			object: { id: 300, name: "Graph Explorer" },
		},
		{
			objectId: 300,
			amount: 8000,
			path: "/athens/div-01/graph-explorer",
			object: { id: 300, name: "Graph Explorer" },
		},
		{
			objectId: 301,
			amount: 5000,
			path: "/athens/div-01/go-reloaded",
			object: { id: 301, name: "Go Reloaded" },
		},
	];

	const details = computeAuditDetailsProjects(audits, auditXpTransactions);

	assert.equal(details.length, 2);
	assert.equal(details[0].name, "Graph Explorer");
	assert.equal(details[0].auditCount, 2);
	assert.equal(details[0].totalXP, 20000);
	assert.equal(details[1].name, "Go Reloaded");
	assert.equal(details[1].totalXP, 5000);
});

test("audit details projects fall back to path/name xp matching when object id is missing", () => {
	const audits = [
		{
			createdAt: "2026-03-11T10:00:00Z",
			projectName: "Net Cat",
			projectPath: "/athens/div-01/net-cat",
		},
		{
			createdAt: "2026-03-12T10:00:00Z",
			projectName: "Ascii Art",
			projectPath: "",
		},
	];

	const auditXpTransactions = [
		{
			amount: 11000,
			path: "/athens/div-01/net-cat",
			object: { name: "Net Cat" },
		},
		{
			amount: 6100,
			path: "/athens/div-01/ascii-art",
			object: { name: "Ascii Art" },
		},
	];

	const details = computeAuditDetailsProjects(audits, auditXpTransactions);

	const byName = new Map(details.map((item) => [item.name, item.totalXP]));
	assert.equal(byName.get("Net Cat"), 11000);
	assert.equal(byName.get("Ascii Art"), 6100);
});
