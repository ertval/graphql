import { defineConfig } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
	testDir: "./tests",
	testMatch: ["**/*.e2e.mjs"],
	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},
	fullyParallel: true,
	retries: 0,
	reporter: "list",
	use: {
		baseURL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	webServer: {
		command: "npx serve . -l 3000 --no-clipboard",
		url: baseURL,
		reuseExistingServer: true,
		timeout: 10_000,
	},
});
