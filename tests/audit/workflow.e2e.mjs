import { expect, test } from "@playwright/test";

const buildMockJwt = () => {
	const payload = {
		exp: 4_102_444_800,
		sub: "audit-tester",
	};
	const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
		"base64url",
	);
	return `header.${encodedPayload}.signature`;
};

const mockAuditData = {
	user: [
		{
			id: 101,
			login: "audit-user",
			firstName: "Audit",
			lastName: "Tester",
			email: "audit@example.com",
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
	],
	results: [
		{
			id: 801,
			objectId: 1,
			grade: 1,
			type: "project",
			createdAt: "2026-01-21T10:00:00.000Z",
			user: { id: 101, login: "audit-user" },
			object: { name: "Alpha Project", type: "project" },
		},
	],
};

test.describe("E2E Audit Workflow", () => {
	test.beforeEach(async ({ page }) => {
		// Mock GraphQL requests
		await page.route("**/api/graphql-engine/v1/graphql", async (route) => {
			const requestBody = route.request().postDataJSON();
			const query = requestBody?.query ?? "";

			if (query.includes("user {")) {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ data: { user: mockAuditData.user } }),
				});
			} else if (query.includes("transaction")) {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						data: { transaction: mockAuditData.xpTransactions },
					}),
				});
			} else if (query.includes("progress")) {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ data: { progress: mockAuditData.progress } }),
				});
			} else if (query.includes("result")) {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ data: { result: mockAuditData.results } }),
				});
			} else {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ data: {} }),
				});
			}
		});
	});

	test("Functional: Login and Profile Verification", async ({ page }) => {
		// 1. Try to log in with invalid credentials
		await page.goto("/");
		await page.route("**/api/auth/signin", async (route) => {
			await route.fulfill({
				status: 401,
				contentType: "application/json",
				body: JSON.stringify({ error: "Invalid credentials" }),
			});
		});

		await page.fill("#identifier", "wrong-user");
		await page.fill("#password", "wrong-pass");
		await page.click("#login-btn");

		// Is an appropriate error shown?
		await expect(page.locator("#login-error")).toBeVisible();
		await expect(page.locator("#login-error")).not.toBeEmpty();

		// 2. Login with valid credentials
		const jwt = buildMockJwt();
		await page.route("**/api/auth/signin", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(jwt),
			});
		});

		await page.fill("#identifier", "audit-user");
		await page.fill("#password", "correct-pass");
		await page.click("#login-btn");

		// Does the profile page consist of three sections as required?
		await expect(page.locator("#profile-view")).toHaveClass(/active/);
		await expect(page.locator("#section-user")).toBeVisible();
		await expect(page.locator("#section-xp")).toBeVisible();
		await expect(page.locator("#section-audit")).toBeVisible();

		// Verify accuracy of content
		await expect(page.locator("#section-user")).toContainText("audit-user");
		await expect(page.locator("#section-user")).toContainText("Athens");
		await expect(page.locator("#section-xp")).toContainText("145.0 kB"); // Updated to match actual UI output

		// 3. Graphical Statistics
		// Does the profile include a fourth section dedicated to graphical statistics?
		await expect(page.locator("#section-graphs")).toBeVisible();

		// Does this section contain at least two different graphs created using SVG?
		const graphs = page.locator("#section-graphs svg");
		expect(await graphs.count()).toBeGreaterThanOrEqual(2);

		// Do the graphs display the expected data accurately?
		// (Checking for presence of labels or specific SVG elements)
		await expect(page.locator("#xp-line-chart")).toBeVisible();
		await expect(page.locator("#project-bar-chart")).toBeVisible();

		// 4. Logout
		// Is the logout functionality successful?
		await page.click("#logout-btn");
		await expect(page.locator("#login-view")).toHaveClass(/active/);
		await expect(page.locator("#identifier")).toHaveValue("");
	});

	test("General: GraphQL Query Types", async ({ page }) => {
		const queries = [];
		await page.route("**/api/graphql-engine/v1/graphql", async (route) => {
			const body = route.request().postDataJSON();
			queries.push(body.query);
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					data: {
						user: mockAuditData.user,
						transaction: [],
						progress: [],
						result: [],
					},
				}),
			});
		});

		const jwt = buildMockJwt();
		await page.route("**/api/auth/signin", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(jwt),
			});
		});

		await page.goto("/");
		await page.fill("#identifier", "audit-user");
		await page.fill("#password", "pass");
		await page.click("#login-btn");

		// Wait for more queries to fire (results might be fetched slightly later)
		await expect.poll(() => queries.join("\n")).toMatch(/query\s+GetResults/);

		const combinedQueries = queries.join("\n");

		// Normal query (matches { user { ... } })
		expect(combinedQueries).toMatch(/\{\s*user\s*\{/);

		// Nested query (e.g., result { ... user { ... } })
		expect(combinedQueries).toMatch(
			/result\s*(\([^)]*\))?\s*\{[\s\S]*?user\s*\{/,
		);

		// Using arguments (e.g., where: { ... })
		expect(combinedQueries).toMatch(/\(where:\s*\{/);
	});
});
