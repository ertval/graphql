import assert from "node:assert/strict";
import test from "node:test";

import { computeAuditRoleStats } from "../src/dashboard.core.js";

const createProject = (id) => ({ object: { id, type: "project" }, grade: 1 });

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

	const stats = computeAuditRoleStats(
		completedProjects,
		teamsByProject,
		"alice",
		12,
	);

	assert.equal(stats.captain, 10);
	assert.equal(stats.partner, 15);
	assert.equal(stats.auditor, 12);
	assert.equal(stats.captain + stats.partner, completedProjects.length);
});

test("projects without team metadata default to Partner", () => {
	const completedProjects = [createProject(1), createProject(2), createProject(3)];
	const teamsByProject = new Map([["1", { captainLogin: "alice" }]]);

	const stats = computeAuditRoleStats(
		completedProjects,
		teamsByProject,
		"alice",
		0,
	);

	assert.deepEqual(stats, { captain: 1, partner: 2, auditor: 0 });
});
