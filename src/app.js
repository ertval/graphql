/**
 * Main Application Orchestrator.
 * Handles top-level routing (login/profile) and tab switching.
 * @module app
 */

import {
	initCollaborationsView,
	resetCollabsState,
} from "./collaborations.view.js";
import {
	initDashboard,
	loadDashboard,
	resetDashboard,
} from "./dashboard.view.js";
import {
	AUTH_SYNC_KEY,
	clearToken,
	decodeToken,
	getToken,
	isAuthenticated,
	login,
	saveToken,
} from "./infra.auth.js";
import { configureGraphqlAuth } from "./infra.graphql.js";

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

// ── Tab Routing ────────────────────────────────────────────────────
const tabDashboard = $("#tab-dashboard");
const tabCollabs = $("#tab-collaborations");
const dashboardPanel = $("#dashboard");
const collabsPanel = $("#collaborations-view");
let activeUserId = null;
let collabsViewStatus = "idle";
let collabsViewLoadGeneration = 0;
const authChannel =
	"BroadcastChannel" in globalThis
		? new BroadcastChannel("graphql_auth_channel")
		: null;

const toPublicErrorMessage = (error, scope) => {
	const message =
		typeof error?.message === "string" ? error.message.toLowerCase() : "";
	if (message.includes("invalid")) return "Invalid username/email or password.";
	if (message.includes("timed out"))
		return "Request timed out. Please try again.";
	if (message.includes("session") || message.includes("authenticate")) {
		return "Session expired. Please sign in again.";
	}
	return scope === "auth"
		? "Sign-in failed. Please try again."
		: "Unable to load data right now.";
};

configureGraphqlAuth({
	getToken,
	clearToken,
});

const ensureCollaborationsView = async () => {
	if (collabsViewStatus !== "idle") return;

	const decoded = decodeToken();
	const userId =
		typeof activeUserId === "number" && Number.isInteger(activeUserId)
			? activeUserId
			: Number(decoded?.sub);
	if (!Number.isInteger(userId) || userId <= 0) return;

	collabsViewStatus = "loading";
	const loadGeneration = ++collabsViewLoadGeneration;
	const result = await initCollaborationsView(userId);
	if (loadGeneration !== collabsViewLoadGeneration) return;
	collabsViewStatus = result?.ok ? "ready" : "idle";
};

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
	void ensureCollaborationsView();
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
const performLogout = (broadcast = true) => {
	clearToken();
	collabsViewStatus = "idle";
	collabsViewLoadGeneration += 1;
	resetDashboard();
	resetCollabsState();
	activeUserId = null;
	showLogin();
	history.replaceState(null, "", location.pathname);
	if (broadcast) {
		authChannel?.postMessage({ type: "logout" });
		try {
			localStorage.setItem(
				AUTH_SYNC_KEY,
				String(Temporal.Now.instant().epochMilliseconds),
			);
			localStorage.removeItem(AUTH_SYNC_KEY);
		} catch {
			// Ignore storage sync fallback failures.
		}
	}
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
			if (loginError) {
				loginError.textContent = toPublicErrorMessage(
					loginResult.error,
					"auth",
				);
			}
			return;
		}

		const persistResult = saveToken(loginResult.data);
		if (!persistResult.ok) {
			if (loginError) {
				loginError.textContent = toPublicErrorMessage(
					persistResult.error,
					"auth",
				);
			}
			return;
		}

		showProfile();
		const dashboardResult = await loadDashboard(performLogout, isAuthenticated);
		if (dashboardResult?.ok) {
			activeUserId = dashboardResult.data.userId;
		}
	} catch (err) {
		if (loginError) {
			loginError.textContent = toPublicErrorMessage(err, "auth");
		}
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
	if (event.key === AUTH_SYNC_KEY) {
		performLogout(false);
	}
});

authChannel?.addEventListener("message", (event) => {
	if (event.data?.type === "logout") {
		performLogout(false);
	}
});

// ── App Initialization ─────────────────────────────────────────────
const init = async () => {
	initDashboard();
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
