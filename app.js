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
} from "./api.js";
import { initCollaborationsView, resetCollabsState } from "./collaborations.js";
import {
	renderAuditDonutChart,
	renderPassFailPieChart,
	renderProjectBarChart,
	renderXPLineChart,
} from "./graphs.js";

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
		const token = await login(identifier, password);
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
	clearToken();
	resetDashboard();
	resetCollabsState();
	showLogin();
	history.replaceState(null, "", location.pathname);
});

globalThis.addEventListener("popstate", () => {
	if (!isAuthenticated()) showLogin();
});

/* -------------------------------------------------------------------
   Dashboard Data Loading
   ------------------------------------------------------------------- */

/**
 * Formats bytes to human-readable XP.
 * @param {number} bytes
 * @returns {string}
 */
const formatXP = (bytes) => {
	if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
	if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} kB`;
	return `${bytes} B`;
};

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
		const user = await fetchUserInfo();
		if (!user) throw new Error("Could not load user data.");

		renderUserSection(user);

		const [xpTransactions, progress, skills, level, results] =
			await Promise.all([
				fetchXPTransactions(user.id),
				fetchProgress(user.id),
				fetchSkills(user.id),
				fetchUserLevel(user.id),
				fetchResults(user.id),
			]);

		// Store for project detail cross-referencing
		_xpTransactions = xpTransactions;
		_results = results;
		_userId = user.id;

		renderXPSection(xpTransactions, level, progress);
		renderAuditSection(user);
		renderGraphs(xpTransactions, user, progress);
		renderSkills(skills);
		renderActivity(results, xpTransactions);

		// Bonus: demonstrate fetching a specific object by ID (parameterized query)
		if (xpTransactions.length > 0) {
			const objDetail = await fetchObjectById(xpTransactions[0].id);
			if (objDetail) console.log("[Bonus] fetchObjectById demo:", objDetail);
		}
	} catch (err) {
		console.error("Dashboard loading error:", err);
		if (
			err.message.includes("Session expired") ||
			err.message.includes("Not authenticated")
		) {
			clearToken();
			showLogin();
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
	const totalXP = transactions.reduce((sum, tx) => sum + tx.amount, 0);
	const completedProjects = progress.filter(
		(p) => p.grade >= 1 && p.object?.type === "project",
	).length;

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
		list.innerHTML =
			'<p style="color:var(--text-muted);font-size:0.875rem">No skill data available.</p>';
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
		item.innerHTML = `
      <span class="skill-name">${name}</span>
      <div class="skill-bar-track">
        <div class="skill-bar-fill" style="width:0%"></div>
      </div>
      <span class="skill-value">${amount}%</span>
    `;
		list.append(item);
		requestAnimationFrame(() => {
			item.querySelector(".skill-bar-fill").style.width =
				`${(amount / maxAmount) * 100}%`;
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
		.slice(0, 10);

	const items = projectResults.length
		? projectResults
		: results.filter((r) => r.object?.name).slice(0, 10);

	if (!items.length) {
		list.innerHTML =
			'<p style="color:var(--text-muted);font-size:0.875rem">No recent activity.</p>';
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

		item.innerHTML = `
      <span class="activity-name">${result.object?.name ?? "Unknown"}</span>
      <div class="activity-meta">
        <span class="activity-badge ${passed ? "badge-pass" : "badge-fail"}">${passed ? "PASS" : "FAIL"}</span>
        <span class="activity-date">${dateStr}</span>
      </div>
    `;

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

	content.innerHTML = `
    <div class="project-detail-grid">
      <div class="pd-stat">
        <span class="stat-value">${passed ? "✓ PASS" : "✗ FAIL"}</span>
        <span class="stat-label">Result</span>
      </div>
      <div class="pd-stat">
        <span class="stat-value">${result.grade.toFixed(2)}</span>
        <span class="stat-label">Grade</span>
      </div>
      <div class="pd-stat">
        <span class="stat-value">${xp ? formatXP(xp) : "—"}</span>
        <span class="stat-label">XP Earned</span>
      </div>
      <div class="pd-stat">
        <span class="stat-value">${result.object?.type ?? "—"}</span>
        <span class="stat-label">Type</span>
      </div>
    </div>
    <p class="stat-label" style="margin-bottom:0.5rem">Completed</p>
    <p style="color:var(--text-primary);font-size:0.9rem;margin-bottom:0.75rem">${dateStr}</p>
    ${result.path ? `<p class="stat-label" style="margin-bottom:0.25rem">Path</p><div class="pd-path">${result.path}</div>` : ""}
  `;

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
