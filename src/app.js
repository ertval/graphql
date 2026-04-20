/**
 * Main Application Orchestrator.
 * Wires up feature slices and initializes the application.
 * @module app
 */

import { initAuthUI } from "./features/auth/auth.ui.view.js";
import {
	loadCollaborationsLazy,
	resetCollabsState,
} from "./features/collaborations/collaborations.ui.view.js";
import {
	initDashboard,
	invalidateDashboardLoads,
	loadDashboard,
	resetDashboard,
} from "./features/dashboard/dashboard.ui.view.js";
import { initShellUI } from "./features/shell/shell.ui.view.js";
import {
	clearToken,
	decodeToken,
	getToken,
	isAuthenticated,
} from "./infra/auth.js";
import { configureGraphqlAuth } from "./infra/graphql.js";

configureGraphqlAuth({
	getToken,
	clearToken,
});

let activeUserId = null;

const init = async () => {
	// 1. Initialize UI Shell and routing
	const { showProfile, showLogin } = initShellUI({
		onTabSwitch: (tab) => {
			if (tab === "collabs") {
				const decoded = decodeToken();
				const userId =
					typeof activeUserId === "number" && Number.isInteger(activeUserId)
						? activeUserId
						: Number(decoded?.sub);
				void loadCollaborationsLazy(userId);
			}
		},
	});

	// 2. Initialize Auth UI interactions
	const { performLogout } = initAuthUI({
		onLoginSuccess: async () => {
			showProfile();
			const dashboardResult = await loadDashboard(
				performLogout,
				isAuthenticated,
			);
			if (dashboardResult?.ok) {
				activeUserId = dashboardResult.data.userId;
			}
		},
		onLogout: () => {
			invalidateDashboardLoads();
			resetDashboard();
			resetCollabsState();
			activeUserId = null;
			showLogin();
		},
	});

	// 3. Initialize Dashboard structural elements
	initDashboard();

	// Global navigation handlers
	globalThis.addEventListener("popstate", () => {
		if (!isAuthenticated()) {
			showLogin();
		}
	});

	// Initial route
	if (isAuthenticated()) {
		showProfile();
		const dashboardResult = await loadDashboard(performLogout, isAuthenticated);
		if (dashboardResult?.ok) {
			activeUserId = dashboardResult.data.userId;
		}
	} else {
		clearToken();
		showLogin();
	}
};

init();
