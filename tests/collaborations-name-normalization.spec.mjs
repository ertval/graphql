import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCollaboratorNamesByLogin } from "../src/features/collaborations.index.js";

test("normalizes collaborator display names by login across roles", () => {
	const records = [
		{
			id: "p1",
			login: "jdoe",
			firstName: "JOHN",
			lastName: "doE",
			campus: "Paris",
			project: "Alpha",
			role: "Partner",
			date: "2026-01-01T00:00:00.000Z",
			ts: 1,
		},
		{
			id: "c1",
			login: "jdoe",
			firstName: "",
			lastName: "",
			campus: "",
			project: "Beta",
			role: "Captain",
			date: "2026-01-02T00:00:00.000Z",
			ts: 2,
		},
		{
			id: "a1",
			login: "jdoe",
			firstName: "jOHN",
			lastName: "DOE",
			campus: "Paris",
			project: "Gamma",
			role: "Auditor",
			date: "2026-01-03T00:00:00.000Z",
			ts: 3,
		},
	];

	const normalized = normalizeCollaboratorNamesByLogin(records);
	assert.equal(normalized.length, 3);

	for (const collab of normalized) {
		assert.equal(collab.login, "jdoe");
		assert.equal(collab.firstName, "John");
		assert.equal(collab.lastName, "Doe");
	}
});

test("normalizes hyphenated and apostrophe names to readable casing", () => {
	const records = [
		{
			id: "p2",
			login: "moconnor",
			firstName: "mARIE-cLAIRE",
			lastName: "o'cONNOR",
			campus: "Lyon",
			project: "Delta",
			role: "Partner",
			date: "2026-01-04T00:00:00.000Z",
			ts: 4,
		},
		{
			id: "a2",
			login: "moconnor",
			firstName: "",
			lastName: "",
			campus: "",
			project: "Epsilon",
			role: "Captain",
			date: "2026-01-05T00:00:00.000Z",
			ts: 5,
		},
	];

	const normalized = normalizeCollaboratorNamesByLogin(records);
    assert.equal(normalized[0].firstName, "Marie-Claire");
	assert.equal(normalized[0].lastName, "O'Connor");
	assert.equal(normalized[1].firstName, "Marie-Claire");
	assert.equal(normalized[1].lastName, "O'Connor");
});
