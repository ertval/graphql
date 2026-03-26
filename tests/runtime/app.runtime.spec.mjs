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

const mergeMockData = (base, overrides = {}) => {
	const merged = {
		...base,
		...overrides,
		collabs: {
			...base.collabs,
			...(overrides.collabs ?? {}),
		},
	};

	if (overrides.projectTeams) {
		merged.projectTeams = overrides.projectTeams;
	}

	return merged;
};

const installMockAuthAndGraphql = async (page, overrides = {}) => {
	const jwt = buildMockJwt();
	const scenarioData = mergeMockData(mockGraphqlData, overrides);

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
			const requestedProjectIds = new Set(
				(requestBody?.variables?.projectObjectIds ?? []).filter((id) =>
					typeof id === "number",
				),
			);
			const matchingProjectTeams = scenarioData.projectTeams.filter((entry) => {
				const objectId = entry.group?.object?.id;
				return (
					typeof objectId === "number" && requestedProjectIds.has(objectId)
				);
			});

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					data: { group_user: matchingProjectTeams },
				}),
			});
			return;
		}

		if (query.trim().startsWith("{") && query.includes("user {")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { user: scenarioData.user } }),
			});
			return;
		}

		if (query.includes("GetXPTransactions")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					data: { transaction: scenarioData.xpTransactions },
				}),
			});
			return;
		}

		if (query.includes("GetProgress")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { progress: scenarioData.progress } }),
			});
			return;
		}

		if (query.includes("GetSkills")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { transaction: scenarioData.skills } }),
			});
			return;
		}

		if (query.includes("GetLevel")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { transaction: scenarioData.level } }),
			});
			return;
		}

		if (query.includes("GetResults")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { result: scenarioData.results } }),
			});
			return;
		}

		if (query.includes("GetObject")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: { object: scenarioData.objectById } }),
			});
			return;
		}

		if (query.includes("GetCollabs")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: scenarioData.collabs }),
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

const loginWithMockBackend = async (page, overrides = {}) => {
	await installMockAuthAndGraphql(page, overrides);
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

test("dashboard popup resolves role and members for projects missing from recent results", async ({
	page,
}) => {
	const scenarioOverrides = {
		xpTransactions: [
			...mockGraphqlData.xpTransactions,
			{
				id: 3,
				amount: 91000,
				createdAt: "2026-01-23T10:00:00.000Z",
				path: "/zone/project-gamma",
				object: { id: 3, name: "Gamma Project", type: "project" },
			},
		],
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
		],
		projectTeams: [
			...mockGraphqlData.projectTeams,
			{
				group: {
					captainLogin: "runtime-user",
					object: { id: 3, name: "Gamma Project" },
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
								login: "gamma-partner",
								firstName: "Gamma",
								lastName: "Partner",
							},
						},
					],
				},
			},
		],
	};

	await loginWithMockBackend(page, scenarioOverrides);
	await expect(page.locator("#project-bar-chart svg")).toBeVisible();

	await page.click('[aria-label="View details for Gamma Project"]');
	await expect(page.locator("#project-detail-overlay")).toHaveClass(/active/);
	await expect(page.locator("#project-detail-content")).toContainText("Gamma Partner");
	await expect(page.locator("#project-detail-content")).toContainText("Captain");
	await page
		.locator("#project-detail-content")
		.screenshot({ path: "test-results/visual/dashboard-gamma-popup.png" });
});

test("collaboration project panel does not retain oversized height after project switch", async ({
	page,
}) => {
	const scenarioOverrides = {
		collabs: {
			group_user: [
				{
					createdAt: "2026-01-25T10:00:00.000Z",
					group: {
						captainLogin: "runtime-user",
						object: { name: "Mega Project" },
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
							{
								userId: 111,
								user: {
									login: "peer-two",
									firstName: "Peer",
									lastName: "Two",
									campus: "Athens",
								},
							},
						],
					},
				},
				{
					createdAt: "2026-01-26T10:00:00.000Z",
					group: {
						captainLogin: "runtime-user",
						object: { name: "Tiny Project" },
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

	await loginWithMockBackend(page, scenarioOverrides);
	await page.click("#tab-collaborations");
	await expect(page.locator("#collabs-tbody tr").first()).toBeVisible();

	await page.click('[aria-label="Open collaborator details for Peer One"]');
	await expect(page.locator("#student-profile-overlay")).toHaveClass(/active/);

	const [firstOpenSamples] = await Promise.all([
		page.evaluate(async () => {
			const modal = document.querySelector(".student-profile-modal");
			if (!modal) return [];

			const samples = [];
			const start = performance.now();
			while (performance.now() - start <= 950) {
				samples.push({
					t: performance.now() - start,
					h: Math.round(modal.getBoundingClientRect().height),
				});
				await new Promise((resolve) => requestAnimationFrame(resolve));
			}

			return samples;
		}),
		page.click('[aria-label="View details for Mega Project"]'),
	]);

	await expect(page.locator(".sp-project-panel")).toHaveClass(/active/);

	expect(firstOpenSamples.length > 3).toBe(true);
	const firstOpenEarly = firstOpenSamples.filter((sample) => sample.t <= 350);
	const firstOpenLate = firstOpenSamples.filter((sample) => sample.t >= 650);
	const firstOpenPeak = Math.max(...firstOpenEarly.map((sample) => sample.h));
	const firstOpenSettled = Math.min(...firstOpenLate.map((sample) => sample.h));

	// Prevent first-open overshoot where modal gets taller then immediately shrinks.
	expect(firstOpenPeak - firstOpenSettled).toBeLessThanOrEqual(20);

	await page.waitForTimeout(250);

	const [heightSamples] = await Promise.all([
		page.evaluate(async () => {
			const modal = document.querySelector(".student-profile-modal");
			if (!modal) return [];

			const samples = [];
			const start = performance.now();
			while (performance.now() - start <= 950) {
				samples.push({
					t: performance.now() - start,
					h: Math.round(modal.getBoundingClientRect().height),
				});
				await new Promise((resolve) => requestAnimationFrame(resolve));
			}

			return samples;
		}),
		page.click('[aria-label="View details for Tiny Project"]'),
	]);

	expect(heightSamples.length > 3).toBe(true);
	const earlyHeights = heightSamples.filter((sample) => sample.t <= 350);
	const lateHeights = heightSamples.filter((sample) => sample.t >= 650);
	const earlyMin = Math.min(...earlyHeights.map((sample) => sample.h));
	const lateMin = Math.min(...lateHeights.map((sample) => sample.h));

	// Prevent late-stage height collapse that appears as a jagged pop animation.
	expect(earlyMin - lateMin).toBeLessThanOrEqual(20);
	await page
		.locator(".student-profile-modal")
		.screenshot({ path: "test-results/visual/collaborations-project-panel.png" });
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
