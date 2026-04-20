/**
 * Shell UI View — High-level routing and tab switching.
 * @module features/shell/view
 */

import { clearToken, isAuthenticated } from "../../infra/auth.js";
import { $ } from "../../infra/ui.js";

export const initShell = () => {
	const loginView = $("#login-view");
	const profileView = $("#profile-view");
	const tabDashboard = $("#tab-dashboard");
	const tabCollabs = $("#tab-collaborations");
	const dashboardPanel = $("#dashboard");
	const collabsPanel = $("#collaborations-view");

	// References needed for reset
	const loginForm = $("#login-form");
	const identifierInput = $("#identifier");
	const passwordInput = $("#password");
	const loginError = $("#login-error");

	const switchTab = (tab) => {
		tabDashboard?.classList.toggle("active", tab === "dashboard");
		tabCollabs?.classList.toggle("active", tab === "collabs");
		tabDashboard?.setAttribute("aria-selected", String(tab === "dashboard"));
		tabCollabs?.setAttribute("aria-selected", String(tab === "collabs"));

		if (tab === "dashboard") {
			dashboardPanel?.classList.add("active");
			collabsPanel?.classList.remove("active");
		} else {
			dashboardPanel?.classList.remove("active");
			collabsPanel?.classList.add("active");
		}

		document.dispatchEvent(new CustomEvent("shell:tab", { detail: { tab } }));
	};

	tabDashboard?.addEventListener("click", () => switchTab("dashboard"));
	tabCollabs?.addEventListener("click", () => switchTab("collabs"));

	const showProfile = () => {
		loginView?.classList.remove("active");
		profileView?.classList.add("active");
	};

	const showLogin = () => {
		profileView?.classList.remove("active");
		loginView?.classList.add("active");
		loginForm?.reset();
		if (identifierInput) identifierInput.value = "";
		if (passwordInput) passwordInput.value = "";
		if (loginError) loginError.textContent = "";
		switchTab("dashboard");
	};

	document.addEventListener("auth:login", showProfile);
	document.addEventListener("auth:logout", showLogin);

	globalThis.addEventListener("popstate", () => {
		if (!isAuthenticated()) {
			clearToken();
			document.dispatchEvent(new CustomEvent("auth:logout"));
		}
	});
};
