/**
 * Main Application Orchestrator.
 * Wires up feature slices and initializes the application.
 * @module app
 */

import { initAuth } from "./features/auth/auth.ui.view.js";
import { initCollaborations } from "./features/collaborations/collaborations.ui.view.js";
import { initDashboard } from "./features/dashboard/dashboard.ui.view.js";
import { initTheme } from "./features/shell/shell.theme.js";
import { initShell } from "./features/shell/shell.ui.view.js";
import { clearToken, getToken, isAuthenticated } from "./infra/auth.js";
import { configureGraphqlAuth } from "./infra/graphql.js";

configureGraphqlAuth({
	getToken,
	clearToken,
});

const init = async () => {
	// 1. Initialize UI components (setup listeners)
	initShell();
	initAuth();
	initDashboard();
	initCollaborations();
	await initTheme();

	// 2. Initial Route Check
	if (isAuthenticated()) {
		// Trigger initial authenticated flow via feature exports
		document.dispatchEvent(new CustomEvent("auth:login"));
	} else {
		// Trigger initial guest flow
		document.dispatchEvent(new CustomEvent("auth:logout"));
	}
};

void init();
