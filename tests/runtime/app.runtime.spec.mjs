import { expect, test } from "@playwright/test";

const buildMockJwt = () => {
	const payload = {
		// Far-future unix timestamp to keep runtime tests deterministic.
		exp: 4_102_444_800,
		sub: "runtime-test-user",
	};
	const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
		"base64url",
	);
	return `header.${encodedPayload}.signature`;
};

const mockGraphqlData = {
	user: [
		{
			id: 101,
			login: "runtime-user",
			firstName: "Runtime",
			lastName: "Tester",
			email: "runtime@example.com",
			campus: "Athens",
			auditRatio: 1.5,
			totalUp: 210000,
			totalDown: 140000,
		},
	],
	xpTransactions: [
		{
			id: 1,
			amount: 80000,
			createdAt: "2026-01-10T10:00:00.000Z",
			path: "/zone/project-alpha",
			object: { name: "Alpha Project", type: "project" },
		},
		{
			id: 2,
			amount: 65000,
			createdAt: "2026-01-20T10:00:00.000Z",
			path: "/zone/project-beta",
			object: { name: "Beta Project", type: "project" },
		},
	],
	progress: [
		{
			id: 501,
			grade: 1,
			createdAt: "2026-01-10T10:00:00.000Z",
			updatedAt: "2026-01-10T10:00:00.000Z",
			path: "/zone/project-alpha",
			object: { name: "Alpha Project", type: "project" },
		},
		{
			id: 502,
			grade: 1,
			createdAt: "2026-01-20T10:00:00.000Z",
			updatedAt: "2026-01-20T10:00:00.000Z",
			path: "/zone/project-beta",
			object: { name: "Beta Project", type: "project" },
		},
	],
	skills: [
		{ type: "skill_js", amount: 80 },
		{ type: "skill_go", amount: 65 },
	],
	level: [{ amount: 12 }],
	results: [
		{
			id: 801,
			objectId: 1,
			grade: 1,
			type: "project",
			createdAt: "2026-01-21T10:00:00.000Z",
			user: { id: 101, login: "runtime-user" },
			object: { name: "Alpha Project", type: "project" },
		},
		{
			id: 802,
			objectId: 2,
			grade: 1,
			type: "project",
			createdAt: "2026-01-22T10:00:00.000Z",
			user: { id: 101, login: "runtime-user" },
			object: { name: "Beta Project", type: "project" },
		},
	],
	projectTeams: [
		{
			group: {
				captainLogin: "runtime-user",
				object: { id: 1, name: "Alpha Project" },
				members: [
					{
						user: {
							login: "runtime-user",
							firstName: "Runtime",
							lastName: "Tester",
						},
					},
					{
						user: {
							login: "peer-user",
							firstName: "Peer",
							lastName: "One",
						},
					},
				],
			},
		},
	],
	objectById: [{ id: 1, name: "Alpha Project", type: "project" }],
	collabs: {
		group_user: [
			{
				createdAt: "2026-01-25T10:00:00.000Z",
				group: {
					captainLogin: "runtime-user",
					object: { name: "Alpha Project" },
					members: [
						{
							userId: 101,
							user: {
								login: "runtime-user",
								firstName: "Runtime",
								lastName: "Tester",
								campus: "Athens",
							},
						},
						{
							userId: 999,
							user: {
								login: "peer-user",
								firstName: "Peer",
								lastName: "One",
								campus: "Athens",
							},
						},
					],
				},
			},
		],
		audit: [],
		audit_received: [],
	},
};

const installMockAuthAndGraphql = async (page) => {
	const jwt = buildMockJwt();

	await page.route("**/api/auth/signin", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(jwt),
		});
	});

	await page.route("**/api/graphql-engine/v1/graphql", async (route) => {
		const requestBody = route.request().postDataJSON();
		const query = requestBody?.query ?? "";

		if (
			query.includes("GetProjectTeams") ||
			(query.includes("group_user(") && query.includes("projectObjectIds"))
		) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					data: { group_user: mockGraphqlData.projectTeams },
				}),
			});
			return;
		}

		if (query.trim().startsWith("{") && query.includes("user {")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { user: mockGraphqlData.user } }),
			});
			return;
		}

		if (query.includes("GetXPTransactions")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					data: { transaction: mockGraphqlData.xpTransactions },
				}),
			});
			return;
		}

		if (query.includes("GetProgress")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { progress: mockGraphqlData.progress } }),
			});
			return;
		}

		if (query.includes("GetSkills")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { transaction: mockGraphqlData.skills } }),
			});
			return;
		}

		if (query.includes("GetLevel")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { transaction: mockGraphqlData.level } }),
			});
			return;
		}

		if (query.includes("GetResults")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { result: mockGraphqlData.results } }),
			});
			return;
		}

		if (query.includes("GetObject")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { object: mockGraphqlData.objectById } }),
			});
			return;
		}

		if (query.includes("GetCollabs")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: mockGraphqlData.collabs }),
			});
			return;
		}

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ data: {} }),
		});
	});
};

const loginWithMockBackend = async (page) => {
	await installMockAuthAndGraphql(page);
	await page.goto("/");

	await page.fill("#identifier", "runtime-user");
	await page.fill("#password", "safe-password");
	await page.click("#login-btn");

	await expect(page.locator("#profile-view")).toHaveClass(/active/);
	await expect(page.locator("#dashboard")).toHaveClass(/active/);
};

test("login form enforces required fields at DOM/runtime level", async ({
	page,
}) => {
	await page.goto("/");

	await expect(page.locator("#identifier")).toHaveAttribute("required", "");
	await expect(page.locator("#password")).toHaveAttribute("required", "");

	const formValidityBefore = await page.$eval("#login-form", (form) =>
		form.checkValidity(),
	);
	expect(formValidityBefore).toBe(false);
	const identifierValidityMessage = await page.$eval(
		"#identifier",
		(input) => input.validationMessage,
	);
	expect(identifierValidityMessage.length > 0).toBe(true);

	await page.click("#login-btn");
	await expect(page.locator("#login-view")).toHaveClass(/active/);
	await expect(page.locator("#profile-view")).not.toHaveClass(/active/);
});

test("logout returns to login and clears credential inputs", async ({
	page,
}) => {
	await loginWithMockBackend(page);

	await expect(page.locator("#logout-btn")).toBeVisible();
	await page.click("#logout-btn");

	await expect(page.locator("#login-view")).toHaveClass(/active/);
	await expect(page.locator("#profile-view")).not.toHaveClass(/active/);
	await expect(page.locator("#identifier")).toHaveValue("");
	await expect(page.locator("#password")).toHaveValue("");
});

test("collaborations tab can be reopened after logout and relogin", async ({
	page,
}) => {
	await loginWithMockBackend(page);

	await page.click("#tab-collaborations");
	await expect(page.locator("#collabs-table-wrap")).toBeVisible();
	await expect(page.locator("#collabs-tbody tr").first()).toBeVisible();

	await page.click("#logout-btn");
	await expect(page.locator("#login-view")).toHaveClass(/active/);

	await page.fill("#identifier", "runtime-user");
	await page.fill("#password", "safe-password");
	await page.click("#login-btn");
	await expect(page.locator("#profile-view")).toHaveClass(/active/);

	await page.click("#tab-collaborations");
	await expect(page.locator("#collabs-table-wrap")).toBeVisible();
	await expect(page.locator("#collabs-tbody tr").first()).toBeVisible();
});

test("XP by Project interaction opens project detail modal", async ({
	page,
}) => {
	await loginWithMockBackend(page);

	await expect(page.locator("#project-bar-chart svg")).toBeVisible();

	await page.click('[aria-label="View details for Alpha Project"]');
	await expect(page.locator("#project-detail-overlay")).toHaveClass(/active/);
	await expect(page.locator("#pd-title")).toContainText("Alpha Project");
	await expect(page.locator("#project-detail-content")).toContainText(
		"Runtime Tester",
	);
	await expect(page.locator("#project-detail-content")).toContainText("Peer One");
	await expect(page.locator("#project-detail-content")).toContainText("Captain");

	await page.click("#project-detail-close");
	await expect(page.locator("#project-detail-overlay")).not.toHaveClass(
		/active/,
	);
});

test("main nav switches between dashboard and collaborations tab", async ({
	page,
}) => {
	await loginWithMockBackend(page);

	await page.click("#tab-collaborations");
	await expect(page.locator("#tab-collaborations")).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.locator("#collaborations-view")).toHaveClass(/active/);
	await expect(page.locator("#dashboard")).not.toHaveClass(/active/);

	await expect(page.locator("#collabs-table-wrap")).toBeVisible();
	await expect(page.locator("#collabs-tbody tr").first()).toBeVisible();

	await page.click("#tab-dashboard");
	await expect(page.locator("#tab-dashboard")).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.locator("#dashboard")).toHaveClass(/active/);
});
