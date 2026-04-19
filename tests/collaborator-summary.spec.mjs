import assert from "node:assert/strict";
import test from "node:test";

import {
	buildCollaboratorSummary,
	filterVerifiedCollaborations,
} from "../src/features/collaborations/collaborations.core.js";

test("buildCollaboratorSummary aggregates projects, roles and counts for a login", () => {
	const records = [
		{
			id: "a1",
			login: "jdoe",
			firstName: "John",
			lastName: "Doe",
			campus: "Athens",
			project: "Libft",
			role: "Partner",
			date: "2026-01-01T10:00:00.000Z",
			ts: 100,
		},
		{
			id: "a2",
			login: "jdoe",
			firstName: "John",
			lastName: "Doe",
			campus: "Athens",
			project: "Libft",
			role: "Auditor",
			date: "2026-01-08T10:00:00.000Z",
			ts: 200,
		},
		{
			id: "a3",
			login: "jdoe",
			firstName: "",
			lastName: "",
			campus: "Athens",
			project: "Graph Explorer",
			role: "Captain",
			date: "2026-01-10T10:00:00.000Z",
			ts: 300,
		},
		{
			id: "a4",
			login: "other",
			firstName: "Other",
			lastName: "User",
			campus: "Paris",
			project: "Ignored",
			role: "Partner",
			date: "2026-01-12T10:00:00.000Z",
			ts: 400,
		},
	];

	const summary = buildCollaboratorSummary(records, "jdoe");

	assert.ok(summary);
	assert.equal(summary.displayName, "John Doe");
	assert.equal(summary.totalCollaborations, 3);
	assert.equal(summary.totalProjects, 2);

	assert.deepEqual(summary.byRole, [
		{ role: "Auditor", count: 1 },
		{ role: "Captain", count: 1 },
		{ role: "Partner", count: 1 },
	]);

	assert.deepEqual(summary.projects[0], {
		name: "Graph Explorer",
		path: "",
		roles: ["Captain"],
		latestDate: "2026-01-10T10:00:00.000Z",
		count: 1,
	});

	assert.deepEqual(summary.projects[1], {
		name: "Libft",
		path: "",
		roles: ["Auditor", "Partner"],
		latestDate: "2026-01-08T10:00:00.000Z",
		count: 2,
	});
});

test("buildCollaboratorSummary returns null for unknown collaborator login", () => {
	const summary = buildCollaboratorSummary([], "nobody");
	assert.equal(summary, null);
});

test("filterVerifiedCollaborations keeps only verified same-campus teammates", () => {
	const records = [
		{
			id: "keep-partner",
			login: "alice",
			firstName: "Alice",
			lastName: "Partner",
			campus: "Athens",
			project: "Libft",
			role: "Partner",
			date: "2026-01-01T10:00:00.000Z",
			ts: 100,
		},
		{
			id: "drop-campus-mismatch",
			login: "bob",
			firstName: "Bob",
			lastName: "Auditor",
			campus: "Paris",
			project: "Libft",
			role: "Auditor",
			date: "2026-01-02T10:00:00.000Z",
			ts: 200,
		},
		{
			id: "drop-unverified-role",
			login: "eve",
			firstName: "Eve",
			lastName: "Proposal",
			campus: "Athens",
			project: "Libft",
			role: "Member",
			date: "2026-01-03T10:00:00.000Z",
			ts: 300,
		},
		{
			id: "drop-missing-campus",
			login: "carol",
			firstName: "Carol",
			lastName: "Auditee",
			campus: "",
			project: "Graph Explorer",
			role: "Auditee",
			date: "2026-01-04T10:00:00.000Z",
			ts: 400,
		},
	];

	const filtered = filterVerifiedCollaborations(records, "Athens");

	assert.deepEqual(
		filtered.map((record) => record.id),
		["keep-partner"],
	);
});
