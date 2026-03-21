/**
 * Main Application Orchestrator.
 * Handles top-level routing (login/profile) and tab switching.
 * @module app
 */

import { initCollaborationsView } from "./collaborations.api.js";
import { resetCollabsState } from "./collaborations.view.js";
import {
	initDashboard,
	loadDashboard,
	resetDashboard,
} from "./dashboard.view.js";
import { clearToken, isAuthenticated, login, saveToken } from "./infra.auth.js";

const $ = (sel) => document.querySelector(sel);

// ── DOM References ─────────────────────────────────────────────────
const loginView = $("#login-view");
const profileView = $("#profile-view");

const loginForm = $("#login-form");
const loginError = $("#login-error");
const loginBtn = $("#login-btn");
const btnText = loginBtn?.querySelector(".btn-text");
const btnLoader = loginBtn?.querySelector(".btn-loader");
const logoutBtn = $("#logout-btn");
const identifierInput = $("#identifier");
const passwordInput = $("#password");
const TOKEN_STORAGE_KEY = "graphql_jwt";

// ── Tab Routing ────────────────────────────────────────────────────
const tabDashboard = $("#tab-dashboard");
const tabCollabs = $("#tab-collaborations");
const dashboardPanel = $("#dashboard");
const collabsPanel = $("#collaborations-view");

/** @param {'dashboard'|'collabs'} tab */
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
};

tabDashboard?.addEventListener("click", () => switchTab("dashboard"));
tabCollabs?.addEventListener("click", () => {
	switchTab("collabs");
	if (!collabsPanel?.dataset.loaded) {
		collabsPanel.dataset.loaded = "1";
		// The `loadDashboard` payload saved the user ID in the DOM or state.
		// For simplicity, we decode the JWT token to get the user ID for collaborations.
		const token = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
		if (token) {
			try {
				const payloadBase64 = token.split(".")[1];
				const decoded = JSON.parse(atob(payloadBase64));
				if (decoded.sub) initCollaborationsView(Number(decoded.sub));
			} catch (_) {}
		}
	}
});

// ── View Routing (Login ↔ Profile) ─────────────────────────────────
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

/** Full logout flow — clears state and returns to login. */
const performLogout = () => {
	clearToken();
	resetDashboard();
	resetCollabsState();
	showLogin();
	history.replaceState(null, "", location.pathname);
};

// ── Login Handler ──────────────────────────────────────────────────
loginForm?.addEventListener("submit", async (e) => {
	e.preventDefault();
	if (loginError) loginError.textContent = "";

	const identifier = identifierInput?.value.trim();
	const password = passwordInput?.value;

	if (!identifier || !password) {
		if (loginError) loginError.textContent = "Please fill in all fields.";
		return;
	}

	if (loginBtn) loginBtn.disabled = true;
	if (btnText) btnText.hidden = true;
	if (btnLoader) btnLoader.hidden = false;

	try {
		const loginResult = await login(identifier, password);
		if (!loginResult.ok) {
			if (loginError) loginError.textContent = loginResult.error.message;
			return;
		}

		saveToken(loginResult.data);
		showProfile();
		await loadDashboard(performLogout);
	} catch (err) {
		if (loginError) loginError.textContent = err.message;
	} finally {
		if (loginBtn) loginBtn.disabled = false;
		if (btnText) btnText.hidden = false;
		if (btnLoader) btnLoader.hidden = true;
	}
});

// ── Logout Handler ─────────────────────────────────────────────────
logoutBtn?.addEventListener("click", () => {
	performLogout();
});

// Re-check auth on browser back/forward navigation
globalThis.addEventListener("popstate", () => {
	if (!isAuthenticated()) showLogin();
});

// Synchronise logout across browser tabs via storage event
globalThis.addEventListener("storage", (event) => {
	if (event.key === TOKEN_STORAGE_KEY && event.newValue === null) {
		performLogout();
	}
});

// ── App Initialization ─────────────────────────────────────────────
const init = async () => {
	initDashboard();
	if (isAuthenticated()) {
		showProfile();
		await loadDashboard(performLogout);
	} else {
		clearToken();
		showLogin();
	}
};

init();
