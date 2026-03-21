/**
 * Main Application Controller
 * Orchestrates login, data fetching, and UI rendering.
 * @module app
 */

import {
	clearToken,
	fetchObjectById,
	fetchProgress,
	fetchResults,
	fetchSkills,
	fetchUserInfo,
	fetchUserLevel,
	fetchXPTransactions,
	isAuthenticated,
	login,
	saveToken,
} from "../infrastructure/graphql.index.js";
import {
	initCollaborationsView,
	resetCollabsState,
} from "./collaborations.controller.js";
import {
	renderAuditDonutChart,
	renderPassFailPieChart,
	renderProjectBarChart,
	renderXPLineChart,
} from "./dashboard.graphs.render.js";
import { computeXpSummary, formatXP } from "./dashboard.metrics.js";
import { unwrapResult } from "./shared.result.unwrap.js";

/* -------------------------------------------------------------------
   DOM References
   ------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------
   Module-level state (needed for project detail cross-reference)
   ------------------------------------------------------------------- */

/** @type {Array<{amount:number, createdAt:string, path:string, object:{name:string,type:string}}>} */
let _xpTransactions = [];

/** @type {Array<{grade:number, createdAt:string, object:{name:string,type:string}}>} */
let _results = [];

/** @type {number|null} */
let _userId = null;

/* -------------------------------------------------------------------
   Tab Routing
   ------------------------------------------------------------------- */

/** @type {'dashboard'|'students'} */
let activeTab = "dashboard";

const tabDashboard = $("#tab-dashboard");
const tabCollabs = $("#tab-collaborations");
const dashboardPanel = $("#dashboard");
const collabsPanel = $("#collaborations-view");

/** @param {'dashboard'|'collabs'} tab */
const switchTab = (tab) => {
	activeTab = tab;

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
		if (_userId) initCollaborationsView(_userId);
	}
});

/* -------------------------------------------------------------------
   View Routing (Login ↔ Profile)
   ------------------------------------------------------------------- */

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

const performLogout = () => {
	clearToken();
	resetDashboard();
	resetCollabsState();
	showLogin();
	history.replaceState(null, "", location.pathname);
};

/* -------------------------------------------------------------------
   Login Handler
   ------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------
   Logout Handler
   ------------------------------------------------------------------- */

logoutBtn?.addEventListener("click", () => {
	performLogout();
});

globalThis.addEventListener("popstate", () => {
	if (!isAuthenticated()) showLogin();
});

globalThis.addEventListener("storage", (event) => {
	if (event.key === TOKEN_STORAGE_KEY && event.newValue === null) {
		performLogout();
	}
});

/* -------------------------------------------------------------------
   Dashboard Data Loading
   ------------------------------------------------------------------- */

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

const loadDashboard = async () => {
	try {
		const user = unwrapResult(await fetchUserInfo());
		if (!user) throw new Error("Could not load user data.");

		renderUserSection(user);

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

		if (xpTransactions.length > 0) {
			const objDetail = unwrapResult(await fetchObjectById(xpTransactions[0].id));
			void objDetail;
		}
	} catch (err) {
		if (isAuthFailureError(err) || !isAuthenticated()) {
			performLogout();
		}
	}
};

/* -------------------------------------------------------------------
   Section Renderers
   ------------------------------------------------------------------- */

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

/**
 * @param {Array} transactions
 * @param {number} level
 * @param {Array} progress
 */
const renderXPSection = (transactions, level, progress) => {
	const { completedProjects, totalXP } = computeXpSummary(transactions, progress);

	$("#total-xp").textContent = formatXP(totalXP);
	$("#user-level").textContent = String(level);
	$("#completed-projects").textContent = String(completedProjects);
};

/** @param {object} user */
const renderAuditSection = (user) => {
	const ratio = user.auditRatio ?? 0;
	const totalUp = user.totalUp ?? 0;
	const totalDown = user.totalDown ?? 0;
	const maxAudit = Math.max(totalUp, totalDown, 1);

	$("#audit-ratio").textContent = ratio.toFixed(1);
	$("#audit-done-value").textContent = formatXP(totalUp);
	$("#audit-received-value").textContent = formatXP(totalDown);

	requestAnimationFrame(() => {
		$("#audit-done-bar").style.width = `${(totalUp / maxAudit) * 100}%`;
		$("#audit-received-bar").style.width = `${(totalDown / maxAudit) * 100}%`;
	});
};

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
		requestAnimationFrame(() => {
			skillFill.style.width = `${(amount / maxAmount) * 100}%`;
		});
	}
};

/**
 * Renders recent project results. Each item is clickable for project detail.
 * @param {Array} results
 * @param {Array} xpTransactions
 */
const renderActivity = (results, xpTransactions) => {
	const list = $("#activity-list");
	list.innerHTML = "";

	const projectResults = results
		.filter((r) => r.object?.name && r.object?.type === "project")
		.slice(0, 30);

	const items = projectResults.length
		? projectResults
		: results.filter((r) => r.object?.name).slice(0, 30);

	if (!items.length) {
		const empty = document.createElement("p");
		empty.style.color = "var(--text-muted)";
		empty.style.fontSize = "0.875rem";
		empty.textContent = "No recent activity.";
		list.append(empty);
		return;
	}

	// Build XP lookup by object name
	const xpByName = new Map();
	for (const tx of xpTransactions) {
		const name = tx.object?.name;
		if (name) xpByName.set(name, (xpByName.get(name) ?? 0) + tx.amount);
	}

	renderActivityItems(list, items, xpByName);
};

/**
 * @param {HTMLElement} list
 * @param {Array} items
 * @param {Map<string,number>} xpByName
 */
const renderActivityItems = (list, items, xpByName) => {
	for (const result of items) {
		const passed = result.grade >= 1;
		const dateStr = (() => {
			try {
				const instant = Temporal.Instant.from(result.createdAt);
				const zdt = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
				return zdt.toLocaleString("en", {
					month: "short",
					day: "numeric",
					year: "numeric",
				});
			} catch {
				return "";
			}
		})();

		const item = document.createElement("div");
		item.className = "activity-item";
		item.setAttribute("role", "button");
		item.setAttribute("tabindex", "0");
		item.setAttribute(
			"aria-label",
			`View details for ${result.object?.name ?? "project"}`,
		);

		const activityName = document.createElement("span");
		activityName.className = "activity-name";
		activityName.textContent = result.object?.name ?? "Unknown";

		const activityMeta = document.createElement("div");
		activityMeta.className = "activity-meta";

		const badge = document.createElement("span");
		badge.className = `activity-badge ${passed ? "badge-pass" : "badge-fail"}`;
		badge.textContent = passed ? "PASS" : "FAIL";

		const activityDate = document.createElement("span");
		activityDate.className = "activity-date";
		activityDate.textContent = dateStr;

		activityMeta.append(badge, activityDate);
		item.append(activityName, activityMeta);

		const open = () => openProjectDetail(result, xpByName);
		item.addEventListener("click", open);
		item.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				open();
			}
		});

		list.append(item);
	}
};

/* -------------------------------------------------------------------
   Project Detail Overlay
   ------------------------------------------------------------------- */

/**
 * Shows the project detail modal for a given result record.
 * @param {{grade:number, createdAt:string, path?:string, objectId:number, object:{name:string,type:string}}} result
 * @param {Map<string,number>} xpByName
 */
const openProjectDetail = (result, xpByName) => {
	const overlay = $("#project-detail-overlay");
	const content = $("#project-detail-content");
	const title = $("#pd-title");
	if (!overlay || !content) return;

	const name = result.object?.name ?? "Unknown Project";
	const passed = result.grade >= 1;
	const xp = xpByName.get(name) ?? 0;
	const dateStr = (() => {
		try {
			const zdt = Temporal.Instant.from(result.createdAt).toZonedDateTimeISO(
				Temporal.Now.timeZoneId(),
			);
			return zdt.toLocaleString("en", { dateStyle: "long" });
		} catch {
			return "—";
		}
	})();

	title.textContent = name;
	content.innerHTML = "";

	const grid = document.createElement("div");
	grid.className = "project-detail-grid";

	const appendStat = (value, label) => {
		const stat = document.createElement("div");
		stat.className = "pd-stat";

		const statValue = document.createElement("span");
		statValue.className = "stat-value";
		statValue.textContent = value;

		const statLabel = document.createElement("span");
		statLabel.className = "stat-label";
		statLabel.textContent = label;

		stat.append(statValue, statLabel);
		grid.append(stat);
	};

	appendStat(passed ? "✓ PASS" : "✗ FAIL", "Result");
	appendStat(result.grade.toFixed(2), "Grade");
	appendStat(xp ? formatXP(xp) : "—", "XP Earned");
	appendStat(result.object?.type ?? "—", "Type");

	const completedLabel = document.createElement("p");
	completedLabel.className = "stat-label";
	completedLabel.style.marginBottom = "0.5rem";
	completedLabel.textContent = "Completed";

	const completedDate = document.createElement("p");
	completedDate.style.color = "var(--text-primary)";
	completedDate.style.fontSize = "0.9rem";
	completedDate.style.marginBottom = "0.75rem";
	completedDate.textContent = dateStr;

	content.append(grid, completedLabel, completedDate);

	if (result.path) {
		const pathLabel = document.createElement("p");
		pathLabel.className = "stat-label";
		pathLabel.style.marginBottom = "0.25rem";
		pathLabel.textContent = "Path";

		const pathValue = document.createElement("div");
		pathValue.className = "pd-path";
		pathValue.textContent = result.path;

		content.append(pathLabel, pathValue);
	}

	overlay.classList.add("active");
};

const initProjectDetailClose = () => {
	const overlay = $("#project-detail-overlay");
	const closeBtn = $("#project-detail-close");
	closeBtn?.addEventListener("click", () =>
		overlay?.classList.remove("active"),
	);
	overlay?.addEventListener("click", (e) => {
		if (e.target === overlay) overlay.classList.remove("active");
	});
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") overlay?.classList.remove("active");
	});

	// Connect Project Bar Chart clicks to the Project Detail Overlay
	$("#project-bar-chart")?.addEventListener("projectClick", (e) => {
		const projectName = e.detail?.name ?? e.detail;
		const matchingTxs = _xpTransactions.filter(
			(t) => t.object?.name === projectName,
		);
		const xpAmount = matchingTxs.reduce((sum, tx) => sum + tx.amount, 0);
		const latestTx = matchingTxs.toSorted((a, b) =>
			Temporal.Instant.from(b.createdAt).epochMilliseconds -
			Temporal.Instant.from(a.createdAt).epochMilliseconds,
		)[0];

		const resultRecord = _results.find((r) => r.object?.name === projectName);
		const fallbackCreatedAt = Temporal.Now.instant().toString();

		const detailResult = {
			object: { name: projectName, type: "project" },
			grade: resultRecord?.grade ?? (xpAmount > 0 ? 1 : 0),
			createdAt:
				resultRecord?.createdAt ?? latestTx?.createdAt ?? fallbackCreatedAt,
			path: latestTx?.path ?? "",
		};

		const tempXpMap = new Map([[projectName, xpAmount]]);
		openProjectDetail(detailResult, tempXpMap);
	});
};

/* -------------------------------------------------------------------
   App Initialization
   ------------------------------------------------------------------- */

const init = () => {
	initProjectDetailClose();

	if (isAuthenticated()) {
		showProfile();
		loadDashboard();
	} else {
		clearToken();
		showLogin();
	}
};

init();
