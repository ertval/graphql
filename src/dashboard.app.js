/**
 * Main Application Controller
 * Orchestrates login, data fetching, and UI rendering.
 * Entry point: loaded by index.html via <script type="module">.
 * @module app
 */

import { initCollaborationsView } from "./collaborations.init.js";
import { resetCollabsState } from "./collaborations.view.js";
import {
	initProjectDetailClose,
	renderActivity,
} from "./dashboard.activity.js";
import { computeXpSummary, formatXP } from "./dashboard.metrics.js";
import {
	clearToken,
	isAuthenticated,
	login,
	saveToken,
} from "./graphql.auth.js";
import {
	fetchObjectById,
	fetchProgress,
	fetchResults,
	fetchSkills,
	fetchUserInfo,
	fetchUserLevel,
	fetchXPTransactions,
} from "./graphql.queries.js";
import { unwrapResult } from "./graphql.result.js";
import { renderProjectBarChart } from "./graphs.bar.js";
import { renderAuditDonutChart } from "./graphs.donut.js";
import { renderXPLineChart } from "./graphs.line.js";
import { renderPassFailPieChart } from "./graphs.pie.js";

// ── DOM References ─────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);

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

// ── Module-level state (needed for project detail cross-reference) ─
/** @type {Array<{amount:number, createdAt:string, path:string, object:{name:string,type:string}}>} */
let _xpTransactions = [];

/** @type {Array<{grade:number, createdAt:string, object:{name:string,type:string}}>} */
let _results = [];

/** @type {number|null} */
let _userId = null;

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
	// Lazy-load collaborations on first tab open
	if (!collabsPanel?.dataset.loaded) {
		collabsPanel.dataset.loaded = "1";
		if (_userId) initCollaborationsView(_userId);
	}
});

// ── View Routing (Login ↔ Profile) ─────────────────────────────────

const showProfile = () => {
	loginView.classList.remove("active");
	profileView.classList.add("active");
};

const showLogin = () => {
	profileView.classList.remove("active");
	loginView.classList.add("active");
	loginForm?.reset();
	if (identifierInput) identifierInput.value = "";
	if (passwordInput) passwordInput.value = "";
	loginError.textContent = "";
	switchTab("dashboard");
};

/** Checks if an error indicates the session is no longer valid. */
/** @param {unknown} err */
const isAuthFailureError = (err) => {
	const message = err instanceof Error ? err.message.toLowerCase() : "";
	return (
		message.includes("session expired") ||
		message.includes("not authenticated") ||
		message.includes("unauthorized") ||
		message.includes("forbidden") ||
		message.includes("graphql error: jwt") ||
		message.includes("graphql error: token")
	);
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
	loginError.textContent = "";

	const identifier = $("#identifier").value.trim();
	const password = $("#password").value;

	if (!identifier || !password) {
		loginError.textContent = "Please fill in all fields.";
		return;
	}

	loginBtn.disabled = true;
	btnText.hidden = true;
	btnLoader.hidden = false;

	try {
		const loginResult = await login(identifier, password);
		if (!loginResult.ok) {
			loginError.textContent = loginResult.error.message;
			return;
		}

		const token = loginResult.data;
		saveToken(token);
		showProfile();
		await loadDashboard();
	} catch (err) {
		loginError.textContent = err.message;
	} finally {
		loginBtn.disabled = false;
		btnText.hidden = false;
		btnLoader.hidden = true;
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

// ── Dashboard Data Loading ─────────────────────────────────────────

/** Clears all dashboard UI elements back to empty state. */
const resetDashboard = () => {
	$("#avatar-initials").textContent = "";
	$("#user-fullname").textContent = "";
	$("#user-login").textContent = "";
	$("#user-email").textContent = "";
	$("#user-campus").textContent = "";
	$("#total-xp").textContent = "—";
	$("#user-level").textContent = "—";
	$("#completed-projects").textContent = "—";
	$("#audit-ratio").textContent = "—";
	$("#audit-done-value").textContent = "";
	$("#audit-received-value").textContent = "";
	$("#audit-done-bar").style.width = "0";
	$("#audit-received-bar").style.width = "0";
	$("#xp-line-chart").innerHTML = "";
	$("#project-bar-chart").innerHTML = "";
	$("#audit-donut-chart").innerHTML = "";
	$("#passfail-pie-chart").innerHTML = "";
	$("#skills-list").innerHTML = "";
	$("#activity-list").innerHTML = "";
	$("#nav-username").textContent = "";
	_xpTransactions = [];
	_results = [];
	_userId = null;
};

/** Fetches all dashboard data and renders every section. */
const loadDashboard = async () => {
	try {
		const user = unwrapResult(await fetchUserInfo());
		if (!user) throw new Error("Could not load user data.");

		renderUserSection(user);

		// Fetch all data in parallel for performance
		const [xpResult, progressResult, skillsResult, levelResult, resultsResult] =
			await Promise.all([
				fetchXPTransactions(user.id),
				fetchProgress(user.id),
				fetchSkills(user.id),
				fetchUserLevel(user.id),
				fetchResults(user.id),
			]);

		const xpTransactions = unwrapResult(xpResult);
		const progress = unwrapResult(progressResult);
		const skills = unwrapResult(skillsResult);
		const level = unwrapResult(levelResult);
		const results = unwrapResult(resultsResult);

		// Store for project detail cross-referencing
		_xpTransactions = xpTransactions;
		_results = results;
		_userId = user.id;

		renderXPSection(xpTransactions, level, progress);
		renderAuditSection(user);
		renderGraphs(xpTransactions, user, progress);
		renderSkills(skills);
		renderActivity(results, xpTransactions);

		// Prefetch first object detail for caching
		if (xpTransactions.length > 0) {
			const objDetail = unwrapResult(
				await fetchObjectById(xpTransactions[0].id),
			);
			void objDetail;
		}
	} catch (err) {
		if (isAuthFailureError(err) || !isAuthenticated()) {
			performLogout();
		}
	}
};

// ── Section Renderers ──────────────────────────────────────────────

/** Populates the user profile card with identity information. */
/** @param {object} user */
const renderUserSection = (user) => {
	const initials =
		`${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}` ||
		user.login?.[0]?.toUpperCase() ||
		"?";

	$("#avatar-initials").textContent = initials;
	$("#user-fullname").textContent =
		[user.firstName, user.lastName].filter(Boolean).join(" ") || user.login;
	$("#user-login").textContent = `@${user.login}`;
	$("#user-email").textContent = user.email || "";
	$("#user-campus").textContent = user.campus ? `📍 ${user.campus}` : "";
	$("#nav-username").textContent = `@${user.login}`;
};

/** Populates XP stats card with level, projects done, and total XP. */
/**
 * @param {Array} transactions
 * @param {number} level
 * @param {Array} progress
 */
const renderXPSection = (transactions, level, progress) => {
	const { completedProjects, totalXP } = computeXpSummary(
		transactions,
		progress,
	);

	$("#total-xp").textContent = formatXP(totalXP);
	$("#user-level").textContent = String(level);
	$("#completed-projects").textContent = String(completedProjects);
};

/** Populates the audit ratio card with bar widths and values. */
/** @param {object} user */
const renderAuditSection = (user) => {
	const ratio = user.auditRatio ?? 0;
	const totalUp = user.totalUp ?? 0;
	const totalDown = user.totalDown ?? 0;
	const maxAudit = Math.max(totalUp, totalDown, 1);

	$("#audit-ratio").textContent = ratio.toFixed(1);
	$("#audit-done-value").textContent = formatXP(totalUp);
	$("#audit-received-value").textContent = formatXP(totalDown);

	// Animate bar widths on next frame
	requestAnimationFrame(() => {
		$("#audit-done-bar").style.width = `${(totalUp / maxAudit) * 100}%`;
		$("#audit-received-bar").style.width = `${(totalDown / maxAudit) * 100}%`;
	});
};

/** Delegates chart rendering to individual graph modules. */
/**
 * @param {Array} transactions
 * @param {object} user
 * @param {Array} progress
 */
const renderGraphs = (transactions, user, progress) => {
	renderXPLineChart($("#xp-line-chart"), transactions);
	renderProjectBarChart($("#project-bar-chart"), transactions);
	renderAuditDonutChart(
		$("#audit-donut-chart"),
		user.totalUp ?? 0,
		user.totalDown ?? 0,
	);
	renderPassFailPieChart($("#passfail-pie-chart"), progress);
};

/** Renders the top-N skills as animated bar items. */
/** @param {Array} skills */
const renderSkills = (skills) => {
	const list = $("#skills-list");
	list.innerHTML = "";

	if (!skills.length) {
		const empty = document.createElement("p");
		empty.style.color = "var(--text-muted)";
		empty.style.fontSize = "0.875rem";
		empty.textContent = "No skill data available.";
		list.append(empty);
		return;
	}

	// Deduplicate skills and keep highest amount per type
	const skillMap = new Map();
	for (const s of skills) {
		const name = s.type.replace("skill_", "");
		const existing = skillMap.get(name);
		if (!existing || s.amount > existing) skillMap.set(name, s.amount);
	}

	const topSkills = [...skillMap.entries()]
		.toSorted(([, a], [, b]) => b - a)
		.slice(0, 8);
	const maxAmount = Math.max(...topSkills.map(([, v]) => v));

	for (const [name, amount] of topSkills) {
		const item = document.createElement("div");
		item.className = "skill-item";

		const skillName = document.createElement("span");
		skillName.className = "skill-name";
		skillName.textContent = name;

		const skillTrack = document.createElement("div");
		skillTrack.className = "skill-bar-track";

		const skillFill = document.createElement("div");
		skillFill.className = "skill-bar-fill";
		skillFill.style.width = "0%";
		skillTrack.append(skillFill);

		const skillValue = document.createElement("span");
		skillValue.className = "skill-value";
		skillValue.textContent = `${amount}%`;

		item.append(skillName, skillTrack, skillValue);
		list.append(item);

		// Animate fill width on next frame
		requestAnimationFrame(() => {
			skillFill.style.width = `${(amount / maxAmount) * 100}%`;
		});
	}
};

// ── App Initialization ─────────────────────────────────────────────

const init = () => {
	initProjectDetailClose(
		() => _xpTransactions,
		() => _results,
	);

	if (isAuthenticated()) {
		showProfile();
		loadDashboard();
	} else {
		clearToken();
		showLogin();
	}
};

init();
