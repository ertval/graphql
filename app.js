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
import { renderProjectBarChart, renderXPLineChart } from "./graphs.js";

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

/* -------------------------------------------------------------------
   View Routing
   ------------------------------------------------------------------- */

/** Shows the profile view, hides login. */
const showProfile = () => {
	loginView.classList.remove("active");
	profileView.classList.add("active");
};

/** Shows the login view, hides profile. */
const showLogin = () => {
	profileView.classList.remove("active");
	loginView.classList.add("active");
	loginError.textContent = "";
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

	// UI loading state
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
	// Clear profile data from DOM
	resetDashboard();
	showLogin();
	// Prevent back-navigation to profile
	history.replaceState(null, "", location.pathname);
});

// Block back-button navigation to profile when logged out
globalThis.addEventListener("popstate", () => {
	if (!isAuthenticated()) {
		showLogin();
	}
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

/** Resets all dashboard DOM content. */
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
	$("#skills-list").innerHTML = "";
	$("#activity-list").innerHTML = "";
	$("#nav-username").textContent = "";
};

/** Loads all dashboard data and renders the UI. */
const loadDashboard = async () => {
	try {
		// Fetch user info first to get the ID
		const user = await fetchUserInfo();
		if (!user) {
			throw new Error("Could not load user data.");
		}

		renderUserSection(user);

		// Fetch remaining data in parallel
		const [xpTransactions, progress, skills, level, results] =
			await Promise.all([
				fetchXPTransactions(user.id),
				fetchProgress(user.id),
				fetchSkills(user.id),
				fetchUserLevel(user.id),
				fetchResults(user.id),
			]);

		renderXPSection(xpTransactions, level, progress);
		renderAuditSection(user);
		renderGraphs(xpTransactions);
		renderSkills(skills);
		renderActivity(results);

		// Bonus: demonstrate fetching a specific object by ID (parameterized query)
		if (xpTransactions.length > 0) {
			const firstTx = xpTransactions[0];
			const objDetail = await fetchObjectById(firstTx.id);
			if (objDetail) {
				console.log("[Bonus] Object by ID demo:", objDetail);
			}
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

/**
 * Renders the User Profile section.
 * @param {object} user
 */
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
 * Renders the XP & Level section.
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

/**
 * Renders the audit ratio section.
 * @param {object} user
 */
const renderAuditSection = (user) => {
	const ratio = user.auditRatio ?? 0;
	const totalUp = user.totalUp ?? 0;
	const totalDown = user.totalDown ?? 0;
	const maxAudit = Math.max(totalUp, totalDown, 1);

	$("#audit-ratio").textContent = ratio.toFixed(1);
	$("#audit-done-value").textContent = formatXP(totalUp);
	$("#audit-received-value").textContent = formatXP(totalDown);

	// Animate bars
	requestAnimationFrame(() => {
		$("#audit-done-bar").style.width = `${(totalUp / maxAudit) * 100}%`;
		$("#audit-received-bar").style.width = `${(totalDown / maxAudit) * 100}%`;
	});
};

/**
 * Renders the SVG graphs section.
 * @param {Array} transactions
 */
const renderGraphs = (transactions) => {
	const lineContainer = $("#xp-line-chart");
	const barContainer = $("#project-bar-chart");

	renderXPLineChart(lineContainer, transactions);
	renderProjectBarChart(barContainer, transactions);
};

/**
 * Renders top skills (bonus section).
 * @param {Array} skills
 */
const renderSkills = (skills) => {
	const list = $("#skills-list");
	list.innerHTML = "";

	if (!skills.length) {
		list.innerHTML =
			'<p style="color:var(--text-muted);font-size:0.875rem;">No skill data available.</p>';
		return;
	}

	// De-duplicate skills — keep highest amount per type
	const skillMap = new Map();
	for (const s of skills) {
		const name = s.type.replace("skill_", "");
		const existing = skillMap.get(name);
		if (!existing || s.amount > existing) {
			skillMap.set(name, s.amount);
		}
	}

	// Top 8 skills
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

		// Animate bar
		requestAnimationFrame(() => {
			item.querySelector(".skill-bar-fill").style.width =
				`${(amount / maxAmount) * 100}%`;
		});
	}
};

/**
 * Renders recent project results (bonus section).
 * @param {Array} results
 */
const renderActivity = (results) => {
	const list = $("#activity-list");
	list.innerHTML = "";

	// Filter to project-type results with a valid object
	const projectResults = results
		.filter((r) => r.object?.name && r.object?.type === "project")
		.slice(0, 10);

	if (!projectResults.length) {
		// Fallback: show any results with objects
		const anyResults = results.filter((r) => r.object?.name).slice(0, 10);
		if (!anyResults.length) {
			list.innerHTML =
				'<p style="color:var(--text-muted);font-size:0.875rem;">No recent activity.</p>';
			return;
		}
		renderActivityItems(list, anyResults);
		return;
	}

	renderActivityItems(list, projectResults);
};

/**
 * Renders activity item elements into a list.
 * @param {HTMLElement} list
 * @param {Array} items
 */
const renderActivityItems = (list, items) => {
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
		item.innerHTML = `
      <span class="activity-name">${result.object?.name ?? "Unknown"}</span>
      <div class="activity-meta">
        <span class="activity-badge ${passed ? "badge-pass" : "badge-fail"}">${passed ? "PASS" : "FAIL"}</span>
        <span class="activity-date">${dateStr}</span>
      </div>
    `;
		list.append(item);
	}
};

/* -------------------------------------------------------------------
   App Initialization
   ------------------------------------------------------------------- */

const init = () => {
	if (isAuthenticated()) {
		showProfile();
		loadDashboard();
	} else {
		clearToken();
		showLogin();
	}
};

init();
