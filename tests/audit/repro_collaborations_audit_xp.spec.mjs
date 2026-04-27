/**
 * Reproduction test for collaborations audit XP issue.
 * smart-road shows 0 B in collaborations but 75.3 kB in audit details.
 * This occurs when a project has audit XP (type="up") but no regular XP (type="xp").
 * @module repro_collaborations_audit_xp
 */

import { strict as assert } from "node:assert";
import test from "node:test";
import { createProjectXPResolver } from "../../src/features/dashboard/dashboard.core.js";

// Simulate the data structure
const mockAuditXPTransactions = [
	{
		id: 1,
		objectId: 100,
		amount: 75.3 * 1024, // 75.3 kB in bytes
		createdAt: "2026-04-20T10:00:00Z",
		path: "/athens/div-01/smart-road",
		object: {
			id: 100,
			name: "smart-road",
			type: "project",
		},
	},
];

const mockRegularXPTransactions = [
	// smart-road has NO regular XP, only audit XP
	{
		id: 2,
		objectId: 101,
		amount: 50 * 1024, // Different project
		createdAt: "2026-04-19T10:00:00Z",
		path: "/athens/div-01/forum",
		object: {
			id: 101,
			name: "forum",
			type: "project",
		},
	},
];

test("should resolve smart-road audit XP correctly when using audit transactions", () => {
	const resolveAuditXP = createProjectXPResolver(mockAuditXPTransactions);

	// Simulate collaboration record for smart-road
	const smartRoadCollab = {
		objectId: 100,
		path: "/athens/div-01/smart-road",
		name: "smart-road",
	};

	const xpAmount = resolveAuditXP(smartRoadCollab);
	assert.equal(xpAmount, 75.3 * 1024, "Should resolve 75.3 kB audit XP");
});

test("should resolve smart-road as 0 B when only using regular XP transactions", () => {
	const resolveRegularXP = createProjectXPResolver(mockRegularXPTransactions);

	// Simulate collaboration record for smart-road
	const smartRoadCollab = {
		objectId: 100,
		path: "/athens/div-01/smart-road",
		name: "smart-road",
	};

	const xpAmount = resolveRegularXP(smartRoadCollab);
	assert.equal(
		xpAmount,
		0,
		"Should resolve 0 B because smart-road has no regular XP",
	);
});

test("should resolve audit XP by path when objectId is missing", () => {
	const resolveAuditXP = createProjectXPResolver(mockAuditXPTransactions);

	// Simulate collaboration record WITHOUT objectId
	const smartRoadCollabNoId = {
		objectId: null,
		path: "/athens/div-01/smart-road",
		name: "smart-road",
	};

	const xpAmount = resolveAuditXP(smartRoadCollabNoId);
	assert.equal(
		xpAmount,
		75.3 * 1024,
		"Should fallback to path matching and resolve 75.3 kB",
	);
});

test("should resolve audit XP by name as final fallback", () => {
	const resolveAuditXP = createProjectXPResolver(mockAuditXPTransactions);

	// Simulate collaboration record with only name
	const smartRoadCollabNameOnly = {
		objectId: null,
		path: "",
		name: "smart-road",
	};

	const xpAmount = resolveAuditXP(smartRoadCollabNameOnly);
	assert.equal(
		xpAmount,
		75.3 * 1024,
		"Should fallback to name matching and resolve 75.3 kB",
	);
});
