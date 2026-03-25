/**
 * Dashboard View Controller.
 * Handles DOM rendering specifically for the dashboard tab.
 * @module dashboard.view
 */

import { renderProjectBarChart } from "./charts.bar.js";
import { renderAuditDonutChart } from "./charts.donut.js";
import { formatXP } from "./charts.helpers.js";
import { renderXPLineChart } from "./charts.line.js";
import { renderPassFailPieChart } from "./charts.pie.js";
import {
	fetchProgress,
	fetchProjectTeams,
	fetchResults,
	fetchSkills,
	fetchUserInfo,
	fetchUserLevel,
	fetchXPTransactions,
} from "./dashboard.api.js";
import {
	computeTopSkills,
	computeXpSummary,
	isAuthFailureError,
} from "./dashboard.core.js";
import { initProjectDetailClose, renderActivity } from "./dashboard.popup.js";

// ── DOM References ─────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);

// ── Module-level state (needed for project detail cross-reference) ─
/** @type {Array<{amount:number, createdAt:string, path:string, object:{name:string,type:string}}>} */
let _xpTransactions = [];

/** @type {Array<{grade:number, createdAt:string, object:{name:string,type:string}}>} */
let _results = [];

/** @type {Map<string, {captainLogin:string, members:Array<{login:string, displayName:string}>}>} */
let _teamsByProject = new Map();

export const initDashboard = () => {
	initProjectDetailClose(
		() => _xpTransactions,
		() => _results,
		() => _teamsByProject,
	);
};

// ── Dashboard Data Loading ─────────────────────────────────────────

/** Clears all dashboard UI elements back to empty state. */
export const resetDashboard = () => {
	const textOf = (id, val) => {
		const el = $(id);
		if (el) el.textContent = val;
	};
	textOf("#avatar-initials", "");
	textOf("#user-fullname", "");
	textOf("#user-login", "");
	textOf("#user-email", "");
	textOf("#user-campus", "");
	textOf("#total-xp", "—");
	textOf("#user-level", "—");
	textOf("#completed-projects", "—");
	textOf("#audit-ratio", "—");
	textOf("#audit-done-value", "");
	textOf("#audit-received-value", "");
	textOf("#nav-username", "");

	const styleOf = (id, width) => {
		const el = $(id);
		if (el) el.style.width = width;
	};
	styleOf("#audit-done-bar", "0");
	styleOf("#audit-received-bar", "0");

	const htmlOf = (id) => {
		const el = $(id);
		if (el) el.replaceChildren();
	};
	htmlOf("#xp-line-chart");
	htmlOf("#project-bar-chart");
	htmlOf("#audit-donut-chart");
	htmlOf("#passfail-pie-chart");
	htmlOf("#skills-list");
	htmlOf("#activity-list");

	_xpTransactions = [];
	_results = [];
	_teamsByProject = new Map();
};

/** Fetches all dashboard data and renders every section. */
export const loadDashboard = async (
	onAuthFailure,
	isSessionValid = () => true,
) => {
	const shouldLogout = (error) =>
		(error instanceof Error && isAuthFailureError(error)) || !isSessionValid();
	const normalizeProjectName = (name) =>
		typeof name === "string" ? name.trim().toLowerCase() : "";

	try {
		const userResult = await fetchUserInfo();
		if (!userResult.ok) {
			if (shouldLogout(userResult.error)) {
				onAuthFailure();
			}
			return { ok: false, error: userResult.error };
		}

		const user = userResult.data;

		renderUserSection(user);
		// Fetch all data in parallel for performance
		const [
			xpResult,
			progressResult,
			skillsResult,
			levelResult,
			resultsResult,
		] =
			await Promise.all([
				fetchXPTransactions(user.id),
				fetchProgress(user.id),
				fetchSkills(user.id),
				fetchUserLevel(user.id),
				fetchResults(user.id),
			]);

		const firstError = [
			xpResult,
			progressResult,
			skillsResult,
			levelResult,
			resultsResult,
		].find((result) => !result.ok);

		if (firstError && !firstError.ok) {
			if (shouldLogout(firstError.error)) {
				onAuthFailure();
			}
			return { ok: false, error: firstError.error };
		}

		const xpTransactions = xpResult.data;
		const progress = progressResult.data;
		const skills = skillsResult.data;
		const level = levelResult.data;
		const rawResults = resultsResult.data;
		const projectObjectIds = [
			...new Set(
				rawResults
					.map((result) => result.objectId)
					.filter((id) => typeof id === "number"),
			),
		];
		const projectTeamsResult = await fetchProjectTeams(user.id, projectObjectIds);
		if (!projectTeamsResult.ok) {
			if (shouldLogout(projectTeamsResult.error)) {
				onAuthFailure();
			}
			return { ok: false, error: projectTeamsResult.error };
		}

		const teamsByProject = projectTeamsResult.data;
		_teamsByProject = teamsByProject;
		const projectCountByName = rawResults.reduce((map, result) => {
			const projectKey = normalizeProjectName(result.object?.name);
			if (!projectKey) return map;
			map.set(projectKey, (map.get(projectKey) ?? 0) + 1);
			return map;
		}, new Map());

		const results = rawResults.map((result) => {
			const projectKey = String(result.objectId ?? "");
			const teamInfo = teamsByProject.get(projectKey) ?? {
				members: [],
				captainLogin: "",
			};
			const isCaptain = teamInfo.captainLogin === user.login;
			const myRole = isCaptain ? "Captain" : "Member";

			return {
				...result,
				teamMembers: teamInfo.members,
				teamCaptainLogin: teamInfo.captainLogin,
				myRole,
				projectRoles: [myRole],
				sharedRecordsCount: projectCountByName.get(projectKey) ?? 1,
			};
		});

		// Store for project detail cross-referencing
		_xpTransactions = xpTransactions;
		_results = results;

		renderXPSection(xpTransactions, level, progress);
		renderAuditSection(user);
		renderGraphs(xpTransactions, user, progress);
		renderSkills(skills);
		renderActivity(results, xpTransactions);

		return { ok: true, data: { userId: user.id } };
	} catch (err) {
		if (shouldLogout(err)) {
			onAuthFailure();
		}
		return {
			ok: false,
			error:
				err instanceof Error ? err : new Error("Unexpected dashboard error."),
		};
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

	const elInitials = $("#avatar-initials");
	if (elInitials) elInitials.textContent = initials;

	const elFullName = $("#user-fullname");
	if (elFullName)
		elFullName.textContent =
			[user.firstName, user.lastName].filter(Boolean).join(" ") || user.login;

	const elLogin = $("#user-login");
	if (elLogin) elLogin.textContent = `@${user.login}`;

	const elEmail = $("#user-email");
	if (elEmail) elEmail.textContent = user.email || "";

	const elCampus = $("#user-campus");
	if (elCampus) elCampus.textContent = user.campus ? `📍 ${user.campus}` : "";

	const elNavUser = $("#nav-username");
	if (elNavUser) elNavUser.textContent = `@${user.login}`;
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

	const xpEl = $("#total-xp");
	const lvlEl = $("#user-level");
	const projEl = $("#completed-projects");

	if (xpEl) xpEl.textContent = formatXP(totalXP);
	if (lvlEl) lvlEl.textContent = String(level);
	if (projEl) projEl.textContent = String(completedProjects);
};

/** Populates the audit ratio card with bar widths and values. */
/** @param {object} user */
const renderAuditSection = (user) => {
	const ratio = user.auditRatio ?? 0;
	const totalUp = user.totalUp ?? 0;
	const totalDown = user.totalDown ?? 0;
	const maxAudit = Math.max(totalUp, totalDown, 1);

	const ratioEl = $("#audit-ratio");
	const doneValEl = $("#audit-done-value");
	const recValEl = $("#audit-received-value");

	if (ratioEl) ratioEl.textContent = ratio.toFixed(1);
	if (doneValEl) doneValEl.textContent = formatXP(totalUp);
	if (recValEl) recValEl.textContent = formatXP(totalDown);

	// Animate bar widths on next frame
	requestAnimationFrame(() => {
		const doneBar = $("#audit-done-bar");
		const receivedBar = $("#audit-received-bar");
		if (doneBar) doneBar.style.width = `${(totalUp / maxAudit) * 100}%`;
		if (receivedBar)
			receivedBar.style.width = `${(totalDown / maxAudit) * 100}%`;
	});
};

/** Delegates chart rendering to individual graph modules. */
/**
 * @param {Array} transactions
 * @param {object} user
 * @param {Array} progress
 */
const renderGraphs = (transactions, user, progress) => {
	const xpLine = $("#xp-line-chart");
	if (xpLine) renderXPLineChart(xpLine, transactions);

	const barChart = $("#project-bar-chart");
	if (barChart) renderProjectBarChart(barChart, transactions);

	const donutChart = $("#audit-donut-chart");
	if (donutChart)
		renderAuditDonutChart(donutChart, user.totalUp ?? 0, user.totalDown ?? 0);

	const pieChart = $("#passfail-pie-chart");
	if (pieChart) renderPassFailPieChart(pieChart, progress);
};

/** Renders the top-N skills as animated bar items. */
/** @param {Array} skills */
const renderSkills = (skills) => {
	const list = $("#skills-list");
	if (!list) return;
	list.replaceChildren();

	if (!skills.length) {
		const empty = document.createElement("p");
		empty.style.color = "var(--text-muted)";
		empty.style.fontSize = "0.875rem";
		empty.textContent = "No skill data available.";
		list.append(empty);
		return;
	}

	const topSkills = computeTopSkills(skills, 8);
	const maxAmount = Math.max(...topSkills.map(([, v]) => v), 1);

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
